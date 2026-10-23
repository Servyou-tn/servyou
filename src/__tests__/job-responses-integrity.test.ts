/**
 * Live-DB proof for db/migrations/20261023212946_job_responses_responder_integrity.sql.
 *
 * Part 1 — enforce_job_responder_capability() on job_responses (BEFORE INSERT, fires before
 *          check_job_response_limits by name): for a signed-in non-admin caller the row must be the
 *          caller's own (checked first, so no message describes another account), then the account
 *          must be seller_type 'freelancer', 18+, not suspended, and own a freelancer profile that
 *          is not admin-moderated — all 42501.
 * Part 2 — enforce_seller_capability_switch() (migration 55, extended): seller_type cannot move away
 *          from 'freelancer' while the account holds any job_responses row (42501, own message).
 * Part 3 — anon lost INSERT / UPDATE on job_responses and authenticated lost UPDATE.
 *
 * Every write under test goes through a signed-in user's own session (the REST path the guards
 * exist for); the service role seeds fixtures, reads ground truth and runs the bypass control.
 * Every rejection is followed by a service-role read proving nothing changed. The phone unlock the
 * HIGH finding was about is checked end to end through get_contact_phone.
 *
 * Fixtures (all `job-resp-`): a poster (consumer with a phone) owning an open and a filled post, a
 * consumer, a minor, a shop owner, a freelancer, a freelancer with no profile, a minor freelancer
 * (seller_type set by the service role, which bypasses the age gate), a suspended freelancer, a
 * freelancer whose profile is admin-moderated, a freelancer who switches, a service-role bypass
 * target and an admin. Deleting the auth users cascades to every row seeded here.
 *
 * Not proven here: the FOR SHARE serialization between an insert and a concurrent seller_type
 * switch (supabase-js over PostgREST cannot hold two transactions open; the repo has no pg client).
 *
 * Pattern A (live-DB). Service role for fixtures, ground truth and teardown only.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/job-responses-integrity.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'job-resp-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PASSWORD = 'Job-Responses-Test-7k2!' // ephemeral test users only; never a real account
const TITLE = 'Job responses integrity test'
const RUN = randomUUID().slice(0, 8)
const POSTER_PHONE = '+21620000077'

// 15 years before today (UTC), so the minor stays under 18 whatever day the suite runs.
const MINOR_DOB = (() => {
  const d = new Date()
  d.setUTCFullYear(d.getUTCFullYear() - 15)
  return d.toISOString().slice(0, 10)
})()

// The guards' error shapes, pinned by text so a rejection from some OTHER trigger, policy or
// constraint can't pass for the rule under test.
const NOT_SELF = "Vous ne pouvez répondre à une annonce qu'en votre propre nom."
const NOT_FREELANCER = 'Seul un compte freelance peut répondre à une annonce.'
const UNDER_18 = 'Il faut avoir 18 ans pour répondre à une annonce.'
const SUSPENDED = 'Un compte suspendu ne peut pas répondre à une annonce.'
const NO_PROFILE = 'Un profil freelance est requis pour répondre à une annonce.'
const HIDDEN = 'Un profil freelance masqué par la modération ne peut pas répondre à une annonce.'
const SWITCH = 'Le type de vendeur ne peut pas changer tant que le compte possède une boutique ou un profil freelance.' // migration 55
const SWITCH_RESPONSES = 'Le type de vendeur ne peut pas changer tant que le compte a des réponses à des annonces.'
const NOT_OPEN = "Cette annonce n'est plus ouverte." // check_job_response_limits, unchanged
const PERMISSION_DENIED = 'permission denied for table job_responses'

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

async function signIn(local: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email: email(local), password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function createUser(local: string, dateOfBirth = '1990-01-01'): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Job Responses Test', date_of_birth: dateOfBirth, city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

// Service-role seeding: auth.uid() is NULL, so every guard trigger is bypassed — which is what lets
// the minor-freelancer and no-profile states below exist at all.
async function seedSellerType(id: string, type: 'shop_owner' | 'freelancer'): Promise<void> {
  const { error } = await admin.from('profiles').update({ seller_type: type }).eq('id', id)
  if (error) throw new Error(`seller_type seed failed: ${error.message}`)
}

// admin_hidden_* is set on INSERT: enforce_admin_marker_lock is BEFORE UPDATE only and has no
// auth.uid() NULL bypass, so a service-role UPDATE of the marker would raise.
async function seedFreelancerProfile(profileId: string, hidden = false): Promise<void> {
  const row: { profile_id: string; admin_hidden_at?: string; admin_hidden_reason?: string } = hidden
    ? { profile_id: profileId, admin_hidden_at: new Date().toISOString(), admin_hidden_reason: 'Job responses test' }
    : { profile_id: profileId }
  const { error } = await admin.from('freelancer_profiles').insert(row)
  if (error) throw new Error(`freelancer_profiles seed failed: ${error.message}`)
}

async function seedPost(consumerId: string, status: 'open' | 'filled'): Promise<string> {
  const { data, error } = await admin
    .from('job_posts')
    .insert({ consumer_id: consumerId, title: `${TITLE} ${RUN} — ${status}`, description: 'Test description', status })
    .select('id')
    .single()
  if (error || !data) throw new Error(`job_posts seed failed (${status}): ${error?.message}`)
  return data.id
}

async function responseCount(freelancerId: string): Promise<number> {
  const { count, error } = await admin
    .from('job_responses')
    .select('id', { count: 'exact', head: true })
    .eq('freelancer_id', freelancerId)
  if (error) throw new Error(`job_responses count failed: ${error.message}`)
  return count ?? 0
}

async function sellerTypeOf(id: string): Promise<string | null> {
  const { data, error } = await admin.from('profiles').select('seller_type').eq('id', id).single()
  if (error) throw new Error(`seller_type read failed: ${error.message}`)
  return data.seller_type as string | null
}

async function fpCount(profileId: string): Promise<number> {
  const { count, error } = await admin
    .from('freelancer_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
  if (error) throw new Error(`freelancer_profiles count failed: ${error.message}`)
  return count ?? 0
}

function respond(client: SupabaseClient, postId: string, freelancerId: string) {
  return client.from('job_responses').insert({ job_post_id: postId, freelancer_id: freelancerId, proposal_message: 'Test proposal' })
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// Deleting the auth user cascades profiles -> job_posts / job_responses / freelancer_profiles / shops.
// No orders or audit rows are ever created here.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id as string)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

let posterId: string
let consumerId: string
let minorId: string
let shopOwnerId: string
let freelancerId: string
let noProfileId: string
let minorFreelancerId: string
let suspendedId: string
let hiddenId: string
let switcherId: string
let bypassId: string
let adminId: string

let openPostId: string
let filledPostId: string

let consumerClient: SupabaseClient
let minorClient: SupabaseClient
let shopOwnerClient: SupabaseClient
let freelancerClient: SupabaseClient
let noProfileClient: SupabaseClient
let minorFreelancerClient: SupabaseClient
let suspendedClient: SupabaseClient
let hiddenClient: SupabaseClient
let switcherClient: SupabaseClient
let adminClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  posterId = await createUser('poster')
  consumerId = await createUser('consumer')
  minorId = await createUser('minor', MINOR_DOB)
  shopOwnerId = await createUser('shop')
  freelancerId = await createUser('free')
  noProfileId = await createUser('no-profile')
  minorFreelancerId = await createUser('minor-free', MINOR_DOB)
  suspendedId = await createUser('suspended')
  hiddenId = await createUser('hidden')
  switcherId = await createUser('switcher')
  bypassId = await createUser('bypass')
  adminId = await createUser('admin')

  const { error: phoneErr } = await admin.from('profiles').update({ phone: POSTER_PHONE }).eq('id', posterId)
  if (phoneErr) throw new Error(`poster phone seed failed: ${phoneErr.message}`)
  openPostId = await seedPost(posterId, 'open')
  filledPostId = await seedPost(posterId, 'filled')

  await seedSellerType(shopOwnerId, 'shop_owner')
  const { error: shopErr } = await admin.from('shops').insert({ owner_id: shopOwnerId, name: `${TITLE} ${RUN}` })
  if (shopErr) throw new Error(`shop seed failed: ${shopErr.message}`)

  for (const id of [freelancerId, minorFreelancerId, suspendedId, hiddenId, switcherId]) {
    await seedSellerType(id, 'freelancer')
  }
  await seedSellerType(noProfileId, 'freelancer') // no freelancer profile
  await seedFreelancerProfile(freelancerId)
  await seedFreelancerProfile(minorFreelancerId)
  await seedFreelancerProfile(suspendedId)
  await seedFreelancerProfile(hiddenId, true)
  await seedFreelancerProfile(switcherId)

  const { error: suspendErr } = await admin
    .from('profiles')
    .update({ suspended_at: new Date().toISOString(), suspended_reason: 'Job responses test' })
    .eq('id', suspendedId)
  if (suspendErr) throw new Error(`suspension seed failed: ${suspendErr.message}`)

  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)

  consumerClient = await signIn('consumer')
  minorClient = await signIn('minor')
  shopOwnerClient = await signIn('shop')
  freelancerClient = await signIn('free')
  noProfileClient = await signIn('no-profile')
  minorFreelancerClient = await signIn('minor-free')
  suspendedClient = await signIn('suspended')
  hiddenClient = await signIn('hidden')
  switcherClient = await signIn('switcher')
  adminClient = await signIn('admin')
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown verification failed: ${error.message}`)
  if (count !== 0) throw new Error(`teardown left ${count} ${PREFIX} profile(s) behind`)
  const { count: posts, error: postsErr } = await admin
    .from('job_posts')
    .select('id', { count: 'exact', head: true })
    .like('title', `${TITLE} ${RUN}%`)
  if (postsErr) throw new Error(`teardown post verification failed: ${postsErr.message}`)
  if (posts !== 0) throw new Error(`teardown left ${posts} job post(s) behind`)
}, 120000)

describe.skipIf(!hasCreds)('ground truth for every case below', () => {
  it('the seeded accounts and posts hold exactly the states under test', async () => {
    expect(await sellerTypeOf(consumerId)).toBeNull()
    expect(await sellerTypeOf(minorId)).toBeNull()
    expect(await sellerTypeOf(shopOwnerId)).toBe('shop_owner')
    for (const id of [freelancerId, noProfileId, minorFreelancerId, suspendedId, hiddenId, switcherId]) {
      expect(await sellerTypeOf(id)).toBe('freelancer')
    }
    expect(await fpCount(noProfileId)).toBe(0)
    for (const id of [freelancerId, minorFreelancerId, suspendedId, hiddenId, switcherId]) {
      expect(await fpCount(id)).toBe(1)
    }

    const { data: minorFree } = await admin.from('profiles').select('date_of_birth').eq('id', minorFreelancerId).single()
    expect(minorFree?.date_of_birth).toBe(MINOR_DOB)
    const { data: suspended } = await admin.from('profiles').select('suspended_at').eq('id', suspendedId).single()
    expect(suspended?.suspended_at).not.toBeNull()
    const { data: hidden } = await admin.from('freelancer_profiles').select('admin_hidden_at').eq('profile_id', hiddenId).single()
    expect(hidden?.admin_hidden_at).not.toBeNull()

    const { data: posts } = await admin.from('job_posts').select('id, status').in('id', [openPostId, filledPostId])
    expect(posts).toHaveLength(2)
    expect(posts?.find((p) => p.id === openPostId)?.status).toBe('open')
    expect(posts?.find((p) => p.id === filledPostId)?.status).toBe('filled')

    const { count } = await admin.from('job_responses').select('id', { count: 'exact', head: true }).in('job_post_id', [openPostId, filledPostId])
    expect(count).toBe(0)
  })
})

describe.skipIf(!hasCreds)('the exploit — a non-freelancer response and the phone it unlocked', () => {
  it('a consumer cannot respond, and so get_contact_phone(poster) stays NULL for them', async () => {
    const { error } = await respond(consumerClient, openPostId, consumerId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_FREELANCER)
    expect(await responseCount(consumerId)).toBe(0)

    const { data: phone, error: rpcErr } = await consumerClient.rpc('get_contact_phone', { target: posterId })
    expect(rpcErr).toBeNull()
    expect(phone).toBeNull()
  })

  it('control: a freelancer responds, and get_contact_phone(poster) then returns the phone', async () => {
    const { data: before } = await freelancerClient.rpc('get_contact_phone', { target: posterId })
    expect(before).toBeNull()

    const { error } = await respond(freelancerClient, openPostId, freelancerId)
    expect(error).toBeNull()
    expect(await responseCount(freelancerId)).toBe(1)

    const { data: phone, error: rpcErr } = await freelancerClient.rpc('get_contact_phone', { target: posterId })
    expect(rpcErr).toBeNull()
    expect(phone).toBe(POSTER_PHONE)
  })
})

describe.skipIf(!hasCreds)('Part 1 — who may respond (42501)', () => {
  it('a minor (seller_type NULL) cannot respond', async () => {
    const { error } = await respond(minorClient, openPostId, minorId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_FREELANCER)
    expect(await responseCount(minorId)).toBe(0)
  })

  it('a shop owner cannot respond', async () => {
    const { error } = await respond(shopOwnerClient, openPostId, shopOwnerId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_FREELANCER)
    expect(await responseCount(shopOwnerId)).toBe(0)
  })

  it('a freelancer with a seller_type set past the age gate is still refused under 18', async () => {
    const { error } = await respond(minorFreelancerClient, openPostId, minorFreelancerId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(UNDER_18)
    expect(await responseCount(minorFreelancerId)).toBe(0)
  })

  it('a suspended freelancer cannot respond', async () => {
    const { error } = await respond(suspendedClient, openPostId, suspendedId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(SUSPENDED)
    expect(await responseCount(suspendedId)).toBe(0)
  })

  it('a freelancer with no freelancer profile cannot respond', async () => {
    const { error } = await respond(noProfileClient, openPostId, noProfileId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NO_PROFILE)
    expect(await responseCount(noProfileId)).toBe(0)
  })

  it('a freelancer whose profile is admin-moderated cannot respond', async () => {
    const { error } = await respond(hiddenClient, openPostId, hiddenId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(HIDDEN)
    expect(await responseCount(hiddenId)).toBe(0)
  })
})

describe.skipIf(!hasCreds)('Part 1 — the own-account check comes first, so no message describes another account', () => {
  it("naming a suspended freelancer's id yields the generic message, not theirs", async () => {
    const { error } = await respond(consumerClient, openPostId, suspendedId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_SELF)
    expect(await responseCount(suspendedId)).toBe(0)
  })

  it("naming a freelancer who already responded yields the generic message, not the limits trigger's duplicate check", async () => {
    expect(await responseCount(freelancerId)).toBe(1)
    const { error } = await respond(consumerClient, openPostId, freelancerId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_SELF)
    expect(await responseCount(freelancerId)).toBe(1)
  })

  it('a freelancer cannot respond in another freelancer\'s name either', async () => {
    const { error } = await respond(freelancerClient, openPostId, switcherId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_SELF)
    expect(await responseCount(switcherId)).toBe(0)
  })
})

describe.skipIf(!hasCreds)('Part 1 — firing order against check_job_response_limits', () => {
  it('a consumer on a filled post is refused for who they are, not for the post', async () => {
    const { error } = await respond(consumerClient, filledPostId, consumerId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_FREELANCER)
  })

  it('a freelancer on a filled post still gets the limits trigger\'s own rejection', async () => {
    const { error } = await respond(freelancerClient, filledPostId, freelancerId)
    expect(error?.message).toBe(NOT_OPEN)
    const { count } = await admin.from('job_responses').select('id', { count: 'exact', head: true }).eq('job_post_id', filledPostId)
    expect(count).toBe(0)
  })
})

describe.skipIf(!hasCreds)('Part 2 — seller_type cannot leave freelancer while responses exist (42501)', () => {
  it("a freelancer who still owns a profile gets migration 55's message first", async () => {
    const { error } = await freelancerClient.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', freelancerId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(SWITCH)
    expect(await sellerTypeOf(freelancerId)).toBe('freelancer')
  })

  it('red team: respond, delete the profile, switch — the switch is refused while the response exists', async () => {
    const { error: respErr } = await respond(switcherClient, openPostId, switcherId)
    expect(respErr).toBeNull()
    expect(await responseCount(switcherId)).toBe(1)

    const { data: deleted, error: delErr } = await switcherClient
      .from('freelancer_profiles')
      .delete()
      .eq('profile_id', switcherId)
      .select('id')
    expect(delErr).toBeNull()
    expect(deleted).toHaveLength(1)
    expect(await fpCount(switcherId)).toBe(0)

    for (const next of ['shop_owner', null] as const) {
      const { error } = await switcherClient.from('profiles').update({ seller_type: next }).eq('id', switcherId)
      expect(error?.code).toBe('42501')
      expect(error?.message).toBe(SWITCH_RESPONSES)
    }
    expect(await sellerTypeOf(switcherId)).toBe('freelancer')
    expect(await responseCount(switcherId)).toBe(1)
  })

  it('…and the profile-less account cannot add a response meanwhile', async () => {
    const { error } = await respond(switcherClient, openPostId, switcherId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NO_PROFILE)
    expect(await responseCount(switcherId)).toBe(1)
  })

  it('withdrawing the responses lets the switch through', async () => {
    const { data: withdrawn, error: delErr } = await switcherClient
      .from('job_responses')
      .delete()
      .eq('freelancer_id', switcherId)
      .select('id')
    expect(delErr).toBeNull()
    expect(withdrawn).toHaveLength(1)

    const { error } = await switcherClient.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', switcherId)
    expect(error).toBeNull()
    expect(await sellerTypeOf(switcherId)).toBe('shop_owner')
  })
})

describe.skipIf(!hasCreds)('Part 3 — grants', () => {
  it('anon is stopped at the privilege check, before the limits trigger can describe a response', async () => {
    const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    // freelancerId already responded to this post: before Part 3 this reached "déjà répondu".
    const { error } = await respond(anon, openPostId, freelancerId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(PERMISSION_DENIED)

    const { error: updErr } = await anon.from('job_responses').update({ proposal_message: 'anon' }).eq('freelancer_id', freelancerId)
    expect(updErr?.code).toBe('42501')
    expect(updErr?.message).toBe(PERMISSION_DENIED)
    expect(await responseCount(freelancerId)).toBe(1)
  })

  it('a signed-in responder cannot UPDATE their response (no grant, not just no policy)', async () => {
    const { error } = await freelancerClient
      .from('job_responses')
      .update({ proposal_message: 'Edited' })
      .eq('freelancer_id', freelancerId)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(PERMISSION_DENIED)
    const { data } = await admin.from('job_responses').select('proposal_message').eq('freelancer_id', freelancerId).single()
    expect(data?.proposal_message).toBe('Test proposal')
  })
})

describe.skipIf(!hasCreds)('bypasses — consistent with the other guard triggers', () => {
  it('the service role (auth.uid() NULL) can seed a response for a consumer — three suites depend on it', async () => {
    const { error } = await respond(admin, openPostId, bypassId)
    expect(error).toBeNull()
    expect(await sellerTypeOf(bypassId)).toBeNull()
    expect(await responseCount(bypassId)).toBe(1)
  })

  it('an admin is not gated', async () => {
    const { error } = await respond(adminClient, openPostId, adminId)
    expect(error).toBeNull()
    expect(await sellerTypeOf(adminId)).toBeNull()
    expect(await responseCount(adminId)).toBe(1)
  })
})

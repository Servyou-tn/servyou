/**
 * RLS boundary + trigger tests for the freelancer publish gate
 * (db/migrations/<version>_freelancer_profiles_publish_gate.sql).
 *
 * freelancer_profiles and its five child tables (freelancer_skills,
 * freelancer_tools, freelancer_education, freelancer_certifications,
 * freelancer_languages) went from SELECT `using (true)` to gated on
 * freelancer_profiles.is_published OR owner OR admin. is_published is
 * derived — true iff the freelancer has >= 1 active service_listings row —
 * and maintained by the sync_freelancer_is_published() trigger, never
 * written directly.
 *
 * Supersedes freelancer-config-rls.test.ts: that file's premise ("anon CAN
 * read unconditionally") is no longer true. Its owner/non-owner WRITE
 * coverage (unchanged by this migration) is preserved below; its read
 * assertions are replaced by the published/unpublished/admin split.
 *
 * Every negative-read assertion below runs against a profile SEEDED with a
 * row in all five child tables — prod has zero rows in all five today, so
 * an assertion against live data alone cannot distinguish "correctly
 * hidden" from "nothing there to find".
 *
 * Pattern A (live-DB), mirroring freelancer-config-rls.test.ts / profiles-rls
 * .test.ts. Service role for fixtures and teardown only.
 *
 * Run: npx vitest run src/__tests__/freelancer-publish-gate-rls.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'frl-pub-'
const PUB_EMAIL = `${EMAIL_PREFIX}published${EMAIL_SUFFIX}`
const UNPUB_EMAIL = `${EMAIL_PREFIX}unpublished${EMAIL_SUFFIX}`
const TRIGGER_EMAIL = `${EMAIL_PREFIX}trigger${EMAIL_SUFFIX}`
const OTHER_EMAIL = `${EMAIL_PREFIX}other${EMAIL_SUFFIX}`
const ADMIN_EMAIL = `${EMAIL_PREFIX}admin${EMAIL_SUFFIX}`
const PASSWORD = 'Rls-Publish-Test-9j4!' // ephemeral test users only; never a real account

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)
const anon: SupabaseClient = hasCreds
  ? createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${email}: ${error.message}`)
  return client
}

async function createUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Publish Gate Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
  return data.user.id
}

async function seedChildren(freelancerProfileId: string, tag: string): Promise<void> {
  const seeds = [
    admin.from('freelancer_skills').insert({ freelancer_profile_id: freelancerProfileId, skill: `Skill-${tag}` }),
    admin.from('freelancer_languages').insert({ freelancer_profile_id: freelancerProfileId, language: 'fr', proficiency: 'natif' }),
    admin.from('freelancer_tools').insert({ freelancer_id: freelancerProfileId, name: `Tool-${tag}` }),
    admin.from('freelancer_education').insert({ freelancer_id: freelancerProfileId, institution: `Institution-${tag}` }),
    admin.from('freelancer_certifications').insert({ freelancer_id: freelancerProfileId, name: `Cert-${tag}` }),
  ]
  for (const p of seeds) {
    const { error } = await p
    if (error) throw new Error(`seedChildren(${tag}) failed: ${error.message}`)
  }
}

// Idempotent, surgical to this file's prefix. Deleting the user cascades
// profiles -> freelancer_profiles -> children + service_listings (ON DELETE CASCADE).
async function teardown(): Promise<void> {
  const { data, error } = await admin
    .from('profiles').select('id').like('email', `${EMAIL_PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

let pubProfileId: string
let unpubProfileId: string
let triggerProfileId: string
let pubClient: SupabaseClient
let unpubClient: SupabaseClient
let otherClient: SupabaseClient
let adminClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown() // teardown-first: recover from any crashed prior run

  const pubOwnerId = await createUser(PUB_EMAIL)
  const unpubOwnerId = await createUser(UNPUB_EMAIL)
  const triggerOwnerId = await createUser(TRIGGER_EMAIL)
  await createUser(OTHER_EMAIL)
  const adminId = await createUser(ADMIN_EMAIL)

  const { data: pubProfile, error: pubErr } = await admin
    .from('freelancer_profiles').insert({ profile_id: pubOwnerId }).select('id').single()
  if (pubErr || !pubProfile) throw new Error(`published freelancer_profile insert failed: ${pubErr?.message}`)
  pubProfileId = pubProfile.id

  const { data: unpubProfile, error: unpubErr } = await admin
    .from('freelancer_profiles').insert({ profile_id: unpubOwnerId }).select('id').single()
  if (unpubErr || !unpubProfile) throw new Error(`unpublished freelancer_profile insert failed: ${unpubErr?.message}`)
  unpubProfileId = unpubProfile.id

  const { data: triggerProfile, error: triggerErr } = await admin
    .from('freelancer_profiles').insert({ profile_id: triggerOwnerId }).select('id').single()
  if (triggerErr || !triggerProfile) throw new Error(`trigger freelancer_profile insert failed: ${triggerErr?.message}`)
  triggerProfileId = triggerProfile.id

  // pubProfileId becomes published via the trigger firing on this insert — not set directly.
  const { error: listingErr } = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: pubProfileId, title: 'Test service (published)', starting_price_tnd: 50 })
  if (listingErr) throw new Error(`published service_listings insert failed: ${listingErr.message}`)

  // unpubProfileId gets zero listings — is_published stays at its column default (false).
  // Seed both profiles' children so a negative read can't be mistaken for "nothing there".
  await seedChildren(pubProfileId, 'pub')
  await seedChildren(unpubProfileId, 'unpub')

  pubClient = await signIn(PUB_EMAIL)
  unpubClient = await signIn(UNPUB_EMAIL)
  otherClient = await signIn(OTHER_EMAIL)
  adminClient = await signIn(ADMIN_EMAIL)
  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)
  // is_admin() reads profiles per call (not cached at sign-in), so adminClient needs no re-auth.
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

// ─── 1 & 6: anon reads the published profile, and is denied on the unpublished one
//     (which has real rows in all five child tables) ───────────────────────────

describe.skipIf(!hasCreds)('anon read — publish gate', () => {
  it('CAN read the published freelancer_profiles row', async () => {
    const { data, error } = await anon.from('freelancer_profiles').select('id').eq('id', pubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('CAN read all five child tables of the published profile', async () => {
    const [skills, languages, tools, education, certifications] = await Promise.all([
      anon.from('freelancer_skills').select('id').eq('freelancer_profile_id', pubProfileId),
      anon.from('freelancer_languages').select('id').eq('freelancer_profile_id', pubProfileId),
      anon.from('freelancer_tools').select('id').eq('freelancer_id', pubProfileId),
      anon.from('freelancer_education').select('id').eq('freelancer_id', pubProfileId),
      anon.from('freelancer_certifications').select('id').eq('freelancer_id', pubProfileId),
    ])
    for (const r of [skills, languages, tools, education, certifications]) {
      expect(r.error).toBeNull()
      expect(r.data).toHaveLength(1)
    }
  })

  it('CANNOT read the unpublished freelancer_profiles row', async () => {
    const { data, error } = await anon.from('freelancer_profiles').select('id').eq('id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('CANNOT read any of the five child tables of the unpublished profile, though rows exist', async () => {
    const [skills, languages, tools, education, certifications] = await Promise.all([
      anon.from('freelancer_skills').select('id').eq('freelancer_profile_id', unpubProfileId),
      anon.from('freelancer_languages').select('id').eq('freelancer_profile_id', unpubProfileId),
      anon.from('freelancer_tools').select('id').eq('freelancer_id', unpubProfileId),
      anon.from('freelancer_education').select('id').eq('freelancer_id', unpubProfileId),
      anon.from('freelancer_certifications').select('id').eq('freelancer_id', unpubProfileId),
    ])
    for (const r of [skills, languages, tools, education, certifications]) {
      expect(r.error).toBeNull()
      expect(r.data).toEqual([])
    }
    // Ground truth: the rows really exist (service role bypasses RLS) — proves the
    // empty results above are the gate working, not an empty fixture.
    const { data: groundTruth, error: gtErr } = await admin
      .from('freelancer_skills').select('id').eq('freelancer_profile_id', unpubProfileId)
    expect(gtErr).toBeNull()
    expect(groundTruth).toHaveLength(1)
  })

  it('a signed-in but unrelated, non-admin user is ALSO denied on the unpublished profile', async () => {
    const { data, error } = await otherClient.from('freelancer_profiles').select('id').eq('id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

// ─── 2: owner reads own row + own children while unpublished ──────────────────

describe.skipIf(!hasCreds)('owner read — unpublished profile', () => {
  it('CAN read own freelancer_profiles row while is_published=false', async () => {
    const { data, error } = await unpubClient.from('freelancer_profiles').select('id, is_published').eq('id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0].is_published).toBe(false)
  })

  it('CAN read own child rows while unpublished', async () => {
    const { data, error } = await unpubClient.from('freelancer_skills').select('id').eq('freelancer_profile_id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

// ─── 3: admin reads the unpublished profile (proves /admin/signalements/[id] still works) ──

describe.skipIf(!hasCreds)('admin read — unpublished profile', () => {
  it('CAN read the unpublished freelancer_profiles row', async () => {
    const { data, error } = await adminClient.from('freelancer_profiles').select('id').eq('id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('CAN read its child rows', async () => {
    const { data, error } = await adminClient.from('freelancer_certifications').select('id').eq('freelancer_id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

// ─── write policies (unchanged by this migration) — ported from freelancer-config-rls.test.ts ──

describe.skipIf(!hasCreds)('freelancer_tools / freelancer_education / freelancer_certifications write RLS (unchanged)', () => {
  it('non-owner CANNOT insert a tool on another freelancer', async () => {
    const { error } = await otherClient.from('freelancer_tools').insert({ freelancer_id: pubProfileId, name: 'Photoshop' })
    expect(error).not.toBeNull()
  })
  it('owner CAN insert a tool on own profile (control)', async () => {
    const { error } = await pubClient.from('freelancer_tools').insert({ freelancer_id: pubProfileId, name: 'Illustrator' })
    expect(error).toBeNull()
  })
  it('non-owner CANNOT insert an education entry on another freelancer', async () => {
    const { error } = await otherClient.from('freelancer_education').insert({ freelancer_id: pubProfileId, institution: 'ESPRIT' })
    expect(error).not.toBeNull()
  })
  it('owner CAN insert an education entry on own profile (control)', async () => {
    const { error } = await pubClient.from('freelancer_education').insert({ freelancer_id: pubProfileId, institution: 'INSAT' })
    expect(error).toBeNull()
  })
  it('non-owner CANNOT insert a certification on another freelancer', async () => {
    const { error } = await otherClient.from('freelancer_certifications').insert({ freelancer_id: pubProfileId, name: 'AWS SAA' })
    expect(error).not.toBeNull()
  })
  it('owner CAN insert a certification on own profile (control)', async () => {
    const { error } = await pubClient.from('freelancer_certifications').insert({ freelancer_id: pubProfileId, name: 'Scrum Master' })
    expect(error).toBeNull()
  })
})

// ─── 4: sync_freelancer_is_published trigger, both directions + DELETE ────────

describe.skipIf(!hasCreds)('sync_freelancer_is_published trigger', () => {
  async function isPublished(): Promise<boolean> {
    const { data, error } = await admin.from('freelancer_profiles').select('is_published').eq('id', triggerProfileId).single()
    if (error || !data) throw new Error(`isPublished read failed: ${error?.message}`)
    return data.is_published as boolean
  }

  it('starts unpublished — no listings yet', async () => {
    expect(await isPublished()).toBe(false)
  })

  let listingId: string

  it('INSERT of an active listing flips is_published to true', async () => {
    const { data, error } = await admin
      .from('service_listings')
      .insert({ freelancer_profile_id: triggerProfileId, title: 'Trigger test service', starting_price_tnd: 30 })
      .select('id').single()
    if (error || !data) throw new Error(`listing insert failed: ${error?.message}`)
    listingId = data.id
    expect(await isPublished()).toBe(true)
  })

  it('the last active listing going hidden flips is_published to false', async () => {
    const { error } = await admin.from('service_listings').update({ status: 'hidden' }).eq('id', listingId)
    expect(error).toBeNull()
    expect(await isPublished()).toBe(false)
  })

  it('the listing going active again flips is_published back to true', async () => {
    const { error } = await admin.from('service_listings').update({ status: 'active' }).eq('id', listingId)
    expect(error).toBeNull()
    expect(await isPublished()).toBe(true)
  })

  it('DELETE of the last active listing flips is_published to false', async () => {
    const { error } = await admin.from('service_listings').delete().eq('id', listingId)
    expect(error).toBeNull()
    expect(await isPublished()).toBe(false)
  })
})

// ─── 5: the !inner embed paths (marketplace list + detail) still surface every
//     published freelancer against REAL data — not fixtures. These are the paths
//     that break loudly (whole parent row disappears) if the gate is wrong. ────

describe.skipIf(!hasCreds)('live marketplace embed paths (real data, read-only)', () => {
  it('the getActiveServices/-list- shape returns every active service_listings row', async () => {
    const { count: groundTruth, error: gtErr } = await admin
      .from('service_listings').select('id', { count: 'exact', head: true }).eq('status', 'active')
    expect(gtErr).toBeNull()
    expect(groundTruth ?? 0).toBeGreaterThan(0)

    const { data, error } = await anon
      .from('service_listings')
      .select('id, freelancer_profiles!inner(profile_id, city, admin_hidden_at)')
      .eq('status', 'active')
      .is('admin_hidden_at', null)
      .is('freelancer_profiles.admin_hidden_at', null)
    expect(error).toBeNull()
    expect(data).toHaveLength(groundTruth ?? 0)
  })

  it('the service-detail/-single-row- shape resolves a real active listing', async () => {
    const { data: any1, error: anyErr } = await admin
      .from('service_listings').select('id').eq('status', 'active').limit(1).maybeSingle()
    expect(anyErr).toBeNull()
    if (!any1) return // nothing active in prod right now — nothing to prove

    const { data, error } = await anon
      .from('service_listings')
      .select('id, freelancer_profiles!inner ( id, profile_id, city, headline, admin_hidden_at )')
      .eq('id', any1.id)
      .eq('status', 'active')
      .is('admin_hidden_at', null)
      .is('freelancer_profiles.admin_hidden_at', null)
      .maybeSingle()
    expect(error).toBeNull()
    expect(data).not.toBeNull()
  })
})

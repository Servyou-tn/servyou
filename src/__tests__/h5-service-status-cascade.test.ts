/**
 * Live-DB proof for H5's central claim (founder ruling 1, PR body): pausing or deleting a
 * freelancer's LAST active service_listings row flips freelancer_profiles.is_published to false
 * via sync_freelancer_is_published — and does NOT flip it while another active listing remains.
 * Also proves the admin-moderation lock ServiceRow.tsx's `isModerated` gate depends on:
 * enforce_admin_moderation_lock blocks the OWNER from reactivating a row admin_hide_content
 * moderated, even though the same owner can freely toggle an ordinary (non-moderated) row.
 *
 * Pattern A (live-DB), mirroring d4-completed-project-count.test.ts. Service role for fixtures,
 * teardown, and the admin-hide step only — every status WRITE under test goes through the real
 * owner's own signed-in session, so RLS and the triggers run exactly as they would for a real
 * freelancer clicking the kebab.
 *
 * Run: npx vitest run src/__tests__/h5-service-status-cascade.test.ts
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
const EMAIL_PREFIX = 'h5-cascade-'
const OWNER_EMAIL = `${EMAIL_PREFIX}owner${EMAIL_SUFFIX}`
const ADMIN_EMAIL = `${EMAIL_PREFIX}admin${EMAIL_SUFFIX}`
const PASSWORD = 'H5-Cascade-Test-6q3!'

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
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
    user_metadata: { full_name: 'H5 Cascade Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
  return data.user.id
}

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${EMAIL_PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return

  // Same ON DELETE RESTRICT as d4-freelancer-services-visibility.test.ts's teardown — the admin
  // fixture here calls an audited RPC (admin_hide_content) too.
  const { error: auditErr } = await admin.from('admin_audit_log').delete().in('admin_id', ids)
  if (auditErr) throw new Error(`admin_audit_log cleanup failed: ${auditErr.message}`)

  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let ownerId: string
let adminId: string
let freelancerProfileId: string
let ownerClient: SupabaseClient
let adminClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  ownerId = await createUser(OWNER_EMAIL)
  adminId = await createUser(ADMIN_EMAIL)
  await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)

  const { data: profile, error: profileErr } = await admin
    .from('freelancer_profiles')
    .insert({ profile_id: ownerId })
    .select('id')
    .single()
  if (profileErr || !profile) throw new Error(`freelancer_profiles insert failed: ${profileErr?.message}`)
  freelancerProfileId = profile.id

  ownerClient = await signIn(OWNER_EMAIL)
  adminClient = await signIn(ADMIN_EMAIL)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

async function insertActiveListing(title: string): Promise<string> {
  const { data, error } = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: freelancerProfileId, title, starting_price_tnd: 50 })
    .select('id')
    .single()
  if (error || !data) throw new Error(`service_listings insert failed: ${error?.message}`)
  return data.id
}

async function isPublished(): Promise<boolean> {
  const { data, error } = await admin
    .from('freelancer_profiles')
    .select('is_published')
    .eq('id', freelancerProfileId)
    .single()
  if (error) throw new Error(`is_published read failed: ${error.message}`)
  return data.is_published
}

describe.skipIf(!hasCreds)('is_published cascade — pausing/reactivating the LAST active listing only', () => {
  it('pausing one of TWO active listings does NOT unpublish the profile', async () => {
    const svc1 = await insertActiveListing('H5 cascade test service 1')
    const svc2 = await insertActiveListing('H5 cascade test service 2')
    expect(await isPublished()).toBe(true)

    const { error } = await ownerClient.from('service_listings').update({ status: 'hidden' }).eq('id', svc1)
    expect(error).toBeNull()
    expect(await isPublished()).toBe(true) // svc2 is still active

    // Clean up this scenario's rows before the next `it` so activeCount stays predictable —
    // each scenario in this file owns its own listings.
    await admin.from('service_listings').delete().in('id', [svc1, svc2])
  })

  it('pausing the ONLY active listing flips is_published to false', async () => {
    const solo = await insertActiveListing('H5 cascade test solo service')
    expect(await isPublished()).toBe(true)

    const { error } = await ownerClient.from('service_listings').update({ status: 'hidden' }).eq('id', solo)
    expect(error).toBeNull()
    expect(await isPublished()).toBe(false)

    // Reactivating it flips the profile back — same trigger, the other direction.
    const { error: reactivateErr } = await ownerClient
      .from('service_listings')
      .update({ status: 'active' })
      .eq('id', solo)
    expect(reactivateErr).toBeNull()
    expect(await isPublished()).toBe(true)

    await admin.from('service_listings').delete().eq('id', solo)
  })
})

describe.skipIf(!hasCreds)('admin-moderation lock — the owner cannot reactivate a moderated row', () => {
  it('a self-paused (non-moderated) row: the owner CAN reactivate it', async () => {
    const svc = await insertActiveListing('H5 moderation test — self-pause')
    await admin.from('service_listings').update({ status: 'hidden' }).eq('id', svc)

    const { error } = await ownerClient.from('service_listings').update({ status: 'active' }).eq('id', svc)
    expect(error).toBeNull()

    await admin.from('service_listings').delete().eq('id', svc)
  })

  it('an admin-moderated row: the owner is BLOCKED from reactivating it — this is the write ServiceRow.tsx must never let fire', async () => {
    const svc = await insertActiveListing('H5 moderation test — admin-hidden')

    const { error: hideErr } = await adminClient.rpc('admin_hide_content', {
      target_type: 'service',
      target_id: svc,
      reason: 'H5 cascade test moderation',
    })
    expect(hideErr).toBeNull()

    const { data: row } = await admin
      .from('service_listings')
      .select('status, admin_hidden_at')
      .eq('id', svc)
      .single()
    expect(row?.status).toBe('hidden')
    expect(row?.admin_hidden_at).not.toBeNull()

    const { error } = await ownerClient.from('service_listings').update({ status: 'active' }).eq('id', svc)
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/admin-moderated/)

    // Confirm the row genuinely did not change — the block isn't just an error message with a
    // silent partial write.
    const { data: after } = await admin.from('service_listings').select('status').eq('id', svc).single()
    expect(after?.status).toBe('hidden')

    await adminClient.rpc('admin_unhide_content', { target_type: 'service', target_id: svc })
    await admin.from('service_listings').delete().eq('id', svc)
  })
})

describe.skipIf(!hasCreds)('admin_hide_content draft guard — a draft cannot be moderated into existence', () => {
  it('admin_hide_content on a draft raises the generic not-found error rather than hiding it', async () => {
    const { data, error: insertErr } = await admin
      .from('service_listings')
      .insert({
        freelancer_profile_id: freelancerProfileId,
        title: 'H5 draft guard test',
        starting_price_tnd: 50,
        status: 'draft',
      })
      .select('id')
      .single()
    if (insertErr || !data) throw new Error(`draft insert failed: ${insertErr?.message}`)
    const svc = data.id

    const { error } = await adminClient.rpc('admin_hide_content', {
      target_type: 'service',
      target_id: svc,
      reason: 'H5 draft guard test',
    })
    expect(error).not.toBeNull()
    expect(error?.message).toMatch(/not found or already moderated/)

    // Confirm the row genuinely never moved — same "not just an error message" bar as the
    // moderation-lock test above.
    const { data: after } = await admin
      .from('service_listings')
      .select('status, admin_hidden_at')
      .eq('id', svc)
      .single()
    expect(after?.status).toBe('draft')
    expect(after?.admin_hidden_at).toBeNull()

    await admin.from('service_listings').delete().eq('id', svc)
  })
})

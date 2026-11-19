/**
 * Live proof of the two-step sign-up's database side, DB-2 (db/migrations/PENDING_two_step_signup_db2.sql; plan
 * docs/follow-ups/two-step-signup-plan.md « DB-2 », and docs/follow-ups/two-step-signup-db.md §3). RED until the
 * architect applies the migration.
 *
 * Covered:
 *   - creation:
 *       · a sign-up confirmed LATER with the full profile (a squatter's /signup) is INCOMPLETE. That is H1;
 *       · an account the service role creates already confirmed, with the full profile, is complete under
 *         « cree-par-le-service ». GoTrue inserts it unconfirmed and confirms it in the same transaction;
 *       · under 16 it is incomplete even then;
 *   - the write gate on an incomplete account (an e-mail-link session), on a sample of the 28 gated tables: writes are
 *     refused with the hint account_incomplete on profiles, notification_preferences, favorites, reports and job_posts.
 *     The INSERTs into deletion_requests and data_exports are refused too (decision 5): their trigger gains INSERT in
 *     DB-2, while a SUSPENDED user can still file them (suspension D3, proved by suspension-enforcement);
 *   - complete_my_account still passes from that session, and afterwards the same write passes;
 *   - every write needs a live session. Once a session is signed out, its still-valid access token is refused
 *     (session_ended), while the account's other session still writes.
 * Not here (the PENDING file's rolled-back check proves them with simulated claims):
 *   - a token with no session_id;
 *   - an ended session writing through a SECURITY DEFINER RPC;
 *   - the 7-day purge.
 *
 * Fixtures (`tsdb2-`, test domain, random passwords), deleted in afterAll, then counted. 3 fixture verifications.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/two-step-signup-db2-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { fixtureSignIn } from './fixture-session'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'tsdb2-'
const RUN = randomUUID().slice(0, 8)
const email = (local: string) => `${PREFIX}${local}-${RUN}@rls-smoke.servyou.invalid`
const INCOMPLETE = email('incomplete')
const LEGACY = email('legacy')
const SERVICE = email('service')
const YOUNG = email('young')
const COMPLETE = email('complete')
// Mirror the migration: private.current_terms_version(), and the D1 label for accounts complete at creation.
const TERMS_VERSION = 'cgu-2026-06-17+confidentialite-2026-11-14'
const SERVICE_LABEL = 'cree-par-le-service'
const STEP1 = { full_name: 'Tsdb2 Step One', language: 'fr' }
const FULL = { full_name: 'Tsdb2 Full Profile', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' }
const VALID = { p_full_name: 'Tsdb2 Completed', p_date_of_birth: '1990-05-05', p_city: 'Sousse', p_terms_version: TERMS_VERSION }

// 15 years before today (UTC): under 16 whatever day the suite runs.
const UNDER_16_DOB = (() => {
  const d = new Date()
  d.setUTCFullYear(d.getUTCFullYear() - 15)
  return d.toISOString().slice(0, 10)
})()

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin = hasCreds ? createClient(url, serviceKey, opts) : null
const anon = (): SupabaseClient => createClient(url, anonKey, opts)

type Profile = { id: string; completed_at: string | null; terms_version: string | null; language: string }

async function profileOf(address: string): Promise<Profile> {
  const { data, error } = await admin!
    .from('profiles')
    .select('id, completed_at, terms_version, language')
    .eq('email', address)
    .single()
  if (error) throw new Error(`profile lookup failed: ${error.message} (${error.code})`)
  return data as Profile
}

// Redeems a freshly minted link the way the e-mailed one is redeemed: the client gets an amr-otp session.
async function linkSession(client: SupabaseClient, address: string): Promise<void> {
  const { data, error } = await admin!.auth.admin.generateLink({ type: 'magiclink', email: address })
  if (error || !data.properties?.hashed_token) throw new Error(`generateLink: ${error?.message ?? 'no hashed_token'}`)
  const { error: verifyErr } = await client.auth.verifyOtp({ type: 'email', token_hash: data.properties.hashed_token })
  if (verifyErr) throw new Error(`verifyOtp: ${verifyErr.message}`)
}

async function createConfirmed(address: string, metadata: Record<string, string>): Promise<void> {
  const { error } = await admin!.auth.admin.createUser({
    email: address,
    password: `Tf-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (error) throw new Error(`createUser ${address}: ${error.message}`)
}

async function teardown(): Promise<void> {
  const { data, error } = await admin!.from('profiles').select('id').like('email', `${PREFIX}%@rls-smoke.servyou.invalid`)
  if (error) throw new Error(`teardown lookup failed: ${error.message} (${error.code})`)
  for (const { id } of data ?? []) {
    const { error: delErr } = await admin!.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

const incomplete = hasCreds ? anon() : (null as unknown as SupabaseClient)
const completeA = hasCreds ? anon() : (null as unknown as SupabaseClient)
const completeB = hasCreds ? anon() : (null as unknown as SupabaseClient)
let incompleteId = ''
let completeId = ''

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  // Step 1 as the form does it: name and e-mail only (a magic link creates the account).
  const { error: incErr } = await admin!.auth.admin.generateLink({ type: 'magiclink', email: INCOMPLETE, options: { data: STEP1 } })
  if (incErr) throw new Error(`generateLink incomplete: ${incErr.message}`)
  // A squatter's /signup with the full profile: unconfirmed until someone opens the link.
  const { error: legErr } = await admin!.auth.admin.generateLink({
    type: 'signup',
    email: LEGACY,
    password: `Lg-${randomUUID()}-Aa1!`,
    options: { data: FULL },
  })
  if (legErr) throw new Error(`generateLink legacy: ${legErr.message}`)
  await createConfirmed(SERVICE, FULL)
  await createConfirmed(YOUNG, { ...FULL, date_of_birth: UNDER_16_DOB })
  await createConfirmed(COMPLETE, FULL)

  await linkSession(incomplete, INCOMPLETE)
  for (const client of [completeA, completeB]) {
    const { error } = await fixtureSignIn(client, COMPLETE)
    if (error) throw new Error(`fixtureSignIn complete: ${error.message}`)
  }
  incompleteId = (await profileOf(INCOMPLETE)).id
  completeId = (await profileOf(COMPLETE)).id
}, 90000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin!.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%@rls-smoke.servyou.invalid`)
  if (error) throw new Error(`cleanup check failed: ${error.message} (${error.code})`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 60000)

describe.skipIf(!hasCreds)('profile creation (handle_new_user + on_auth_user_confirmed_at_creation)', () => {
  it('a sign-up with the full profile, confirmed later, is incomplete (H1)', async () => {
    const profile = await profileOf(LEGACY)
    expect(profile.completed_at).toBeNull()
    expect(profile.terms_version).toBeNull()
  })

  it('an account the service role creates confirmed with the full profile is complete, under its own label', async () => {
    const profile = await profileOf(SERVICE)
    expect(profile.completed_at).not.toBeNull()
    expect(profile.terms_version).toBe(SERVICE_LABEL)
  })

  it('under 16, even a confirmed service-role account starts incomplete', async () => {
    expect((await profileOf(YOUNG)).completed_at).toBeNull()
  })

  it('a step-1 account (name and e-mail) is incomplete', async () => {
    expect((await profileOf(INCOMPLETE)).completed_at).toBeNull()
  })
})

// The tests below run in order on the same accounts.
describe.skipIf(!hasCreds)('the write gate', () => {
  it("refuses an incomplete account's writes (account_incomplete), deletion and export requests included", async () => {
    const attempts: [string, () => PromiseLike<{ error: { code?: string; hint?: string | null } | null }>][] = [
      ['profiles', () => incomplete.from('profiles').update({ language: 'ar' }).eq('id', incompleteId)],
      ['notification_preferences', () => incomplete.from('notification_preferences').insert({ profile_id: incompleteId, email_newsletter: true })],
      ['favorites', () => incomplete.from('favorites').insert({ user_id: incompleteId, item_type: 'product', product_id: randomUUID() })],
      ['reports', () => incomplete.from('reports').insert({ reporter_id: incompleteId, target_type: 'user', target_id: randomUUID(), reason: 'other', description: 'tsdb2 gate check' })],
      ['job_posts', () => incomplete.from('job_posts').insert({ consumer_id: incompleteId, title: 'Tsdb2 gate check', description: 'Tsdb2 gate check, never stored.', status: 'open' })],
      ['deletion_requests', () => incomplete.from('deletion_requests').insert({ user_id: incompleteId, reason: 'tsdb2 gate check' })],
      ['data_exports', () => incomplete.from('data_exports').insert({ user_id: incompleteId })],
    ]
    for (const [table, attempt] of attempts) {
      const { error } = await attempt()
      expect(error?.code, table).toBe('42501')
      expect(error?.hint, table).toBe('account_incomplete')
    }
    expect((await profileOf(INCOMPLETE)).language).toBe('fr')
  })

  it('complete_my_account still passes from the link session, and the same write then goes through', async () => {
    const { error: outErr } = await incomplete.auth.signOut({ scope: 'others' })
    expect(outErr).toBeNull()
    const { error: pwErr } = await incomplete.auth.updateUser({ password: `Ic-${randomUUID()}-Bb2!` })
    expect(pwErr).toBeNull()
    const { error } = await incomplete.rpc('complete_my_account', VALID)
    expect(error).toBeNull()
    const profile = await profileOf(INCOMPLETE)
    expect(profile.completed_at).not.toBeNull()
    expect(profile.terms_version).toBe(TERMS_VERSION)

    const { error: writeErr } = await incomplete.from('profiles').update({ language: 'ar' }).eq('id', incompleteId)
    expect(writeErr).toBeNull()
    expect((await profileOf(INCOMPLETE)).language).toBe('ar')
  })

  it('a signed-out session can no longer write (session_ended); the live one still can', async () => {
    // B's access token stays a valid JWT (autoRefreshToken is off), but its session row is gone.
    const { error: outErr } = await completeA.auth.signOut({ scope: 'others' })
    expect(outErr).toBeNull()
    const { error: staleErr } = await completeB.from('profiles').update({ language: 'en' }).eq('id', completeId)
    expect(staleErr?.code).toBe('42501')
    expect(staleErr?.hint).toBe('session_ended')
    expect((await profileOf(COMPLETE)).language).toBe('fr')

    const { error: liveErr } = await completeA.from('profiles').update({ language: 'ar' }).eq('id', completeId)
    expect(liveErr).toBeNull()
    expect((await profileOf(COMPLETE)).language).toBe('ar')
  })
})

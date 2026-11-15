/**
 * Live proof of the two-step sign-up's database side, DB-1 (db/migrations/PENDING_two_step_signup.sql; founder decisions
 * of 2026-11-15 in docs/follow-ups/two-step-signup-plan.md). RED until the architect applies the migration.
 *
 * Covered:
 *   - a sign-up without a birth date now creates an INCOMPLETE profile (it used to fail the whole Auth insert);
 *   - a sign-up with the full profile, and a service-role fixture, are complete at creation (the transitional rule),
 *     terms « avant 2026-11 »;
 *   - complete_my_account, from a session opened by an e-mailed link (amr otp):
 *       · refuses until a password was set during that session; a password set when the account was created (the
 *         squatter's, through /signup) never counts;
 *       · refuses under 16, an invalid birth date, a blank name or city, missing or outdated terms;
 *       · completes the profile, records the terms, and ends the account's other sessions;
 *       · refuses a second time (already complete);
 *   - the client can write none of the completion columns, nor the birth date; anon cannot call the RPC.
 * Not here: a PASSWORD session is refused. A test cannot sign in with a password while CAPTCHA is ON, so the PENDING
 * file's rolled-back check proves it with simulated claims.
 *
 * Fixtures (`tsdb-`, test domain, random passwords), deleted in afterAll, then counted. 3 fixture verifications.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/two-step-signup-db-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'tsdb-'
const RUN = randomUUID().slice(0, 8)
const email = (local: string) => `${PREFIX}${local}-${RUN}@rls-smoke.servyou.invalid`
const FRESH = email('fresh')
const SQUATTED = email('squatted')
const LEGACY = email('legacy')
const FIXTURE = email('fixture')
// Mirrors private.current_terms_version(); bump both together.
const TERMS_VERSION = 'cgu-2026-06-17+confidentialite-2026-11-14'
const STEP1 = { full_name: 'Tsdb Step One', language: 'fr' }
const FULL = { full_name: 'Tsdb Full Profile', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' }
const VALID = { p_full_name: 'Tsdb Completed', p_date_of_birth: '1990-05-05', p_city: 'Sousse', p_terms_version: TERMS_VERSION }

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin = hasCreds ? createClient(url, serviceKey, opts) : null
const anon = (): SupabaseClient => createClient(url, anonKey, opts)

type Profile = {
  id: string
  date_of_birth: string | null
  city: string | null
  full_name: string
  completed_at: string | null
  terms_accepted_at: string | null
  terms_version: string | null
}

async function profileOf(address: string): Promise<Profile> {
  const { data, error } = await admin!
    .from('profiles')
    .select('id, date_of_birth, city, full_name, completed_at, terms_accepted_at, terms_version')
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

async function complete(client: SupabaseClient, overrides: Partial<typeof VALID> = {}) {
  return client.rpc('complete_my_account', { ...VALID, ...overrides })
}

async function teardown(): Promise<void> {
  const { data, error } = await admin!.from('profiles').select('id').like('email', `${PREFIX}%`)
  if (error) throw new Error(`teardown lookup failed: ${error.message} (${error.code})`)
  for (const { id } of data ?? []) {
    const { error: delErr } = await admin!.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

const fresh = hasCreds ? anon() : (null as unknown as SupabaseClient)
const freshOther = hasCreds ? anon() : (null as unknown as SupabaseClient)
const squatted = hasCreds ? anon() : (null as unknown as SupabaseClient)

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  // Step 1 as the new form does it: name and e-mail only (a magic link creates the account).
  const { error: freshErr } = await admin!.auth.admin.generateLink({ type: 'magiclink', email: FRESH, options: { data: STEP1 } })
  if (freshErr) throw new Error(`generateLink fresh: ${freshErr.message}`)
  // A squatter's /signup: someone else's e-mail, the squatter's password, no birth date.
  const { error: squatErr } = await admin!.auth.admin.generateLink({
    type: 'signup',
    email: SQUATTED,
    password: `Sq-${randomUUID()}-Aa1!`,
    options: { data: STEP1 },
  })
  if (squatErr) throw new Error(`generateLink squatted: ${squatErr.message}`)
  // Today's form: an unconfirmed sign-up with the full profile.
  const { error: legacyErr } = await admin!.auth.admin.generateLink({
    type: 'signup',
    email: LEGACY,
    password: `Lg-${randomUUID()}-Aa1!`,
    options: { data: FULL },
  })
  if (legacyErr) throw new Error(`generateLink legacy: ${legacyErr.message}`)
  // A service-role fixture, as the 64 live suites create theirs.
  const { error: fixtureErr } = await admin!.auth.admin.createUser({
    email: FIXTURE,
    password: `Fx-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: FULL,
  })
  if (fixtureErr) throw new Error(`createUser fixture: ${fixtureErr.message}`)

  await linkSession(fresh, FRESH)
  await linkSession(freshOther, FRESH)
  await linkSession(squatted, SQUATTED)
}, 90000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin!.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%`)
  if (error) throw new Error(`cleanup check failed: ${error.message} (${error.code})`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 60000)

describe.skipIf(!hasCreds)('profile creation (handle_new_user)', () => {
  it('a sign-up without a birth date creates an incomplete profile', async () => {
    const profile = await profileOf(FRESH)
    expect(profile.date_of_birth).toBeNull()
    expect(profile.completed_at).toBeNull()
    expect(profile.terms_version).toBeNull()
  })

  it('a sign-up with the full profile and a service-role fixture are complete at creation', async () => {
    for (const address of [LEGACY, FIXTURE]) {
      const profile = await profileOf(address)
      expect(profile.completed_at).not.toBeNull()
      expect(profile.terms_accepted_at).not.toBeNull()
      expect(profile.terms_version).toBe('avant 2026-11')
      expect(profile.date_of_birth).toBe('1990-01-01')
    }
  })
})

describe.skipIf(!hasCreds)('complete_my_account', () => {
  it('refuses before a password was set in the session', async () => {
    const { error } = await complete(fresh)
    expect(error?.hint).toBe('password_required')
  })

  it("never counts the password chosen when the account was created (the squatter's)", async () => {
    const { error } = await complete(squatted)
    expect(error?.hint).toBe('password_required')

    const { error: pwErr } = await squatted.auth.updateUser({ password: `Ow-${randomUUID()}-Bb2!` })
    expect(pwErr).toBeNull()
    const { error: done } = await complete(squatted)
    expect(done).toBeNull()
    expect((await profileOf(SQUATTED)).completed_at).not.toBeNull()
  })

  it('refuses an invalid step 2, each with its hint', async () => {
    const { error: pwErr } = await fresh.auth.updateUser({ password: `Fr-${randomUUID()}-Bb2!` })
    expect(pwErr).toBeNull()
    const cases: [Partial<typeof VALID>, string][] = [
      [{ p_date_of_birth: '2016-01-01' }, 'too_young'],
      [{ p_date_of_birth: '2099-01-01' }, 'birth_date_invalid'],
      [{ p_date_of_birth: '1899-12-31' }, 'birth_date_invalid'],
      [{ p_full_name: ' x ' }, 'name_invalid'],
      [{ p_city: '   ' }, 'city_required'],
      [{ p_terms_version: 'cgu-ancienne' }, 'terms_outdated'],
    ]
    for (const [overrides, hint] of cases) {
      const { error } = await complete(fresh, overrides)
      expect(error?.hint, JSON.stringify(overrides)).toBe(hint)
    }
    const { error: noTerms } = await fresh.rpc('complete_my_account', { ...VALID, p_terms_version: null as unknown as string })
    expect(noTerms?.hint).toBe('terms_required')
    expect((await profileOf(FRESH)).completed_at).toBeNull()
  })

  it('the client writes none of the completion columns, nor the birth date', async () => {
    for (const change of [{ completed_at: new Date().toISOString() }, { terms_version: TERMS_VERSION }, { date_of_birth: '1990-01-01' }]) {
      const { error } = await fresh.from('profiles').update(change).eq('id', (await profileOf(FRESH)).id)
      expect(error?.code, JSON.stringify(change)).toBe('42501')
    }
  })

  it('completes the profile, records the terms, and ends the other sessions', async () => {
    const { error } = await complete(fresh)
    expect(error).toBeNull()
    const profile = await profileOf(FRESH)
    expect(profile.completed_at).not.toBeNull()
    expect(profile.terms_accepted_at).not.toBeNull()
    expect(profile.terms_version).toBe(TERMS_VERSION)
    expect(profile.date_of_birth).toBe(VALID.p_date_of_birth)
    expect(profile.city).toBe(VALID.p_city)
    expect(profile.full_name).toBe(VALID.p_full_name)

    // The account's other session (opened by a second link) can no longer refresh.
    const { error: refreshErr } = await freshOther.auth.refreshSession()
    expect(refreshErr).not.toBeNull()
  })

  it('refuses a second completion', async () => {
    const { error } = await complete(fresh)
    expect(error?.hint).toBe('already_complete')
  })

  it('anon cannot call it', async () => {
    const { error } = await anon().rpc('complete_my_account', VALID)
    expect(error?.code).toBe('42501')
  })
})

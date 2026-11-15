/**
 * Live proof of the Supabase Auth behaviour the two-step sign-up relies on (docs/follow-ups/two-step-signup-plan.md,
 * section 6; founder decisions of 2026-11-15). Runs against production Auth with « Confirm email », CAPTCHA, « Secure
 * password change » and « Require current password » all ON (decision 9). If Supabase changes any of this, the
 * completion RPC (db/migrations/PENDING_two_step_signup.sql) must be revisited: this suite says what it relies on.
 *
 * No mail is sent: every link is minted with the admin API (generateLink), then redeemed by the fixture's own anon
 * client with verifyOtp, exactly what clicking the e-mailed link does (POST /verify, not CAPTCHA-checked). The custom
 * SMTP (Brevo) arrives on domain day; the mail itself is checked then.
 *
 * Observed on 2026-11-15 and asserted here:
 *   1. every e-mail path records the `amr` method `otp`: the new-account link, the sign-in link, the e-mail code and the
 *      reset link. A password sign-in records `password` (production data; a test cannot sign in with a password while
 *      CAPTCHA is ON). The completion RPC accepts `otp` only;
 *   2. THE SQUATTED ACCOUNT: an account created through /signup with someone else's password (generateLink type
 *      'signup' creates it the same way: unconfirmed, with that password), once confirmed by the inbox owner, lets the
 *      owner set their own password from the link session with NO current password, « Require current password »
 *      ON. No lockout;
 *   3. a new account's link is a `signup` link (the « Confirm signup » template), an existing account's a `magiclink`
 *      link (the « Magic Link » template); verifyOtp type 'email' redeems both;
 *   plus a new passwordless account sets its first password from its link session, and signOut({ scope: 'others' })
 *   from a link session ends the account's other sessions while keeping the caller's (step 2 does that first).
 *
 * Fixtures (`tssa-`, test domain, random passwords): three users, deleted in afterAll, then counted. 5 fixture
 * verifications (the sign-in budget counts /verify calls).
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/two-step-signup-auth-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'tssa-'
const RUN = randomUUID().slice(0, 8)
const email = (local: string) => `${PREFIX}${local}-${RUN}@rls-smoke.servyou.invalid`
const NEW_ACCOUNT = email('new')
const EXISTING = email('existing')
const SQUATTED = email('squatted')
// Every fixture carries the full metadata, so it is a complete account whatever handle_new_user's version.
const METADATA = { full_name: 'Two Step Spike', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' }

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin = hasCreds ? createClient(url, serviceKey, opts) : null
const anon = (): SupabaseClient => createClient(url, anonKey, opts)

// The access token's `amr` claim: the methods this session was authenticated with.
function amrMethods(accessToken: string): string[] {
  const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8')) as {
    amr?: { method: string }[]
  }
  return (payload.amr ?? []).map((entry) => entry.method)
}

// Redeems a link the way the e-mailed one is redeemed, and returns the session's amr methods.
async function redeem(client: SupabaseClient, params: Parameters<SupabaseClient['auth']['verifyOtp']>[0]): Promise<string[]> {
  const { data, error } = await client.auth.verifyOtp(params)
  if (error || !data.session) throw new Error(`verifyOtp: ${error?.message ?? 'no session'}`)
  return amrMethods(data.session.access_token)
}

async function teardown(): Promise<void> {
  const { data, error } = await admin!.from('profiles').select('id').like('email', `${PREFIX}%@rls-smoke.servyou.invalid`)
  if (error) throw new Error(`teardown lookup failed: ${error.message} (${error.code})`)
  for (const { id } of data ?? []) {
    const { error: delErr } = await admin!.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { error } = await admin!.auth.admin.createUser({
    email: EXISTING,
    password: `Ts-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: METADATA,
  })
  if (error) throw new Error(`createUser failed: ${error.message}`)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin!.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%@rls-smoke.servyou.invalid`)
  if (error) throw new Error(`cleanup check failed: ${error.message} (${error.code})`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 60000)

describe.skipIf(!hasCreds)('two-step sign-up: the Auth behaviour it relies on', () => {
  it('the owner of a squatted account sets their own password from the link, with no current password', async () => {
    // The squatter: an unconfirmed account for someone else's e-mail, with the squatter's password.
    const { data: link, error: linkErr } = await admin!.auth.admin.generateLink({
      type: 'signup',
      email: SQUATTED,
      password: `Sq-${randomUUID()}-Aa1!`,
      options: { data: METADATA },
    })
    expect(linkErr).toBeNull()
    expect(link?.properties?.verification_type).toBe('signup')
    expect(link?.user?.email_confirmed_at ?? null).toBeNull()

    // The owner clicks the confirmation link, then sets a password without knowing the squatter's.
    const owner = anon()
    expect(await redeem(owner, { type: 'email', token_hash: link!.properties!.hashed_token })).toEqual(['otp'])
    const { error: updateErr } = await owner.auth.updateUser({ password: `Ow-${randomUUID()}-Bb2!` })
    expect(updateErr).toBeNull()
  })

  it('a new account gets a signup link (amr otp) and sets its first password from that session', async () => {
    const { data: link, error: linkErr } = await admin!.auth.admin.generateLink({
      type: 'magiclink',
      email: NEW_ACCOUNT,
      options: { data: METADATA },
    })
    expect(linkErr).toBeNull()
    expect(link?.properties?.verification_type).toBe('signup')

    const user = anon()
    expect(await redeem(user, { type: 'email', token_hash: link!.properties!.hashed_token })).toEqual(['otp'])
    const { error: updateErr } = await user.auth.updateUser({ password: `Nw-${randomUUID()}-Bb2!` })
    expect(updateErr).toBeNull()
  })

  it('an existing account: a sign-in link, an e-mail code and a reset link all record amr otp', async () => {
    const viaLink = anon()
    const viaCode = anon()
    const viaReset = anon()
    const { data: magic, error: magicErr } = await admin!.auth.admin.generateLink({ type: 'magiclink', email: EXISTING })
    expect(magicErr).toBeNull()
    expect(magic?.properties?.verification_type).toBe('magiclink')
    expect(await redeem(viaLink, { type: 'email', token_hash: magic!.properties!.hashed_token })).toEqual(['otp'])

    const { data: code, error: codeErr } = await admin!.auth.admin.generateLink({ type: 'magiclink', email: EXISTING })
    expect(codeErr).toBeNull()
    expect(await redeem(viaCode, { type: 'email', email: EXISTING, token: code!.properties!.email_otp })).toEqual(['otp'])

    const { data: recovery, error: recoveryErr } = await admin!.auth.admin.generateLink({ type: 'recovery', email: EXISTING })
    expect(recoveryErr).toBeNull()
    expect(await redeem(viaReset, { type: 'recovery', token_hash: recovery!.properties!.hashed_token })).toEqual(['otp'])

    // Step 2 first ends the account's other sessions (complete_my_account refuses while one is alive): GoTrue's
    // signOut with scope 'others' does it from a link session, and the caller keeps its own.
    const { error: outErr } = await viaLink.auth.signOut({ scope: 'others' })
    expect(outErr).toBeNull()
    expect((await viaCode.auth.refreshSession()).error).not.toBeNull()
    expect((await viaReset.auth.refreshSession()).error).not.toBeNull()
    expect((await viaLink.auth.refreshSession()).error).toBeNull()
  })
})

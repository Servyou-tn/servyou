/**
 * Live proof that the password-RESET flow keeps working once « Secure password change » is ON in Supabase Auth
 * (pre-beta review M1). That setting makes updateUser({ password }) demand a recent sign-in or a reauthentication
 * nonce; a recovery-link session is recent by construction, so the reset link must still be able to set a new
 * password. The fixture sign-in here IS that recovery path: admin generateLink(type 'recovery') + the user's own
 * verifyOtp(token_hash) — exactly what the emailed link does.
 *
 * The other half — Mon compte's change-password, which re-checks the current password with signInWithPassword — needs
 * a real Turnstile token for the production CAPTCHA, so it is covered by the mocked suite
 * (src/app/mon-compte/actions.test.ts), not here.
 *
 * Fixture (`pw-reset-`, password random per run): one user. Deleting it removes it. 1 fixture sign-in.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/password-reset-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { fixtureSignIn } from './fixture-session'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'pw-reset-'
const EMAIL = `${PREFIX}user@rls-smoke.servyou.invalid`
const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin = hasCreds ? createClient(url, serviceKey, opts) : null

async function teardown(): Promise<void> {
  const { data, error } = await admin!.from('profiles').select('id').like('email', `${PREFIX}%`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const { id } of data ?? []) {
    const { error: delErr } = await admin!.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { error } = await admin!.auth.admin.createUser({
    email: EMAIL,
    password: `Pr-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: 'Password Reset Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error) throw new Error(`createUser failed: ${error.message}`)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin!.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 60000)

describe.skipIf(!hasCreds)('the reset link can still set a new password', () => {
  it('a recovery-link session sets a new password with no reauthentication error', async () => {
    const client = createClient(url, anonKey, opts)
    const { error: signErr } = await fixtureSignIn(client, EMAIL)
    expect(signErr).toBeNull()

    const { data, error } = await client.auth.updateUser({ password: `New-${randomUUID()}-Bb2!` })
    expect(error).toBeNull()
    expect(data.user?.email).toBe(EMAIL)
  })
})

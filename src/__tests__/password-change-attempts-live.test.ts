/**
 * Live proof for db/migrations/20261031211307_password_change_attempts.sql (#111) and src/lib/auth/password-attempts.ts — at most 5
 * wrong current-password attempts per account per 15 minutes on Mon compte's password change (pre-beta review M1):
 *   * the real reservePasswordAttempt (service role): 5 attempts pass, the 6th is blocked and leaves no row behind
 *     (a refused attempt does not extend the lockout); releasing one frees a slot;
 *   * the table is service-role only: a signed-in user can neither read nor write it (42501).
 *
 * Fixture (`pw-att-`, password random per run): one user. Its attempt rows cascade with it. 1 fixture sign-in.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/password-change-attempts-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { reservePasswordAttempt, releasePasswordAttempt, PASSWORD_ATTEMPT_LIMIT } from '@/lib/auth/password-attempts'
import { fixtureSignIn } from './fixture-session'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'pw-att-'
const EMAIL = `${PREFIX}user@rls-smoke.servyou.invalid`
const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: SupabaseClient | null = hasCreds ? createClient(url, serviceKey, opts) : null

async function teardown(): Promise<void> {
  const { data, error } = await admin!.from('profiles').select('id').like('email', `${PREFIX}%`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const { id } of data ?? []) {
    const { error: delErr } = await admin!.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

async function rows(userId: string): Promise<number> {
  const { count, error } = await admin!.from('password_change_attempts').select('id', { count: 'exact', head: true }).eq('user_id', userId)
  if (error) throw new Error(`count failed: ${error.message}`)
  return count ?? 0
}

let userId: string

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { data, error } = await admin!.auth.admin.createUser({
    email: EMAIL,
    password: `Pa-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: 'Password Attempts Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  userId = data.user.id
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin!.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 60000)

describe.skipIf(!hasCreds)('reservePasswordAttempt — 5 per account per 15 minutes', () => {
  it('5 attempts pass; the 6th is blocked and leaves no row behind', async () => {
    for (let i = 0; i < PASSWORD_ATTEMPT_LIMIT; i++) {
      expect(await reservePasswordAttempt(userId)).toMatchObject({ ok: true, blocked: false })
    }
    expect(await rows(userId)).toBe(PASSWORD_ATTEMPT_LIMIT)

    expect(await reservePasswordAttempt(userId)).toMatchObject({ ok: true, blocked: true })
    expect(await rows(userId)).toBe(PASSWORD_ATTEMPT_LIMIT)
  })

  it('a released attempt frees its slot', async () => {
    const { data, error } = await admin!.from('password_change_attempts').select('id').eq('user_id', userId).limit(1).single()
    expect(error).toBeNull()
    await releasePasswordAttempt((data as { id: string }).id)
    expect(await reservePasswordAttempt(userId)).toMatchObject({ ok: true, blocked: false })
  })
})

describe.skipIf(!hasCreds)('password_change_attempts is service-role only', () => {
  it('a signed-in user can neither read nor write it', async () => {
    const user = createClient(url, anonKey, opts)
    const { error: signErr } = await fixtureSignIn(user, EMAIL)
    if (signErr) throw new Error(`signIn failed: ${signErr.message}`)

    expect((await user.from('password_change_attempts').select('id')).error?.code).toBe('42501')
    expect((await user.from('password_change_attempts').insert({ user_id: userId })).error?.code).toBe('42501')
    expect((await user.from('password_change_attempts').delete().eq('user_id', userId)).error?.code).toBe('42501')
  })
})

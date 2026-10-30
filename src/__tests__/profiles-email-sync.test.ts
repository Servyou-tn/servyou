/**
 * Live-DB proof for db/migrations/20261027215609_profiles_email_sync.sql — profiles.email follows a confirmed
 * auth.users.email change (trigger on_auth_user_email_changed → sync_profile_email()).
 *
 * The confirmed change is driven through the Auth admin API (updateUserById with email_confirm), which
 * writes auth.users.email the same way the second confirmation link of « Secure email change » does. The
 * user-facing double-confirmation flow needs two real inboxes and is not automatable here (and a request to
 * an undeliverable address would still send mail). An unconfirmed request never writes auth.users.email
 * (it sits in email_change), so the trigger cannot fire on it.
 *
 * Fixtures (all `email-sync-`, password random per run): one user. Teardown matches the prefix, which the
 * renamed address keeps.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/profiles-email-sync.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { fixtureSignIn } from './fixture-session'

type Client = SupabaseClient<Database>

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'email-sync-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Es-${randomUUID()}-Aa1!`
const ORIGINAL = `${PREFIX}user-${RUN}${EMAIL_SUFFIX}`
const RENAMED = `${PREFIX}renamed-${RUN}${EMAIL_SUFFIX}`

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const { id } of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

async function profileEmail(id: string): Promise<string | null> {
  const { data, error } = await admin.from('profiles').select('email').eq('id', id).single()
  if (error) throw new Error(`profiles read failed: ${error.message}`)
  return data.email
}

let userId: string

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { data, error } = await admin.auth.admin.createUser({
    email: ORIGINAL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Email Sync Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  userId = data.user.id
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 60000)

describe.skipIf(!hasCreds)('profiles.email follows auth.users.email', () => {
  it('ground truth: signup copied the address (handle_new_user)', async () => {
    expect(await profileEmail(userId)).toBe(ORIGINAL)
  })

  it('a confirmed change is copied into profiles.email', async () => {
    const { error } = await admin.auth.admin.updateUserById(userId, { email: RENAMED, email_confirm: true })
    expect(error).toBeNull()
    const { data } = await admin.auth.admin.getUserById(userId)
    expect(data.user?.email).toBe(RENAMED)
    expect(await profileEmail(userId)).toBe(RENAMED)
  })

  // Proves the observable contract only: profiles is not rewritten on sign-in. It does not isolate the trigger's
  // WHEN clause — the function's own `email is distinct from` guard would also make that a 0-row no-op.
  it('a sign-in (auth.users rewritten, email unchanged) leaves profiles unchanged', async () => {
    const { data: before } = await admin.from('profiles').select('updated_at').eq('id', userId).single()
    const client = createClient<Database>(url, anonKey, opts)
    const { error } = await fixtureSignIn(client, RENAMED)
    expect(error).toBeNull()
    const { data: after } = await admin.from('profiles').select('updated_at').eq('id', userId).single()
    expect(after?.updated_at).toBe(before?.updated_at)
  })
})

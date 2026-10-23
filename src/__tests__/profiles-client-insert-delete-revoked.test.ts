/**
 * Live-DB proof for db/migrations/20261023170907_profiles_revoke_client_insert_delete.sql — the
 * CRITICAL self-admin hotfix.
 *
 * Before it, a signed-in user could DELETE their own profiles row and re-INSERT it with
 * is_admin = true: the guard triggers (admin-marker lock, seller age gate) are BEFORE UPDATE only.
 * The migration revoked INSERT/DELETE/TRUNCATE from anon + authenticated and dropped the two
 * own-row policies. This file proves:
 *   * the delete half is refused (42501) and the row survives;
 *   * the re-insert half is refused on its own — tested against a user whose profile the service
 *     role has removed, i.e. exactly the state the delete half used to produce — so is_admin()
 *     stays false;
 *   * anon is refused both;
 *   * nothing legitimate broke: a new auth user still gets its profile from handle_new_user
 *     (SECURITY DEFINER), the owner can still UPDATE their own row, and deleting the auth user
 *     still cascades the profile away (the FK action runs as the table owner).
 *
 * Signup is exercised through admin.auth.admin.createUser: it inserts into auth.users, which fires
 * the same AFTER INSERT trigger (on_auth_user_created) as a public signUp, without sending mail to
 * an .invalid address.
 *
 * Pattern A (live-DB). Service role for fixtures, ground truth and teardown only.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/profiles-client-insert-delete-revoked.test.ts
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

const PREFIX = 'prof-revoke-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PASSWORD = 'Profiles-Revoke-Test-3m9!' // ephemeral test users only; never a real account
const METADATA = { full_name: 'Profiles Revoke Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' }

// PostgREST surfaces a missing table privilege as Postgres insufficient_privilege.
const PERMISSION_DENIED = '42501'

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)
const anon: SupabaseClient = hasCreds
  ? createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

async function signIn(local: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email: email(local), password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: METADATA,
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

async function profileRow(id: string) {
  const { data, error } = await admin.from('profiles').select('id, is_admin, full_name').eq('id', id).maybeSingle()
  if (error) throw new Error(`profile lookup failed: ${error.message}`)
  return data
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// Users are found through profiles — auth.admin.listUsers currently fails on this project
// ("Database error finding users", logged in docs/follow-ups.md). The orphan has no profiles row by
// design, so it is deleted by id; its email is unique per run so a crashed run's orphan can never
// block the next run's createUser (and is reaped with every other @rls-smoke user).
async function teardown(extraIds: string[] = []): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = [...(data ?? []).map((row) => row.id as string), ...extraIds]
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

const ORPHAN = `orphan-${Date.now()}`

let userId: string
let orphanId: string
let userClient: SupabaseClient
let orphanClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  userId = await createUser('user')
  orphanId = await createUser(ORPHAN)
  userClient = await signIn('user')
  orphanClient = await signIn(ORPHAN)

  // The state the old delete half produced: a live auth user with no profiles row.
  const { error } = await admin.from('profiles').delete().eq('id', orphanId)
  if (error) throw new Error(`orphan profile removal failed: ${error.message}`)
}, 90000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown(orphanId ? [orphanId] : [])
}, 90000)

describe.skipIf(!hasCreds)('handle_new_user still creates the profile', () => {
  it('a brand-new auth user gets a profiles row from its signup metadata, never an admin', async () => {
    const id = await createUser('fresh')
    const { data, error } = await admin
      .from('profiles')
      .select('id, full_name, date_of_birth, city, language, is_admin, seller_type')
      .eq('id', id)
      .single()
    expect(error).toBeNull()
    expect(data).toEqual({
      id,
      full_name: METADATA.full_name,
      date_of_birth: METADATA.date_of_birth,
      city: METADATA.city,
      language: METADATA.language,
      is_admin: false,
      seller_type: null,
    })
  })
})

describe.skipIf(!hasCreds)('the delete half is refused', () => {
  it('a signed-in user cannot DELETE their own profile, and the row survives', async () => {
    const { error } = await userClient.from('profiles').delete().eq('id', userId)
    expect(error?.code).toBe(PERMISSION_DENIED)
    expect(await profileRow(userId)).not.toBeNull()
  })

  it('anon cannot DELETE a profile either', async () => {
    const { error } = await anon.from('profiles').delete().eq('id', userId)
    expect(error?.code).toBe(PERMISSION_DENIED)
    expect(await profileRow(userId)).not.toBeNull()
  })
})

describe.skipIf(!hasCreds)('the re-insert half is refused on its own', () => {
  it('ground truth: the orphan has an auth user but no profiles row', async () => {
    expect(await profileRow(orphanId)).toBeNull()
  })

  it('a profile-less user cannot INSERT their own row with is_admin = true', async () => {
    const { error } = await orphanClient
      .from('profiles')
      .insert({ id: orphanId, email: email(ORPHAN), date_of_birth: '1970-01-01', full_name: 'x', is_admin: true })
    expect(error?.code).toBe(PERMISSION_DENIED)
    expect(await profileRow(orphanId)).toBeNull()
  })

  it('a profile-less user cannot INSERT a plain row either (no escalation via any column)', async () => {
    const { error } = await orphanClient
      .from('profiles')
      .insert({ id: orphanId, email: email(ORPHAN), date_of_birth: '1990-01-01', full_name: 'x' })
    expect(error?.code).toBe(PERMISSION_DENIED)
    expect(await profileRow(orphanId)).toBeNull()
  })

  it('so is_admin() stays false for both users', async () => {
    for (const client of [orphanClient, userClient]) {
      const { data, error } = await client.rpc('is_admin')
      expect(error).toBeNull()
      expect(data).toBe(false)
    }
  })

  it('anon cannot INSERT a profile', async () => {
    const { error } = await anon
      .from('profiles')
      .insert({ id: orphanId, email: email(ORPHAN), date_of_birth: '1970-01-01', full_name: 'x', is_admin: true })
    expect(error?.code).toBe(PERMISSION_DENIED)
    expect(await profileRow(orphanId)).toBeNull()
  })
})

describe.skipIf(!hasCreds)('untouched paths still work', () => {
  it('the owner can still UPDATE their own profile', async () => {
    const { error } = await userClient.from('profiles').update({ full_name: 'Renamed' }).eq('id', userId)
    expect(error).toBeNull()
    expect((await profileRow(userId))?.full_name).toBe('Renamed')
  })

  it('deleting the auth user still cascades the profile away (FK action runs as the table owner)', async () => {
    const id = await createUser('cascade')
    expect(await profileRow(id)).not.toBeNull()
    const { error } = await admin.auth.admin.deleteUser(id)
    expect(error).toBeNull()
    expect(await profileRow(id)).toBeNull()
  })
})

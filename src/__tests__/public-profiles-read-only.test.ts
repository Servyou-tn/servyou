/**
 * Live-DB proof for db/migrations/20261023231434_public_profiles_revoke_writes.sql — the CRITICAL
 * hotfix that made public_profiles read-only.
 *
 * public_profiles is a simple view over profiles, so Postgres made it auto-updatable; it is owned by
 * postgres (BYPASSRLS) with security_invoker = false, and Supabase's default privileges had granted
 * INSERT / UPDATE / DELETE / TRUNCATE on it to anon and authenticated. Through PostgREST anyone with
 * the anon key could PATCH any account's name / city / avatar / seller_type or DELETE the row
 * (cascading to that account's shops, orders, listings…). The migration revoked every write
 * privilege on public_profiles and buyer_cancellation_history from both roles. This file proves:
 *   * anon and a signed-in user are refused PATCH / DELETE / POST on public_profiles with the
 *     privilege error (42501), not a 0-row match;
 *   * the account behind the probed row is untouched (service-role ground truth);
 *   * buyer_cancellation_history refuses writes too;
 *   * SELECT still works for both roles, and still exposes only the view's column list.
 *
 * Safety: every write targets a RANDOM, nonexistent id, never a real profile — if the grant ever
 * regressed, a DELETE on a real id would cascade-delete that account. The one exception is the
 * signed-in user's PATCH of their OWN fixture row, harmless even on a regression.
 *
 * Pattern A (live-DB). Service role for fixtures, ground truth and teardown only.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/public-profiles-read-only.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { fixtureSignIn } from './fixture-session'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'pub-prof-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PASSWORD = `Pp-${randomUUID()}-Aa1!` // per run, never committed
const FULL_NAME = 'Public Profiles Read Only Test'
const CITY = 'Sfax'

const DENIED_CODE = '42501'
const DENIED_VIEW = 'permission denied for view public_profiles'

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)
const anon: SupabaseClient = hasCreds
  ? createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: FULL_NAME, date_of_birth: '1990-01-01', city: CITY, language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

async function signIn(local: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await fixtureSignIn(client, email(local))
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function profileRow(id: string) {
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, city, seller_type, avatar_url')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`profile lookup failed: ${error.message}`)
  return data
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id as string)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

let readerId: string
let readerClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  readerId = await createUser('reader')
  readerClient = await signIn('reader')
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

const roles = () =>
  [
    ['anon', anon],
    ['a signed-in user', readerClient],
  ] as const

describe.skipIf(!hasCreds)('public_profiles refuses every write', () => {
  it.each(['anon', 'a signed-in user'] as const)('%s cannot PATCH a row', async (label) => {
    const client = roles().find(([l]) => l === label)![1]
    const { error } = await client.from('public_profiles').update({ full_name: 'Pwned', seller_type: 'freelancer' }).eq('id', randomUUID())
    expect(error?.code).toBe(DENIED_CODE)
    expect(error?.message).toBe(DENIED_VIEW)
  })

  it.each(['anon', 'a signed-in user'] as const)('%s cannot DELETE a row', async (label) => {
    const client = roles().find(([l]) => l === label)![1]
    const { error } = await client.from('public_profiles').delete().eq('id', randomUUID())
    expect(error?.code).toBe(DENIED_CODE)
    expect(error?.message).toBe(DENIED_VIEW)
  })

  it.each(['anon', 'a signed-in user'] as const)('%s cannot POST a row', async (label) => {
    const client = roles().find(([l]) => l === label)![1]
    const { error } = await client.from('public_profiles').insert({ id: randomUUID(), full_name: 'Pwned', city: 'Tunis' })
    expect(error?.code).toBe(DENIED_CODE)
    expect(error?.message).toBe(DENIED_VIEW)
  })

  it("a signed-in user cannot PATCH even their OWN row through the view, and it stays unchanged", async () => {
    const { error } = await readerClient.from('public_profiles').update({ full_name: 'Renamed via view' }).eq('id', readerId)
    expect(error?.code).toBe(DENIED_CODE)
    expect(error?.message).toBe(DENIED_VIEW)
    expect(await profileRow(readerId)).toEqual({ id: readerId, full_name: FULL_NAME, city: CITY, seller_type: null, avatar_url: null })
  })
})

// buyer_cancellation_history (GROUP BY) is not auto-updatable, so the rewriter refuses a write with
// 55000 before any privilege check runs — the revoke on it is defense in depth and cannot be
// observed from outside. Pinned so a future INSTEAD rule / trigger that made it writable shows up.
describe.skipIf(!hasCreds)('buyer_cancellation_history refuses every write', () => {
  it.each(['anon', 'a signed-in user'] as const)('%s cannot POST / PATCH / DELETE', async (label) => {
    const client = roles().find(([l]) => l === label)![1]
    const target = randomUUID()
    const attempts = [
      await client.from('buyer_cancellation_history').insert({ buyer_id: target }),
      await client.from('buyer_cancellation_history').update({ buyer_id: target }).eq('buyer_id', target),
      await client.from('buyer_cancellation_history').delete().eq('buyer_id', target),
    ]
    for (const { error } of attempts) {
      expect(error?.code).toBe('55000') // object_not_in_prerequisite_state: "cannot … view"
    }
  })
})

describe.skipIf(!hasCreds)('reads are unchanged', () => {
  it.each(['anon', 'a signed-in user'] as const)('%s can still SELECT a profile through the view', async (label) => {
    const client = roles().find(([l]) => l === label)![1]
    const { data, error } = await client
      .from('public_profiles')
      .select('id, full_name, city, language, seller_type, avatar_url')
      .eq('id', readerId)
      .single()
    expect(error).toBeNull()
    expect(data).toEqual({ id: readerId, full_name: FULL_NAME, city: CITY, language: 'fr', seller_type: null, avatar_url: null })
  })

  it("the view still exposes only its column list (no email / phone / date_of_birth)", async () => {
    for (const column of ['email', 'phone', 'date_of_birth']) {
      const { error } = await anon.from('public_profiles').select(column).eq('id', readerId)
      expect(error?.code).toBe('42703') // undefined_column
    }
  })
})

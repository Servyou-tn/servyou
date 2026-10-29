/**
 * Live-DB proof for db/migrations/PENDING_notification_prefs_missions_column.sql (architect brief 2026-10-29 step 2b;
 * B5 decision D2). Written while PENDING: red before apply (no column), all green after.
 *
 *   email_missions_matching — defaults ON when the owner's first save omits it, and the owner can insert, read and
 *   update it through their session (column grants). Like its siblings, another user and anon read nothing.
 *
 * Fixtures (all `np-miss-`, password random per run): two consumers. No seller, nothing orderable.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/notification-prefs-missions.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

// Untyped on purpose: the generated Database type gains email_missions_matching only after apply + regeneration.
type Client = SupabaseClient

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'np-miss-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PASSWORD = `Nm-${randomUUID()}-Aa1!`
const COLUMNS = 'profile_id, email_new_orders, email_missions_matching'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient(url, serviceKey, opts) : (undefined as unknown as Client)
const anon: Client = hasCreds ? createClient(url, anonKey, opts) : (undefined as unknown as Client)

let aId: string
let bId: string
let a: Client
let b: Client

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'NP Missions Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

async function signIn(local: string): Promise<Client> {
  const client = createClient(url, anonKey, opts)
  const { error } = await client.auth.signInWithPassword({ email: email(local), password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

// Deleting the users cascades their notification_preferences rows.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  aId = await createUser('a')
  bId = await createUser('b')
  a = await signIn('a')
  b = await signIn('b')
}, 120_000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count } = await admin
    .from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  expect(count).toBe(0)
  const { count: rows } = await admin
    .from('notification_preferences').select('profile_id', { count: 'exact', head: true }).in('profile_id', [aId, bId])
  expect(rows).toBe(0)
}, 120_000)

describe.skipIf(!hasCreds)('email_missions_matching', () => {
  it('defaults ON when the first save omits it (the owner reads it back)', async () => {
    const ins = await a.from('notification_preferences').insert({ profile_id: aId, email_new_orders: false })
    expect(ins.error).toBeNull()
    const { data, error } = await a.from('notification_preferences').select(COLUMNS).eq('profile_id', aId).single()
    expect(error).toBeNull()
    expect(data).toEqual({ profile_id: aId, email_new_orders: false, email_missions_matching: true })
  })

  it('the owner turns it off and on through the app’s upsert (every flag in the payload)', async () => {
    const off = await a
      .from('notification_preferences')
      .upsert({ profile_id: aId, email_new_orders: false, email_proposals: true, email_reviews: true, email_low_stock: false, email_newsletter: false, email_missions_matching: false }, { onConflict: 'profile_id' })
    expect(off.error).toBeNull()
    const { data } = await a.from('notification_preferences').select('email_missions_matching').eq('profile_id', aId).single()
    expect(data?.email_missions_matching).toBe(false)
    const on = await a.from('notification_preferences').update({ email_missions_matching: true }).eq('profile_id', aId).select('email_missions_matching')
    expect(on.error).toBeNull()
    expect(on.data).toEqual([{ email_missions_matching: true }])
  })

  it('a first save can set it OFF directly', async () => {
    const ins = await b.from('notification_preferences').insert({ profile_id: bId, email_missions_matching: false })
    expect(ins.error).toBeNull()
    const { data } = await b.from('notification_preferences').select('email_missions_matching').eq('profile_id', bId).single()
    expect(data?.email_missions_matching).toBe(false)
  })

  it('another user and anon read nothing', async () => {
    const other = await b.from('notification_preferences').select(COLUMNS).eq('profile_id', aId)
    expect(other.error).toBeNull()
    expect(other.data).toEqual([])
    const anonRead = await anon.from('notification_preferences').select('email_missions_matching').eq('profile_id', aId)
    // No anon grant at all: refused by privilege (or an empty set); never a row.
    expect(anonRead.data ?? []).toEqual([])
  })
})

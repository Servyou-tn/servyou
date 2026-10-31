/**
 * Live proof for db/migrations/20261031211305_freelancer_links_cap.sql (#110) — at most 5 freelancer_links per freelancer profile
 * (founder decision 2026-11-01):
 *   * 5 links in ONE multi-row insert pass (H3's save: delete, then insert the set in one statement);
 *   * the 6th is refused (23514, hint freelancer_links_cap) and nothing is added;
 *   * 6 in one insert are refused whole (the statement is atomic);
 *   * the service role is not capped (seeds, admin tooling).
 *
 * Fixture (`lnk-cap-`, password random per run): one freelancer and a profile, written by the service role. Deleting
 * the user cascades everything. 1 fixture sign-in (the live sign-in budget).
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/freelancer-links-cap-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'

type Client = SupabaseClient<Database>

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'lnk-cap-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  await refuseTeardownOnForeignOrders(admin, ids, PREFIX)
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

const link = (profileId: string, n: number) => ({ freelancer_profile_id: profileId, label: `Lien ${n}`, url: `https://example.com/${n}`, display_order: n })
async function count(profileId: string): Promise<number> {
  const { count: n, error } = await admin.from('freelancer_links').select('id', { count: 'exact', head: true }).eq('freelancer_profile_id', profileId)
  if (error) throw new Error(`count failed: ${error.message}`)
  return n ?? 0
}

let profileId: string
let freelancer: Client

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { data, error } = await admin.auth.admin.createUser({
    email: email('freelancer'),
    password: `Lk-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: 'Links Cap Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  const { data: profile, error: profErr } = await admin.from('freelancer_profiles').insert({ profile_id: data.user.id }).select('id').single()
  if (profErr || !profile) throw new Error(`freelancer profile insert failed: ${profErr?.message}`)
  profileId = profile.id

  freelancer = createClient<Database>(url, anonKey, opts)
  const { error: signErr } = await fixtureSignIn(freelancer, email('freelancer'))
  if (signErr) throw new Error(`signIn failed: ${signErr.message}`)
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count: n, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((n ?? 0) !== 0) throw new Error(`teardown left ${n} ${PREFIX} profiles`)
}, 120000)

describe.skipIf(!hasCreds)('freelancer_links — at most 5 per profile', () => {
  it('6 in one insert are refused whole: nothing is stored', async () => {
    const { error } = await freelancer.from('freelancer_links').insert(Array.from({ length: 6 }, (_, i) => link(profileId, i)))
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('freelancer_links_cap')
    expect(await count(profileId)).toBe(0)
  })

  it('5 in one insert pass (H3: delete, then insert the set); the 6th is refused with 23514 + freelancer_links_cap', async () => {
    expect((await freelancer.from('freelancer_links').insert(Array.from({ length: 5 }, (_, i) => link(profileId, i)))).error).toBeNull()
    expect(await count(profileId)).toBe(5)

    const { error } = await freelancer.from('freelancer_links').insert(link(profileId, 5))
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('freelancer_links_cap')
    expect(await count(profileId)).toBe(5)
  })

  it('a delete-then-insert of 5 (the H3 save) still passes at the cap', async () => {
    expect((await freelancer.from('freelancer_links').delete().eq('freelancer_profile_id', profileId)).error).toBeNull()
    expect((await freelancer.from('freelancer_links').insert(Array.from({ length: 5 }, (_, i) => link(profileId, i + 10)))).error).toBeNull()
    expect(await count(profileId)).toBe(5)
  })

  it('the service role is not capped', async () => {
    expect((await admin.from('freelancer_links').insert(link(profileId, 99))).error).toBeNull()
    expect(await count(profileId)).toBe(6)
  })
})

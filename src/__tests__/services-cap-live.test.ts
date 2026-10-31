/**
 * Live proof for db/migrations/PENDING_listing_upload_caps.sql (pre-beta review M2) — the services half: at most 20
 * service listings per freelancer profile, drafts included. The freelancer's 21st insert is refused (23514, hint
 * services_per_freelancer_cap); the service role is not capped. The shop and upload halves are
 * listing-caps-live.test.ts.
 *
 * ⚠ Red until that migration is applied.
 *
 * Fixtures (`svc-cap-`, password random per run): one freelancer and a profile, written by the service role; 19 draft
 * listings pre-filled by the service role (drafts skip the publish-requirements trigger). Deleting the user cascades
 * everything. 1 fixture sign-in (the live sign-in budget).
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/services-cap-live.test.ts
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

const PREFIX = 'svc-cap-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)

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

const draft = (profileId: string, n: number) => ({ freelancer_profile_id: profileId, title: `Service cap ${RUN} #${n}`, status: 'draft' })
async function count(profileId: string): Promise<number> {
  const { count: n, error } = await admin.from('service_listings').select('id', { count: 'exact', head: true }).eq('freelancer_profile_id', profileId)
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
    password: `Sc-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: 'Service Cap Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)

  const { data: profile, error: profErr } = await admin.from('freelancer_profiles').insert({ profile_id: data.user.id }).select('id').single()
  if (profErr || !profile) throw new Error(`freelancer profile insert failed: ${profErr?.message}`)
  profileId = profile.id

  const { error: fillErr } = await admin.from('service_listings').insert(Array.from({ length: 19 }, (_, i) => draft(profileId, i)))
  if (fillErr) throw new Error(`draft prefill failed: ${fillErr.message}`)

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

describe.skipIf(!hasCreds)('service listings — at most 20 per freelancer profile, drafts included', () => {
  it("the freelancer's 20th listing passes; the 21st is refused with 23514 + services_per_freelancer_cap", async () => {
    expect((await freelancer.from('service_listings').insert(draft(profileId, 19))).error).toBeNull()
    expect(await count(profileId)).toBe(20)

    const { error } = await freelancer.from('service_listings').insert(draft(profileId, 20))
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('services_per_freelancer_cap')
    expect(await count(profileId)).toBe(20)
  })

  it('the service role is not capped', async () => {
    expect((await admin.from('service_listings').insert(draft(profileId, 21))).error).toBeNull()
    expect(await count(profileId)).toBe(21)
  })
})

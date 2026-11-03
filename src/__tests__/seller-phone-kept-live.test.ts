/**
 * Live proof for db/migrations/20261103201715_seller_phone_not_cleared.sql (journey walk 2026-11-02 #17 follow-up):
 * enforce_seller_phone_not_cleared — a stored profiles.phone going NULL is refused (23514, hint seller_phone_required)
 * for a shop owner, and for a freelancer with at least one ACTIVE service; a new number is fine; once every service is
 * paused the freelancer may clear it; a consumer may; an admin (here a shop owner too) and the service role skip it.
 *
 * Fixtures (`phone-kept-`, passwords random per run), written by the service role: a shop owner, a freelancer with one
 * complete active listing, a consumer, an admin shop owner — all with a phone. Deleting the users cascades everything.
 * 4 fixture sign-ins, made on first use.
 *
 * Run: npx vitest run --config vitest.integration.config.ts --no-file-parallelism src/__tests__/seller-phone-kept-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'phone-kept-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const RUN = randomUUID().slice(0, 8)
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PHONE = '+21620000000'
const PHONE_HINT = 'seller_phone_required'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: SupabaseClient = hasCreds ? createClient(url, serviceKey, opts) : (undefined as unknown as SupabaseClient)

const ids = { shopOwner: '', freelancer: '', consumer: '', admin: '' }
let activeListingId = ''

// Signed in on first use, so a filtered run (-t) spends only the sign-ins it needs.
const clients = new Map<string, Promise<SupabaseClient>>()
const client = (local: string) => {
  if (!clients.has(local)) clients.set(local, signIn(local))
  return clients.get(local)!
}

async function signIn(local: string): Promise<SupabaseClient> {
  const c = createClient(url, anonKey, opts)
  const { error } = await fixtureSignIn(c, email(local))
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return c
}

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const found = (data ?? []).map((row) => row.id as string)
  if (found.length === 0) return
  await refuseTeardownOnForeignOrders(admin as never, found, PREFIX)
  for (const id of found) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

async function createUser(local: string, patch: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: `Pk-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: `Phone Kept ${local}`, date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  const { error: pErr } = await admin.from('profiles').update({ phone: PHONE, ...patch }).eq('id', data.user.id)
  if (pErr) throw new Error(`profile seed failed for ${local}: ${pErr.message}`)
  return data.user.id
}

const setOwnPhone = async (local: string, id: string, phone: string | null) =>
  (await client(local)).from('profiles').update({ phone }).eq('id', id).select('id')

const expectPhoneRefusal = (error: { code?: string; hint?: string } | null) => {
  expect(error?.code).toBe('23514')
  expect(error?.hint).toBe(PHONE_HINT)
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  ids.shopOwner = await createUser('shopowner', { seller_type: 'shop_owner' })
  ids.freelancer = await createUser('freelancer', { seller_type: 'freelancer' })
  ids.consumer = await createUser('consumer', {})
  ids.admin = await createUser('admin', { seller_type: 'shop_owner', is_admin: true })

  const { data: sub, error: subErr } = await admin
    .from('categories').select('id, parent_id').eq('kind', 'service').not('parent_id', 'is', null).limit(1).single()
  if (subErr || !sub) throw new Error(`service subcategory lookup failed: ${subErr?.message}`)
  const { data: fp, error: fpErr } = await admin.from('freelancer_profiles').insert({ profile_id: ids.freelancer }).select('id').single()
  if (fpErr || !fp) throw new Error(`freelancer_profiles seed failed: ${fpErr?.message}`)
  const { data: listing, error: lErr } = await admin
    .from('service_listings')
    .insert({
      freelancer_profile_id: fp.id,
      status: 'active',
      title: `Phone kept service ${RUN}`,
      category_id: sub.parent_id,
      subcategory_id: sub.id,
      tags: ['testing'],
      short_description: 'Un service de test pour le contrôle du téléphone',
      description: 'd'.repeat(120),
      starting_price_tnd: 100,
      price_unit: 'month',
      deliverables: ['Livrable un', 'Livrable deux', 'Livrable trois'],
      delivery_mode: 'remote',
    })
    .select('id')
    .single()
  if (lErr || !listing) throw new Error(`listing seed failed: ${lErr?.message}`)
  activeListingId = listing.id as string
}, 180000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 120000)

describe.skipIf(!hasCreds)('profiles.phone — a shop owner (own client)', () => {
  it('clearing the phone is refused (23514, seller_phone_required)', async () => {
    expectPhoneRefusal((await setOwnPhone('shopowner', ids.shopOwner, null)).error)
    expectPhoneRefusal((await setOwnPhone('shopowner', ids.shopOwner, '   ')).error)
  })

  it('a new number is fine', async () => {
    const { data, error } = await setOwnPhone('shopowner', ids.shopOwner, '+21620000001')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

describe.skipIf(!hasCreds)('profiles.phone — a freelancer (own client)', () => {
  it('with an active service, clearing the phone is refused', async () => {
    expectPhoneRefusal((await setOwnPhone('freelancer', ids.freelancer, null)).error)
  })

  it('after pausing every service, clearing the phone is fine', async () => {
    const pause = await (await client('freelancer'))
      .from('service_listings').update({ status: 'hidden' }).eq('id', activeListingId).select('id')
    expect(pause.error).toBeNull()
    expect(pause.data).toHaveLength(1)
    const { data, error } = await setOwnPhone('freelancer', ids.freelancer, null)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

describe.skipIf(!hasCreds)('profiles.phone — who may always clear it', () => {
  it('a consumer clears their phone', async () => {
    const { data, error } = await setOwnPhone('consumer', ids.consumer, null)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('an admin (who is also a shop owner) clears their own phone — admins skip the rule', async () => {
    const { data, error } = await setOwnPhone('admin', ids.admin, null)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it("the service role clears a shop owner's phone", async () => {
    const { error } = await admin.from('profiles').update({ phone: null }).eq('id', ids.shopOwner)
    expect(error).toBeNull()
    const { data } = await admin.from('profiles').select('phone').eq('id', ids.shopOwner).single()
    expect(data?.phone).toBeNull()
  })
})

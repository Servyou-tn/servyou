/**
 * Live-DB proof of the COD no-show rule's counting and enforcement (db/migrations/PENDING_cod_no_show.sql; founder
 * decisions 2026-11-14, docs/follow-ups/cod-no-show-plan.md). Written while the migration is PENDING: red until the
 * architect applies it.
 *
 *   tier 1   — 1 counted refusal: no cap; 2 (two sellers): the first open product order is filed, the second refused
 *              23514 cod_open_order_cap (mapped); a refusal 91 days old does not count, 89 days does; one seller twice
 *              on the same Tunis day counts once; 4 parallel inserts while capped file exactly 1 (the advisory lock).
 *   tier 2   — 3 counted refusals, the third 29 days ago: blocked (23514 cod_blocked, with the end date through
 *              get_my_cod_standing); the third 31 days ago: the block is over and tier 1 applies; a 4th refusal
 *              restarts the 30 days; a voided refusal no longer counts.
 *   scope    — a blocked buyer can still file a SERVICE request (products only, decision 2).
 *   privacy  — get_my_cod_standing answers for the caller only (anon has no EXECUTE); seller_buyer_cod_warnings
 *              returns only the caller's own open product orders whose buyer is at 2+, never another seller's.
 *
 * Fixtures (all `codr-`, password random per run): two shop owners with a live product each, a freelancer with a live
 * service, three buyers. Refusals are SEEDED by the service role (a NULL caller: the insert triggers let it through,
 * the CHECKs still apply), at noon in Africa/Tunis N days ago, so a run near midnight never splits a same-day pair or
 * crosses a boundary. Each scenario starts from a clean buyer (its orders and lifts deleted).
 * Sign-ins: 5 (sellers a + b, buyers main / race / plain). The freelancer never signs in.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/cod-no-show-rule-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { orderCapKey } from '@/lib/marche/cap-refusal'
import { codBlockedMessage } from '@/lib/orders/cod-standing'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'

type Client = SupabaseClient<Database>
type OrderInsert = Database['public']['Tables']['orders']['Insert']

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'codr-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Cr-${randomUUID()}-Aa1!`
const CAP = '23514'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

const LOCALS = ['seller-a', 'seller-b', 'freelancer', 'buyer', 'buyer-race', 'buyer-plain'] as const
type Local = (typeof LOCALS)[number]
const ids = {} as Record<Local, string>
const clients = {} as Partial<Record<Local, Client>>
let productA: string
let productB: string
let serviceF: string

async function createUser(local: Local): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local), password: PASSWORD, email_confirm: true,
    user_metadata: { full_name: 'Cod Rule Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

async function signIn(local: Local): Promise<Client> {
  const client = createClient<Database>(url, anonKey, opts)
  const { error } = await fixtureSignIn(client, email(local))
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function makeShopWithProduct(sellerId: string, label: string): Promise<string> {
  const { error: upErr } = await admin.from('profiles').update({ seller_type: 'shop_owner', phone: '+21620000000' }).eq('id', sellerId)
  if (upErr) throw new Error(`seller upgrade failed: ${upErr.message}`)
  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: sellerId, name: `Cod Shop ${label} ${RUN}` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  const { data: product, error: prodErr } = await admin
    .from('products')
    .insert({ shop_id: shop.id, title: `Cod Product ${label} ${RUN}`, price_tnd: 80, status: 'active', tracks_stock: false })
    .select('id').single()
  if (prodErr || !product) throw new Error(`product insert failed: ${prodErr?.message}`)
  return product.id
}

async function makeService(freelancerId: string): Promise<string> {
  const { error: upErr } = await admin.from('profiles').update({ seller_type: 'freelancer', phone: '+21620000001' }).eq('id', freelancerId)
  if (upErr) throw new Error(`freelancer upgrade failed: ${upErr.message}`)
  const { data: sub, error: subErr } = await admin
    .from('categories').select('id, parent_id').eq('kind', 'service').not('parent_id', 'is', null).limit(1).single()
  if (subErr || !sub) throw new Error(`service subcategory lookup failed: ${subErr?.message}`)
  const { data: fp, error: fpErr } = await admin
    .from('freelancer_profiles').insert({ profile_id: freelancerId, headline: 'Titre de test', bio: 'Une bio de test', city: 'Tunis' })
    .select('id').single()
  if (fpErr || !fp) throw new Error(`freelancer_profiles insert failed: ${fpErr?.message}`)
  const { data: sl, error: slErr } = await admin.from('service_listings').insert({
    freelancer_profile_id: fp.id, status: 'active', title: `Cod Service ${RUN}`, category_id: sub.parent_id!, subcategory_id: sub.id,
    tags: ['testing'], short_description: 'Un service de test pour la règle COD', description: 'd'.repeat(120),
    starting_price_tnd: 100, price_unit: 'month', deliverables: ['Livrable un', 'Livrable deux', 'Livrable trois'], delivery_mode: 'remote',
  }).select('id').single()
  if (slErr || !sl) throw new Error(`service_listings insert failed: ${slErr?.message}`)
  return sl.id
}

// Noon in Africa/Tunis, `days` calendar days ago (Tunisia is a fixed UTC+1: noon = 11:00 UTC), plus `minutes`.
function tunisNoonDaysAgo(days: number, minutes = 0): string {
  const [y, m, d] = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' }).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - days, 11, minutes)).toISOString()
}

const sellerOf = (productId: string) => (productId === productA ? ids['seller-a'] : ids['seller-b'])

function productOrder(buyer: Local, productId: string, extra: Partial<OrderInsert> = {}): OrderInsert {
  return {
    buyer_id: ids[buyer], seller_id: sellerOf(productId), order_type: 'product', product_id: productId, status: 'pending',
    quantity: 1, delivery_name: 'Cod Test', delivery_address: 'Rue de test, Tunis', delivery_phone: '+21620000000', ...extra,
  }
}

/** A counted refusal, seeded: a seller cancellation with a marker, at `at`. */
async function seedRefusalAt(buyer: Local, productId: string, at: string): Promise<string> {
  const { data, error } = await admin.from('orders').insert(productOrder(buyer, productId, {
    status: 'cancelled', cancelled_by: 'seller', cancellation_reason: 'Refus de test', refusal_reason: 'refused_parcel',
    cancelled_at: at,
  })).select('id').single()
  if (error || !data) throw new Error(`refusal seed failed: ${error?.message}`)
  return data.id
}
/** The same, at noon (Tunis) `days` ago. */
const seedRefusal = (buyer: Local, productId: string, days: number, minutes = 0) =>
  seedRefusalAt(buyer, productId, tunisNoonDaysAgo(days, minutes))
const DAY_MS = 86_400_000

async function seedOrder(buyer: Local, productId: string, status: string): Promise<string> {
  const { data, error } = await admin.from('orders').insert(productOrder(buyer, productId, { status })).select('id').single()
  if (error || !data) throw new Error(`order seed failed: ${error?.message}`)
  return data.id
}

const fileProductOrder = (buyer: Local, productId: string) =>
  clients[buyer]!.from('orders').insert(productOrder(buyer, productId)).select('id')

async function resetBuyer(buyer: Local): Promise<void> {
  const { error: oErr } = await admin.from('orders').delete().eq('buyer_id', ids[buyer])
  if (oErr) throw new Error(`orders reset failed: ${oErr.message}`)
  const { error: lErr } = await admin.from('cod_block_lifts').delete().eq('buyer_id', ids[buyer])
  if (lErr) throw new Error(`lifts reset failed: ${lErr.message}`)
}

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const fixtureIds = (data ?? []).map((row) => row.id)
  if (fixtureIds.length === 0) return
  await refuseTeardownOnForeignOrders(admin, fixtureIds, PREFIX)
  for (const id of fixtureIds) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  for (const local of LOCALS) ids[local] = await createUser(local)
  productA = await makeShopWithProduct(ids['seller-a'], 'A')
  productB = await makeShopWithProduct(ids['seller-b'], 'B')
  serviceF = await makeService(ids.freelancer)
  for (const local of ['seller-a', 'seller-b', 'buyer', 'buyer-race', 'buyer-plain'] as const) clients[local] = await signIn(local)
}, 240_000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count: profiles } = await admin
    .from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  expect(profiles).toBe(0)
  const all = Object.values(ids)
  const { count: orders } = await admin.from('orders').select('id', { count: 'exact', head: true }).in('buyer_id', all)
  expect(orders).toBe(0)
  const { count: lifts } = await admin.from('cod_block_lifts').select('id', { count: 'exact', head: true }).in('buyer_id', all)
  expect(lifts).toBe(0)
}, 180_000)

// ─── tier 1: the 1-open-order cap ─────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('tier 1 — 2 counted refusals in 90 days: one open product order at a time', () => {
  it('1 counted refusal: two open orders are filed', async () => {
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 10)
    expect((await fileProductOrder('buyer', productA)).error).toBeNull()
    expect((await fileProductOrder('buyer', productB)).error).toBeNull()
  })

  it('2 counted refusals (two sellers): the first order is filed, the second refused 23514 cod_open_order_cap', async () => {
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 10)
    await seedRefusal('buyer', productB, 5)
    expect((await fileProductOrder('buyer', productA)).error).toBeNull()
    const { error } = await fileProductOrder('buyer', productB)
    expect(error?.code).toBe(CAP)
    expect(error?.hint).toBe('cod_open_order_cap')
    expect(orderCapKey(error)).toBe('demander.error.cod_open_order_cap')
  })

  it('an order that is no longer open frees the slot (received)', async () => {
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 10)
    await seedRefusal('buyer', productB, 5)
    await seedOrder('buyer', productA, 'received')
    expect((await fileProductOrder('buyer', productA)).error).toBeNull()
  })

  it('every status from pending to arrived counts as open', async () => {
    for (const status of ['pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived']) {
      await resetBuyer('buyer')
      await seedRefusal('buyer', productA, 10)
      await seedRefusal('buyer', productB, 5)
      await seedOrder('buyer', productA, status)
      expect((await fileProductOrder('buyer', productB)).error?.hint, status).toBe('cod_open_order_cap')
    }
  })

  it('a refusal 91 days old does not count; one 89 days old does', async () => {
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 91)
    await seedRefusal('buyer', productB, 5)
    expect((await fileProductOrder('buyer', productA)).error).toBeNull()
    expect((await fileProductOrder('buyer', productB)).error).toBeNull()
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 89)
    await seedRefusal('buyer', productB, 5)
    expect((await fileProductOrder('buyer', productA)).error).toBeNull()
    expect((await fileProductOrder('buyer', productB)).error?.hint).toBe('cod_open_order_cap')
  })

  it('the same seller twice on the same Tunis day counts once (decision 5); on two days, twice', async () => {
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 6)
    await seedRefusal('buyer', productA, 6, 90)
    expect((await fileProductOrder('buyer', productA)).error).toBeNull()
    expect((await fileProductOrder('buyer', productB)).error).toBeNull()
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 6)
    await seedRefusal('buyer', productA, 7)
    expect((await fileProductOrder('buyer', productA)).error).toBeNull()
    expect((await fileProductOrder('buyer', productB)).error?.hint).toBe('cod_open_order_cap')
  })

  it('4 parallel inserts while capped with 0 open orders: exactly 1 is filed (the per-buyer advisory lock)', async () => {
    await resetBuyer('buyer-race')
    await seedRefusal('buyer-race', productA, 10)
    await seedRefusal('buyer-race', productB, 5)
    const results = await Promise.all([productA, productB, productA, productB].map((p) => fileProductOrder('buyer-race', p)))
    expect(results.filter((r) => r.error === null)).toHaveLength(1)
    expect(results.filter((r) => r.error?.hint === 'cod_open_order_cap')).toHaveLength(3)
    const { count } = await admin.from('orders').select('id', { count: 'exact', head: true })
      .eq('buyer_id', ids['buyer-race']).eq('status', 'pending')
    expect(count).toBe(1)
  })
})

// ─── tier 2: the 30-day block ─────────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('tier 2 — 3 counted refusals in 90 days: no new product order for 30 days', () => {
  it('the third 29 days ago: refused 23514 cod_blocked; the standing gives the end date; the message carries it', async () => {
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 40)
    await seedRefusal('buyer', productB, 35)
    const third = tunisNoonDaysAgo(29) // captured once: a run crossing Tunis midnight must not move the expectation
    await seedRefusalAt('buyer', productA, third)
    const { error } = await fileProductOrder('buyer', productA)
    expect(error?.code).toBe(CAP)
    expect(error?.hint).toBe('cod_blocked')
    expect(orderCapKey(error)).toBe('demander.error.cod_blocked')
    const { data, error: rpcErr } = await clients.buyer!.rpc('get_my_cod_standing')
    expect(rpcErr).toBeNull()
    expect(data).toHaveLength(1)
    expect(new Date(data![0].blocked_until).getTime()).toBe(new Date(third).getTime() + 30 * DAY_MS)
    expect(data![0].open_order_cap).toBe(true)
    expect(await codBlockedMessage(clients.buyer!, 'fr')).not.toContain('{date}')
  })

  it('the third 31 days ago: the block is over, and tier 1 still applies', async () => {
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 45)
    await seedRefusal('buyer', productB, 40)
    await seedRefusal('buyer', productA, 31)
    expect((await fileProductOrder('buyer', productA)).error).toBeNull()
    expect((await fileProductOrder('buyer', productB)).error?.hint).toBe('cod_open_order_cap')
    const { data } = await clients.buyer!.rpc('get_my_cod_standing')
    expect(data![0].blocked_until).toBeNull()
  })

  it('a 4th refusal restarts the 30 days', async () => {
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 50)
    await seedRefusal('buyer', productB, 45)
    await seedRefusal('buyer', productA, 40) // block ended 10 days ago
    const fourth = tunisNoonDaysAgo(2)
    await seedRefusalAt('buyer', productB, fourth) // R90 = 4 >= 3: a new trigger
    expect((await fileProductOrder('buyer', productA)).error?.hint).toBe('cod_blocked')
    const { data } = await clients.buyer!.rpc('get_my_cod_standing')
    expect(new Date(data![0].blocked_until).getTime()).toBe(new Date(fourth).getTime() + 30 * DAY_MS)
  })

  it('a block whose older refusals have aged out of the last 90 days still caps and flags the buyer while it lasts', async () => {
    // 94 and 92 days ago, then 5: at the third, all three are within 90 days (a block until +25 days); now only 1 is.
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 94)
    await seedRefusal('buyer', productB, 92)
    await seedRefusal('buyer', productA, 5)
    expect((await fileProductOrder('buyer', productA)).error?.hint).toBe('cod_blocked')
    const { data } = await clients.buyer!.rpc('get_my_cod_standing')
    expect(data![0].open_order_cap).toBe(true)
    expect(data![0].blocked_until).not.toBeNull()
    const open = await seedOrder('buyer', productA, 'pending')
    const { data: flagged } = await clients['seller-a']!.rpc('seller_buyer_cod_warnings', { p_order_ids: [open] })
    expect(flagged).toEqual([open])
  })

  it('a voided refusal no longer counts: the block ends at once, tier 1 remains', async () => {
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 20)
    await seedRefusal('buyer', productB, 15)
    const third = await seedRefusal('buyer', productA, 10)
    expect((await fileProductOrder('buyer', productA)).error?.hint).toBe('cod_blocked')
    // The service role stands in for admin_void_refusal here (cod-no-show-admin-live proves the RPC itself).
    const { error: vErr } = await admin.from('orders').update({ refusal_voided_at: new Date().toISOString() }).eq('id', third)
    expect(vErr).toBeNull()
    expect((await fileProductOrder('buyer', productA)).error).toBeNull()
    expect((await fileProductOrder('buyer', productB)).error?.hint).toBe('cod_open_order_cap')
  })

  it('a blocked buyer can still file a SERVICE request: products only (decision 2)', async () => {
    await resetBuyer('buyer')
    await seedRefusal('buyer', productA, 20)
    await seedRefusal('buyer', productB, 15)
    await seedRefusal('buyer', productA, 10)
    expect((await fileProductOrder('buyer', productA)).error?.hint).toBe('cod_blocked')
    const { error } = await clients.buyer!.from('orders').insert({
      buyer_id: ids.buyer, seller_id: ids.freelancer, order_type: 'service', service_listing_id: serviceF, status: 'pending',
      quantity: 1, delivery_phone: '+21620000000',
    }).select('id')
    expect(error).toBeNull()
  })
})

// ─── privacy: the two read RPCs ──────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('get_my_cod_standing / seller_buyer_cod_warnings — the caller only, yes / no only', () => {
  it('get_my_cod_standing answers for the caller only; anon has no EXECUTE', async () => {
    await resetBuyer('buyer')
    await resetBuyer('buyer-plain')
    await seedRefusal('buyer', productA, 10)
    await seedRefusal('buyer', productB, 5)
    const flagged = await clients.buyer!.rpc('get_my_cod_standing')
    expect(flagged.data).toEqual([{ open_order_cap: true, blocked_until: null }])
    const plain = await clients['buyer-plain']!.rpc('get_my_cod_standing')
    expect(plain.data).toEqual([{ open_order_cap: false, blocked_until: null }])
    const anon = createClient<Database>(url, anonKey, opts)
    const { error } = await anon.rpc('get_my_cod_standing')
    expect(error?.code).toBe('42501')
  })

  it('a seller sees the warning on its own open orders of a buyer at 2+, never on another seller’s or a closed one', async () => {
    await resetBuyer('buyer')
    await resetBuyer('buyer-plain')
    await seedRefusal('buyer', productA, 10)
    await seedRefusal('buyer', productB, 5)
    const flaggedOpen = await seedOrder('buyer', productA, 'pending')
    const flaggedDone = await seedOrder('buyer', productA, 'received')
    const plainOpen = await seedOrder('buyer-plain', productA, 'accepted')
    const otherSellers = await seedOrder('buyer', productB, 'prepared')
    const asked = [flaggedOpen, flaggedDone, plainOpen, otherSellers]
    const { data: a, error: aErr } = await clients['seller-a']!.rpc('seller_buyer_cod_warnings', { p_order_ids: asked })
    expect(aErr).toBeNull()
    expect(a).toEqual([flaggedOpen])
    const { data: b } = await clients['seller-b']!.rpc('seller_buyer_cod_warnings', { p_order_ids: asked })
    expect(b).toEqual([otherSellers])
    const { data: buyerAsks } = await clients.buyer!.rpc('seller_buyer_cod_warnings', { p_order_ids: asked })
    expect(buyerAsks).toEqual([])
  })
})

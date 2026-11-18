/**
 * Live-DB proof of the bell (db/migrations/20261116201553_bell_notifications.sql; founder rule 2026-11-16: every order
 * event notifies the OTHER party, never the person who made it; plan docs/follow-ups/bell-notifications-plan.md §5).
 *
 * Every positive case asserts the order's WHOLE notification list is exactly one row, for the other party: an insert
 * error in the trigger is only a WARNING (architect's fix), so a broken trigger shows up as a missing row, never as an
 * error.
 *
 *   inserts      — the buyer's own product order and service request notify the seller / freelancer (order_created).
 *   seller steps — each product step and each service step notifies the buyer; a seller cancellation and a refusal too.
 *   buyer steps  — a buyer cancellation (product) and a receipt confirmation notify the seller.
 *   not events   — a tracking edit adds nothing; a service-role insert adds nothing (founder decision: no signed-in party,
 *                  no row); a service-role status change is refused by check_order_status_transition.
 *   access       — the recipient reads their row; a non-party and anon read nothing; clients cannot insert, update or
 *                  delete; mark_my_notifications_read touches the caller's own rows only and is refused to anon.
 *
 * Orders are seeded by the service role at the status a test needs (no row: no signed-in party); every write under
 * test is made by a signed-in fixture. The two client inserts run first: seeds count toward the order rate limit.
 * Fixtures (all `bell-`, password random per run): a shop owner with a live product, a freelancer with a live service,
 * a buyer. The freelancer is the non-party for product orders. Sign-ins: 3.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/bell-notifications-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'

type Client = SupabaseClient<Database>
type OrderInsert = Database['public']['Tables']['orders']['Insert']
type Status = Database['public']['Tables']['orders']['Row']['status']

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'bell-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Bl-${randomUUID()}-Aa1!`
const DENIED = '42501'
const BUYER_PHONE = '+21620000081'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)
const anon: Client = hasCreds ? createClient<Database>(url, anonKey, opts) : (undefined as unknown as Client)

const LOCALS = ['seller', 'freelancer', 'buyer'] as const
type Local = (typeof LOCALS)[number]
const ids = {} as Record<Local, string>
const clients = {} as Record<Local, Client>
let product: string
let service: string

async function createUser(local: Local): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local), password: PASSWORD, email_confirm: true,
    user_metadata: { full_name: 'Bell Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

async function makeProduct(): Promise<string> {
  const { error: upErr } = await admin.from('profiles').update({ seller_type: 'shop_owner', phone: '+21620000082' }).eq('id', ids.seller)
  if (upErr) throw new Error(`seller upgrade failed: ${upErr.message}`)
  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: ids.seller, name: `Bell Shop ${RUN}` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  const { data: p, error: pErr } = await admin.from('products')
    .insert({ shop_id: shop.id, title: `Bell Product ${RUN}`, price_tnd: 80, status: 'active', tracks_stock: false })
    .select('id').single()
  if (pErr || !p) throw new Error(`product insert failed: ${pErr?.message}`)
  return p.id
}

async function makeService(): Promise<string> {
  const { error: upErr } = await admin.from('profiles').update({ seller_type: 'freelancer', phone: '+21620000083' }).eq('id', ids.freelancer)
  if (upErr) throw new Error(`freelancer upgrade failed: ${upErr.message}`)
  const { data: sub, error: subErr } = await admin
    .from('categories').select('id, parent_id').eq('kind', 'service').not('parent_id', 'is', null).limit(1).single()
  if (subErr || !sub) throw new Error(`service subcategory lookup failed: ${subErr?.message}`)
  const { data: fp, error: fpErr } = await admin
    .from('freelancer_profiles').insert({ profile_id: ids.freelancer, headline: 'Titre de test', bio: 'Une bio de test', city: 'Tunis' })
    .select('id').single()
  if (fpErr || !fp) throw new Error(`freelancer_profiles insert failed: ${fpErr?.message}`)
  const { data: sl, error: slErr } = await admin.from('service_listings').insert({
    freelancer_profile_id: fp.id, status: 'active', title: `Bell Service ${RUN}`, category_id: sub.parent_id!, subcategory_id: sub.id,
    tags: ['testing'], short_description: 'Un service de test pour la cloche', description: 'd'.repeat(120),
    starting_price_tnd: 100, price_unit: 'month', deliverables: ['Livrable un', 'Livrable deux', 'Livrable trois'], delivery_mode: 'remote',
  }).select('id').single()
  if (slErr || !sl) throw new Error(`service_listings insert failed: ${slErr?.message}`)
  return sl.id
}

const productOrder = (extra: Partial<OrderInsert> = {}): OrderInsert => ({
  buyer_id: ids.buyer, seller_id: ids.seller, order_type: 'product', product_id: product, status: 'pending', quantity: 1,
  delivery_name: 'Bell Test', delivery_address: 'Rue de test, Tunis', delivery_phone: BUYER_PHONE, ...extra,
})

const serviceOrder = (extra: Partial<OrderInsert> = {}): OrderInsert => ({
  buyer_id: ids.buyer, seller_id: ids.freelancer, order_type: 'service', service_listing_id: service, status: 'pending',
  quantity: 1, delivery_phone: BUYER_PHONE, ...extra,
})

/** A service-role seed: no signed-in party, so no notification (checked in its own test). */
async function seed(order: OrderInsert): Promise<string> {
  const { data, error } = await admin.from('orders').insert(order).select('id').single()
  if (error || !data) throw new Error(`order seed failed: ${error?.message}`)
  return data.id
}

/** The order's whole notification list, read with the service role (oldest first). */
async function bellRows(orderId: string) {
  const { data, error } = await admin.from('notifications')
    .select('id, recipient_id, actor_id, kind, from_status, to_status, read_at').eq('order_id', orderId).order('created_at')
  if (error) throw new Error(`notifications read failed: ${error.message}`)
  return data ?? []
}

/** Exactly one row, for `to`, made by `by`. */
async function expectOneRow(orderId: string, to: Local, by: Local, kind: string, from: Status | null, toStatus: Status) {
  const rows = await bellRows(orderId)
  expect(rows).toHaveLength(1)
  expect(rows[0]).toMatchObject({
    recipient_id: ids[to], actor_id: ids[by], kind, from_status: from, to_status: toStatus, read_at: null,
  })
  return rows[0]
}

const move = (who: Local, orderId: string, patch: Database['public']['Tables']['orders']['Update']) =>
  clients[who].from('orders').update(patch).eq('id', orderId).select('id')

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
  const { error: bErr } = await admin.from('profiles').update({ phone: BUYER_PHONE }).eq('id', ids.buyer)
  if (bErr) throw new Error(`buyer phone failed: ${bErr.message}`)
  product = await makeProduct()
  service = await makeService()
  for (const local of LOCALS) clients[local] = await signIn(local)
}, 180_000)

afterAll(async () => {
  if (!hasCreds) return
  const fixtureIds = Object.values(ids)
  await teardown()
  const { count: profiles } = await admin
    .from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  expect(profiles).toBe(0)
  const { count: orders } = await admin.from('orders').select('id', { count: 'exact', head: true }).in('buyer_id', fixtureIds)
  expect(orders).toBe(0)
  const { count: asRecipient } = await admin
    .from('notifications').select('id', { count: 'exact', head: true }).in('recipient_id', fixtureIds)
  expect(asRecipient).toBe(0)
  const { count: asActor } = await admin.from('notifications').select('id', { count: 'exact', head: true }).in('actor_id', fixtureIds)
  expect(asActor).toBe(0)
}, 180_000)

// ─── inserts: the buyer's own order notifies the seller (these run first: seeds count toward the rate limit) ──────

describe.skipIf(!hasCreds)('a new order — the seller is told, the buyer is not', () => {
  it('a product order placed by the buyer: the shop owner gets one order_created row', async () => {
    const { data, error } = await clients.buyer.from('orders').insert(productOrder()).select('id').single()
    expect(error).toBeNull()
    await expectOneRow(data!.id, 'seller', 'buyer', 'order_created', null, 'pending')
  })

  it('a service request placed by the buyer: the freelancer gets one order_created row', async () => {
    const { data, error } = await clients.buyer.from('orders').insert(serviceOrder()).select('id').single()
    expect(error).toBeNull()
    await expectOneRow(data!.id, 'freelancer', 'buyer', 'order_created', null, 'pending')
  })
})

// ─── the seller's steps: the buyer is told, the seller is not ────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('the seller moves the order — the buyer is told, the seller is not', () => {
  it.each([
    ['pending', 'accepted'],
    ['accepted', 'prepared'],
    ['prepared', 'dispatched'],
    ['dispatched', 'in_delivery'],
    ['in_delivery', 'arrived'],
  ] as const)('product %s → %s', async (from, to) => {
    const id = await seed(productOrder({ status: from }))
    const { data, error } = await move('seller', id, { status: to })
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    await expectOneRow(id, 'buyer', 'seller', 'order_status_changed', from, to)
  })

  it.each([
    ['pending', 'accepted'],
    ['accepted', 'arrived'],
  ] as const)('service %s → %s', async (from, to) => {
    const id = await seed(serviceOrder({ status: from }))
    const { data, error } = await move('freelancer', id, { status: to })
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    await expectOneRow(id, 'buyer', 'freelancer', 'order_status_changed', from, to)
  })

  it('a seller cancellation', async () => {
    const id = await seed(productOrder({ status: 'pending' }))
    const { error } = await move('seller', id, { status: 'cancelled', cancelled_by: 'seller', cancellation_reason: 'Rupture de stock' })
    expect(error).toBeNull()
    await expectOneRow(id, 'buyer', 'seller', 'order_status_changed', 'pending', 'cancelled')
  })

  it('a refusal (« Refusée à la livraison »): a seller cancellation after dispatch with the marker', async () => {
    const id = await seed(productOrder({ status: 'dispatched' }))
    const { error } = await move('seller', id, {
      status: 'cancelled', cancelled_by: 'seller', cancellation_reason: 'Le client a refusé le colis', refusal_reason: 'refused_parcel',
    })
    expect(error).toBeNull()
    await expectOneRow(id, 'buyer', 'seller', 'order_status_changed', 'dispatched', 'cancelled')
  })
})

// ─── the buyer's steps: the seller is told, the buyer is not ─────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('the buyer moves the order — the seller is told, the buyer is not', () => {
  it('the buyer cancels a product order', async () => {
    const id = await seed(productOrder({ status: 'pending' }))
    const { error } = await move('buyer', id, { status: 'cancelled', cancelled_by: 'buyer' })
    expect(error).toBeNull()
    await expectOneRow(id, 'seller', 'buyer', 'order_status_changed', 'pending', 'cancelled')
  })

  it('the buyer confirms receipt of a product order', async () => {
    const id = await seed(productOrder({ status: 'arrived' }))
    const { error } = await move('buyer', id, { status: 'received' })
    expect(error).toBeNull()
    await expectOneRow(id, 'seller', 'buyer', 'order_status_changed', 'arrived', 'received')
  })

  it('the buyer confirms receipt of a service: the freelancer is told', async () => {
    const id = await seed(serviceOrder({ status: 'arrived' }))
    const { error } = await move('buyer', id, { status: 'received' })
    expect(error).toBeNull()
    await expectOneRow(id, 'freelancer', 'buyer', 'order_status_changed', 'arrived', 'received')
  })
})

// ─── not events ──────────────────────────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('not events — no row', () => {
  it('a service-role insert (no signed-in party) writes no row', async () => {
    const id = await seed(productOrder({ status: 'pending' }))
    expect(await bellRows(id)).toEqual([])
  })

  it('a tracking-number edit by the seller writes no row', async () => {
    const id = await seed(productOrder({ status: 'dispatched' }))
    const { data, error } = await move('seller', id, { tracking_number: `BELL-${RUN}` })
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(await bellRows(id)).toEqual([])
  })

  it('a service-role status change is refused by the transition trigger (so « no signed-in party » never moves a status)', async () => {
    const id = await seed(productOrder({ status: 'pending' }))
    const { error } = await admin.from('orders').update({ status: 'accepted' }).eq('id', id)
    expect(error?.message).toMatch(/^Vous n'êtes pas autorisé à modifier cette commande/)
    const { data: row } = await admin.from('orders').select('status').eq('id', id).single()
    expect(row?.status).toBe('pending')
    expect(await bellRows(id)).toEqual([])
  })
})

// ─── access ──────────────────────────────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('access — the recipient only; no client writes; read_at only through the RPC', () => {
  let orderId: string
  let rowId: string

  beforeAll(async () => {
    if (!hasCreds) return
    orderId = await seed(productOrder({ status: 'arrived' }))
    const { error } = await move('buyer', orderId, { status: 'received' })
    if (error) throw new Error(`receipt failed: ${error.message}`)
    rowId = (await expectOneRow(orderId, 'seller', 'buyer', 'order_status_changed', 'arrived', 'received')).id
  })

  it('the recipient reads it; the actor and a non-party read nothing of it; anon is refused', async () => {
    const mine = await clients.seller.from('notifications').select('id, recipient_id').eq('order_id', orderId)
    expect(mine.error).toBeNull()
    expect(mine.data).toEqual([{ id: rowId, recipient_id: ids.seller }])
    for (const who of ['buyer', 'freelancer'] as const) {
      const theirs = await clients[who].from('notifications').select('id').eq('order_id', orderId)
      expect(theirs.error).toBeNull()
      expect(theirs.data).toEqual([])
    }
    const anyOther = await clients.freelancer.from('notifications').select('recipient_id').neq('recipient_id', ids.freelancer)
    expect(anyOther.error).toBeNull()
    expect(anyOther.data).toEqual([])
    const asAnon = await anon.from('notifications').select('id').eq('order_id', orderId)
    expect(asAnon.error?.code).toBe(DENIED)
  })

  it('clients cannot insert, update or delete a row (42501), not even their own', async () => {
    const ins = await clients.buyer.from('notifications').insert({
      recipient_id: ids.seller, actor_id: ids.buyer, order_id: orderId, kind: 'order_created', to_status: 'pending',
    }).select('id')
    expect(ins.error?.code).toBe(DENIED)
    const upd = await clients.seller.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', rowId).select('id')
    expect(upd.error?.code).toBe(DENIED)
    const del = await clients.seller.from('notifications').delete().eq('id', rowId).select('id')
    expect(del.error?.code).toBe(DENIED)
    expect(await bellRows(orderId)).toEqual([expect.objectContaining({ id: rowId, read_at: null })])
  })

  it('mark_my_notifications_read: another user’s id marks nothing; the recipient marks it; anon is refused', async () => {
    const foreign = await clients.buyer.rpc('mark_my_notifications_read', { p_ids: [rowId] })
    expect(foreign.error).toBeNull()
    expect(foreign.data).toBe(0)
    const foreignAll = await clients.freelancer.rpc('mark_my_notifications_read', {})
    expect(foreignAll.error).toBeNull()
    expect((await bellRows(orderId))[0].read_at).toBeNull()

    const own = await clients.seller.rpc('mark_my_notifications_read', { p_ids: [rowId] })
    expect(own.error).toBeNull()
    expect(own.data).toBe(1)
    const readAt = (await bellRows(orderId))[0].read_at
    expect(readAt).not.toBeNull()
    const again = await clients.seller.rpc('mark_my_notifications_read', { p_ids: [rowId] })
    expect(again.data).toBe(0)
    expect((await bellRows(orderId))[0].read_at).toBe(readAt)

    const asAnon = await anon.rpc('mark_my_notifications_read', {})
    expect(asAnon.error).not.toBeNull()
  })

  it('mark all (no ids) marks every unread row of the caller, and only theirs', async () => {
    const { count: unreadBefore } = await admin.from('notifications')
      .select('id', { count: 'exact', head: true }).eq('recipient_id', ids.buyer).is('read_at', null)
    expect(unreadBefore).toBeGreaterThan(0)
    const { count: sellerUnread } = await admin.from('notifications')
      .select('id', { count: 'exact', head: true }).eq('recipient_id', ids.seller).is('read_at', null)
    const all = await clients.buyer.rpc('mark_my_notifications_read', {})
    expect(all.error).toBeNull()
    expect(all.data).toBe(unreadBefore)
    const { count: unreadAfter } = await admin.from('notifications')
      .select('id', { count: 'exact', head: true }).eq('recipient_id', ids.buyer).is('read_at', null)
    expect(unreadAfter).toBe(0)
    const { count: sellerAfter } = await admin.from('notifications')
      .select('id', { count: 'exact', head: true }).eq('recipient_id', ids.seller).is('read_at', null)
    expect(sellerAfter).toBe(sellerUnread)
  })
})

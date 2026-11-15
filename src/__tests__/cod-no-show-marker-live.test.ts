/**
 * Live-DB proof of the refusal marker and the contest (db/migrations/20261115182353_cod_no_show.sql; founder decisions
 * 2026-11-14). Written while the migration is PENDING: red until the architect applies it.
 *
 *   marker   — the seller refuses from dispatched, in_delivery and arrived (the real client UPDATE: status cancelled,
 *              cancelled_by seller, the label as cancellation_reason, refusal_reason; cancelled_at stamped by the DB;
 *              the timeline event carries the label); refused 23514 refusal_status from pending / accepted / prepared;
 *              the buyer (42501) and a third party (RLS: no row) can't set it; once set it can't be changed or
 *              cleared (42501), refusal_voided_at has no client grant (42501), and nothing leaves « cancelled »;
 *              a client insert presetting either column is refused (42501). The phone reveal survives a refusal.
 *   contest  — the buyer's dispute refusal_contested is filed within 14 days (13 days: yes) and refused after
 *              (15 days: contest_window_closed); on a cancellation that is no refusal (contest_not_refusal); by the
 *              seller (contest_buyer_only); a second active contest on the same order (23505); a seller's own
 *              dispute does not block the buyer's contest (decision 2 of the migration).
 *
 * Orders are seeded by the service role at the status a test needs (the insert triggers let a NULL caller through);
 * every write under test is made by a signed-in fixture. Backdated refusals: cancelled_at at noon in Africa/Tunis.
 * Fixtures (all `codm-`, password random per run): a shop owner with a live product, a buyer, a third party.
 * Sign-ins: 3.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/cod-no-show-marker-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refusalErrorKey } from '@/lib/orders/refusal'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'

type Client = SupabaseClient<Database>
type OrderInsert = Database['public']['Tables']['orders']['Insert']

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'codm-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Cm-${randomUUID()}-Aa1!`
const DENIED = '42501'
const LABEL = 'Le client a refusé le colis'
const SELLER_PHONE = '+21620000002'
const BUYER_PHONE = '+21620000003'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

const LOCALS = ['seller', 'buyer', 'other'] as const
type Local = (typeof LOCALS)[number]
const ids = {} as Record<Local, string>
const clients = {} as Record<Local, Client>
let product: string

async function createUser(local: Local): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local), password: PASSWORD, email_confirm: true,
    user_metadata: { full_name: 'Cod Marker Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

function tunisNoonDaysAgo(days: number): string {
  const [y, m, d] = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' }).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - days, 11, 0)).toISOString()
}

function productOrder(extra: Partial<OrderInsert> = {}): OrderInsert {
  return {
    buyer_id: ids.buyer, seller_id: ids.seller, order_type: 'product', product_id: product, status: 'pending', quantity: 1,
    delivery_name: 'Cod Test', delivery_address: 'Rue de test, Tunis', delivery_phone: BUYER_PHONE, ...extra,
  }
}

async function seedOrder(extra: Partial<OrderInsert>): Promise<string> {
  const { data, error } = await admin.from('orders').insert(productOrder(extra)).select('id').single()
  if (error || !data) throw new Error(`order seed failed: ${error?.message}`)
  return data.id
}

const seedRefusal = (days: number) => seedOrder({
  status: 'cancelled', cancelled_by: 'seller', cancellation_reason: LABEL, refusal_reason: 'refused_parcel',
  cancelled_at: tunisNoonDaysAgo(days),
})

/** The refuseDeliveryAction write, made by the signed-in seller. */
const refuse = (who: Local, orderId: string, cancelledBy: 'seller' | 'buyer' = 'seller') =>
  clients[who].from('orders')
    .update({ status: 'cancelled', cancelled_by: cancelledBy, cancellation_reason: LABEL, refusal_reason: 'refused_parcel' })
    .eq('id', orderId).select('id')

const contest = (who: Local, orderId: string, role: 'buyer' | 'seller' = 'buyer', reason = 'refusal_contested') =>
  clients[who].from('disputes')
    .insert({ order_id: orderId, created_by_role: role, reason, description: 'Je n’ai jamais été contacté.' }).select('id')

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
  const { error: upErr } = await admin.from('profiles').update({ seller_type: 'shop_owner', phone: SELLER_PHONE }).eq('id', ids.seller)
  if (upErr) throw new Error(`seller upgrade failed: ${upErr.message}`)
  const { error: bErr } = await admin.from('profiles').update({ phone: BUYER_PHONE }).eq('id', ids.buyer)
  if (bErr) throw new Error(`buyer phone failed: ${bErr.message}`)
  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: ids.seller, name: `Cod Marker Shop ${RUN}` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  const { data: p, error: pErr } = await admin.from('products')
    .insert({ shop_id: shop.id, title: `Cod Marker Product ${RUN}`, price_tnd: 80, status: 'active', tracks_stock: false })
    .select('id').single()
  if (pErr || !p) throw new Error(`product insert failed: ${pErr?.message}`)
  product = p.id
  for (const local of LOCALS) clients[local] = await signIn(local)
}, 180_000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count: profiles } = await admin
    .from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  expect(profiles).toBe(0)
  const { count: orders } = await admin.from('orders').select('id', { count: 'exact', head: true }).in('buyer_id', Object.values(ids))
  expect(orders).toBe(0)
}, 180_000)

// ─── the marker ──────────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('the refusal marker — seller only, after dispatch, set once', () => {
  it.each(['dispatched', 'in_delivery', 'arrived'])('the seller refuses from %s: a seller cancellation with the marker', async (status) => {
    const id = await seedOrder({ status })
    const before = Date.now()
    const { data, error } = await refuse('seller', id)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    const { data: row } = await admin.from('orders')
      .select('status, cancelled_by, cancellation_reason, refusal_reason, refusal_voided_at, cancelled_at').eq('id', id).single()
    expect(row).toMatchObject({ status: 'cancelled', cancelled_by: 'seller', cancellation_reason: LABEL, refusal_reason: 'refused_parcel', refusal_voided_at: null })
    expect(new Date(row!.cancelled_at!).getTime()).toBeGreaterThanOrEqual(before - 60_000)
    const { data: events } = await admin.from('order_events').select('to_status, actor_role, note').eq('order_id', id).eq('event_type', 'status_change')
    expect(events).toEqual([{ to_status: 'cancelled', actor_role: 'seller', note: LABEL }])
  })

  it.each(['pending', 'accepted', 'prepared'])('refused from %s (23514 refusal_status), and the order is untouched', async (status) => {
    const id = await seedOrder({ status })
    const { error } = await refuse('seller', id)
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('refusal_status')
    expect(refusalErrorKey(error!)).toBe('seller.orders.error_refusal_status')
    const { data: row } = await admin.from('orders').select('status, refusal_reason').eq('id', id).single()
    expect(row).toEqual({ status, refusal_reason: null })
  })

  it('the buyer cannot set it (42501), even while cancelling as the buyer', async () => {
    const id = await seedOrder({ status: 'in_delivery' })
    const { error } = await refuse('buyer', id, 'buyer')
    expect(error?.code).toBe(DENIED)
    const { data: row } = await admin.from('orders').select('status, refusal_reason').eq('id', id).single()
    expect(row).toEqual({ status: 'in_delivery', refusal_reason: null })
  })

  it('a third party matches no row (RLS) and changes nothing', async () => {
    const id = await seedOrder({ status: 'in_delivery' })
    const { data, error } = await refuse('other', id)
    expect(error).toBeNull()
    expect(data).toEqual([])
    const { data: row } = await admin.from('orders').select('status, refusal_reason').eq('id', id).single()
    expect(row).toEqual({ status: 'in_delivery', refusal_reason: null })
  })

  it('once set: not changed, not cleared (42501); refusal_voided_at has no client grant; nothing leaves « cancelled »', async () => {
    const id = await seedOrder({ status: 'arrived' })
    expect((await refuse('seller', id)).error).toBeNull()
    const change = await clients.seller.from('orders').update({ refusal_reason: 'unreachable' }).eq('id', id).select('id')
    expect(change.error?.code).toBe(DENIED)
    const clear = await clients.seller.from('orders').update({ refusal_reason: null }).eq('id', id).select('id')
    expect(clear.error?.code).toBe(DENIED)
    const voidIt = await clients.seller.from('orders').update({ refusal_voided_at: new Date().toISOString() }).eq('id', id).select('id')
    expect(voidIt.error?.code).toBe(DENIED)
    const reopen = await clients.seller.from('orders').update({ status: 'arrived' }).eq('id', id).select('id')
    expect(reopen.error).not.toBeNull()
    const { data: row } = await admin.from('orders').select('status, refusal_reason, refusal_voided_at').eq('id', id).single()
    expect(row).toEqual({ status: 'cancelled', refusal_reason: 'refused_parcel', refusal_voided_at: null })
  })

  it('a client insert presetting refusal_reason or refusal_voided_at is refused (42501)', async () => {
    const withReason = await clients.buyer.from('orders').insert(productOrder({ refusal_reason: 'refused_parcel' })).select('id')
    expect(withReason.error?.code).toBe(DENIED)
    const withVoid = await clients.buyer.from('orders').insert(productOrder({ refusal_voided_at: new Date().toISOString() })).select('id')
    expect(withVoid.error?.code).toBe(DENIED)
  })

  it('the phone reveal survives a refusal, both ways', async () => {
    // Only the refused order may link the two: any other open order between them would unlock the phone by itself.
    const { error: delErr } = await admin.from('orders').delete().eq('buyer_id', ids.buyer)
    expect(delErr).toBeNull()
    const id = await seedOrder({ status: 'dispatched' })
    expect((await refuse('seller', id)).error).toBeNull()
    const toBuyer = await clients.seller.rpc('get_contact_phone', { target: ids.buyer })
    expect(toBuyer.data).toBe(BUYER_PHONE)
    const toSeller = await clients.buyer.rpc('get_contact_phone', { target: ids.seller })
    expect(toSeller.data).toBe(SELLER_PHONE)
  })
})

// ─── the contest ─────────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('the contest — a buyer dispute refusal_contested within 14 days of the refusal', () => {
  it('13 days after the refusal: filed', async () => {
    const id = await seedRefusal(13)
    const { data, error } = await contest('buyer', id)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('15 days after: refused 23514 contest_window_closed', async () => {
    const id = await seedRefusal(15)
    const { error } = await contest('buyer', id)
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('contest_window_closed')
  })

  it('a cancellation that is no refusal, and a voided refusal: contest_not_refusal', async () => {
    const plain = await seedOrder({ status: 'cancelled', cancelled_by: 'seller', cancellation_reason: 'Rupture', cancelled_at: tunisNoonDaysAgo(2) })
    expect((await contest('buyer', plain)).error?.hint).toBe('contest_not_refusal')
    const voided = await seedRefusal(2)
    const { error: vErr } = await admin.from('orders').update({ refusal_voided_at: new Date().toISOString() }).eq('id', voided)
    expect(vErr).toBeNull()
    expect((await contest('buyer', voided)).error?.hint).toBe('contest_not_refusal')
  })

  it('a third party « contesting » someone else’s order gets 42501, never a hint about that order’s refusal', async () => {
    const live = await seedRefusal(2)
    const old = await seedRefusal(20)
    for (const id of [live, old]) {
      const { error } = await contest('other', id)
      expect(error?.code).toBe(DENIED)
      expect(error?.hint ?? null).toBeNull()
    }
  })

  it('the seller cannot file it (contest_buyer_only)', async () => {
    const id = await seedRefusal(2)
    const { error } = await contest('seller', id, 'seller')
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('contest_buyer_only')
  })

  it('one active contest per order (23505); a seller’s own dispute does not block the buyer’s contest', async () => {
    const id = await seedRefusal(2)
    const sellerDispute = await contest('seller', id, 'seller', 'payment_refused')
    expect(sellerDispute.error).toBeNull()
    expect((await contest('buyer', id)).error).toBeNull()
    expect((await contest('buyer', id)).error?.code).toBe('23505')
    const second = await contest('seller', id, 'seller', 'buyer_unreachable')
    expect(second.error?.code).toBe('23505')
  })
})

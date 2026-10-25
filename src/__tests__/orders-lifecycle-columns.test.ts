/**
 * Live-DB proof for db/migrations/20261025222218_order_lifecycle_columns.sql — pre-launch security batch
 * PR-3 item E1 (architect decisions 12–13, 2026-10-25) — plus item F, the seller-cancel path.
 *
 * E1, trg_enforce_order_lifecycle_columns, for callers with a JWT (admins included):
 *   * received_at = now() on the transition into 'received' — with or without a client value (the
 *     browser sends one until H8 PR-2 ships; that value is discarded) — and unchanged on every other
 *     write;
 *   * cancelled_by / cancellation_reason change only inside the transition into 'cancelled'; any other
 *     change is refused 42501.
 *   Without a JWT (service role, fixtures) explicit values are kept, and an order inserted at
 *   'received' with no timestamp is still stamped.
 * F: the seller cancel WITHOUT cancelled_at succeeds and trg_set_cancelled_at_on_transition stamps it;
 *   naming cancelled_at fails for the whole statement (authenticated holds no UPDATE on it).
 *
 * A stamp is proved exact, not approximate: orders_set_updated_at stamps updated_at with the same
 * transaction's now(), so a database-stamped received_at / cancelled_at EQUALS updated_at.
 *
 * Admins: orders has no admin UPDATE policy, so an admin UPDATE on someone else's order matches 0 rows
 * under RLS and never reaches the trigger — asserting on it would be vacuous. The one path where an
 * admin JWT reaches the trigger today is an INSERT as buyer (migration 54 exempts admins from its tier
 * 2), which is what pins "admins are treated like any client" below.
 *
 * Every order is inserted through the buyer's own session and advanced by the seller through the real
 * transitions (check_order_status_transition refuses a status change without a JWT, so fixtures cannot
 * shortcut it). Fixtures (all `pl-ord-`, password random per run: the repo is public and this suite
 * promotes an admin in production): a shop owner, a buyer and an admin; one shop and one product.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/orders-lifecycle-columns.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>
type OrderInsert = Database['public']['Tables']['orders']['Insert']
type OrderUpdate = Database['public']['Tables']['orders']['Update']

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'pl-ord-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Pl-${randomUUID()}-Aa1!`
const TITLE = `Order lifecycle test ${RUN}`

const FORGED = '2001-01-01T00:00:00+00:00'
const REASON = 'Rupture de stock'
// The two refusals under test, pinned by text so another rejection can't pass for them.
const CANCEL_LOCKED = "Les informations d'annulation ne peuvent pas être modifiées."
const NO_COLUMN_GRANT = 'permission denied for table orders'

const noSession = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds
  ? createClient<Database>(url, serviceKey, noSession)
  : (undefined as unknown as Client)

async function signIn(local: string): Promise<Client> {
  const client = createClient<Database>(url, anonKey, noSession)
  const { error } = await client.auth.signInWithPassword({ email: email(local), password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Order Lifecycle Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

// The exact payload shape of demander/[id]/actions.ts — submitProductRequest. seller_id is NOT NULL,
// so the generated Insert type requires it, but the real payload never sends it:
// trg_enforce_order_insert_integrity (migration 54) derives it from the product. Hence the one cast.
function productOrder(overrides: Partial<OrderInsert> = {}): OrderInsert {
  const payload: Omit<OrderInsert, 'seller_id'> = {
    buyer_id: buyerId,
    order_type: 'product',
    product_id: productId,
    service_listing_id: null,
    status: 'pending',
    delivery_name: 'Test Buyer',
    delivery_address: 'Rue test',
    delivery_phone: '+21620000001',
    quantity: 1,
    buyer_note: null,
    ...overrides,
  }
  return payload as OrderInsert
}

async function placeOrder(): Promise<string> {
  const { data, error } = await buyerClient.from('orders').insert(productOrder()).select('id').single()
  if (error || !data) throw new Error(`order insert failed: ${error?.message}`)
  return data.id
}

// The product chain, driven by the seller exactly as advanceOrderAction does.
async function advanceToArrived(orderId: string): Promise<void> {
  for (const status of ['accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived']) {
    const { error } = await sellerClient.from('orders').update({ status }).eq('id', orderId)
    if (error) throw new Error(`advance to ${status} failed: ${error.message}`)
  }
}

type Lifecycle = {
  status: string
  received_at: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  updated_at: string
}

const LIFECYCLE = 'status, received_at, cancelled_at, cancelled_by, cancellation_reason, updated_at'

// Ground truth, read with the service role.
async function lifecycle(orderId: string): Promise<Lifecycle> {
  const { data, error } = await admin.from('orders').select(LIFECYCLE).eq('id', orderId).single()
  if (error || !data) throw new Error(`lifecycle read failed: ${error?.message}`)
  return data
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// The fixture product is live on production during the run, so a real customer could order it. Deleting
// the fixture seller would then take that order with it — orders.seller_id is ON DELETE CASCADE, and RI
// cascades run breadth-first, so it goes before any product_id SET NULL could trip a CHECK. So: refuse
// to tear down at all while a non-fixture order points at a fixture seller (resolve by hand). Then the
// fixture orders, deleted by BUYER (order_events / disputes cascade from orders); admin_audit_log next —
// admin_id is ON DELETE RESTRICT; then the users (cascades profiles -> shops -> products).
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return

  const { data: outside, error: outsideErr } = await admin
    .from('orders')
    .select('id')
    .in('seller_id', ids)
    .not('buyer_id', 'in', `(${ids.join(',')})`)
  if (outsideErr) throw new Error(`teardown safety check failed: ${outsideErr.message}`)
  if ((outside ?? []).length > 0) {
    throw new Error(
      `teardown REFUSED: ${outside?.length} non-fixture order(s) reference a ${PREFIX} seller — a real ` +
        'customer ordered the live fixture product during the run. Resolve by hand; never force-delete.',
    )
  }

  // Every fixture order's buyer is a fixture user (the buyer, or the admin buying as itself).
  const { error: orderErr } = await admin.from('orders').delete().in('buyer_id', ids)
  if (orderErr) throw new Error(`orders cleanup failed: ${orderErr.message}`)
  const { error: auditErr } = await admin.from('admin_audit_log').delete().in('admin_id', ids)
  if (auditErr) throw new Error(`admin_audit_log cleanup failed: ${auditErr.message}`)
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let buyerId: string
let adminId: string
let productId: string

let sellerClient: Client
let buyerClient: Client
let adminClient: Client

// R1 / R2 reach 'arrived' and are received in the tests; N1 stays pending; C1–C3 are cancelled.
let orderR1: string
let orderR2: string
let orderN1: string
let orderC1: string
let orderC2: string
let orderC3: string

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  const sellerId = await createUser('seller')
  buyerId = await createUser('buyer')
  adminId = await createUser('admin')

  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)
  const { error: sellerErr } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', sellerId)
  if (sellerErr) throw new Error(`seller upgrade failed: ${sellerErr.message}`)

  const { data: shop, error: shopErr } = await admin
    .from('shops')
    .insert({ owner_id: sellerId, name: `${TITLE} — shop` })
    .select('id')
    .single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  const { data: product, error: productErr } = await admin
    .from('products')
    .insert({ shop_id: shop.id, title: `${TITLE} — product`, price_tnd: 30, status: 'active' })
    .select('id')
    .single()
  if (productErr || !product) throw new Error(`product insert failed: ${productErr?.message}`)
  productId = product.id

  sellerClient = await signIn('seller')
  buyerClient = await signIn('buyer')
  adminClient = await signIn('admin')

  orderR1 = await placeOrder()
  orderR2 = await placeOrder()
  orderN1 = await placeOrder()
  orderC1 = await placeOrder()
  orderC2 = await placeOrder()
  orderC3 = await placeOrder()
  await advanceToArrived(orderR1)
  await advanceToArrived(orderR2)
}, 180000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  // Cleanup verified by a read, not assumed.
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 120000)

describe.skipIf(!hasCreds)('ground truth', () => {
  it('R1 and R2 are arrived, N1 and C1–C3 pending, none carries a lifecycle value yet', async () => {
    for (const id of [orderR1, orderR2]) expect((await lifecycle(id)).status).toBe('arrived')
    for (const id of [orderN1, orderC1, orderC2, orderC3]) {
      expect(await lifecycle(id)).toMatchObject({
        status: 'pending',
        received_at: null,
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
      })
    }
  })
})

describe.skipIf(!hasCreds)('E1 — received_at is the database’s', () => {
  it('buyer confirms arrived → received WITHOUT received_at (H8 PR-2 payload): stamped by the database', async () => {
    const { data, error } = await buyerClient
      .from('orders')
      .update({ status: 'received' })
      .eq('id', orderR1)
      .select(LIFECYCLE)
      .single()
    expect(error).toBeNull()
    expect(data?.status).toBe('received')
    expect(data?.received_at).not.toBeNull()
    expect(data?.received_at).toBe(data?.updated_at) // same transaction's now()
  })

  it('a client-supplied received_at on the receipt (today’s browser payload) is discarded', async () => {
    const { data, error } = await buyerClient
      .from('orders')
      .update({ status: 'received', received_at: FORGED })
      .eq('id', orderR2)
      .select(LIFECYCLE)
      .single()
    expect(error).toBeNull()
    expect(data?.received_at).not.toBe(FORGED)
    expect(data?.received_at).toBe(data?.updated_at)
  })

  it('afterwards neither party moves it, and the write is silently discarded', async () => {
    const before = await lifecycle(orderR1)
    for (const client of [buyerClient, sellerClient]) {
      // .select proves the row matched — the trigger ran and discarded the value, RLS did not filter it.
      const { data, error } = await client.from('orders').update({ received_at: FORGED }).eq('id', orderR1).select('id')
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    }
    expect((await lifecycle(orderR1)).received_at).toBe(before.received_at)
  })

  it('a seller cannot plant received_at on an order that is not received', async () => {
    const { data, error } = await sellerClient.from('orders').update({ received_at: FORGED }).eq('id', orderN1).select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect((await lifecycle(orderN1)).received_at).toBeNull()
  })

  it('an admin JWT is treated like any client: inserting at received as buyer stamps now(), not its value', async () => {
    const { data, error } = await adminClient
      .from('orders')
      .insert(productOrder({ buyer_id: adminId, status: 'received', received_at: FORGED }))
      .select('received_at, created_at')
      .single()
    expect(error).toBeNull()
    expect(data?.received_at).not.toBe(FORGED)
    expect(data?.received_at).toBe(data?.created_at) // created_at defaults to the same now()
  })

  it('without a JWT: an order inserted at received is stamped, and an explicit value is kept', async () => {
    const { data: stamped, error: stampErr } = await admin
      .from('orders')
      .insert(productOrder({ status: 'received' }))
      .select('received_at')
      .single()
    expect(stampErr).toBeNull()
    expect(stamped?.received_at).not.toBeNull()

    const { data: kept, error: keptErr } = await admin
      .from('orders')
      .insert(productOrder({ status: 'received', received_at: FORGED }))
      .select('id, received_at')
      .single()
    expect(keptErr).toBeNull()
    expect(kept?.received_at).toBe(FORGED)
    if (!kept) throw new Error('system insert returned no row')

    // The data-fix path stays open to the service role.
    const corrected = '2026-10-01T09:00:00+00:00'
    const { error: fixErr } = await admin.from('orders').update({ received_at: corrected }).eq('id', kept.id)
    expect(fixErr).toBeNull()
    expect((await lifecycle(kept.id)).received_at).toBe(corrected)
  })
})

describe.skipIf(!hasCreds)('F — the seller cancel path', () => {
  it('seller cancels WITHOUT cancelled_at: succeeds, and trg_set_cancelled_at_on_transition stamps it', async () => {
    const { data, error } = await sellerClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_by: 'seller', cancellation_reason: REASON })
      .eq('id', orderC1)
      .select(LIFECYCLE)
      .single()
    expect(error).toBeNull()
    expect(data).toMatchObject({ status: 'cancelled', cancelled_by: 'seller', cancellation_reason: REASON })
    expect(data?.cancelled_at).toBe(data?.updated_at)
  })

  it('the same UPDATE naming cancelled_at fails for the whole statement — no column grant', async () => {
    const { error } = await sellerClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_by: 'seller', cancellation_reason: REASON, cancelled_at: new Date().toISOString() })
      .eq('id', orderC2)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NO_COLUMN_GRANT)
    expect((await lifecycle(orderC2)).status).toBe('pending')
  })

  it('the buyer cancel (CancelOrderModal payload) still works and is stamped', async () => {
    const { data, error } = await buyerClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_by: 'buyer', cancellation_reason: null })
      .eq('id', orderC3)
      .select(LIFECYCLE)
      .single()
    expect(error).toBeNull()
    expect(data?.cancelled_by).toBe('buyer')
    expect(data?.cancelled_at).toBe(data?.updated_at)
  })
})

describe.skipIf(!hasCreds)('E1 — cancel metadata is written once', () => {
  it('after the cancel, both parties are refused, and nothing moves', async () => {
    const before = await lifecycle(orderC1)
    const attempts: Array<[Client, OrderUpdate]> = [
      [buyerClient, { cancelled_by: 'buyer' }], // a buyer cleaning their cancellation history
      [sellerClient, { cancelled_by: 'buyer' }], // a seller framing the buyer
      [sellerClient, { cancellation_reason: 'Raison réécrite' }],
    ]
    for (const [client, change] of attempts) {
      const { error } = await client.from('orders').update(change).eq('id', orderC1)
      expect(error?.code).toBe('42501')
      expect(error?.message).toBe(CANCEL_LOCKED)
    }
    expect(await lifecycle(orderC1)).toEqual(before)
  })

  it('on a live order, neither party can write cancel metadata without cancelling', async () => {
    const buyerTry = await buyerClient.from('orders').update({ cancelled_by: 'seller' }).eq('id', orderN1)
    expect(buyerTry.error?.message).toBe(CANCEL_LOCKED)
    const sellerTry = await sellerClient.from('orders').update({ cancellation_reason: REASON }).eq('id', orderN1)
    expect(sellerTry.error?.message).toBe(CANCEL_LOCKED)
    expect(await lifecycle(orderN1)).toMatchObject({ status: 'pending', cancelled_by: null, cancellation_reason: null })
  })

  it('repeating the identical cancel is a no-op, not a refusal, and cancelled_at does not move', async () => {
    const before = await lifecycle(orderC1)
    const { data, error } = await sellerClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_by: 'seller', cancellation_reason: REASON })
      .eq('id', orderC1)
      .select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect((await lifecycle(orderC1)).cancelled_at).toBe(before.cancelled_at)
  })

  it('the service role can still correct cancel metadata (the data-fix path)', async () => {
    const { error } = await admin.from('orders').update({ cancellation_reason: 'Correction support' }).eq('id', orderC1)
    expect(error).toBeNull()
    expect((await lifecycle(orderC1)).cancellation_reason).toBe('Correction support')
  })
})

/**
 * Correctness + visibility tests for the refined buyer_cancellation_history view
 * (PR-W, migration 20260609150153).
 *
 * Two things under test:
 *   1. COUNTING — cancellations_by_buyer_after_pivot must count ONLY buyer-initiated
 *      post-pivot cancellations. The bug this PR fixes: the old view counted any
 *      cancellation with a reason, so a SELLER's post-pivot cancel (which also
 *      requires a reason) was wrongly charged to the buyer. The key assertion below
 *      is that metric = 1, not 2.
 *   2. VISIBILITY — the view is security_invoker=true, so it inherits orders RLS:
 *      a buyer sees their own GLOBAL stats; a seller sees only the slice of orders
 *      they share with that buyer; an unrelated user sees nothing; anon is denied
 *      outright (SELECT was revoked from anon).
 *
 * Pattern: live-DB, service role for fixtures/teardown only; anon + signed-in
 * clients make every assertion. Cancelled orders are INSERTed directly with their
 * terminal fields — the BEFORE UPDATE role-gating trigger blocks service-role
 * status transitions, but INSERT bypasses it (there is no BEFORE INSERT trigger).
 *
 * Run: npx vitest run src/__tests__/buyer-cancellation-history.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!url || !serviceKey || !anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'bch-'
const PASSWORD = 'Rls-Config-Test-7k2!' // ephemeral test users only; never a real account

const admin: SupabaseClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anon: SupabaseClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${email}: ${error.message}`)
  return client
}

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: `${EMAIL_PREFIX}${local}${EMAIL_SUFFIX}`,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'BCH Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

// Make a user a shop owner with one product; returns the product id for orders.
async function makeSellerWithProduct(sellerId: string): Promise<string> {
  const { error: upErr } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', sellerId)
  if (upErr) throw new Error(`seller upgrade failed: ${upErr.message}`)
  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: sellerId, name: 'BCH Shop' }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  const { data: product, error: prodErr } = await admin
    .from('products').insert({ shop_id: shop.id, title: 'BCH Product', price_tnd: 10, status: 'active' }).select('id').single()
  if (prodErr || !product) throw new Error(`product insert failed: ${prodErr?.message}`)
  return product.id
}

type OrderSeed = {
  buyerId: string
  sellerId: string
  productId: string
  status: string
  cancelledBy?: 'buyer' | 'seller'
  reason?: string | null
  cancelledAt?: string | null
}

async function insertOrder(o: OrderSeed): Promise<void> {
  const { error } = await admin.from('orders').insert({
    buyer_id: o.buyerId,
    seller_id: o.sellerId,
    order_type: 'product',
    product_id: o.productId,
    status: o.status,
    cancelled_by: o.cancelledBy ?? null,
    cancellation_reason: o.reason ?? null,
    cancelled_at: o.cancelledAt ?? null,
  })
  if (error) throw new Error(`order insert failed: ${error.message}`)
}

// Idempotent teardown, surgical to this file's prefix. Deleting the user cascades
// profiles -> shops/products/orders (all ON DELETE CASCADE).
async function teardown() {
  const { data, error } = await admin
    .from('profiles').select('id').like('email', `${EMAIL_PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

// ─── shared state ─────────────────────────────────────────────────────────────
let buyerC: string
let buyerV: string
// correctness row (queried as buyerC)
let cRow: Record<string, unknown>
// visibility rows
let vBuyerRow: Record<string, unknown>            // as buyerV (global)
let vSellerRow: Record<string, unknown>           // as sellerV1 (own-relationship slice)
let vUnrelatedRows: unknown[]                       // as an unrelated user

beforeAll(async () => {
  await teardown() // teardown-first: recover from any crashed prior run

  // ── CORRECTNESS fixture: buyerC has 4 orders against one seller ──────────────
  buyerC = await createUser('buyerc')
  const sellerC = await createUser('sellerc')
  const productC = await makeSellerWithProduct(sellerC)

  // 1) pre-pivot cancel by buyer (no reason) — counts toward by_buyer, NOT after_pivot
  await insertOrder({ buyerId: buyerC, sellerId: sellerC, productId: productC, status: 'cancelled', cancelledBy: 'buyer', reason: null, cancelledAt: '2026-06-08T10:00:00.000Z' })
  // 2) post-pivot cancel by buyer (with reason) — THE serial-refuser case
  await insertOrder({ buyerId: buyerC, sellerId: sellerC, productId: productC, status: 'cancelled', cancelledBy: 'buyer', reason: 'changed my mind after dispatch', cancelledAt: '2026-06-09T10:00:00.000Z' })
  // 3) post-pivot cancel by SELLER (with reason) — must NOT count against the buyer
  await insertOrder({ buyerId: buyerC, sellerId: sellerC, productId: productC, status: 'cancelled', cancelledBy: 'seller', reason: 'out of stock after dispatch', cancelledAt: '2026-06-09T11:00:00.000Z' })
  // 4) a completed order
  await insertOrder({ buyerId: buyerC, sellerId: sellerC, productId: productC, status: 'received' })

  // ── VISIBILITY fixture: buyerV cancels (buyer, post-pivot) against TWO sellers ─
  buyerV = await createUser('buyerv')
  const sellerV1 = await createUser('sellerv1')
  const sellerV2 = await createUser('sellerv2')
  await createUser('unrelated')
  const productV1 = await makeSellerWithProduct(sellerV1)
  const productV2 = await makeSellerWithProduct(sellerV2)
  await insertOrder({ buyerId: buyerV, sellerId: sellerV1, productId: productV1, status: 'cancelled', cancelledBy: 'buyer', reason: 'post-dispatch cancel', cancelledAt: '2026-06-09T12:00:00.000Z' })
  await insertOrder({ buyerId: buyerV, sellerId: sellerV2, productId: productV2, status: 'cancelled', cancelledBy: 'buyer', reason: 'post-dispatch cancel', cancelledAt: '2026-06-09T13:00:00.000Z' })

  // ── fetch rows through each persona's own RLS context ───────────────────────
  const clientBuyerC = await signIn(`${EMAIL_PREFIX}buyerc${EMAIL_SUFFIX}`)
  const clientBuyerV = await signIn(`${EMAIL_PREFIX}buyerv${EMAIL_SUFFIX}`)
  const clientSellerV1 = await signIn(`${EMAIL_PREFIX}sellerv1${EMAIL_SUFFIX}`)
  const clientUnrelated = await signIn(`${EMAIL_PREFIX}unrelated${EMAIL_SUFFIX}`)

  const cRes = await clientBuyerC.from('buyer_cancellation_history').select('*').eq('buyer_id', buyerC).single()
  if (cRes.error) throw new Error(`correctness fetch failed: ${cRes.error.message}`)
  cRow = cRes.data as Record<string, unknown>

  const vbRes = await clientBuyerV.from('buyer_cancellation_history').select('*').eq('buyer_id', buyerV).single()
  if (vbRes.error) throw new Error(`visibility buyer fetch failed: ${vbRes.error.message}`)
  vBuyerRow = vbRes.data as Record<string, unknown>

  const vsRes = await clientSellerV1.from('buyer_cancellation_history').select('*').eq('buyer_id', buyerV).single()
  if (vsRes.error) throw new Error(`visibility seller fetch failed: ${vsRes.error.message}`)
  vSellerRow = vsRes.data as Record<string, unknown>

  const vuRes = await clientUnrelated.from('buyer_cancellation_history').select('*').eq('buyer_id', buyerV)
  if (vuRes.error) throw new Error(`visibility unrelated fetch failed: ${vuRes.error.message}`)
  vUnrelatedRows = vuRes.data ?? []
}, 90000)

afterAll(async () => {
  await teardown()
}, 60000)

// ─── COUNTING correctness ─────────────────────────────────────────────────────

describe('buyer_cancellation_history — counting', () => {
  it('total_orders counts every order the buyer placed', () => {
    expect(Number(cRow.total_orders)).toBe(4)
  })

  it('cancellations_total counts all cancellations regardless of initiator', () => {
    expect(Number(cRow.cancellations_total)).toBe(3)
  })

  it('cancellations_by_buyer counts buyer-initiated cancels in any phase', () => {
    expect(Number(cRow.cancellations_by_buyer)).toBe(2)
  })

  it('cancellations_by_buyer_after_pivot EXCLUDES the seller-initiated post-pivot cancel (the bug fix)', () => {
    // 1 buyer post-pivot cancel — NOT 2. The seller-initiated post-pivot cancel
    // (which also carries a reason) must not be charged to the buyer.
    expect(Number(cRow.cancellations_by_buyer_after_pivot)).toBe(1)
  })

  it('last_buyer_cancelled_at is set from the buyer-initiated cancellations', () => {
    expect(cRow.last_buyer_cancelled_at).not.toBeNull()
  })
})

// ─── VISIBILITY (security_invoker boundary) ───────────────────────────────────

describe('buyer_cancellation_history — visibility', () => {
  it('buyer sees their own GLOBAL stats across all sellers', () => {
    expect(Number(vBuyerRow.cancellations_by_buyer_after_pivot)).toBe(2)
  })

  it('seller sees only their own-relationship slice, not the global count', () => {
    expect(Number(vSellerRow.cancellations_by_buyer_after_pivot)).toBe(1)
  })

  it('an unrelated authenticated user sees zero rows for the buyer', () => {
    expect(vUnrelatedRows).toHaveLength(0)
  })

  it('anon is denied (SELECT revoked from anon)', async () => {
    const { error } = await anon.from('buyer_cancellation_history').select('*').eq('buyer_id', buyerV)
    expect(error).not.toBeNull()
  })
})

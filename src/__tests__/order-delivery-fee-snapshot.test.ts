/**
 * Trigger-behaviour tests for `delivery_fee_tnd` (migration 20260801112027).
 *
 * This PR ships a DB behaviour, not a UI, so the test asserts the DB behaviour directly.
 * `set_order_snapshot` freezes the fee at INSERT; three properties have to hold:
 *
 *   1. A PRODUCT order lands the product's own fee — not the column DEFAULT, and not
 *      whatever the client posted. The fixture product carries 12.50 precisely so a
 *      passing assertion cannot be explained by the DEFAULT 7.
 *   2. A SERVICE order lands NULL. A service has no parcel, so it has no carrier fee.
 *   3. A client-supplied fee on a SERVICE order is OVERWRITTEN, not rejected. This is
 *      the subtle one: `orders_delivery_fee_requires_product` would reject a non-NULL
 *      fee on a service, but the BEFORE INSERT trigger nulls it first, so the CHECK is
 *      never reached with a bad value and the insert SUCCEEDS. A test that asserted a
 *      raised error here would be asserting the wrong contract.
 *
 * Plus the point of freezing at all: after the seller changes their rate, the existing
 * order still reads what was actually charged, while the next order reads the new rate.
 *
 * Money logic is must-test per the testing discipline. Live-DB suite — registered in
 * INTEGRATION_GLOBS, so `npm test` skips it and `npm run test:integration` runs it.
 * Service role is used for fixtures and teardown only; the trigger under test is
 * SECURITY DEFINER and fires identically on every insert path.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/order-delivery-fee-snapshot.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
)

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'dfee-'
const PASSWORD = 'Rls-Config-Test-7k2!' // ephemeral test users only; never a real account

// The fixture fee is deliberately NOT 7: a passing assertion must prove the trigger read
// products.delivery_fee_tnd, not that it happened to match the column DEFAULT.
const PRODUCT_FEE = 12.5
const RAISED_FEE = 20.0
// What a misbehaving client might post. Must never survive to the stored row.
const CLIENT_SUPPLIED_FEE = 99.99

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: `${EMAIL_PREFIX}${local}${EMAIL_SUFFIX}`,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'DFee Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

/** Shop owner + one product carrying an explicit fee. Returns the product id. */
async function makeShopWithProduct(sellerId: string, feeTnd: number | null): Promise<string> {
  const { error: upErr } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', sellerId)
  if (upErr) throw new Error(`seller upgrade failed: ${upErr.message}`)
  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: sellerId, name: 'DFee Shop' }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)

  // feeTnd === null ⇒ omit the column entirely so the DEFAULT applies. Passing an explicit
  // null would violate NOT NULL, which is a different assertion.
  const row: Record<string, unknown> = {
    shop_id: shop.id, title: 'DFee Product', price_tnd: 80, status: 'active',
  }
  if (feeTnd !== null) row.delivery_fee_tnd = feeTnd

  const { data: product, error: prodErr } = await admin
    .from('products').insert(row).select('id').single()
  if (prodErr || !product) throw new Error(`product insert failed: ${prodErr?.message}`)
  return product.id
}

/** Freelancer + one service listing. Returns the listing id. */
async function makeFreelancerWithService(sellerId: string): Promise<string> {
  const { error: upErr } = await admin.from('profiles').update({ seller_type: 'freelancer' }).eq('id', sellerId)
  if (upErr) throw new Error(`freelancer upgrade failed: ${upErr.message}`)
  const { data: fp, error: fpErr } = await admin
    .from('freelancer_profiles').insert({ profile_id: sellerId }).select('id').single()
  if (fpErr || !fp) throw new Error(`freelancer_profile insert failed: ${fpErr?.message}`)
  const { data: listing, error: lErr } = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: fp.id, title: 'DFee Service', starting_price_tnd: 150, status: 'active' })
    .select('id').single()
  if (lErr || !listing) throw new Error(`service_listing insert failed: ${lErr?.message}`)
  return listing.id
}

/** Insert an order and read back what the trigger actually stored. */
async function insertOrderReturningFee(row: Record<string, unknown>): Promise<number | null> {
  const { data, error } = await admin
    .from('orders').insert(row).select('id, delivery_fee_tnd').single()
  if (error || !data) throw new Error(`order insert failed: ${error?.message}`)
  const raw = (data as { delivery_fee_tnd: number | string | null }).delivery_fee_tnd
  // numeric arrives as a string over PostgREST on some paths — normalise before asserting.
  return raw == null ? null : Number(raw)
}

// Idempotent, surgical to this file's prefix. Deleting the user cascades
// profiles -> shops/products/orders and freelancer_profiles/service_listings.
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
let buyerId: string
let shopSellerId: string
let freelancerSellerId: string
let productId: string
let defaultProductId: string
let serviceListingId: string

describe.skipIf(!hasCreds)('delivery_fee_tnd — set_order_snapshot freeze', () => {
  beforeAll(async () => {
    await teardown()
    buyerId = await createUser('buyer')
    shopSellerId = await createUser('shop')
    freelancerSellerId = await createUser('free')
    productId = await makeShopWithProduct(shopSellerId, PRODUCT_FEE)
    serviceListingId = await makeFreelancerWithService(freelancerSellerId)

    // Second shop-owner product, fee omitted, to prove the DEFAULT is what backfills.
    const defaultSellerId = await createUser('dflt')
    defaultProductId = await makeShopWithProduct(defaultSellerId, null)
  }, 60000)

  afterAll(async () => {
    await teardown()
  }, 60000)

  it('freezes the PRODUCT fee onto the order — the product value, not the DEFAULT', async () => {
    const fee = await insertOrderReturningFee({
      buyer_id: buyerId, seller_id: shopSellerId,
      order_type: 'product', product_id: productId, status: 'pending', quantity: 1,
    })
    expect(fee).toBe(PRODUCT_FEE)
  })

  it('applies DEFAULT 7 to a product whose fee was never declared', async () => {
    const { data, error } = await admin
      .from('products').select('delivery_fee_tnd').eq('id', defaultProductId).single()
    expect(error).toBeNull()
    expect(Number(data!.delivery_fee_tnd)).toBe(7)
  })

  it('leaves a SERVICE order NULL — no parcel, no carrier fee', async () => {
    const fee = await insertOrderReturningFee({
      buyer_id: buyerId, seller_id: freelancerSellerId,
      order_type: 'service', service_listing_id: serviceListingId, status: 'pending',
    })
    expect(fee).toBeNull()
  })

  it('OVERWRITES a client-supplied fee on a service order rather than rejecting it', async () => {
    // The insert must SUCCEED. orders_delivery_fee_requires_product would reject a non-NULL
    // fee here, but the BEFORE INSERT trigger nulls it first, so the CHECK never sees it.
    const fee = await insertOrderReturningFee({
      buyer_id: buyerId, seller_id: freelancerSellerId,
      order_type: 'service', service_listing_id: serviceListingId, status: 'pending',
      delivery_fee_tnd: CLIENT_SUPPLIED_FEE,
    })
    expect(fee).toBeNull()
  })

  it('discards a client-supplied fee on a product order in favour of the product value', async () => {
    const fee = await insertOrderReturningFee({
      buyer_id: buyerId, seller_id: shopSellerId,
      order_type: 'product', product_id: productId, status: 'pending', quantity: 1,
      delivery_fee_tnd: CLIENT_SUPPLIED_FEE,
    })
    expect(fee).toBe(PRODUCT_FEE)
    expect(fee).not.toBe(CLIENT_SUPPLIED_FEE)
  })

  it('keeps the historical fee after the seller raises their rate, and charges the new rate next', async () => {
    const { data: existing, error: insErr } = await admin
      .from('orders')
      .insert({
        buyer_id: buyerId, seller_id: shopSellerId,
        order_type: 'product', product_id: productId, status: 'pending', quantity: 1,
      })
      .select('id').single()
    if (insErr || !existing) throw new Error(`setup order insert failed: ${insErr?.message}`)

    const { error: upErr } = await admin
      .from('products').update({ delivery_fee_tnd: RAISED_FEE }).eq('id', productId)
    expect(upErr).toBeNull()

    // The order placed BEFORE the change still shows what was actually charged.
    const { data: frozen } = await admin
      .from('orders').select('delivery_fee_tnd').eq('id', existing.id).single()
    expect(Number(frozen!.delivery_fee_tnd)).toBe(PRODUCT_FEE)

    // The next order picks up the new rate.
    const nextFee = await insertOrderReturningFee({
      buyer_id: buyerId, seller_id: shopSellerId,
      order_type: 'product', product_id: productId, status: 'pending', quantity: 1,
    })
    expect(nextFee).toBe(RAISED_FEE)
  })
})

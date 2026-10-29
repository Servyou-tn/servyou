/**
 * Live-DB proof for db/migrations/PENDING_orders_buyer_cancel_product_only.sql (architect brief 2026-10-29 step 2a;
 * founder ruling E4 / #233). Written while PENDING: red before apply (the buyer's direct PATCH cancels a service
 * order), all green after.
 *
 *   refused — the buyer moving their own SERVICE order to 'cancelled', pending or accepted (with a reason): 42501,
 *             hint buyer_cancel_service, the order unchanged. This is the PostgREST write cancelOrderAction never sees
 *             (and the one src/components/CancelOrderModal.tsx sends from the browser).
 *   kept    — the freelancer cancelling a service order; the buyer cancelling a PRODUCT order.
 *
 * Fixtures (all `bcancel-`, password random per run): a freelancer with one active service, a shop owner with one
 * active product, a buyer. Both items are orderable while this runs, hence the teardown guard.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/order-cancel-buyer-service.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'

type Client = SupabaseClient<Database>
type OrderInsert = Database['public']['Tables']['orders']['Insert']

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'bcancel-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Bc-${randomUUID()}-Aa1!`

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

let buyerId: string
let freelancerId: string
let shopOwnerId: string
let serviceId: string
let productId: string
let buyer: Client
let freelancer: Client

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'BCancel Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

async function signIn(local: string): Promise<Client> {
  const client = createClient<Database>(url, anonKey, opts)
  const { error } = await client.auth.signInWithPassword({ email: email(local), password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

// The demander actions' shapes; the order starts 'pending' and seller_id is derived by the insert trigger.
async function placeServiceOrder(): Promise<string> {
  const row = { buyer_id: buyerId, order_type: 'service', service_listing_id: serviceId, product_id: null, status: 'pending', delivery_phone: '+21620000000', buyer_note: 'Test' }
  const { data, error } = await buyer.from('orders').insert(row as OrderInsert).select('id').single()
  if (error || !data) throw new Error(`service order failed: ${error?.message}`)
  return data.id
}
async function placeProductOrder(): Promise<string> {
  const row = { buyer_id: buyerId, order_type: 'product', product_id: productId, service_listing_id: null, status: 'pending', quantity: 1, delivery_name: 'BCancel Test', delivery_address: 'Rue de test, Tunis', delivery_phone: '+21620000000' }
  const { data, error } = await buyer.from('orders').insert(row as OrderInsert).select('id').single()
  if (error || !data) throw new Error(`product order failed: ${error?.message}`)
  return data.id
}

// cancelOrderAction's write (and CancelOrderModal's): status + cancelled_by + reason.
const cancel = (client: Client, orderId: string, by: 'buyer' | 'seller', reason: string | null = null) =>
  client.from('orders').update({ status: 'cancelled', cancelled_by: by, cancellation_reason: reason }).eq('id', orderId).select('id')

async function statusOf(orderId: string): Promise<string | undefined> {
  const { data } = await admin.from('orders').select('status').eq('id', orderId).single()
  return data?.status
}

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return
  await refuseTeardownOnForeignOrders(admin, ids, PREFIX)
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  buyerId = await createUser('buyer')
  freelancerId = await createUser('freelancer')
  shopOwnerId = await createUser('shop')

  const up1 = await admin.from('profiles').update({ seller_type: 'freelancer' }).eq('id', freelancerId)
  if (up1.error) throw new Error(`freelancer upgrade failed: ${up1.error.message}`)
  const fp = await admin.from('freelancer_profiles').insert({ profile_id: freelancerId }).select('id').single()
  if (fp.error || !fp.data) throw new Error(`freelancer_profile failed: ${fp.error?.message}`)
  const sl = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: fp.data.id, title: `BCancel Service ${RUN}`, starting_price_tnd: 150, status: 'active' })
    .select('id').single()
  if (sl.error || !sl.data) throw new Error(`service_listing failed: ${sl.error?.message}`)
  serviceId = sl.data.id

  const up2 = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', shopOwnerId)
  if (up2.error) throw new Error(`shop owner upgrade failed: ${up2.error.message}`)
  const shop = await admin.from('shops').insert({ owner_id: shopOwnerId, name: `BCancel Shop ${RUN}` }).select('id').single()
  if (shop.error || !shop.data) throw new Error(`shop failed: ${shop.error?.message}`)
  const pr = await admin
    .from('products')
    .insert({ shop_id: shop.data.id, title: `BCancel Product ${RUN}`, price_tnd: 80, status: 'active', tracks_stock: false })
    .select('id').single()
  if (pr.error || !pr.data) throw new Error(`product failed: ${pr.error?.message}`)
  productId = pr.data.id

  buyer = await signIn('buyer')
  freelancer = await signIn('freelancer')
}, 180_000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count } = await admin
    .from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  expect(count).toBe(0)
  const { count: orders } = await admin
    .from('orders').select('id', { count: 'exact', head: true }).in('buyer_id', [buyerId, freelancerId, shopOwnerId])
  expect(orders).toBe(0)
}, 180_000)

describe.skipIf(!hasCreds)('a buyer cannot cancel a service order', () => {
  it('pending: refused 42501 buyer_cancel_service, with the app’s wording; the order stays pending', async () => {
    const orderId = await placeServiceOrder()
    const { error } = await cancel(buyer, orderId, 'buyer')
    expect(error?.code).toBe('42501')
    expect(error?.hint).toBe('buyer_cancel_service')
    expect(error?.message).toBe('Une demande de service ne peut pas être annulée par le client. Contactez le freelance si besoin.')
    expect(await statusOf(orderId)).toBe('pending')
  })

  it('accepted, with a reason: refused the same way; the order stays accepted', async () => {
    const orderId = await placeServiceOrder()
    const accept = await freelancer.from('orders').update({ status: 'accepted' }).eq('id', orderId).select('id')
    expect(accept.error).toBeNull()
    expect(accept.data).toHaveLength(1)
    const { error } = await cancel(buyer, orderId, 'buyer', 'Je ne suis plus disponible.')
    expect(error?.hint).toBe('buyer_cancel_service')
    expect(await statusOf(orderId)).toBe('accepted')
  })
})

describe.skipIf(!hasCreds)('unchanged', () => {
  it('the freelancer can still cancel a service order', async () => {
    const orderId = await placeServiceOrder()
    const { error, data } = await cancel(freelancer, orderId, 'seller')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(await statusOf(orderId)).toBe('cancelled')
  })

  it('the buyer can still cancel a product order', async () => {
    const orderId = await placeProductOrder()
    const { error, data } = await cancel(buyer, orderId, 'buyer')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(await statusOf(orderId)).toBe('cancelled')
  })
})

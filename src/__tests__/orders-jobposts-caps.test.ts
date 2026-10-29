/**
 * Live-DB proof for db/migrations/PENDING_orders_rate_limit.sql and PENDING_job_posts_cap.sql (architect brief
 * 2026-10-29 steps 2 + 3; pre-launch security audit pass 1 findings 2 + 3). Written while both were PENDING: red
 * before apply, all green after.
 *
 *   orders    — 5 PENDING orders per buyer per seller (23514 order_cap_seller; another seller is a different key;
 *               an order leaving 'pending' frees the slot); 20 orders per buyer per rolling 24 h, every status
 *               (23514 order_cap_daily; rows older than 24 h do not count); a spoofed buyer_id is refused by RLS
 *               (42501), never answered with a cap; service role is not capped; 8 parallel inserts file exactly 5.
 *   job_posts — 5 OPEN posts per consumer (23514 job_post_cap_open), on create AND on « Rouvrir » (filled -> open);
 *               closing one frees a slot; posts past the 30-day life do not count; 10 created per 24 h, every
 *               status (23514 job_post_cap_daily); spoofed consumer_id -> 42501; 7 parallel inserts file exactly 5.
 * Every cap answer is also run through the app's mapper (lib/marche/cap-refusal.ts).
 *
 * Fixtures (all `caps-`, password random per run): two shop owners with one live product each, four buyers, four
 * consumers. The fixture products and the open fixture posts are public while this runs, hence both teardown guards.
 * Bulk rows that only exist to reach a count are seeded by the service role (never refused, but counted).
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/orders-jobposts-caps.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { orderCapKey, jobPostCapKey } from '@/lib/marche/cap-refusal'
import { refuseTeardownOnForeignOrders, refuseTeardownOnForeignResponses } from './live-teardown-guard'

type Client = SupabaseClient<Database>
type OrderInsert = Database['public']['Tables']['orders']['Insert']
type PostInsert = Database['public']['Tables']['job_posts']['Insert']

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'caps-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Cp-${randomUUID()}-Aa1!`
const DENIED = '42501'
const CAP = '23514'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

const SELLERS = ['seller-a', 'seller-b'] as const
const BUYERS = ['buyer-seller', 'buyer-daily', 'buyer-race', 'buyer-spoof'] as const
const CONSUMERS = ['consumer-open', 'consumer-daily', 'consumer-old', 'consumer-race'] as const
type Local = (typeof SELLERS)[number] | (typeof BUYERS)[number] | (typeof CONSUMERS)[number]
const ids = {} as Record<Local, string>
const clients = {} as Record<Local, Client>
let productA: string
let productB: string

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Caps Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

async function makeShopWithProduct(sellerId: string, label: string): Promise<string> {
  const { error: upErr } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', sellerId)
  if (upErr) throw new Error(`seller upgrade failed: ${upErr.message}`)
  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: sellerId, name: `Caps Shop ${label} ${RUN}` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  const { data: product, error: prodErr } = await admin
    .from('products')
    .insert({ shop_id: shop.id, title: `Caps Product ${label} ${RUN}`, price_tnd: 80, status: 'active', tracks_stock: false })
    .select('id').single()
  if (prodErr || !product) throw new Error(`product insert failed: ${prodErr?.message}`)
  return product.id
}

// The demander action's shape (seller_id is derived by enforce_order_insert_integrity).
function order(buyer: Local, productId: string, extra: Partial<OrderInsert> = {}): OrderInsert {
  return {
    buyer_id: ids[buyer], order_type: 'product', product_id: productId, status: 'pending', quantity: 1,
    delivery_name: 'Caps Test', delivery_address: 'Rue de test, Tunis', delivery_phone: '+21620000000', ...extra,
  } as OrderInsert
}
const fileOrder = (buyer: Local, productId: string, extra: Partial<OrderInsert> = {}) =>
  clients[buyer].from('orders').insert(order(buyer, productId, extra))

async function seedOrders(buyer: Local, productId: string, n: number, status: string): Promise<void> {
  const rows = Array.from({ length: n }, () => order(buyer, productId, { status } as Partial<OrderInsert>))
  const { error } = await admin.from('orders').insert(rows)
  if (error) throw new Error(`orders seed failed: ${error.message}`)
}

// The createAnnonce shape.
function post(consumer: Local, extra: Partial<PostInsert> = {}): PostInsert {
  return { consumer_id: ids[consumer], title: `Caps mission ${RUN}`, description: 'Mission de test.', budget_max: 300, status: 'open', ...extra }
}
const filePost = (consumer: Local, extra: Partial<PostInsert> = {}) =>
  clients[consumer].from('job_posts').insert(post(consumer, extra)).select('id')

async function seedPosts(consumer: Local, n: number, extra: Partial<PostInsert>): Promise<void> {
  const { error } = await admin.from('job_posts').insert(Array.from({ length: n }, () => post(consumer, extra)))
  if (error) throw new Error(`job_posts seed failed: ${error.message}`)
}

// Idempotent and surgical to this file's prefix; runs first and last. Guards first (a real customer ordering a fixture
// product, a real freelancer answering a fixture post), then users -- cascading profiles -> orders / job_posts / shops.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const fixtureIds = (data ?? []).map((row) => row.id)
  if (fixtureIds.length === 0) return
  await refuseTeardownOnForeignOrders(admin, fixtureIds, PREFIX)
  await refuseTeardownOnForeignResponses(admin, fixtureIds, PREFIX)
  for (const id of fixtureIds) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  for (const local of [...SELLERS, ...BUYERS, ...CONSUMERS]) ids[local] = await createUser(local)
  productA = await makeShopWithProduct(ids['seller-a'], 'A')
  productB = await makeShopWithProduct(ids['seller-b'], 'B')
  for (const local of [...SELLERS, ...BUYERS, ...CONSUMERS]) clients[local] = await signIn(local)
}, 180_000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  // Read-only proof the cleanup is complete.
  const { count: profiles } = await admin
    .from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  expect(profiles).toBe(0)
  const all = Object.values(ids)
  const { count: orders } = await admin.from('orders').select('id', { count: 'exact', head: true }).in('buyer_id', all)
  expect(orders).toBe(0)
  const { count: posts } = await admin.from('job_posts').select('id', { count: 'exact', head: true }).in('consumer_id', all)
  expect(posts).toBe(0)
}, 180_000)

// ─── orders ──────────────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('orders — 5 pending per buyer per seller', () => {
  it('5 orders on one seller are filed; the 6th is refused 23514 order_cap_seller, mapped for the buyer', async () => {
    for (let i = 0; i < 5; i++) expect((await fileOrder('buyer-seller', productA)).error, `order ${i + 1}`).toBeNull()
    const { error } = await fileOrder('buyer-seller', productA)
    expect(error?.code).toBe(CAP)
    expect(error?.hint).toBe('order_cap_seller')
    expect(orderCapKey(error)).toBe('demander.error.cap_seller')
  })

  it('another seller is a different key', async () => {
    expect((await fileOrder('buyer-seller', productB)).error).toBeNull()
  })

  it('once the seller accepts one, the buyer can order again', async () => {
    const { data: one } = await admin
      .from('orders').select('id').eq('buyer_id', ids['buyer-seller']).eq('product_id', productA).eq('status', 'pending').limit(1).single()
    // The seller accepts it, as advanceOrderAction does (check_order_status_transition only lets a party move it).
    expect((await clients['seller-a'].from('orders').update({ status: 'accepted' }).eq('id', one!.id)).error).toBeNull()
    expect((await fileOrder('buyer-seller', productA)).error).toBeNull()
  })

  it('service role is not capped', async () => {
    expect((await admin.from('orders').insert(order('buyer-seller', productA))).error).toBeNull()
  })

  it('8 parallel orders on one seller file exactly 5 (the per-buyer lock)', async () => {
    const results = await Promise.all(Array.from({ length: 8 }, () => fileOrder('buyer-race', productA)))
    expect(results.filter((r) => r.error === null)).toHaveLength(5)
    expect(results.filter((r) => r.error?.hint === 'order_cap_seller')).toHaveLength(3)
  })
})

describe.skipIf(!hasCreds)('orders — 20 per buyer per rolling 24 h', () => {
  it('19 earlier orders (not pending) + 1 is the 20th: filed; the 21st is refused 23514 order_cap_daily', async () => {
    await seedOrders('buyer-daily', productA, 19, 'received')
    expect((await fileOrder('buyer-daily', productA)).error).toBeNull()
    const { error } = await fileOrder('buyer-daily', productB)
    expect(error?.code).toBe(CAP)
    expect(error?.hint).toBe('order_cap_daily')
    expect(orderCapKey(error)).toBe('demander.error.cap_daily')
  })

  it('an order filed in a capped buyer’s name is refused by RLS (42501), never with a cap (no volume leak)', async () => {
    const { error } = await clients['buyer-spoof'].from('orders').insert(order('buyer-daily', productA))
    expect(error?.code).toBe(DENIED)
    expect(orderCapKey(error)).toBeNull()
  })

  it('orders older than 24 h do not count', async () => {
    const old = new Date(Date.now() - 25 * 3600_000).toISOString()
    expect((await admin.from('orders').update({ created_at: old }).eq('buyer_id', ids['buyer-daily'])).error).toBeNull()
    expect((await fileOrder('buyer-daily', productA)).error).toBeNull()
  })
})

// ─── job_posts ───────────────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('job_posts — 5 open per consumer', () => {
  it('5 open posts are created; the 6th is refused 23514 job_post_cap_open, mapped for the consumer', async () => {
    for (let i = 0; i < 5; i++) expect((await filePost('consumer-open')).error, `post ${i + 1}`).toBeNull()
    const { error } = await filePost('consumer-open')
    expect(error?.code).toBe(CAP)
    expect(error?.hint).toBe('job_post_cap_open')
    expect(jobPostCapKey(error)).toBe('annonce.error.cap_open')
  })

  it('closing one (open -> filled) frees a slot; « Rouvrir » it while 5 are open again is refused', async () => {
    const { data: one } = await admin
      .from('job_posts').select('id').eq('consumer_id', ids['consumer-open']).eq('status', 'open').limit(1).single()
    const close = await clients['consumer-open'].from('job_posts').update({ status: 'filled' }).eq('id', one!.id).select('id')
    expect(close.error).toBeNull()
    expect((await filePost('consumer-open')).error).toBeNull()
    // reopenMissionAction's write.
    const { error } = await clients['consumer-open'].from('job_posts').update({ status: 'open' }).eq('id', one!.id).eq('status', 'filled').select('id')
    expect(error?.hint).toBe('job_post_cap_open')
    expect(jobPostCapKey(error)).toBe('annonce.error.cap_open')
  })

  it('an edit of an open post is never capped', async () => {
    const { data: one } = await admin
      .from('job_posts').select('id').eq('consumer_id', ids['consumer-open']).eq('status', 'open').limit(1).single()
    const { error } = await clients['consumer-open'].from('job_posts').update({ title: `Caps edited ${RUN}` }).eq('id', one!.id).select('id')
    expect(error).toBeNull()
  })

  it('open posts past the 30-day life do not count', async () => {
    await seedPosts('consumer-old', 5, { created_at: new Date(Date.now() - 31 * 86400_000).toISOString() })
    expect((await filePost('consumer-old')).error).toBeNull()
  })

  it('a post filed in another consumer’s name is refused by RLS (42501), never with a cap', async () => {
    const { error } = await clients['consumer-old'].from('job_posts').insert(post('consumer-open')).select('id')
    expect(error?.code).toBe(DENIED)
    expect(jobPostCapKey(error)).toBeNull()
  })

  it('7 parallel posts file exactly 5 (the per-consumer lock)', async () => {
    const results = await Promise.all(Array.from({ length: 7 }, () => filePost('consumer-race')))
    expect(results.filter((r) => r.error === null)).toHaveLength(5)
    expect(results.filter((r) => r.error?.hint === 'job_post_cap_open')).toHaveLength(2)
  })
})

describe.skipIf(!hasCreds)('job_posts — 10 created per consumer per rolling 24 h', () => {
  it('9 earlier posts (deleted) + 1 is the 10th: created; the 11th is refused 23514 job_post_cap_daily', async () => {
    await seedPosts('consumer-daily', 9, { status: 'deleted' })
    expect((await filePost('consumer-daily')).error).toBeNull()
    const { error } = await filePost('consumer-daily')
    expect(error?.code).toBe(CAP)
    expect(error?.hint).toBe('job_post_cap_daily')
    expect(jobPostCapKey(error)).toBe('annonce.error.cap_daily')
  })

  it('service role is not capped', async () => {
    expect((await admin.from('job_posts').insert(post('consumer-daily'))).error).toBeNull()
  })
})

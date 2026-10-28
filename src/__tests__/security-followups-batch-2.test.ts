/**
 * Live-DB proof for the security follow-ups batch 2 (fix/security-followups-batch-2, founder rulings 5–9 and
 * their follow-ups, 2026-10-28). Each describe maps to one db/migrations file. Written while each was PENDING,
 * it asserts the refusal the migration introduces, so it is RED until that file is applied:
 *
 *   applied (migrations 87–91, green):
 *   20261028201727_moderated_seller_no_delete       — a moderated freelancer profile / shop cannot be deleted.
 *   20261028201733_get_contact_phone_state_gate     — no phone via a moderated post, nor when a party is suspended.
 *   20261028201741_orders_insert_counterparty_stock_timestamps — no order to a suspended seller; stock; server clock.
 *   20261028201745_job_responses_suspended_poster   — no response to a suspended poster's post.
 *   20261028201746_shops_one_per_owner              — one shop per owner.
 *   PENDING (red until applied):
 *   PENDING_suspended_content_hidden                — a suspended account's public content is hidden.
 *   PENDING_moderated_item_no_delete                — a moderated product / service cannot be deleted.
 *   PENDING_job_responses_cap_excludes_suspended_poster — a suspended poster's posts hold no cap slot.
 *   PENDING_get_moderation_reason_fn + PENDING_moderation_reason_column_revoke
 *                                                   — admin_hidden_reason: owner / admin via RPC, no column read.
 *
 * Suspension is set and cleared directly by the service role (no auth ban), and always cleared in a finally.
 * Every refusal is paired with a service-role read, and each block keeps a control showing the normal path passes.
 *
 * Fixtures (all `sec-batch2-`, password random per run: the repo is public and this suite promotes an admin in
 * production): two posters, a responding freelancer (with one active service), a cap-test freelancer, a moderated
 * freelancer, a shop owner with a live product, a stock-tracked one and a never-ordered one, a second shop owner, a
 * buyer, an admin. Open fixture posts and live fixture items are public while this runs, hence both teardown
 * guards. The describes that moderate the main shop run last.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/security-followups-batch-2.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders, refuseTeardownOnForeignResponses } from './live-teardown-guard'

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

const PREFIX = 'sec-batch2-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Sb2-${randomUUID()}-Aa1!`
const TITLE = `Security batch 2 ${RUN}`
const MESSAGE = 'Bonjour, je suis disponible pour cette mission de test.'
const phone = () => `+2162${Math.floor(1_000_000 + Math.random() * 8_999_999)}`

const DENIED = '42501'
const NOT_AVAILABLE = "Cet article n'est plus disponible." // enforce_order_insert_integrity
const MODERATION_REASON = `${TITLE} moderation note`

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)
const anon: Client = hasCreds ? createClient<Database>(url, anonKey, opts) : (undefined as unknown as Client)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Security Batch Two Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

async function updateProfile(id: string, patch: Database['public']['Tables']['profiles']['Update']): Promise<void> {
  const { error } = await admin.from('profiles').update(patch).eq('id', id)
  if (error) throw new Error(`profiles seed failed: ${error.message}`)
}

// Suspension through the service role only (no auth ban), always lifted afterwards.
async function whileSuspended(id: string, body: () => Promise<void>): Promise<void> {
  await updateProfile(id, { suspended_at: new Date().toISOString(), suspended_reason: `${TITLE} test` })
  try {
    await body()
  } finally {
    await updateProfile(id, { suspended_at: null, suspended_reason: null })
  }
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
//   0. the guards; 1. orders by buyer and by seller; 2. admin_audit_log (admin_id is ON DELETE RESTRICT);
//   3. users — cascades profiles -> job_posts -> job_responses, shops -> products, freelancer_profiles.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return
  await refuseTeardownOnForeignResponses(admin, ids, PREFIX)
  await refuseTeardownOnForeignOrders(admin, ids, PREFIX)
  for (const column of ['buyer_id', 'seller_id'] as const) {
    const { error: orderErr } = await admin.from('orders').delete().in(column, ids)
    if (orderErr) throw new Error(`orders cleanup (${column}) failed: ${orderErr.message}`)
  }
  const { error: auditErr } = await admin.from('admin_audit_log').delete().in('admin_id', ids)
  if (auditErr) throw new Error(`admin_audit_log cleanup failed: ${auditErr.message}`)
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let posterId: string
let responderId: string
let modFreelancerId: string
let sellerId: string
let seller2Id: string
let buyerId: string
let adminId: string
let shopId: string
let productId: string
let stockProductId: string
let modFreelancerFpId: string
let posterPhone: string
let responderPhone: string
let sellerPhone: string
let poster2Id: string
let capFreelancerId: string
let modProductId: string
let serviceId: string
let capFreelancerClient: Client

let posterClient: Client
let responderClient: Client
let modFreelancerClient: Client
let sellerClient: Client
let seller2Client: Client
let buyerClient: Client
let adminClient: Client

async function seedPost(label: string): Promise<string> {
  const { data, error } = await admin
    .from('job_posts')
    .insert({ consumer_id: posterId, title: `${TITLE} — ${label}`, description: 'Mission de test.', budget_max: 300 })
    .select('id')
    .single()
  if (error || !data) throw new Error(`job_posts seed failed (${label}): ${error?.message}`)
  return data.id
}

async function respond(postId: string) {
  return responderClient
    .from('job_responses')
    .insert({ job_post_id: postId, freelancer_id: responderId, proposal_message: MESSAGE })
    .select('id')
    .single()
}

async function hide(targetType: string, targetId: string): Promise<void> {
  const { error } = await adminClient.rpc('admin_hide_content', { target_type: targetType, target_id: targetId, reason: MODERATION_REASON })
  if (error) throw new Error(`admin_hide_content(${targetType}) failed: ${error.message}`)
}

function productOrder(product: string, extra: Partial<OrderInsert> = {}): OrderInsert {
  // seller_id is derived by trg_enforce_order_insert_integrity; the generated Insert type still requires it.
  const payload: Omit<OrderInsert, 'seller_id'> = {
    buyer_id: buyerId,
    order_type: 'product',
    product_id: product,
    service_listing_id: null,
    status: 'pending',
    delivery_name: 'Test Buyer',
    delivery_address: 'Rue test',
    delivery_phone: '+21620000004',
    quantity: 1,
    buyer_note: null,
    ...extra,
  }
  return payload as OrderInsert
}

async function phoneOf(client: Client, target: string): Promise<string | null> {
  const { data, error } = await client.rpc('get_contact_phone', { target })
  if (error) throw new Error(`get_contact_phone failed: ${error.message}`)
  return data
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  posterId = await createUser('poster')
  responderId = await createUser('responder')
  modFreelancerId = await createUser('modfreelancer')
  sellerId = await createUser('seller')
  seller2Id = await createUser('seller2')
  buyerId = await createUser('buyer')
  adminId = await createUser('admin')

  posterPhone = phone()
  responderPhone = phone()
  sellerPhone = phone()
  await updateProfile(posterId, { phone: posterPhone })
  await updateProfile(responderId, { phone: responderPhone, seller_type: 'freelancer' })
  await updateProfile(modFreelancerId, { seller_type: 'freelancer' })
  await updateProfile(sellerId, { phone: sellerPhone, seller_type: 'shop_owner' })
  await updateProfile(seller2Id, { seller_type: 'shop_owner' })
  await updateProfile(adminId, { is_admin: true })

  poster2Id = await createUser('poster2')
  capFreelancerId = await createUser('capfreelancer')
  await updateProfile(capFreelancerId, { seller_type: 'freelancer' })
  const { error: capFpErr } = await admin.from('freelancer_profiles').insert({ profile_id: capFreelancerId })
  if (capFpErr) throw new Error(`cap freelancer profile seed failed: ${capFpErr.message}`)

  const { data: fp, error: fpErr } = await admin.from('freelancer_profiles').insert({ profile_id: responderId }).select('id').single()
  if (fpErr || !fp) throw new Error(`responder profile seed failed: ${fpErr?.message}`)
  // One active, never-ordered service: publishes the responder's profile (sync_freelancer_is_published).
  const { data: svc, error: svcErr } = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: fp.id, title: `${TITLE} — service`, starting_price_tnd: 60, status: 'active' })
    .select('id')
    .single()
  if (svcErr || !svc) throw new Error(`service_listings seed failed: ${svcErr?.message}`)
  serviceId = svc.id
  const { data: modFp, error: modFpErr } = await admin.from('freelancer_profiles').insert({ profile_id: modFreelancerId }).select('id').single()
  if (modFpErr || !modFp) throw new Error(`moderated freelancer profile seed failed: ${modFpErr?.message}`)
  modFreelancerFpId = modFp.id

  const { data: shop, error: shopErr } = await admin.from('shops').insert({ owner_id: sellerId, name: `${TITLE} — shop` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  shopId = shop.id
  const { data: product, error: productErr } = await admin
    .from('products')
    .insert({ shop_id: shopId, title: `${TITLE} — product`, price_tnd: 40, status: 'active', tracks_stock: false })
    .select('id')
    .single()
  if (productErr || !product) throw new Error(`product insert failed: ${productErr?.message}`)
  productId = product.id
  const { data: stocked, error: stockedErr } = await admin
    .from('products')
    .insert({ shop_id: shopId, title: `${TITLE} — last unit`, price_tnd: 25, status: 'active', tracks_stock: true, stock_count: 1 })
    .select('id')
    .single()
  if (stockedErr || !stocked) throw new Error(`stocked product insert failed: ${stockedErr?.message}`)
  stockProductId = stocked.id
  const { data: modProduct, error: modProductErr } = await admin
    .from('products')
    .insert({ shop_id: shopId, title: `${TITLE} — never ordered`, price_tnd: 30, status: 'active', tracks_stock: false })
    .select('id')
    .single()
  if (modProductErr || !modProduct) throw new Error(`never-ordered product insert failed: ${modProductErr?.message}`)
  modProductId = modProduct.id
  const { error: shop2Err } = await admin.from('shops').insert({ owner_id: seller2Id, name: `${TITLE} — shop 2` })
  if (shop2Err) throw new Error(`shop 2 insert failed: ${shop2Err.message}`)

  posterClient = await signIn('poster')
  responderClient = await signIn('responder')
  modFreelancerClient = await signIn('modfreelancer')
  sellerClient = await signIn('seller')
  seller2Client = await signIn('seller2')
  buyerClient = await signIn('buyer')
  adminClient = await signIn('admin')
  capFreelancerClient = await signIn('capfreelancer')

  // The buyer's past order with the seller (the orders branch of get_contact_phone, and the buyer branch of the
  // shops policy used in the reason block).
  const { error: orderErr } = await buyerClient.from('orders').insert(productOrder(productId))
  if (orderErr) throw new Error(`buyer order failed: ${orderErr.message}`)
}, 180000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (pErr) throw new Error(`cleanup check (profiles) failed: ${pErr.message}`)
  if ((profiles ?? 0) !== 0) throw new Error(`teardown left ${profiles} ${PREFIX} profiles`)
  for (const [table, column] of [['job_posts', 'title'], ['shops', 'name'], ['products', 'title']] as const) {
    const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true }).like(column, `${TITLE}%`)
    if (error) throw new Error(`cleanup check (${table}) failed: ${error.message}`)
    if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} fixture ${table}`)
  }
}, 120000)

// ─── 20261028201727_moderated_seller_no_delete (ruling 5) ────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('a moderated freelancer profile / shop cannot be deleted by its owner', () => {
  it('the freelancer profile: DELETE refused (moderated), the row and its moderation stay', async () => {
    await hide('freelancer_profile', modFreelancerFpId)
    const { error } = await modFreelancerClient.from('freelancer_profiles').delete().eq('id', modFreelancerFpId)
    expect(error?.code).toBe(DENIED)
    expect(error?.hint).toBe('moderated')
    const { data } = await admin.from('freelancer_profiles').select('admin_hidden_at').eq('id', modFreelancerFpId).maybeSingle()
    expect(data?.admin_hidden_at).not.toBeNull()
  })

  it('the shop: DELETE refused (moderated), the row stays', async () => {
    const { data: shop2 } = await admin.from('shops').select('id').eq('owner_id', seller2Id).single()
    await hide('shop', shop2!.id)
    const { error } = await seller2Client.from('shops').delete().eq('id', shop2!.id)
    expect(error?.code).toBe(DENIED)
    expect(error?.hint).toBe('moderated')
    const { count } = await admin.from('shops').select('id', { count: 'exact', head: true }).eq('id', shop2!.id)
    expect(count).toBe(1)
  })
})

// ─── 20261028201733_get_contact_phone_state_gate (ruling 6) ──────────────────────────────────────────────────

describe.skipIf(!hasCreds)('get_contact_phone — no unlock through a moderated post or with a suspended party', () => {
  let postId: string

  beforeAll(async () => {
    if (!hasCreds) return
    postId = await seedPost('phone')
    const { error } = await respond(postId)
    if (error) throw new Error(`response failed: ${error.message}`)
  }, 60000)

  it('control: the response unlocks both phones, and the order unlocks the seller’s', async () => {
    expect(await phoneOf(responderClient, posterId)).toBe(posterPhone)
    expect(await phoneOf(posterClient, responderId)).toBe(responderPhone)
    expect(await phoneOf(buyerClient, sellerId)).toBe(sellerPhone)
  })

  it('the poster suspended: the responder no longer reads their phone (and vice versa)', async () => {
    await whileSuspended(posterId, async () => {
      expect(await phoneOf(responderClient, posterId)).toBeNull()
      expect(await phoneOf(posterClient, responderId)).toBeNull()
    })
  })

  it('the seller suspended: the past buyer no longer reads their phone (orders branch)', async () => {
    await whileSuspended(sellerId, async () => {
      expect(await phoneOf(buyerClient, sellerId)).toBeNull()
    })
  })

  it('the post moderated: neither side unlocks the other through it', async () => {
    await hide('job_post', postId)
    expect(await phoneOf(responderClient, posterId)).toBeNull()
    expect(await phoneOf(posterClient, responderId)).toBeNull()
  })
})

// ─── 20261028201741_orders_insert_counterparty_stock_timestamps (rulings 7 + 8) ──────────────────────────────

describe.skipIf(!hasCreds)('orders INSERT — suspended seller, stock, server timestamps', () => {
  async function buyerOrders(product: string): Promise<number> {
    const { count, error } = await admin.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', buyerId).eq('product_id', product)
    if (error) throw new Error(`orders read failed: ${error.message}`)
    return count ?? 0
  }

  it('an order for a suspended seller’s item is refused as « no longer available », nothing written', async () => {
    const before = await buyerOrders(productId)
    await whileSuspended(sellerId, async () => {
      const { error } = await buyerClient.from('orders').insert(productOrder(productId))
      expect(error?.code).toBe('23514')
      expect(error?.message).toBe(NOT_AVAILABLE)
    })
    expect(await buyerOrders(productId)).toBe(before)
  })

  it('more than the stock is refused (hint stock); the stock itself is orderable', async () => {
    const { error } = await buyerClient.from('orders').insert(productOrder(stockProductId, { quantity: 2 }))
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('stock')
    expect(await buyerOrders(stockProductId)).toBe(0)
    const { error: okErr } = await buyerClient.from('orders').insert(productOrder(stockProductId, { quantity: 1 }))
    expect(okErr).toBeNull()
  })

  it('client-supplied created_at / updated_at are replaced by the database clock', async () => {
    const before = Date.now()
    const { data, error } = await buyerClient
      .from('orders')
      .insert(productOrder(productId, { created_at: '2000-01-01T00:00:00Z', updated_at: '2000-01-01T00:00:00Z' } as Partial<OrderInsert>))
      .select('created_at, updated_at')
      .single()
    expect(error).toBeNull()
    expect(new Date(data!.created_at).getTime()).toBeGreaterThan(before - 60_000)
    expect(new Date(data!.updated_at).getTime()).toBeGreaterThan(before - 60_000)
  })
})

// ─── 20261028201745_job_responses_suspended_poster (ruling 7) ────────────────────────────────────────────────

describe.skipIf(!hasCreds)('job_responses INSERT — no response to a suspended poster', () => {
  it('refused like a moderated post (job_unavailable), nothing written; accepted again once lifted', async () => {
    const postId = await seedPost('suspended poster')
    await whileSuspended(posterId, async () => {
      const { error } = await respond(postId)
      expect(error?.code).toBe('23514')
      expect(error?.hint).toBe('job_unavailable')
      const { count } = await admin.from('job_responses').select('id', { count: 'exact', head: true }).eq('job_post_id', postId)
      expect(count).toBe(0)
    })
    const { error: okErr } = await respond(postId)
    expect(okErr).toBeNull()
  })
})

// ─── 20261028201746_shops_one_per_owner (ruling 9) ───────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('shops — one per owner', () => {
  it('an owner who already has a shop cannot create a second one (23505 on shops_owner_id_key)', async () => {
    const { error } = await sellerClient.from('shops').insert({ owner_id: sellerId, name: `${TITLE} — second shop` })
    expect(error?.code).toBe('23505')
    expect(error?.message).toContain('shops_owner_id_key')
    const { count } = await admin.from('shops').select('id', { count: 'exact', head: true }).eq('owner_id', sellerId)
    expect(count).toBe(1)
  })
})

// ─── PENDING_suspended_content_hidden (ruling 7, read half) ─────────────────────────────────────────────────

describe.skipIf(!hasCreds)('a suspended account’s public content is hidden; owner, past buyer and admin still read it', () => {
  let openPostId: string

  beforeAll(async () => {
    if (!hasCreds) return
    openPostId = await seedPost('suspended read')
  }, 60000)

  async function visible(client: Client, table: 'shops' | 'products' | 'freelancer_profiles' | 'service_listings' | 'job_posts', column: string, value: string): Promise<number> {
    const { data, error } = await client.from(table).select('id').eq(column, value)
    expect(error).toBeNull()
    return (data ?? []).length
  }

  it('control: while nobody is suspended, anon reads the shop, product, published freelancer, service and post', async () => {
    expect(await visible(anon, 'shops', 'id', shopId)).toBe(1)
    expect(await visible(anon, 'products', 'id', productId)).toBe(1)
    expect(await visible(anon, 'freelancer_profiles', 'profile_id', responderId)).toBe(1)
    expect(await visible(anon, 'service_listings', 'id', serviceId)).toBe(1)
    expect(await visible(anon, 'job_posts', 'id', openPostId)).toBe(1)
  })

  it('the shop owner suspended: anon and another user lose the shop and its product; owner, buyer, admin keep it', async () => {
    await whileSuspended(sellerId, async () => {
      for (const client of [anon, posterClient]) {
        expect(await visible(client, 'shops', 'id', shopId)).toBe(0)
        expect(await visible(client, 'products', 'id', productId)).toBe(0)
      }
      for (const client of [sellerClient, buyerClient, adminClient]) {
        expect(await visible(client, 'shops', 'id', shopId)).toBe(1)
        expect(await visible(client, 'products', 'id', productId)).toBe(1)
      }
    })
    expect(await visible(anon, 'shops', 'id', shopId)).toBe(1) // lifted: public again, nothing rewritten
  })

  it('the freelancer suspended: anon loses the profile and the service; the owner and an admin keep them', async () => {
    await whileSuspended(responderId, async () => {
      expect(await visible(anon, 'freelancer_profiles', 'profile_id', responderId)).toBe(0)
      expect(await visible(anon, 'service_listings', 'id', serviceId)).toBe(0)
      for (const client of [responderClient, adminClient]) {
        expect(await visible(client, 'freelancer_profiles', 'profile_id', responderId)).toBe(1)
        expect(await visible(client, 'service_listings', 'id', serviceId)).toBe(1)
      }
    })
  })

  it('the poster suspended: anon loses the open post; the poster keeps it', async () => {
    await whileSuspended(posterId, async () => {
      expect(await visible(anon, 'job_posts', 'id', openPostId)).toBe(0)
      expect(await visible(posterClient, 'job_posts', 'id', openPostId)).toBe(1)
    })
  })
})

// ─── PENDING_moderated_item_no_delete (ruling 5a) ───────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('a moderated product / service cannot be deleted by its owner', () => {
  it('the product: DELETE refused (moderated), the product stays', async () => {
    await hide('product', modProductId)
    const { error } = await sellerClient.from('products').delete().eq('id', modProductId)
    expect(error?.code).toBe(DENIED)
    expect(error?.hint).toBe('moderated')
    const { count } = await admin.from('products').select('id', { count: 'exact', head: true }).eq('id', modProductId)
    expect(count).toBe(1)
  })

  it('the service: DELETE refused (moderated), the service stays', async () => {
    await hide('service', serviceId)
    const { error } = await responderClient.from('service_listings').delete().eq('id', serviceId)
    expect(error?.code).toBe(DENIED)
    expect(error?.hint).toBe('moderated')
    const { count } = await admin.from('service_listings').select('id', { count: 'exact', head: true }).eq('id', serviceId)
    expect(count).toBe(1)
  })
})

// ─── PENDING_job_responses_cap_excludes_suspended_poster (ruling 5c) ────────────────────────────────────────

describe.skipIf(!hasCreds)('the 5-active cap ignores a suspended poster’s posts', () => {
  async function postBy(consumerId: string, label: string): Promise<string> {
    const { data, error } = await admin
      .from('job_posts')
      .insert({ consumer_id: consumerId, title: `${TITLE} — ${label}`, description: 'Mission de test.', budget_max: 300 })
      .select('id')
      .single()
    if (error || !data) throw new Error(`job_posts seed failed (${label}): ${error?.message}`)
    return data.id
  }
  const answer = (postId: string) =>
    capFreelancerClient.from('job_responses').insert({ job_post_id: postId, freelancer_id: capFreelancerId, proposal_message: MESSAGE })

  it('5 answers to a poster who is then suspended leave the freelancer free to answer someone else', async () => {
    for (let i = 1; i <= 5; i++) {
      const { error } = await answer(await postBy(posterId, `cap ${i}`))
      if (error) throw new Error(`cap seed response ${i} failed: ${error.message}`)
    }
    const otherPost = await postBy(poster2Id, 'cap other poster')
    await whileSuspended(posterId, async () => {
      const { error } = await answer(otherPost)
      expect(error).toBeNull()
    })
  })
})

// ─── PENDING_get_moderation_reason_fn + _column_revoke (ruling 9) — moderates the main shop: runs late ───────

describe.skipIf(!hasCreds)('admin_hidden_reason — owner and admin only', () => {
  // get_moderation_reason does not exist before apply, so it is not in the generated types yet.
  const reasonOf = (client: Client, targetType: string, targetId: string) =>
    (client as unknown as SupabaseClient).rpc('get_moderation_reason', { target_type: targetType, target_id: targetId })

  beforeAll(async () => {
    if (!hasCreds) return
    await hide('shop', shopId)
  }, 60000)

  for (const table of ['shops', 'products', 'service_listings', 'freelancer_profiles', 'job_posts'] as const) {
    it(`${table}: no client can select the column; the rest of the row stays readable`, async () => {
      const { error } = await anon.from(table).select('id, admin_hidden_reason').limit(1)
      expect(error?.code).toBe(DENIED)
      const { error: okErr } = await anon.from(table).select('id, admin_hidden_at').limit(1)
      expect(okErr).toBeNull()
    })
  }

  it('the past buyer (shops buyer branch) no longer reads the moderator’s note', async () => {
    const { error } = await buyerClient.from('shops').select('admin_hidden_reason').eq('id', shopId)
    expect(error?.code).toBe(DENIED)
  })

  it('get_moderation_reason: the owner and an admin read it, the buyer gets NULL', async () => {
    for (const [client, expected] of [[sellerClient, MODERATION_REASON], [adminClient, MODERATION_REASON], [buyerClient, null]] as const) {
      const { data, error } = await reasonOf(client, 'shop', shopId)
      expect(error).toBeNull()
      expect(data).toBe(expected)
    }
  })
})

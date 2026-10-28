/**
 * Live-DB proof for the security follow-ups batch (fix/security-followups-batch, migrations 79–86,
 * applied 2026-10-28). Each describe maps to one db/migrations file; written while they were PENDING, it was
 * 14 red / 5 green before apply (each exploit succeeded) and is fully green after.
 *
 *   20261028194710_job_response_skills_open_post      — skills frozen once the post leaves the withdrawal
 *                                                      window; ownership checked before the 8-skill count.
 *   20261028194712_orders_admin_insert_tier2          — a JWT admin inserts at 'pending' like any client.
 *   20261028194715_freelancer_profiles_column_grants  — is_published never client-written; admin markers
 *                                                      never client-inserted.
 *   20261028194717_shops_admin_marker_insert_grant    — admin markers never client-inserted on shops.
 *   20261028194719_disputes_insert_columns            — a party cannot insert a pre-decided dispute.
 *   20261028194721_orders_received_at_revoke          — no client UPDATE grant on received_at (E2).
 *   20261028194726_seller_capability_fail_closed      — a row owned by someone else is refused before that
 *                                                      account's profile is read.
 * 20261028194729_job_post_skills_lock_for_share has no test: a race against an uncommitted response cannot
 * be staged through PostgREST (one transaction per request).
 *
 * Every refusal is paired with a service-role read showing nothing was written, and each block keeps one
 * control showing the app's own write path still passes.
 *
 * Fixtures (all `sec-batch-`, password random per run: the repo is public and this suite promotes an admin
 * in production): a poster, a responding freelancer, a second freelancer and a second shop owner without
 * rows, a shop owner with one live product, a buyer, an admin. An open fixture post and a live fixture
 * product are public while this runs, hence both teardown guards.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/security-followups-batch.test.ts
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

const PREFIX = 'sec-batch-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Sb-${randomUUID()}-Aa1!`
const TITLE = `Security batch ${RUN}`
const MESSAGE = 'Bonjour, je suis disponible pour cette mission de test.'

const DENIED = '42501'
const tableDenied = (table: string) => `permission denied for table ${table}`
const NOT_PENDING = 'Une commande est toujours créée en attente.' // enforce_order_insert_integrity tier 2

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Security Batch Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

async function setSellerType(id: string, sellerType: 'freelancer' | 'shop_owner'): Promise<void> {
  const { error } = await admin.from('profiles').update({ seller_type: sellerType }).eq('id', id)
  if (error) throw new Error(`seller_type seed failed: ${error.message}`)
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
//   0. the guards; 1. orders by buyer and by seller (disputes cascade); 2. admin_audit_log (admin_id is
//   ON DELETE RESTRICT); 3. users — cascades profiles -> job_posts -> job_responses -> job_response_skills,
//   shops -> products, freelancer_profiles.
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
let freelancer2Id: string
let sellerId: string
let seller2Id: string
let buyerId: string
let adminId: string
let productId: string

let posterClient: Client
let responderClient: Client
let freelancer2Client: Client
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

// The real write path: the freelancer answers through their own session while the post is open.
async function respond(postId: string): Promise<string> {
  const { data, error } = await responderClient
    .from('job_responses')
    .insert({ job_post_id: postId, freelancer_id: responderId, proposal_message: MESSAGE })
    .select('id')
    .single()
  if (error || !data) throw new Error(`response insert failed: ${error?.message}`)
  return data.id
}

async function skillCount(responseId: string): Promise<number> {
  const { count, error } = await admin
    .from('job_response_skills')
    .select('id', { count: 'exact', head: true })
    .eq('job_response_id', responseId)
  if (error) throw new Error(`job_response_skills read failed: ${error.message}`)
  return count ?? 0
}

function productOrder(buyer: string, extra: Partial<OrderInsert> = {}): OrderInsert {
  // seller_id is derived by trg_enforce_order_insert_integrity; the generated Insert type still requires it.
  const payload: Omit<OrderInsert, 'seller_id'> = {
    buyer_id: buyer,
    order_type: 'product',
    product_id: productId,
    service_listing_id: null,
    status: 'pending',
    delivery_name: 'Test Buyer',
    delivery_address: 'Rue test',
    delivery_phone: '+21620000003',
    quantity: 1,
    buyer_note: null,
    ...extra,
  }
  return payload as OrderInsert
}

async function ordersBy(buyer: string): Promise<number> {
  const { count, error } = await admin.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', buyer)
  if (error) throw new Error(`orders read failed: ${error.message}`)
  return count ?? 0
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  posterId = await createUser('poster')
  responderId = await createUser('responder')
  freelancer2Id = await createUser('freelancer2')
  sellerId = await createUser('seller')
  seller2Id = await createUser('seller2')
  buyerId = await createUser('buyer')
  adminId = await createUser('admin')

  await setSellerType(responderId, 'freelancer')
  await setSellerType(freelancer2Id, 'freelancer')
  await setSellerType(sellerId, 'shop_owner')
  await setSellerType(seller2Id, 'shop_owner')
  const { error: fpErr } = await admin.from('freelancer_profiles').insert({ profile_id: responderId })
  if (fpErr) throw new Error(`freelancer_profiles seed failed: ${fpErr.message}`)
  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)

  const { data: shop, error: shopErr } = await admin
    .from('shops')
    .insert({ owner_id: sellerId, name: `${TITLE} — shop` })
    .select('id')
    .single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  const { data: product, error: productErr } = await admin
    .from('products')
    .insert({ shop_id: shop.id, title: `${TITLE} — product`, price_tnd: 40, status: 'active' })
    .select('id')
    .single()
  if (productErr || !product) throw new Error(`product insert failed: ${productErr?.message}`)
  productId = product.id

  posterClient = await signIn('poster')
  responderClient = await signIn('responder')
  freelancer2Client = await signIn('freelancer2')
  sellerClient = await signIn('seller')
  seller2Client = await signIn('seller2')
  buyerClient = await signIn('buyer')
  adminClient = await signIn('admin')
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
  const { count: posts, error: jErr } = await admin
    .from('job_posts')
    .select('id', { count: 'exact', head: true })
    .like('title', `${TITLE}%`)
  if (jErr) throw new Error(`cleanup check (job_posts) failed: ${jErr.message}`)
  if ((posts ?? 0) !== 0) throw new Error(`teardown left ${posts} fixture posts`)
  const { count: shops, error: sErr } = await admin
    .from('shops')
    .select('id', { count: 'exact', head: true })
    .like('name', `${TITLE}%`)
  if (sErr) throw new Error(`cleanup check (shops) failed: ${sErr.message}`)
  if ((shops ?? 0) !== 0) throw new Error(`teardown left ${shops} fixture shops`)
}, 120000)

// ─── 20261028194710_job_response_skills_open_post ───────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('job_response_skills — writable only while the post is open', () => {
  it('control: while the post is open the responder adds and removes a skill', async () => {
    const responseId = await respond(await seedPost('skills open'))
    const { error: insErr } = await responderClient.from('job_response_skills').insert({ job_response_id: responseId, skill: 'Figma' })
    expect(insErr).toBeNull()
    const { data, error: delErr } = await responderClient
      .from('job_response_skills')
      .delete()
      .eq('job_response_id', responseId)
      .select('id')
    expect(delErr).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('after the post is filled: adding a skill is refused (proposal_locked) and nothing is written', async () => {
    const postId = await seedPost('skills filled insert')
    const responseId = await respond(postId)
    const { error: closeErr } = await admin.from('job_posts').update({ status: 'filled' }).eq('id', postId)
    if (closeErr) throw new Error(`close failed: ${closeErr.message}`)
    const { error } = await responderClient.from('job_response_skills').insert({ job_response_id: responseId, skill: 'Photoshop' })
    expect(error?.code).toBe(DENIED)
    expect(error?.hint).toBe('proposal_locked')
    expect(await skillCount(responseId)).toBe(0)
  })

  it('after the post is filled: removing a skill is refused (proposal_locked) and the skill stays', async () => {
    const postId = await seedPost('skills filled delete')
    const responseId = await respond(postId)
    const { error: seedErr } = await responderClient.from('job_response_skills').insert({ job_response_id: responseId, skill: 'Illustrator' })
    if (seedErr) throw new Error(`skill seed failed: ${seedErr.message}`)
    const { error: closeErr } = await admin.from('job_posts').update({ status: 'filled' }).eq('id', postId)
    if (closeErr) throw new Error(`close failed: ${closeErr.message}`)
    const { error } = await responderClient.from('job_response_skills').delete().eq('job_response_id', responseId)
    expect(error?.code).toBe(DENIED)
    expect(error?.hint).toBe('proposal_locked')
    expect(await skillCount(responseId)).toBe(1)
  })

  it('a non-responder is refused as not_self before the 8-skill count can answer (M-C leak)', async () => {
    const responseId = await respond(await seedPost('skills leak'))
    const skills = Array.from({ length: 8 }, (_, i) => ({ job_response_id: responseId, skill: `Compétence ${i + 1}` }))
    const { error: seedErr } = await admin.from('job_response_skills').insert(skills)
    if (seedErr) throw new Error(`8-skill seed failed: ${seedErr.message}`)
    // The poster can see the response id (post-owner read) but does not own the response.
    const { error } = await posterClient.from('job_response_skills').insert({ job_response_id: responseId, skill: 'Intrus' })
    expect(error?.code).toBe(DENIED)
    expect(error?.hint).toBe('not_self')
    expect(await skillCount(responseId)).toBe(8)
  })
})

// ─── 20261028194712_orders_admin_insert_tier2 ───────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('orders INSERT — a JWT admin starts at pending like any client', () => {
  const forged: Array<[string, Partial<OrderInsert>]> = [
    ['received (a fake completed sale)', { status: 'received' }],
    ['arrived with carrier and tracking', { status: 'arrived', carrier: 'First Delivery', tracking_number: 'FAKE-1' }],
    ['cancelled, blamed on the seller', { status: 'cancelled', cancelled_by: 'seller', cancellation_reason: 'forged' }],
  ]

  for (const [label, extra] of forged) {
    it(`an admin buyer inserting at ${label} is refused and writes nothing`, async () => {
      const before = await ordersBy(adminId)
      const { error } = await adminClient.from('orders').insert(productOrder(adminId, extra))
      expect(error?.code).toBe(DENIED)
      expect(error?.message).toBe(NOT_PENDING)
      expect(await ordersBy(adminId)).toBe(before)
    })
  }

  it('control: the admin can still place an ordinary pending order', async () => {
    const { data, error } = await adminClient.from('orders').insert(productOrder(adminId)).select('status').single()
    expect(error).toBeNull()
    expect(data?.status).toBe('pending')
  })
})

// ─── 20261028194715_freelancer_profiles_column_grants ───────────────────────────────────────────────────

describe.skipIf(!hasCreds)('freelancer_profiles — is_published and the admin markers are not client-writable', () => {
  async function clearFreelancer2(): Promise<void> {
    const { error } = await admin.from('freelancer_profiles').delete().eq('profile_id', freelancer2Id)
    if (error) throw new Error(`freelancer2 profile cleanup failed: ${error.message}`)
  }
  async function freelancer2Profiles(): Promise<number> {
    const { count, error } = await admin.from('freelancer_profiles').select('id', { count: 'exact', head: true }).eq('profile_id', freelancer2Id)
    if (error) throw new Error(`freelancer_profiles read failed: ${error.message}`)
    return count ?? 0
  }

  it('the owner cannot PATCH is_published = true on a profile with no active listing', async () => {
    const { error } = await responderClient.from('freelancer_profiles').update({ is_published: true }).eq('profile_id', responderId)
    expect(error?.code).toBe(DENIED)
    expect(error?.message).toBe(tableDenied('freelancer_profiles'))
    const { data } = await admin.from('freelancer_profiles').select('is_published').eq('profile_id', responderId).single()
    expect(data?.is_published).toBe(false)
  })

  const forged: Array<[string, Database['public']['Tables']['freelancer_profiles']['Insert']]> = [
    ['is_published = true', { profile_id: '', is_published: true }],
    ['admin_hidden_at / admin_hidden_reason', { profile_id: '', admin_hidden_at: new Date().toISOString(), admin_hidden_reason: 'forged' }],
  ]
  for (const [label, row] of forged) {
    it(`an INSERT naming ${label} is refused and writes nothing`, async () => {
      await clearFreelancer2()
      const { error } = await freelancer2Client.from('freelancer_profiles').insert({ ...row, profile_id: freelancer2Id })
      expect(error?.code).toBe(DENIED)
      expect(error?.message).toBe(tableDenied('freelancer_profiles'))
      expect(await freelancer2Profiles()).toBe(0)
    })
  }

  it('control: the creer + modifier payloads still pass', async () => {
    await clearFreelancer2()
    const { error: insErr } = await freelancer2Client
      .from('freelancer_profiles')
      .insert({ profile_id: freelancer2Id, headline: 'Designer', bio: 'Bio de test', city: 'Tunis' })
    expect(insErr).toBeNull()
    const { error: updErr } = await freelancer2Client
      .from('freelancer_profiles')
      .update({ headline: 'Designer senior', years_experience: 3, working_hours: null, workplace_location: null, portfolio_link: null })
      .eq('profile_id', freelancer2Id)
    expect(updErr).toBeNull()
  })
})

// ─── 20261028194717_shops_admin_marker_insert_grant ─────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('shops — the admin markers are not client-insertable', () => {
  async function seller2Shops(): Promise<number> {
    const { count, error } = await admin.from('shops').select('id', { count: 'exact', head: true }).eq('owner_id', seller2Id)
    if (error) throw new Error(`shops read failed: ${error.message}`)
    return count ?? 0
  }

  it('an owner creating a shop already « moderated » is refused and nothing is written', async () => {
    const { error: clearErr } = await admin.from('shops').delete().eq('owner_id', seller2Id)
    if (clearErr) throw new Error(`seller2 shop cleanup failed: ${clearErr.message}`)
    const { error } = await seller2Client
      .from('shops')
      .insert({ owner_id: seller2Id, name: `${TITLE} — premoderated`, admin_hidden_at: new Date().toISOString(), admin_hidden_reason: 'forged' })
    expect(error?.code).toBe(DENIED)
    expect(error?.message).toBe(tableDenied('shops'))
    expect(await seller2Shops()).toBe(0)
  })

  it('control: the G2 payload (owner_id, name, city, description) still passes', async () => {
    const { error: clearErr } = await admin.from('shops').delete().eq('owner_id', seller2Id)
    if (clearErr) throw new Error(`seller2 shop cleanup failed: ${clearErr.message}`)
    const { error } = await seller2Client
      .from('shops')
      .insert({ owner_id: seller2Id, name: `${TITLE} — G2`, city: 'Tunis', description: 'Boutique de test.' })
    expect(error).toBeNull()
    expect(await seller2Shops()).toBe(1)
  })
})

// ─── 20261028194719_disputes_insert_columns + 20261028194721_orders_received_at_revoke ────────────────────────

describe.skipIf(!hasCreds)('disputes and received_at — a party writes only what the app writes', () => {
  let orderId: string

  beforeAll(async () => {
    if (!hasCreds) return
    const { data, error } = await buyerClient.from('orders').insert(productOrder(buyerId)).select('id').single()
    if (error || !data) throw new Error(`buyer order failed: ${error?.message}`)
    orderId = data.id
    // A dispute needs an order past 'pending'; only the seller can move it (the service role cannot).
    const { error: acceptErr } = await sellerClient.from('orders').update({ status: 'accepted' }).eq('id', orderId)
    if (acceptErr) throw new Error(`seller accept failed: ${acceptErr.message}`)
  }, 60000)

  async function disputesOn(id: string): Promise<number> {
    const { count, error } = await admin.from('disputes').select('id', { count: 'exact', head: true }).eq('order_id', id)
    if (error) throw new Error(`disputes read failed: ${error.message}`)
    return count ?? 0
  }

  it('a buyer cannot insert a dispute already resolved in their favour', async () => {
    const { error } = await buyerClient.from('disputes').insert({
      order_id: orderId,
      created_by_role: 'buyer',
      reason: 'not_delivered',
      status: 'resolved',
      outcome: 'sided_buyer',
      admin_note: 'forged ruling',
    })
    expect(error?.code).toBe(DENIED)
    expect(error?.message).toBe(tableDenied('disputes'))
    expect(await disputesOn(orderId)).toBe(0)
  })

  it('control: the createDispute payload still opens a dispute', async () => {
    const { data, error } = await buyerClient
      .from('disputes')
      .insert({ order_id: orderId, created_by_role: 'buyer', reason: 'other', description: 'Colis non reçu.' })
      .select('status, outcome, admin_note')
      .single()
    expect(error).toBeNull()
    expect(data).toEqual({ status: 'open', outcome: null, admin_note: null })
  })

  it('received_at: a client PATCH naming it is refused (E2) and the column stays NULL', async () => {
    const { error } = await sellerClient.from('orders').update({ received_at: '2000-01-01T00:00:00Z' }).eq('id', orderId)
    expect(error?.code).toBe(DENIED)
    expect(error?.message).toBe(tableDenied('orders'))
    const { data } = await admin.from('orders').select('received_at').eq('id', orderId).single()
    expect(data?.received_at).toBeNull()
  })
})

// ─── 20261028194726_seller_capability_fail_closed ───────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('enforce_seller_capability — a row for someone else fails before their profile is read', () => {
  it('a shop naming another account as owner is refused not_self, not with that account’s seller_type', async () => {
    const { error } = await seller2Client.from('shops').insert({ owner_id: buyerId, name: `${TITLE} — foreign shop` })
    expect(error?.code).toBe(DENIED)
    expect(error?.hint).toBe('not_self')
    const { count } = await admin.from('shops').select('id', { count: 'exact', head: true }).eq('owner_id', buyerId)
    expect(count).toBe(0)
  })

  it('a freelancer profile naming another account is refused not_self too', async () => {
    const { error } = await freelancer2Client.from('freelancer_profiles').insert({ profile_id: buyerId })
    expect(error?.code).toBe(DENIED)
    expect(error?.hint).toBe('not_self')
    const { count } = await admin.from('freelancer_profiles').select('id', { count: 'exact', head: true }).eq('profile_id', buyerId)
    expect(count).toBe(0)
  })
})

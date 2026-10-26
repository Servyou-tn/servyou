/**
 * Live-DB proof for db/migrations/20261023165345_orders_insert_integrity.sql — the BEFORE INSERT
 * guard trg_enforce_order_insert_integrity on orders.
 *
 * Tier 1 (every caller): seller_id is set from the item's owner, any client value discarded.
 * Tier 2 (signed-in non-admin callers): the order starts 'pending' with every lifecycle column
 *         NULL (42501); the item is live — status='active', not admin-moderated, its shop /
 *         freelancer profile not admin-moderated (23514); the buyer is not the seller (23514).
 *
 * Every write under test goes through a signed-in user's own session (the REST path the guard
 * exists for); the service role inserts only fixtures and the tier-2 bypass control. Every
 * rejection is followed by a service-role count proving no row landed.
 *
 * Moderation isolation: admin_hide_content('product' | 'service') flips status to 'hidden' in the
 * same statement as admin_hidden_at, so those two rows are ALSO rejected by the status conjunct
 * alone — the item-level admin_hidden_at conjunct is defense-in-depth no API path can isolate
 * (same caveat as h6-service-listings-hardening-rls.test.ts). The PARENT conjuncts are isolated:
 * admin_hide_content('shop' | 'freelancer_profile') leaves the item itself 'active'.
 *
 * Fixtures (all `ord-int-`): seven ephemeral users — two shop owners (one shop later moderated),
 * two freelancers (one profile later moderated), a buyer, a victim with a phone, an admin.
 *
 * Pattern A (live-DB). Service role for fixtures, ground truth and teardown only.
 *
 * Run (only after the migration is applied): npx vitest run --config vitest.integration.config.ts src/__tests__/orders-insert-integrity.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'ord-int-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PASSWORD = 'Orders-Integrity-Test-7k2!' // ephemeral test users only; never a real account
const TITLE = 'Orders integrity test'
const VICTIM_PHONE = '+21620000731'

// The guard's error shapes, pinned by text so a rejection from some OTHER trigger or constraint
// can't pass for the rule under test.
const NOT_PENDING = 'Une commande est toujours créée en attente.'
const NOT_LIVE = "Cet article n'est plus disponible."
const SELF_ORDER = 'Vous ne pouvez pas commander votre propre article.'
const NOT_FOUND = 'article introuvable'

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

async function signIn(local: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email: email(local), password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Orders Integrity Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

// shops.name is unique case-insensitively (shops_name_lower_key), so each fixture shop gets its own.
async function makeShop(ownerId: string, label: string): Promise<string> {
  const { error: upErr } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', ownerId)
  if (upErr) throw new Error(`seller upgrade failed: ${upErr.message}`)
  const { data, error } = await admin.from('shops').insert({ owner_id: ownerId, name: `${TITLE} — ${label}` }).select('id').single()
  if (error || !data) throw new Error(`shop insert failed: ${error?.message}`)
  return data.id
}

async function makeProduct(shopId: string, label: string, status: 'active' | 'hidden' | 'sold_out'): Promise<string> {
  const { data, error } = await admin
    .from('products')
    .insert({ shop_id: shopId, title: `${TITLE} — ${label}`, price_tnd: 80, status })
    .select('id')
    .single()
  if (error || !data) throw new Error(`product insert failed (${label}): ${error?.message}`)
  return data.id
}

async function makeFreelancer(profileId: string): Promise<string> {
  const { error: upErr } = await admin.from('profiles').update({ seller_type: 'freelancer' }).eq('id', profileId)
  if (upErr) throw new Error(`freelancer upgrade failed: ${upErr.message}`)
  const { data, error } = await admin.from('freelancer_profiles').insert({ profile_id: profileId }).select('id').single()
  if (error || !data) throw new Error(`freelancer_profiles insert failed: ${error?.message}`)
  return data.id
}

async function makeService(fpId: string, label: string, status: 'active' | 'hidden' | 'draft'): Promise<string> {
  const { data, error } = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: fpId, title: `${TITLE} — ${label}`, starting_price_tnd: 120, status })
    .select('id')
    .single()
  if (error || !data) throw new Error(`service insert failed (${label}): ${error?.message}`)
  return data.id
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// orders first — enforce_order_identity_lock guards the product_id/service_listing_id SET NULL a
// cascaded item delete would cause; admin_audit_log next — admin_id is ON DELETE RESTRICT.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id as string)
  if (ids.length === 0) return
  await refuseTeardownOnForeignOrders(admin, ids, PREFIX)

  for (const column of ['seller_id', 'buyer_id']) {
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

let shopOwnerId: string
let freelancerId: string
let buyerId: string
let victimId: string

let shopOwnerClient: SupabaseClient
let freelancerClient: SupabaseClient
let buyerClient: SupabaseClient

// Products: live, owner-hidden, sold out, admin-moderated, and live-in-a-moderated-shop.
let productLive: string
let productHidden: string
let productSoldOut: string
let productModerated: string
let productInModeratedShop: string
// Services: live, draft, owner-paused, admin-moderated, and live-under-a-moderated-profile.
let serviceLive: string
let serviceDraft: string
let servicePaused: string
let serviceModerated: string
let serviceUnderModeratedProfile: string

let moderatedShopId: string
let moderatedFpId: string

// The exact payload shapes of demander/[id]/actions.ts — submitProductRequest / submitServiceRequest.
// Neither sends seller_id any more (the trigger resolves it), so neither do these; the tier-1 tests
// pass one explicitly as an override to prove a spoofed value is overwritten.
function productOrder(productId: string, overrides: Record<string, unknown> = {}) {
  return {
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
}

function serviceOrder(serviceId: string, overrides: Record<string, unknown> = {}) {
  return {
    buyer_id: buyerId,
    order_type: 'service',
    service_listing_id: serviceId,
    product_id: null,
    status: 'pending',
    delivery_phone: '+21620000001',
    buyer_note: `${TITLE} — besoin décrit en plus de vingt caractères`,
    ...overrides,
  }
}

async function orderCount(column: 'product_id' | 'service_listing_id', itemId: string): Promise<number> {
  const { count, error } = await admin.from('orders').select('id', { count: 'exact', head: true }).eq(column, itemId)
  if (error) throw new Error(`order count failed: ${error.message}`)
  return count ?? 0
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  shopOwnerId = await createUser('shop')
  const shopOwner2Id = await createUser('shop2')
  freelancerId = await createUser('free')
  const freelancer2Id = await createUser('free2')
  buyerId = await createUser('buyer')
  victimId = await createUser('victim')
  const adminId = await createUser('admin')

  const { error: phoneErr } = await admin.from('profiles').update({ phone: VICTIM_PHONE }).eq('id', victimId)
  if (phoneErr) throw new Error(`victim phone failed: ${phoneErr.message}`)
  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)

  const shopId = await makeShop(shopOwnerId, 'shop')
  moderatedShopId = await makeShop(shopOwner2Id, 'moderated shop')
  productLive = await makeProduct(shopId, 'P live', 'active')
  productHidden = await makeProduct(shopId, 'P hidden', 'hidden')
  productSoldOut = await makeProduct(shopId, 'P sold out', 'sold_out')
  productModerated = await makeProduct(shopId, 'P moderated', 'active')
  productInModeratedShop = await makeProduct(moderatedShopId, 'P in moderated shop', 'active')

  const fpId = await makeFreelancer(freelancerId)
  moderatedFpId = await makeFreelancer(freelancer2Id)
  serviceLive = await makeService(fpId, 'S live', 'active')
  serviceDraft = await makeService(fpId, 'S draft', 'draft')
  servicePaused = await makeService(fpId, 'S paused', 'hidden')
  serviceModerated = await makeService(fpId, 'S moderated', 'active')
  serviceUnderModeratedProfile = await makeService(moderatedFpId, 'S under moderated profile', 'active')

  const adminClient = await signIn('admin')
  const hides: Array<[string, string]> = [
    ['product', productModerated],
    ['service', serviceModerated],
    ['shop', moderatedShopId],
    ['freelancer_profile', moderatedFpId],
  ]
  for (const [target_type, target_id] of hides) {
    const { error } = await adminClient.rpc('admin_hide_content', { target_type, target_id, reason: `${TITLE} moderation` })
    if (error) throw new Error(`admin_hide_content(${target_type}) failed: ${error.message}`)
  }

  shopOwnerClient = await signIn('shop')
  freelancerClient = await signIn('free')
  buyerClient = await signIn('buyer')
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 120000)

describe.skipIf(!hasCreds)('ground truth for every rejection below', () => {
  it('the non-live items exist, in exactly the states under test', async () => {
    const { data: products, error: pErr } = await admin
      .from('products')
      .select('id, status, admin_hidden_at, shops ( admin_hidden_at )')
      .in('id', [productHidden, productSoldOut, productModerated, productInModeratedShop])
    expect(pErr).toBeNull()
    const p = new Map((products ?? []).map((row) => [row.id as string, row]))
    expect(p.get(productHidden)?.status).toBe('hidden')
    expect(p.get(productSoldOut)?.status).toBe('sold_out')
    expect(p.get(productModerated)?.admin_hidden_at).not.toBeNull()
    expect(p.get(productInModeratedShop)?.status).toBe('active')
    expect(p.get(productInModeratedShop)?.admin_hidden_at).toBeNull()

    const { data: shop } = await admin.from('shops').select('admin_hidden_at').eq('id', moderatedShopId).single()
    expect(shop?.admin_hidden_at).not.toBeNull()

    const { data: services, error: sErr } = await admin
      .from('service_listings')
      .select('id, status, admin_hidden_at')
      .in('id', [serviceDraft, servicePaused, serviceModerated, serviceUnderModeratedProfile])
    expect(sErr).toBeNull()
    const s = new Map((services ?? []).map((row) => [row.id as string, row]))
    expect(s.get(serviceDraft)?.status).toBe('draft')
    expect(s.get(servicePaused)?.status).toBe('hidden')
    expect(s.get(servicePaused)?.admin_hidden_at).toBeNull()
    expect(s.get(serviceModerated)?.admin_hidden_at).not.toBeNull()
    expect(s.get(serviceUnderModeratedProfile)?.status).toBe('active')
    expect(s.get(serviceUnderModeratedProfile)?.admin_hidden_at).toBeNull()

    const { data: fp } = await admin.from('freelancer_profiles').select('admin_hidden_at').eq('id', moderatedFpId).single()
    expect(fp?.admin_hidden_at).not.toBeNull()
  })
})

describe.skipIf(!hasCreds)('controls — the legitimate app paths still work end to end', () => {
  it('a COD product order on a live product succeeds, snapshotted, pending, logged as created by the buyer', async () => {
    const { data, error } = await buyerClient
      .from('orders')
      .insert(productOrder(productLive))
      .select('id, seller_id, status, item_title, unit_price_tnd')
      .single()
    expect(error).toBeNull()
    expect(data?.seller_id).toBe(shopOwnerId)
    expect(data?.status).toBe('pending')
    expect(data?.item_title).toBe(`${TITLE} — P live`)
    expect(Number(data?.unit_price_tnd)).toBe(80)

    const { data: events, error: evErr } = await admin
      .from('order_events')
      .select('event_type, to_status, actor_role')
      .eq('order_id', data!.id)
    expect(evErr).toBeNull()
    expect(events).toEqual([{ event_type: 'created', to_status: 'pending', actor_role: 'buyer' }])
  })

  it('a service request on a live service succeeds', async () => {
    const { data, error } = await buyerClient
      .from('orders')
      .insert(serviceOrder(serviceLive))
      .select('seller_id, status, item_title')
      .single()
    expect(error).toBeNull()
    expect(data?.seller_id).toBe(freelancerId)
    expect(data?.status).toBe('pending')
    expect(data?.item_title).toBe(`${TITLE} — S live`)
  })
})

describe.skipIf(!hasCreds)('tier 2 — the item must be live (23514)', () => {
  const productCases: Array<[string, () => string]> = [
    ['owner-hidden product', () => productHidden],
    ['sold-out product', () => productSoldOut],
    ['admin-moderated product', () => productModerated],
    ['live product in an admin-moderated shop', () => productInModeratedShop],
  ]
  for (const [label, id] of productCases) {
    it(`rejects an order on a ${label}, and no row lands`, async () => {
      const { error } = await buyerClient.from('orders').insert(productOrder(id()))
      expect(error?.code).toBe('23514')
      expect(error?.message).toBe(NOT_LIVE)
      expect(await orderCount('product_id', id())).toBe(0)
    })
  }

  const serviceCases: Array<[string, () => string]> = [
    ['draft service', () => serviceDraft],
    ['owner-paused service', () => servicePaused],
    ['admin-moderated service', () => serviceModerated],
    ['live service under an admin-moderated freelancer profile', () => serviceUnderModeratedProfile],
  ]
  for (const [label, id] of serviceCases) {
    it(`rejects an order on a ${label}, and no row lands`, async () => {
      const { error } = await buyerClient.from('orders').insert(serviceOrder(id()))
      expect(error?.code).toBe('23514')
      expect(error?.message).toBe(NOT_LIVE)
      expect(await orderCount('service_listing_id', id())).toBe(0)
    })
  }

  it('the rejected draft order granted no read on the draft (the D1 buyer branch stays closed)', async () => {
    const { data, error } = await buyerClient.from('service_listings').select('id').eq('id', serviceDraft)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

describe.skipIf(!hasCreds)("tier 2 — an order is born 'pending' with no lifecycle fields (42501)", () => {
  it("rejects a service order inserted as 'received', and the public D4 count does not move", async () => {
    const { data: before } = await admin.rpc('get_completed_service_order_count', { target: freelancerId })
    const { error } = await buyerClient.from('orders').insert(serviceOrder(serviceLive, { status: 'received' }))
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_PENDING)
    const { data: after } = await admin.rpc('get_completed_service_order_count', { target: freelancerId })
    expect(after).toBe(before)
  })

  for (const status of ['accepted', 'arrived', 'cancelled']) {
    it(`rejects a service order inserted as '${status}'`, async () => {
      const { error } = await buyerClient.from('orders').insert(serviceOrder(serviceLive, { status }))
      expect(error?.code).toBe('42501')
      expect(error?.message).toBe(NOT_PENDING)
    })
  }

  const lifecycle: Array<[string, Record<string, unknown>]> = [
    ['cancelled_by', { cancelled_by: 'seller' }],
    ['cancelled_at', { cancelled_at: new Date().toISOString() }],
    ['cancellation_reason', { cancellation_reason: 'forged' }],
    ['received_at', { received_at: new Date().toISOString() }],
    ['carrier', { carrier: 'Forged Express' }],
    ['tracking_number', { tracking_number: 'FORGED-1' }],
  ]
  for (const [column, extra] of lifecycle) {
    it(`rejects a 'pending' product order that pre-fills ${column}`, async () => {
      const { error } = await buyerClient.from('orders').insert(productOrder(productLive, extra))
      expect(error?.code).toBe('42501')
      expect(error?.message).toBe(NOT_PENDING)
    })
  }
})

describe.skipIf(!hasCreds)('tier 1 — seller_id is the item owner, whatever the client sends', () => {
  it('a spoofed seller_id is OVERWRITTEN (not rejected) with the shop owner', async () => {
    const { data, error } = await buyerClient
      .from('orders')
      .insert(productOrder(productLive, { seller_id: victimId }))
      .select('seller_id')
      .single()
    expect(error).toBeNull()
    expect(data?.seller_id).toBe(shopOwnerId)
  })

  it("so the spoof unlocks nothing: get_contact_phone(victim) stays NULL for the attacker", async () => {
    const { count } = await admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .or(`seller_id.eq.${victimId},buyer_id.eq.${victimId}`)
    expect(count).toBe(0)
    const { data, error } = await buyerClient.rpc('get_contact_phone', { target: victimId })
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('a service-role insert is overwritten too (tier 1 applies to every caller)', async () => {
    const { data, error } = await admin
      .from('orders')
      .insert(serviceOrder(serviceLive, { seller_id: victimId }))
      .select('seller_id')
      .single()
    expect(error).toBeNull()
    expect(data?.seller_id).toBe(freelancerId)
  })

  it('an order on a non-existent item is rejected with the snapshot error (23503)', async () => {
    const { error } = await buyerClient.from('orders').insert(productOrder('00000000-0000-4000-8000-000000000000'))
    expect(error?.code).toBe('23503')
    expect(error?.message).toContain(NOT_FOUND)
  })
})

describe.skipIf(!hasCreds)('tier 2 — no self-orders (23514)', () => {
  it('a shop owner cannot order their own live product', async () => {
    const { error } = await shopOwnerClient
      .from('orders')
      .insert(productOrder(productLive, { buyer_id: shopOwnerId }))
    expect(error?.code).toBe('23514')
    expect(error?.message).toBe(SELF_ORDER)
  })

  it('a freelancer cannot order their own live service — even naming someone else as seller', async () => {
    const { error } = await freelancerClient
      .from('orders')
      .insert(serviceOrder(serviceLive, { buyer_id: freelancerId, seller_id: victimId }))
    expect(error?.code).toBe('23514')
    expect(error?.message).toBe(SELF_ORDER)
  })
})

describe.skipIf(!hasCreds)('tier 2 bypass — the service role (auth.uid() NULL) keeps fixture powers', () => {
  it("can still insert a 'received' order directly, as the d4/h5 suites do", async () => {
    const { data, error } = await admin
      .from('orders')
      .insert(serviceOrder(serviceLive, { status: 'received' }))
      .select('status')
      .single()
    expect(error).toBeNull()
    expect(data?.status).toBe('received')
  })
})

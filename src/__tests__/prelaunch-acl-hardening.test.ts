/**
 * Live-DB proof for db/migrations/20261026190353_prelaunch_acl_hardening.sql — pre-launch security batch
 * PR-2, items B + C + D (docs/design/prelaunch-security-batch-discovery.md §3–5; decisions 2, 7–11 and
 * P2-1 / P2-2).
 *
 * Signup — handle_new_user lost every client EXECUTE: every fixture below is created through the admin
 *   API, and the profile row it must still produce is checked field by field.
 * B — trigger / helper functions are closed to clients, yet every trigger family still fires for a JWT
 *   caller (EXECUTE is not checked when a trigger fires): one probe per family, pinned by its message.
 *   The six admin RPCs refuse anon by privilege and a signed-in non-admin by their own is_admin() gate;
 *   is_admin / get_contact_phone / get_completed_service_order_count / is_active_user stay callable;
 *   f_unaccent's qualified body still feeds search_vector. That the trigger functions themselves are
 *   closed is catalog-level (has_function_privilege, checked by the architect at apply), not RPC-level.
 * C — data_exports / deletion_requests: a user names only themselves (and a reason); every system column
 *   is refused 42501; admins may update only the processing columns.
 * D — anon never writes; authenticated's policy-less DELETE / UPDATE are refused by privilege; anon reads
 *   of the marketplace still work (the PUBLIC policies read orders as the caller); anon cannot read
 *   admin_audit_log / disputes. TRUNCATE is not reachable over PostgREST: catalog-checked at apply.
 *
 * Fixtures (all `pl-acl-`, password random per run: the repo is public and this suite promotes an admin
 * in production): a buyer, a shop owner with one live product, an unrelated consumer, a minor and an
 * admin.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/prelaunch-acl-hardening.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'

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

const PREFIX = 'pl-acl-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Pa-${randomUUID()}-Aa1!`
const TITLE = `ACL hardening test ${RUN}`
const METADATA = { full_name: 'ACL Hardening Test', date_of_birth: '1990-01-01', city: 'Sfax', language: 'fr' }

// 15 years before today (UTC), so the minor stays under 18 whatever day the suite runs.
const MINOR_DOB = (() => {
  const d = new Date()
  d.setUTCFullYear(d.getUTCFullYear() - 15)
  return d.toISOString().slice(0, 10)
})()

// The refusals under test, pinned by text so another rejection can't pass for them.
const DENIED = '42501'
const tableDenied = (table: string) => `permission denied for table ${table}`
const functionDenied = (fn: string) => `permission denied for function ${fn}`
const FORBIDDEN_RPC = 'Forbidden: admin access required'
const ORDER_NOT_PENDING = 'Une commande est toujours créée en attente.' // enforce_order_insert_integrity
const NOT_SHOP_OWNER = 'Seul un compte boutique peut posséder une boutique.' // enforce_seller_capability
const MARKER_LOCK = 'Only admins can set or clear admin_hidden_at' // enforce_admin_marker_lock / _moderation_lock
const UNDER_18 = 'You must be 18 or older to become a seller' // enforce_seller_type_age_gate

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)
const anon: Client = hasCreds ? createClient<Database>(url, anonKey, opts) : (undefined as unknown as Client)

async function createUser(local: string, dateOfBirth = METADATA.date_of_birth): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { ...METADATA, date_of_birth: dateOfBirth },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

async function signIn(local: string): Promise<Client> {
  const client = createClient<Database>(url, anonKey, opts)
  const { error } = await fixtureSignIn(client, email(local))
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

function expectDenied(error: { code?: string; message?: string } | null, message: string) {
  expect(error?.code).toBe(DENIED)
  expect(error?.message).toBe(message)
}

// The exact payload of demander/[id]/actions.ts — submitProductRequest (seller_id is derived by
// migration 54's trigger, hence the one cast).
function productOrder(buyer: string, productId: string, status = 'pending'): OrderInsert {
  const payload: Omit<OrderInsert, 'seller_id'> = {
    buyer_id: buyer,
    order_type: 'product',
    product_id: productId,
    service_listing_id: null,
    status,
    delivery_name: 'Test Buyer',
    delivery_address: 'Rue test',
    delivery_phone: '+21620000001',
    quantity: 1,
    buyer_note: null,
  }
  return payload as OrderInsert
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// The fixture product is live on production while this runs: refuse while a real customer's order
// references the fixture seller. Then data_exports / deletion_requests (processed_by -> auth.users has no
// ON DELETE action, so the admin could not be deleted under them), the fixture orders by buyer, and the
// users (cascades profiles -> shops -> products).
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return
  await refuseTeardownOnForeignOrders(admin, ids, PREFIX)

  for (const table of ['data_exports', 'deletion_requests'] as const) {
    const { error: reqErr } = await admin.from(table).delete().in('user_id', ids)
    if (reqErr) throw new Error(`${table} cleanup failed: ${reqErr.message}`)
  }
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
let sellerId: string
let otherId: string
let adminId: string
let shopId: string
let productId: string

let buyerClient: Client
let sellerClient: Client
let otherClient: Client
let minorClient: Client
let adminClient: Client

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  buyerId = await createUser('buyer')
  sellerId = await createUser('seller')
  otherId = await createUser('other')
  await createUser('minor', MINOR_DOB)
  adminId = await createUser('admin')

  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)
  const { error: typeErr } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', sellerId)
  if (typeErr) throw new Error(`seller upgrade failed: ${typeErr.message}`)
  const { data: shop, error: shopErr } = await admin.from('shops').insert({ owner_id: sellerId, name: `${TITLE} — shop` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  shopId = shop.id
  const { data: product, error: productErr } = await admin
    .from('products')
    .insert({ shop_id: shopId, title: `${TITLE} — product`, price_tnd: 25, status: 'active' })
    .select('id')
    .single()
  if (productErr || !product) throw new Error(`product insert failed: ${productErr?.message}`)
  productId = product.id

  buyerClient = await signIn('buyer')
  sellerClient = await signIn('seller')
  otherClient = await signIn('other')
  minorClient = await signIn('minor')
  adminClient = await signIn('admin')
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

describe.skipIf(!hasCreds)('signup — handle_new_user still runs with no client EXECUTE', () => {
  it('an admin-API user gets its full profiles row from the auth.users trigger', async () => {
    const { data, error } = await admin
      .from('profiles')
      .select('email, full_name, city, language, date_of_birth')
      .eq('id', buyerId)
      .single()
    expect(error).toBeNull()
    expect(data).toEqual({ email: email('buyer'), ...METADATA })
  })
})

describe.skipIf(!hasCreds)('B — functions closed to clients, triggers still firing', () => {
  it('freelancer_has_active_listing is refused to anon and to a signed-in user', async () => {
    for (const client of [anon, buyerClient]) {
      const { error } = await client.rpc('freelancer_has_active_listing', { p_freelancer_profile_id: randomUUID() })
      expectDenied(error, functionDenied('freelancer_has_active_listing'))
    }
  })

  it('the six admin RPCs: anon refused by privilege, a signed-in non-admin by the is_admin() gate', async () => {
    const ghost = randomUUID()
    const calls = (client: Client) => [
      ['admin_hide_content', client.rpc('admin_hide_content', { target_type: 'product', target_id: ghost, reason: TITLE })],
      ['admin_unhide_content', client.rpc('admin_unhide_content', { target_type: 'product', target_id: ghost })],
      ['admin_suspend_user', client.rpc('admin_suspend_user', { target_user_id: ghost, reason: TITLE })],
      ['admin_unsuspend_user', client.rpc('admin_unsuspend_user', { target_user_id: ghost })],
      ['admin_overview_stats', client.rpc('admin_overview_stats')],
      [
        'log_admin_action',
        client.rpc('log_admin_action', {
          p_action: 'test', p_target_type: 'product', p_target_id: ghost, p_before_state: {}, p_after_state: {}, p_note: TITLE,
        }),
      ],
    ] as const
    for (const [fn, call] of calls(anon)) expectDenied((await call).error, functionDenied(fn))
    for (const [fn, call] of calls(buyerClient)) expect((await call).error?.message, fn).toBe(FORBIDDEN_RPC)
  })

  it('the kept functions still answer: is_admin, get_contact_phone, get_completed_service_order_count, is_active_user', async () => {
    expect(await anon.rpc('is_admin')).toMatchObject({ data: false, error: null })
    expect(await anon.rpc('get_contact_phone', { target: sellerId })).toMatchObject({ data: null, error: null })
    const count = await anon.rpc('get_completed_service_order_count', { target: sellerId })
    expect(count.error).toBeNull()
    expect(count.data).toBe(0)
    expect(await buyerClient.rpc('is_active_user')).toMatchObject({ data: true, error: null })
  })

  it('f_unaccent (qualified body) still feeds search_vector: « Élève » is found as « eleve »', async () => {
    const { data: created, error } = await sellerClient
      .from('products')
      .insert({ shop_id: shopId, title: `Élève à Sfax ${RUN}`, price_tnd: 10, status: 'hidden' })
      .select('id')
      .single()
    expect(error).toBeNull()
    const { data, error: searchErr } = await admin
      .from('products')
      .select('id')
      .eq('id', created!.id)
      .textSearch('search_vector', `eleve & sfax & ${RUN}`, { config: 'simple' })
    expect(searchErr).toBeNull()
    expect(data).toEqual([{ id: created!.id }])
  })

  it('orders: an insert not at pending is refused by enforce_order_insert_integrity', async () => {
    const { error } = await buyerClient.from('orders').insert(productOrder(buyerId, productId, 'accepted'))
    expect(error?.message).toBe(ORDER_NOT_PENDING)
  })

  it('orders: the buyer inserts, the seller cancels — snapshot, event, transition and cancelled_at stamp all fire', async () => {
    const { data: order, error } = await buyerClient.from('orders').insert(productOrder(buyerId, productId)).select('id').single()
    expect(error).toBeNull()
    const { data: cancelled, error: cancelErr } = await sellerClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_by: 'seller' })
      .eq('id', order!.id)
      .select('status')
    expect(cancelErr).toBeNull()
    expect(cancelled).toEqual([{ status: 'cancelled' }])
    const { data: row } = await admin.from('orders').select('seller_id, item_title, cancelled_at').eq('id', order!.id).single()
    expect(row?.seller_id).toBe(sellerId) // enforce_order_insert_integrity
    expect(row?.item_title).toBe(`${TITLE} — product`) // set_order_snapshot
    expect(row?.cancelled_at).not.toBeNull() // set_cancelled_at_on_transition
    const { count } = await admin.from('order_events').select('id', { count: 'exact', head: true }).eq('order_id', order!.id)
    expect(count).toBeGreaterThanOrEqual(2) // emit_order_event: created + cancelled
  })

  it('products: updated_at bumps (handle_updated_at) and the moderation marker stays admin-only', async () => {
    const { data: before } = await admin.from('products').select('updated_at').eq('id', productId).single()
    const { error } = await sellerClient.from('products').update({ description: `Edited ${RUN}` }).eq('id', productId)
    expect(error).toBeNull()
    const { data: after } = await admin.from('products').select('updated_at').eq('id', productId).single()
    expect(Date.parse(after!.updated_at)).toBeGreaterThan(Date.parse(before!.updated_at))
    const { error: markerErr } = await sellerClient.from('products').update({ admin_hidden_at: new Date().toISOString() }).eq('id', productId)
    expect(markerErr?.message).toBe(MARKER_LOCK)
  })

  it('shops: a consumer cannot create one, and an owner cannot set the moderation marker', async () => {
    const { error } = await otherClient.from('shops').insert({ owner_id: otherId, name: `${TITLE} — forbidden shop` })
    expect(error?.message).toBe(NOT_SHOP_OWNER)
    const { error: markerErr } = await sellerClient.from('shops').update({ admin_hidden_at: new Date().toISOString() }).eq('id', shopId)
    expect(markerErr?.message).toBe(MARKER_LOCK)
  })

  it('profiles: a minor cannot become a seller (enforce_seller_type_age_gate)', async () => {
    const { data } = await admin.from('profiles').select('id').eq('email', email('minor')).single()
    const { error } = await minorClient.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', data!.id)
    expect(error?.message).toBe(UNDER_18)
  })
})

describe.skipIf(!hasCreds)('C — data_exports / deletion_requests: the user names only themselves', () => {
  it('the plain requests work, with the system columns at their defaults', async () => {
    expect((await buyerClient.from('data_exports').insert({ user_id: buyerId })).error).toBeNull()
    expect((await buyerClient.from('deletion_requests').insert({ user_id: buyerId, reason: TITLE })).error).toBeNull()
    for (const table of ['data_exports', 'deletion_requests'] as const) {
      const { data } = await admin.from(table).select('status, requested_at, processed_at, processed_by').eq('user_id', buyerId).single()
      expect(data).toMatchObject({ status: 'pending', processed_at: null, processed_by: null })
      expect(data?.requested_at).toBeTruthy()
    }
  })

  it('every system column is refused on INSERT, and nothing is written', async () => {
    const forged = { processed_at: new Date().toISOString(), processed_by: otherId, requested_at: '2001-01-01T00:00:00+00:00', id: randomUUID() }
    const exportCases: Record<string, Database['public']['Tables']['data_exports']['Insert']> = {
      status: { user_id: otherId, status: 'completed' },
      processed_at: { user_id: otherId, processed_at: forged.processed_at },
      processed_by: { user_id: otherId, processed_by: forged.processed_by },
      requested_at: { user_id: otherId, requested_at: forged.requested_at },
      export_url: { user_id: otherId, export_url: 'https://attacker.example' },
      id: { user_id: otherId, id: forged.id },
    }
    for (const [label, row] of Object.entries(exportCases)) {
      const { error } = await otherClient.from('data_exports').insert(row)
      expect(error?.message, label).toBe(tableDenied('data_exports'))
    }
    const deletionCases: Record<string, Database['public']['Tables']['deletion_requests']['Insert']> = {
      status: { user_id: otherId, status: 'approved' },
      processed_at: { user_id: otherId, processed_at: forged.processed_at },
      processed_by: { user_id: otherId, processed_by: forged.processed_by },
      requested_at: { user_id: otherId, requested_at: forged.requested_at },
      id: { user_id: otherId, id: forged.id },
    }
    for (const [label, row] of Object.entries(deletionCases)) {
      const { error } = await otherClient.from('deletion_requests').insert(row)
      expect(error?.message, label).toBe(tableDenied('deletion_requests'))
    }
    for (const table of ['data_exports', 'deletion_requests'] as const) {
      const { count } = await admin.from(table).select('id', { count: 'exact', head: true }).eq('user_id', otherId)
      expect(count).toBe(0)
    }
  })

  it('a second pending request is a duplicate; another user_id is RLS-refused', async () => {
    expect((await buyerClient.from('data_exports').insert({ user_id: buyerId })).error?.code).toBe('23505')
    const { error } = await otherClient.from('data_exports').insert({ user_id: buyerId })
    expect(error?.code).toBe(DENIED)
    expect(error?.message).toBe('new row violates row-level security policy for table "data_exports"')
  })

  it('the user can neither withdraw nor process their own request', async () => {
    expectDenied((await buyerClient.from('data_exports').delete().eq('user_id', buyerId)).error, tableDenied('data_exports'))
    expectDenied((await buyerClient.from('deletion_requests').delete().eq('user_id', buyerId)).error, tableDenied('deletion_requests'))
    // status is column-granted for the admins' policy, but the UPDATE policy is is_admin(): 0 rows.
    const { data, error } = await buyerClient.from('data_exports').update({ status: 'completed' }).eq('user_id', buyerId).select('id')
    expect(error).toBeNull()
    expect(data).toEqual([])
    const { data: row } = await admin.from('data_exports').select('status').eq('user_id', buyerId).single()
    expect(row?.status).toBe('pending')
  })

  it('an admin processes a request through the processing columns only', async () => {
    const { data, error } = await adminClient
      .from('data_exports')
      .update({ status: 'completed', processed_at: new Date().toISOString(), processed_by: adminId, export_url: 'https://servyou.vercel.app/export.zip' })
      .eq('user_id', buyerId)
      .select('status, processed_by')
    expect(error).toBeNull()
    expect(data).toEqual([{ status: 'completed', processed_by: adminId }])
    expectDenied((await adminClient.from('data_exports').update({ user_id: adminId }).eq('user_id', buyerId)).error, tableDenied('data_exports'))
    expectDenied(
      (await adminClient.from('deletion_requests').update({ requested_at: new Date().toISOString() }).eq('user_id', buyerId)).error,
      tableDenied('deletion_requests'),
    )
  })
})

describe.skipIf(!hasCreds)('D — default-grant sweep', () => {
  it('anon writes are refused by privilege, before RLS', async () => {
    const ghost = randomUUID()
    expectDenied((await anon.from('products').insert({ shop_id: shopId, title: 'Pwned', price_tnd: 1 })).error, tableDenied('products'))
    expectDenied((await anon.from('products').update({ title: 'Pwned' }).eq('id', productId)).error, tableDenied('products'))
    expectDenied((await anon.from('products').delete().eq('id', ghost)).error, tableDenied('products'))
    expectDenied((await anon.from('orders').insert(productOrder(buyerId, productId))).error, tableDenied('orders'))
    expectDenied((await anon.from('categories').update({ name_fr: 'Pwned' }).eq('id', ghost)).error, tableDenied('categories'))
    expectDenied((await anon.from('job_posts').delete().eq('id', ghost)).error, tableDenied('job_posts'))
  })

  it('anon cannot read admin_audit_log or disputes, and still reads the marketplace (orders subquery)', async () => {
    expectDenied((await anon.from('admin_audit_log').select('id').limit(1)).error, tableDenied('admin_audit_log'))
    expectDenied((await anon.from('disputes').select('id').limit(1)).error, tableDenied('disputes'))
    const { data, error } = await anon.from('products').select('id').eq('id', productId)
    expect(error).toBeNull()
    expect(data).toEqual([{ id: productId }])
    const { error: listingsErr } = await anon.from('service_listings').select('id').limit(1)
    expect(listingsErr).toBeNull()
  })

  it("authenticated's policy-less DELETE / UPDATE are refused by privilege", async () => {
    const ghost = randomUUID()
    expectDenied((await buyerClient.from('orders').delete().eq('id', ghost)).error, tableDenied('orders'))
    expectDenied((await buyerClient.from('reports').delete().eq('id', ghost)).error, tableDenied('reports'))
    expectDenied((await buyerClient.from('favorites').update({ item_type: 'product' }).eq('id', ghost)).error, tableDenied('favorites'))
    expectDenied((await sellerClient.from('product_images').update({ display_order: 1 }).eq('id', ghost)).error, tableDenied('product_images'))
  })
})

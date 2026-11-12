/**
 * Live proof for db/migrations/20261106074610_admin_requests_backend.sql (docs/discovery/admin-requests-backend.md, D1–D9):
 * the six admin « Demandes » RPCs — three lists, admin_process_deletion_request (tombstone), admin_process_data_export,
 * admin_mark_contact_message_handled — plus the removal of the admins' direct UPDATE path.
 *
 *   * access — anon has no EXECUTE; a signed-in non-admin meets the is_admin() gate (42501) on all six;
 *   * lists — pending first, oldest first, then the rest; the open-order count; an unknown status is 23514;
 *   * deletion guards — unknown decision / reject without a note (23514), unknown id (P0002), an open order (23514),
 *     an admin target and the caller's own account (42501);
 *   * deletion approve, three accounts:
 *       buyer      — favourite deleted; a post with a proposal closed (D8), a post without one deleted; the received
 *                    order keeps amounts / title / status but loses the delivery identity (D3); a pending export is
 *                    closed (D9); profile tombstoned + suspended (D1);
 *       seller(s)  — two shop owners in a row (each kept shop gets its own name, migration 20261106083409);
 *                    the product with no order deleted, the sold one and the reported one hidden (« Compte supprimé »);
 *                    the shop hidden and scrubbed, its payment methods deleted (c2); the order history intact;
 *       freelancer — the active service with no order deleted, the reported draft hidden but still `draft`; the profile
 *                    hidden and scrubbed (is_published false), its links deleted; its proposal deleted and the post's
 *                    response_count follows;
 *     one audit row each, ids and counts only (no e-mail, no name); a second process is 23514;
 *   * reject — with a note: status rejected, audit row;
 *   * export / contact — each processes, logs, and refuses a repeat; a refusal needs a note;
 *   * grant lockdown — an admin's direct UPDATE of a request is refused by privilege;
 *   * D2 erasure (src/lib/admin/account-erasure.ts, called directly — the server action needs a cookie session; its
 *     logic is unit-tested in admin-demandes-actions.test.ts): refused on a live account; on a tombstone the auth e-mail
 *     and identity are replaced, the metadata emptied, the account banned, every file (an un-indexed one included) and
 *     image row removed; a second run is a no-op; neither the old nor the tombstone e-mail can sign in.
 *
 * Fixtures (`adm-req-`, passwords random per run), written by the service role: an admin (signs in), a second admin, a
 * consumer (signs in), a buyer, two shop owners, a freelancer, five small webp files, plus one /contact message.
 * 3 fixture sign-ins (the third is the banned account's refused one).
 * Teardown finds the users through the auth admin API — by e-mail prefix, or by the `app_metadata.fixture` tag once the
 * erasure has replaced the e-mail — and removes their files before deleting them.
 *
 * Run: npx vitest run --config vitest.integration.config.ts --no-file-parallelism src/__tests__/admin-requests-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'
import { finishAccountErasure, tombstoneEmail } from '@/lib/admin/account-erasure'
import { revokeTestAdmins, assertNoTestAdmin } from './fixture-admin'

type Client = SupabaseClient<Database>

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'adm-req-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const RUN = randomUUID().slice(0, 8)
const TITLE = `${PREFIX}${RUN}`
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PHONE = '+21620000000'
const NOT_ADMIN = 'Accès réservé aux administrateurs.'
const DELETED = 'Compte supprimé'
const PROPOSAL = 'Une proposition de test assez longue pour passer.'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

type Local = 'admin' | 'admin2' | 'consumer' | 'buyer' | 'seller' | 'seller2' | 'freelancer'
const ids = {} as Record<Local, string>
const req = {} as Record<'seller' | 'buyer' | 'freelancer' | 'admin2' | 'self' | 'seller2', string>
const fx = {
  productImagePath: '', shop: '', productSold: '', productUnsold: '', productReported: '', openOrder: '', receivedOrder: '', shop2: '', product2: '',
  fp: '', serviceActive: '', serviceDraft: '', postWithProposal: '', postEmpty: '', buyerExport: '', message: '',
}

let adminClient: Client
let consumerClient: Client

async function signIn(local: Local): Promise<Client> {
  const c = createClient<Database>(url, anonKey, opts)
  const { error } = await fixtureSignIn(c, email(local))
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return c
}

async function fixtureUserIds(): Promise<string[]> {
  const found: string[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    // The erasure replaces the auth e-mail, so an erased fixture is found by its app_metadata tag (never touched).
    for (const u of data.users) {
      const byEmail = u.email?.startsWith(PREFIX) && u.email.endsWith(EMAIL_SUFFIX)
      if (byEmail || u.app_metadata?.fixture === PREFIX) found.push(u.id)
    }
    if (data.users.length < 1000) return found
  }
}

// Idempotent, surgical to this prefix; runs first (recovers a crashed run) and last. Order matters:
// admin_audit_log.admin_id is ON DELETE RESTRICT, and data_exports / deletion_requests.processed_by -> auth.users has
// no ON DELETE action, so both go before the users; then the orders (refused while a real customer's order points at a
// fixture seller); deleting the users cascades the rest (the moderation no-delete trigger skips the service role).
async function teardown(): Promise<void> {
  const found = await fixtureUserIds()
  await revokeTestAdmins(found) // audit H6: admin rights go first, before anything that can throw
  const { error: msgErr } = await admin.from('contact_messages').delete().like('name', `${PREFIX}%`)
  if (msgErr) throw new Error(`contact_messages cleanup failed: ${msgErr.message}`)
  if (found.length === 0) return
  await refuseTeardownOnForeignOrders(admin, found, PREFIX)
  const steps: [string, PromiseLike<{ error: { message: string } | null }>][] = [
    ['admin_audit_log', admin.from('admin_audit_log').delete().in('admin_id', found)],
    ['data_exports', admin.from('data_exports').delete().in('user_id', found)],
    ['deletion_requests', admin.from('deletion_requests').delete().in('user_id', found)],
    ['reports', admin.from('reports').delete().in('reporter_id', found)],
    ['orders', admin.from('orders').delete().in('buyer_id', found)],
  ]
  for (const [label, step] of steps) {
    const { error } = await step
    if (error) throw new Error(`${label} cleanup failed: ${error.message}`)
  }
  await removeFixtureFiles(found)
  for (const id of found) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) throw new Error(`deleteUser failed for ${id}: ${error.message}`)
  }
}

// Storage is not cascaded by deleteUser: remove what the fixtures uploaded (their provenance rows + the un-indexed
// orphan), then the rows. Removing a missing object is not an error, so this is safe after the erasure too.
const WEBP = () => new Blob([new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])], { type: 'image/webp' })
async function removeFixtureFiles(userIds: string[]): Promise<void> {
  const { data: rows, error } = await admin.from('uploaded_objects').select('bucket, path').in('owner_id', userIds)
  if (error) throw new Error(`uploaded_objects lookup failed: ${error.message}`)
  const byBucket = new Map<string, string[]>()
  for (const r of rows ?? []) byBucket.set(r.bucket, [...(byBucket.get(r.bucket) ?? []), r.path])
  for (const id of userIds) {
    byBucket.set('avatars', [...(byBucket.get('avatars') ?? []), `${id}/a.webp`, `${id}/orphan.webp`])
    byBucket.set('portfolio-media', [...(byBucket.get('portfolio-media') ?? []), `${id}/p.webp`])
  }
  for (const [bucket, paths] of byBucket) {
    const { error: rmErr } = await admin.storage.from(bucket).remove(paths)
    if (rmErr) throw new Error(`storage cleanup failed for ${bucket}: ${rmErr.message}`)
  }
  const { error: delErr } = await admin.from('uploaded_objects').delete().in('owner_id', userIds)
  if (delErr) throw new Error(`uploaded_objects cleanup failed: ${delErr.message}`)
}

async function seedFile(bucket: string, path: string, ownerId: string | null): Promise<void> {
  const { error } = await admin.storage.from(bucket).upload(path, WEBP(), { contentType: 'image/webp', upsert: true })
  if (error) throw new Error(`upload ${bucket} failed: ${error.message}`)
  if (ownerId === null) return
  const { error: uoErr } = await admin.from('uploaded_objects').insert({ bucket, path, owner_id: ownerId })
  if (uoErr) throw new Error(`uploaded_objects seed failed (${bucket}): ${uoErr.message}`)
}

async function listed(bucket: string, prefix: string): Promise<string[]> {
  const { data, error } = await admin.storage.from(bucket).list(prefix)
  if (error) throw new Error(`list ${bucket} failed: ${error.message}`)
  return (data ?? []).filter((e) => e.id !== null).map((e) => e.name)
}

async function createUser(local: Local, patch: Database['public']['Tables']['profiles']['Update']): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: `Ar-${randomUUID()}-Aa1!`,
    email_confirm: true,
    app_metadata: { fixture: PREFIX },
    user_metadata: { full_name: `Adm Req ${local}`, date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  const { error: pErr } = await admin.from('profiles').update({ phone: PHONE, ...patch }).eq('id', data.user.id)
  if (pErr) throw new Error(`profile seed failed for ${local}: ${pErr.message}`)
  return data.user.id
}

// Seeds one row through the service role and returns its id (untyped client: the table is a parameter).
async function insertId<T extends keyof Database['public']['Tables']>(
  table: T,
  row: Database['public']['Tables'][T]['Insert'],
): Promise<string> {
  const { data, error } = await (admin as unknown as SupabaseClient).from(table).insert(row).select('id').single()
  if (error || !data) throw new Error(`${String(table)} seed failed: ${error?.message}`)
  return data.id
}

function productOrder(buyer: string, seller: string, productId: string, status: string): Database['public']['Tables']['orders']['Insert'] {
  return {
    buyer_id: buyer, seller_id: seller, order_type: 'product', product_id: productId, status, quantity: 1,
    delivery_name: 'Adm Req Buyer', delivery_address: 'Rue du test', delivery_phone: '+21620000001', buyer_note: 'Sonnez deux fois',
  }
}

const expectCode = (error: { code?: string } | null, code: string, label?: string) => expect(error?.code, label).toBe(code)

async function decide(requestId: string, decision: string, note?: string) {
  return adminClient.rpc('admin_process_deletion_request', { p_request_id: requestId, p_decision: decision, p_note: note })
}

async function auditRows(targetId: string) {
  const { data, error } = await admin.from('admin_audit_log').select('action, target_type, before_state, after_state, note').eq('target_id', targetId)
  if (error) throw new Error(`audit read failed: ${error.message}`)
  return data ?? []
}

async function count(table: keyof Database['public']['Tables'], column: string, value: string): Promise<number> {
  const { count: n, error } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(column, value)
  if (error) throw new Error(`count ${table} failed: ${error.message}`)
  return n ?? 0
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  ids.admin = await createUser('admin', { is_admin: true })
  ids.admin2 = await createUser('admin2', { is_admin: true })
  ids.consumer = await createUser('consumer', {})
  ids.buyer = await createUser('buyer', {})
  ids.seller = await createUser('seller', { seller_type: 'shop_owner' })
  ids.seller2 = await createUser('seller2', { seller_type: 'shop_owner' })
  ids.freelancer = await createUser('freelancer', { seller_type: 'freelancer' })

  // Seller: a shop with a payment method; a product sold (received order + an open one), one never ordered, one reported.
  fx.shop = await insertId('shops', { owner_id: ids.seller, name: `${TITLE} — shop`, description: 'Une boutique de test', city: 'Tunis' })
  const { error: pmErr } = await admin.from('shop_payment_methods').insert({ shop_id: fx.shop, method: 'cod' })
  if (pmErr) throw new Error(`shop_payment_methods seed failed: ${pmErr.message}`)
  fx.productSold = await insertId('products', { shop_id: fx.shop, title: `${TITLE} — sold`, price_tnd: 25, status: 'active' })
  fx.productUnsold = await insertId('products', { shop_id: fx.shop, title: `${TITLE} — unsold`, price_tnd: 30, status: 'active' })
  fx.productReported = await insertId('products', { shop_id: fx.shop, title: `${TITLE} — reported`, price_tnd: 35, status: 'active' })
  fx.receivedOrder = await insertId('orders', productOrder(ids.buyer, ids.seller, fx.productSold, 'received'))
  // Files for the D2 erasure: an avatar (+ one with no provenance row, found by the folder sweep), a shop logo, an image
  // on the sold product (kept, hidden), and — below — a portfolio image. Provenance before product_images (its trigger).
  await seedFile('avatars', `${ids.seller}/a.webp`, ids.seller)
  await seedFile('avatars', `${ids.seller}/orphan.webp`, null)
  await seedFile('shop-assets', `${fx.shop}/logo/l.webp`, ids.seller)
  fx.productImagePath = `${fx.shop}/${fx.productSold}/i.webp`
  await seedFile('product-images', fx.productImagePath, ids.seller)
  const imageUrl = admin.storage.from('product-images').getPublicUrl(fx.productImagePath).data.publicUrl
  const { error: piErr } = await admin.from('product_images').insert({ product_id: fx.productSold, image_url: imageUrl })
  if (piErr) throw new Error(`product_images seed failed: ${piErr.message}`)
  fx.openOrder = await insertId('orders', productOrder(ids.buyer, ids.seller, fx.productSold, 'pending'))
  // A second shop owner whose shop must stay too (a sold product): two tombstoned shops in a row (migration 20261106083409).
  fx.shop2 = await insertId('shops', { owner_id: ids.seller2, name: `${TITLE} — shop 2` })
  fx.product2 = await insertId('products', { shop_id: fx.shop2, title: `${TITLE} — sold 2`, price_tnd: 40, status: 'active' })
  await insertId('orders', productOrder(ids.consumer, ids.seller2, fx.product2, 'received'))
  const { error: rErr } = await admin.from('reports').insert({ reporter_id: ids.consumer, target_type: 'product', target_id: fx.productReported, reason: 'other' })
  if (rErr) throw new Error(`report seed failed: ${rErr.message}`)

  // Freelancer: one active service (no order), one reported draft, a link.
  const { data: sub, error: subErr } = await admin
    .from('categories').select('id, parent_id').eq('kind', 'service').not('parent_id', 'is', null).limit(1).single()
  if (subErr || !sub) throw new Error(`service subcategory lookup failed: ${subErr?.message}`)
  fx.fp = await insertId('freelancer_profiles', { profile_id: ids.freelancer, headline: 'Titre de test', bio: 'Une bio de test', city: 'Tunis' })
  fx.serviceActive = await insertId('service_listings', {
    freelancer_profile_id: fx.fp, status: 'active', title: `${TITLE} — active`, category_id: sub.parent_id!, subcategory_id: sub.id,
    tags: ['testing'], short_description: 'Un service de test pour les demandes admin', description: 'd'.repeat(120),
    starting_price_tnd: 100, price_unit: 'month', deliverables: ['Livrable un', 'Livrable deux', 'Livrable trois'], delivery_mode: 'remote',
  })
  fx.serviceDraft = await insertId('service_listings', { freelancer_profile_id: fx.fp, status: 'draft', title: `${TITLE} — draft` })
  // The open report is what keeps the draft (with no order and no report it is deleted): hidden instead, still `draft`.
  const { error: r2Err } = await admin.from('reports').insert({ reporter_id: ids.consumer, target_type: 'service', target_id: fx.serviceDraft, reason: 'other' })
  if (r2Err) throw new Error(`service report seed failed: ${r2Err.message}`)
  const { error: lErr } = await admin.from('freelancer_links').insert({ freelancer_profile_id: fx.fp, label: 'Lien', url: 'https://example.com/a', display_order: 0 })
  if (lErr) throw new Error(`freelancer_links seed failed: ${lErr.message}`)
  await seedFile('portfolio-media', `${ids.freelancer}/p.webp`, ids.freelancer)

  // Buyer: a favourite, a post with the freelancer's proposal, a post without one, a pending export.
  const { error: fErr } = await admin.from('favorites').insert({ user_id: ids.buyer, item_type: 'product', product_id: fx.productUnsold })
  if (fErr) throw new Error(`favorites seed failed: ${fErr.message}`)
  fx.postWithProposal = await insertId('job_posts', { consumer_id: ids.buyer, title: `${TITLE} — with proposal`, description: 'Mission de test.' })
  fx.postEmpty = await insertId('job_posts', { consumer_id: ids.buyer, title: `${TITLE} — empty`, description: 'Mission de test.' })
  const { error: jrErr } = await admin.from('job_responses').insert({ job_post_id: fx.postWithProposal, freelancer_id: ids.freelancer, proposal_message: PROPOSAL })
  if (jrErr) throw new Error(`job_responses seed failed: ${jrErr.message}`)
  fx.buyerExport = await insertId('data_exports', { user_id: ids.buyer })

  // Deletion requests, one statement each so requested_at is strictly increasing in this order.
  req.seller = await insertId('deletion_requests', { user_id: ids.seller, reason: TITLE })
  req.buyer = await insertId('deletion_requests', { user_id: ids.buyer, reason: TITLE })
  req.freelancer = await insertId('deletion_requests', { user_id: ids.freelancer, reason: TITLE })
  req.admin2 = await insertId('deletion_requests', { user_id: ids.admin2, reason: TITLE })
  req.self = await insertId('deletion_requests', { user_id: ids.admin, reason: TITLE })
  req.seller2 = await insertId('deletion_requests', { user_id: ids.seller2, reason: TITLE })

  fx.message = await insertId('contact_messages', {
    name: `${TITLE} — contact`, email: 'sender@example.com', subject: 'contact.form.subject.general', message: 'Bonjour',
  })

  adminClient = await signIn('admin')
  consumerClient = await signIn('consumer')
}, 240000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const left = await fixtureUserIds()
  if (left.length !== 0) throw new Error(`teardown left ${left.length} ${PREFIX} users`)
  const { count: msgs } = await admin.from('contact_messages').select('id', { count: 'exact', head: true }).like('name', `${PREFIX}%`)
  if ((msgs ?? 0) !== 0) throw new Error(`teardown left ${msgs} ${PREFIX} contact messages`)
  const tracked = Object.values(ids).filter(Boolean)
  if (tracked.length > 0) {
    const { count: profiles } = await admin.from('profiles').select('id', { count: 'exact', head: true }).in('id', tracked)
    if ((profiles ?? 0) !== 0) throw new Error(`teardown left ${profiles} fixture profiles`)
  }
  await assertNoTestAdmin() // audit H6: no test-domain account may still be an admin
}, 180000)

describe.skipIf(!hasCreds)('access — admin-only, authenticated EXECUTE only', () => {
  const calls = (c: Client) => [
    ['admin_list_deletion_requests', c.rpc('admin_list_deletion_requests', {})],
    ['admin_list_data_exports', c.rpc('admin_list_data_exports', {})],
    ['admin_list_contact_messages', c.rpc('admin_list_contact_messages', {})],
    ['admin_process_deletion_request', c.rpc('admin_process_deletion_request', { p_request_id: req.seller, p_decision: 'reject', p_note: 'x' })],
    ['admin_process_data_export', c.rpc('admin_process_data_export', { p_export_id: fx.buyerExport, p_decision: 'completed' })],
    ['admin_mark_contact_message_handled', c.rpc('admin_mark_contact_message_handled', { p_message_id: fx.message })],
  ] as const

  it('anon has no EXECUTE on any of the six', async () => {
    const anon = createClient<Database>(url, anonKey, opts)
    for (const [name, call] of calls(anon)) {
      const { error } = await call
      expectCode(error, '42501', name)
      expect(error?.message, name).toBe(`permission denied for function ${name}`)
    }
  })

  it('a signed-in non-admin meets the is_admin() gate on all six, and nothing moves', async () => {
    for (const [name, call] of calls(consumerClient)) {
      const { error } = await call
      expectCode(error, '42501', name)
      expect(error?.message, name).toBe(NOT_ADMIN)
    }
    expect((await admin.from('deletion_requests').select('status').eq('id', req.seller).single()).data?.status).toBe('pending')
    expect((await admin.from('data_exports').select('status').eq('id', fx.buyerExport).single()).data?.status).toBe('pending')
    expect((await admin.from('contact_messages').select('status').eq('id', fx.message).single()).data?.status).toBe('new')
  })
})

describe.skipIf(!hasCreds)('lists', () => {
  it('deletion requests: pending first, oldest first, with the open-order count', async () => {
    const { data, error } = await adminClient.rpc('admin_list_deletion_requests', { p_status: 'pending', p_limit: 200 })
    expect(error).toBeNull()
    const mine = (data ?? []).filter((r) => Object.values(req).includes(r.id))
    expect(mine.map((r) => r.id)).toEqual([req.seller, req.buyer, req.freelancer, req.admin2, req.self, req.seller2])
    const seller = mine.find((r) => r.id === req.seller)!
    expect(seller).toMatchObject({ user_id: ids.seller, email: email('seller'), seller_type: 'shop_owner', status: 'pending', open_orders: 1 })
    expect(mine.find((r) => r.id === req.buyer)?.open_orders).toBe(1)
    expect(mine.find((r) => r.id === req.freelancer)?.open_orders).toBe(0)
  })

  it('an unknown status is refused; p_limit 1 and the floor (0 → 1) return one row', async () => {
    expectCode((await adminClient.rpc('admin_list_deletion_requests', { p_status: 'bogus' })).error, '23514')
    expectCode((await adminClient.rpc('admin_list_data_exports', { p_status: 'bogus' })).error, '23514')
    expectCode((await adminClient.rpc('admin_list_contact_messages', { p_status: 'bogus' })).error, '23514')
    for (const limit of [1, 0, -5]) {
      const { data, error } = await adminClient.rpc('admin_list_deletion_requests', { p_status: 'pending', p_limit: limit })
      expect(error, String(limit)).toBeNull()
      expect(data, String(limit)).toHaveLength(1)
    }
  })

  it('exports and contact messages list the fixture rows', async () => {
    const exports = await adminClient.rpc('admin_list_data_exports', { p_limit: 200 })
    expect(exports.error).toBeNull()
    expect(exports.data?.find((r) => r.id === fx.buyerExport)).toMatchObject({ user_id: ids.buyer, email: email('buyer'), status: 'pending' })
    const messages = await adminClient.rpc('admin_list_contact_messages', { p_limit: 200 })
    expect(messages.error).toBeNull()
    expect(messages.data?.find((r) => r.id === fx.message)).toMatchObject({ status: 'new', subject: 'contact.form.subject.general' })
  })
})

describe.skipIf(!hasCreds)('deletion — guards', () => {
  // Messages pinned: req.seller also has an open order (23514 too), so a code-only check would pass without the guard.
  it('an unknown decision, a reject without a note, a note over 500 characters: 23514', async () => {
    const cases: [string, string | undefined, string][] = [
      ['delete', undefined, 'Décision inconnue.'],
      ['reject', undefined, 'Indiquez le motif du refus.'],
      ['reject', '   ', 'Indiquez le motif du refus.'],
      ['approve', 'n'.repeat(501), 'La note est trop longue (500 caractères maximum).'],
    ]
    for (const [decision, note, message] of cases) {
      const { error } = await decide(req.seller, decision, note)
      expectCode(error, '23514', `${decision} ${note?.length ?? 0}`)
      expect(error?.message).toBe(message)
    }
  })

  it('an unknown request: P0002', async () => {
    expectCode((await decide(randomUUID(), 'approve')).error, 'P0002')
  })

  it('an open order blocks the approval (23514), and nothing is written', async () => {
    const { error } = await decide(req.seller, 'approve')
    expectCode(error, '23514')
    expect(error?.message).toContain('1 commande(s) en cours')
    expect(await count('products', 'shop_id', fx.shop)).toBe(3)
    expect((await admin.from('profiles').select('full_name').eq('id', ids.seller).single()).data?.full_name).toBe('Adm Req seller')
    expect((await admin.from('deletion_requests').select('status').eq('id', req.seller).single()).data?.status).toBe('pending')
  })

  // The caller is an admin too, so the two refusals are told apart by their message, not the code.
  it('an admin account and the caller’s own: 42501', async () => {
    const other = (await decide(req.admin2, 'approve')).error
    expectCode(other, '42501')
    expect(other?.message).toBe('Un compte administrateur ne peut pas être supprimé ici.')
    const self = (await decide(req.self, 'approve')).error
    expectCode(self, '42501')
    expect(self?.message).toBe('Vous ne pouvez pas traiter la suppression de votre propre compte.')
    expect((await admin.from('profiles').select('full_name').eq('id', ids.admin2).single()).data?.full_name).toBe('Adm Req admin2')
  })

  it('cleanup for the next block: the open order goes (service role)', async () => {
    const { error } = await admin.from('orders').delete().eq('id', fx.openOrder)
    expect(error).toBeNull()
  })
})

describe.skipIf(!hasCreds)('deletion — approve (tombstone)', () => {
  it('buyer: lists, posts (D8), bought order (D3), export (D9), profile (D1), audit', async () => {
    const { data, error } = await decide(req.buyer, 'approve')
    expect(error).toBeNull()
    const tombstone = `supprime-${ids.buyer}@deleted.servyou.invalid`
    expect(data).toMatchObject({
      status: 'approved', user_id: ids.buyer, tombstone_email: tombstone,
      counts: { favorites: 1, job_posts: 1, exports_closed: 1, orders_anonymised: 1 },
    })

    expect(await count('favorites', 'user_id', ids.buyer)).toBe(0)
    expect(await count('job_posts', 'id', fx.postEmpty)).toBe(0)
    expect((await admin.from('job_posts').select('status').eq('id', fx.postWithProposal).single()).data?.status).toBe('deleted')
    expect(await count('job_responses', 'job_post_id', fx.postWithProposal)).toBe(1)

    const { data: order } = await admin
      .from('orders').select('status, unit_price_tnd, item_title, delivery_name, delivery_address, delivery_phone, buyer_note, buyer_id')
      .eq('id', fx.receivedOrder).single()
    expect(order).toMatchObject({ status: 'received', buyer_id: ids.buyer, delivery_name: null, delivery_address: null, delivery_phone: null, buyer_note: null })
    expect(Number(order?.unit_price_tnd)).toBe(25)
    expect(order?.item_title).toBe(`${TITLE} — sold`)

    expect((await admin.from('data_exports').select('status, processed_by').eq('id', fx.buyerExport).single()).data)
      .toEqual({ status: 'rejected', processed_by: ids.admin })

    const { data: profile } = await admin
      .from('profiles').select('full_name, email, phone, city, avatar_url, date_of_birth, suspended_at, suspended_reason').eq('id', ids.buyer).single()
    expect(profile).toMatchObject({
      full_name: DELETED, email: tombstone, phone: null, city: null, avatar_url: null, date_of_birth: '1900-01-01', suspended_reason: DELETED,
    })
    expect(profile?.suspended_at).toBeTruthy()
    expect((await admin.from('deletion_requests').select('status, processed_by').eq('id', req.buyer).single()).data)
      .toEqual({ status: 'approved', processed_by: ids.admin })

    const audit = await auditRows(ids.buyer)
    expect(audit).toHaveLength(1)
    expect(audit[0]).toMatchObject({ action: 'approve_deletion_request', target_type: 'user' })
    const logged = JSON.stringify(audit[0])
    expect(logged).not.toContain(email('buyer'))
    expect(logged).not.toContain('Adm Req buyer')
    expect(logged).not.toContain(PHONE)
  })

  it('a second process of the same request: 23514', async () => {
    expectCode((await decide(req.buyer, 'approve')).error, '23514')
    expectCode((await decide(req.buyer, 'reject', 'non')).error, '23514')
  })

  it('seller: unsold product deleted, sold + reported hidden, shop hidden and scrubbed (c2), order history intact', async () => {
    const { data, error } = await decide(req.seller, 'approve')
    expect(error).toBeNull()
    expect(data).toMatchObject({ counts: { products_deleted: 1, products_hidden: 2, shops_deleted: 0, shops_hidden: 1, orders_anonymised: 0 } })

    expect(await count('products', 'id', fx.productUnsold)).toBe(0)
    for (const id of [fx.productSold, fx.productReported]) {
      const { data: p } = await admin.from('products').select('status, admin_hidden_at, admin_hidden_reason').eq('id', id).single()
      expect(p).toMatchObject({ status: 'hidden', admin_hidden_reason: DELETED })
      expect(p?.admin_hidden_at).toBeTruthy()
    }
    const { data: shop } = await admin
      .from('shops').select('name, description, city, logo_url, banner_url, facebook_url, admin_hidden_at, admin_hidden_reason').eq('id', fx.shop).single()
    expect(shop).toMatchObject({ name: `Boutique supprimée · ${fx.shop.slice(0, 8)}`, description: null, city: null, logo_url: null, banner_url: null, facebook_url: null, admin_hidden_reason: DELETED })
    expect(shop?.admin_hidden_at).toBeTruthy()
    expect(await count('shop_payment_methods', 'shop_id', fx.shop)).toBe(0)

    const { data: order } = await admin.from('orders').select('status, seller_id, product_id, item_title').eq('id', fx.receivedOrder).single()
    expect(order).toEqual({ status: 'received', seller_id: ids.seller, product_id: fx.productSold, item_title: `${TITLE} — sold` })
    expect((await admin.from('profiles').select('full_name, seller_type').eq('id', ids.seller).single()).data)
      .toEqual({ full_name: DELETED, seller_type: 'shop_owner' })
  })

  // Before 20261106083409 every kept shop got the same name, so this second approval failed on shops_name_lower_key (23505).
  it('a second shop owner in a row: the kept shop gets its own name, no 23505', async () => {
    const { data, error } = await decide(req.seller2, 'approve')
    expect(error).toBeNull()
    expect(data).toMatchObject({ status: 'approved', counts: { products_deleted: 0, products_hidden: 1, shops_deleted: 0, shops_hidden: 1 } })
    const { data: shops } = await admin.from('shops').select('id, name').in('id', [fx.shop, fx.shop2])
    const names = new Map((shops ?? []).map((r) => [r.id, r.name]))
    expect(names.get(fx.shop2)).toBe(`Boutique supprimée · ${fx.shop2.slice(0, 8)}`)
    expect(names.get(fx.shop)).not.toBe(names.get(fx.shop2))
  })

  it('freelancer: active service deleted, reported draft hidden but still draft, profile hidden and scrubbed, proposal deleted', async () => {
    const { data, error } = await decide(req.freelancer, 'approve', 'Demande confirmée par e-mail')
    expect(error).toBeNull()
    expect(data).toMatchObject({
      counts: { job_responses: 1, services_deleted: 1, services_hidden: 1, freelancer_profiles_deleted: 0, freelancer_profiles_hidden: 1 },
    })

    expect(await count('service_listings', 'id', fx.serviceActive)).toBe(0)
    const { data: draft } = await admin.from('service_listings').select('status, admin_hidden_reason').eq('id', fx.serviceDraft).single()
    expect(draft).toEqual({ status: 'draft', admin_hidden_reason: DELETED })
    const { data: fp } = await admin
      .from('freelancer_profiles').select('headline, bio, city, languages, is_published, admin_hidden_at, admin_hidden_reason').eq('id', fx.fp).single()
    expect(fp).toMatchObject({ headline: null, bio: null, city: null, languages: null, is_published: false, admin_hidden_reason: DELETED })
    expect(fp?.admin_hidden_at).toBeTruthy()
    expect(await count('freelancer_links', 'freelancer_profile_id', fx.fp)).toBe(0)

    expect(await count('job_responses', 'freelancer_id', ids.freelancer)).toBe(0)
    expect((await admin.from('job_posts').select('response_count').eq('id', fx.postWithProposal).single()).data?.response_count).toBe(0)
    expect((await auditRows(ids.freelancer))[0]?.note).toBe('Demande confirmée par e-mail')
  })

  it('reject with a note: status rejected, the account untouched, one audit row', async () => {
    const { data, error } = await decide(req.admin2, 'reject', 'Compte administrateur')
    expect(error).toBeNull()
    expect(data).toEqual({ status: 'rejected', user_id: ids.admin2 })
    expect((await admin.from('deletion_requests').select('status, processed_by').eq('id', req.admin2).single()).data)
      .toEqual({ status: 'rejected', processed_by: ids.admin })
    expect((await admin.from('profiles').select('full_name').eq('id', ids.admin2).single()).data?.full_name).toBe('Adm Req admin2')
    const audit = await auditRows(req.admin2)
    expect(audit).toHaveLength(1)
    expect(audit[0]).toMatchObject({ action: 'reject_deletion_request', target_type: 'deletion_request', note: 'Compte administrateur' })
  })
})

describe.skipIf(!hasCreds)('D2 — finishAccountErasure (auth + files, service role)', () => {
  const PERSONAL_KEYS = ['full_name', 'date_of_birth', 'city', 'email', 'language']

  it('refuses an account that is not a tombstone, and touches nothing (fail closed)', async () => {
    expect(await finishAccountErasure(ids.consumer)).toEqual({ ok: false, step: 'guard', reason: 'not_tombstoned' })
    const { data } = await admin.auth.admin.getUserById(ids.consumer)
    expect(data.user?.email).toBe(email('consumer'))
    expect(data.user?.banned_until ?? null).toBeNull()
    expect(data.user?.user_metadata?.full_name).toBe('Adm Req consumer')
  })

  // Migration 20261106090849. No OAuth identity is created here (that would mean writing auth.identities on production
  // by hand); the Google path is covered by account-erasure.test.ts. These pin the grant and the guard on the real RPC.
  it('erase_oauth_identities: service role only, and refused (42501) on an account that is not a tombstone', async () => {
    const asAdmin = await adminClient.rpc('erase_oauth_identities', { p_user_id: ids.consumer })
    expectCode(asAdmin.error, '42501')
    expect(asAdmin.error?.message).toBe('permission denied for function erase_oauth_identities')
    const anon = await createClient<Database>(url, anonKey, opts).rpc('erase_oauth_identities', { p_user_id: ids.consumer })
    expectCode(anon.error, '42501')
    const live = await admin.rpc('erase_oauth_identities', { p_user_id: ids.consumer })
    expectCode(live.error, '42501')
    expect(live.error?.message).toBe("Ce compte n'est pas supprimé : identités conservées.")
  })

  it('seller: auth e-mail + identity replaced, metadata emptied, banned; every file and image row gone', async () => {
    const result = await finishAccountErasure(ids.seller)
    expect(result).toMatchObject({ ok: true, imageRowsRemoved: 1 })
    if (result.ok) expect(result.filesRemoved).toBeGreaterThanOrEqual(4)

    const { data, error } = await admin.auth.admin.getUserById(ids.seller)
    expect(error).toBeNull()
    const user = data.user!
    expect(user.email).toBe(tombstoneEmail(ids.seller))
    expect(new Date(user.banned_until ?? 0).getFullYear()).toBeGreaterThan(2100)
    for (const key of PERSONAL_KEYS) expect(user.user_metadata?.[key], key).toBeUndefined()
    expect(user.app_metadata?.fixture).toBe(PREFIX)
    // The e-mail identity is where a sign-in looks the address up: it must not keep the real one.
    const identityEmails = (user.identities ?? []).map((i) => i.identity_data?.email)
    expect(identityEmails).not.toContain(email('seller'))
    expect(JSON.stringify(user)).not.toContain(email('seller'))

    expect(await listed('avatars', ids.seller)).toEqual([])
    expect(await listed('shop-assets', `${fx.shop}/logo`)).toEqual([])
    expect(await listed('product-images', `${fx.shop}/${fx.productSold}`)).toEqual([])
    expect(await count('uploaded_objects', 'owner_id', ids.seller)).toBe(0)
    expect(await count('product_images', 'product_id', fx.productSold)).toBe(0)
    // The hidden product itself stays for the order history (D1).
    expect(await count('products', 'id', fx.productSold)).toBe(1)
  })

  it('freelancer: the portfolio file goes', async () => {
    expect(await finishAccountErasure(ids.freelancer)).toMatchObject({ ok: true })
    expect(await listed('portfolio-media', ids.freelancer)).toEqual([])
    expect(await count('uploaded_objects', 'owner_id', ids.freelancer)).toBe(0)
  })

  it('a second run is a no-op success (retry-safe)', async () => {
    expect(await finishAccountErasure(ids.seller)).toEqual({ ok: true, filesRemoved: 0, imageRowsRemoved: 0 })
    // On the tombstone the RPC answers 0 rows for an e-mail-only account.
    const { data, error } = await admin.rpc('erase_oauth_identities', { p_user_id: ids.seller })
    expect(error).toBeNull()
    expect(data).toBe(0)
  })

  it('no login: the real e-mail no longer exists, the tombstone one is banned', async () => {
    const byOldEmail = await fixtureSignIn(createClient<Database>(url, anonKey, opts), email('seller'))
    expect(byOldEmail.error?.message).toMatch(/^generateLink: .*(not found|not exist)/i)
    // One /verify call: GoTrue refuses the banned account's session.
    const byTombstone = await fixtureSignIn(createClient<Database>(url, anonKey, opts), tombstoneEmail(ids.seller))
    expect(byTombstone.error?.message).toMatch(/banned/i)
  })
})

describe.skipIf(!hasCreds)('data export + contact message', () => {
  it('an export: completed once, logged; a repeat is 23514; a refusal needs a note', async () => {
    const exportId = await insertId('data_exports', { user_id: ids.consumer })
    expect((await adminClient.rpc('admin_process_data_export', { p_export_id: exportId, p_decision: 'rejected' })).error?.code).toBe('23514')
    expect((await adminClient.rpc('admin_process_data_export', { p_export_id: exportId, p_decision: 'sent' })).error?.code).toBe('23514')
    expect((await adminClient.rpc('admin_process_data_export', { p_export_id: randomUUID(), p_decision: 'completed' })).error?.code).toBe('P0002')
    expect((await adminClient.rpc('admin_process_data_export', { p_export_id: exportId, p_decision: 'completed' })).error).toBeNull()
    expect((await admin.from('data_exports').select('status, processed_by, export_url').eq('id', exportId).single()).data)
      .toEqual({ status: 'completed', processed_by: ids.admin, export_url: null })
    expect(await auditRows(exportId)).toMatchObject([{ action: 'complete_data_export', target_type: 'data_export' }])
    expect((await adminClient.rpc('admin_process_data_export', { p_export_id: exportId, p_decision: 'completed' })).error?.code).toBe('23514')

    const second = await insertId('data_exports', { user_id: ids.admin2 })
    expect((await adminClient.rpc('admin_process_data_export', { p_export_id: second, p_decision: 'rejected', p_note: 'Doublon' })).error).toBeNull()
    expect((await admin.from('data_exports').select('status').eq('id', second).single()).data?.status).toBe('rejected')
    expect(await auditRows(second)).toMatchObject([{ action: 'reject_data_export', note: 'Doublon' }])
  })

  it('a contact message: handled once, logged; a repeat is 23514; unknown id P0002', async () => {
    expect((await adminClient.rpc('admin_mark_contact_message_handled', { p_message_id: randomUUID() })).error?.code).toBe('P0002')
    expect((await adminClient.rpc('admin_mark_contact_message_handled', { p_message_id: fx.message, p_note: 'Répondu par e-mail' })).error).toBeNull()
    expect((await admin.from('contact_messages').select('status').eq('id', fx.message).single()).data?.status).toBe('handled')
    expect(await auditRows(fx.message)).toMatchObject([{ action: 'handle_contact_message', target_type: 'contact_message', note: 'Répondu par e-mail' }])
    expect((await adminClient.rpc('admin_mark_contact_message_handled', { p_message_id: fx.message })).error?.code).toBe('23514')
    const handled = await adminClient.rpc('admin_list_contact_messages', { p_status: 'handled', p_limit: 200 })
    expect(handled.data?.some((r) => r.id === fx.message)).toBe(true)
  })
})

describe.skipIf(!hasCreds)('grant lockdown (D4)', () => {
  it('an admin’s direct UPDATE of a request is refused by privilege', async () => {
    for (const table of ['deletion_requests', 'data_exports'] as const) {
      const { error } = await adminClient.from(table).update({ status: 'rejected' }).eq('user_id', ids.admin)
      expectCode(error, '42501', table)
      expect(error?.message, table).toBe(`permission denied for table ${table}`)
    }
    expect((await admin.from('deletion_requests').select('status').eq('id', req.self).single()).data?.status).toBe('pending')
  })
})

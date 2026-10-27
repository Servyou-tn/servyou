/**
 * Live-DB proof for db/migrations/20261024191215_suspension_enforcement.sql and the auth ban
 * (src/lib/auth/auth-ban.ts).
 *
 * The migration: is_active_user() + a STATEMENT-level BEFORE trigger, trg_enforce_active_user, on the
 * 26 client-writable tables, raising 42501 'Ce compte est suspendu.' when the ACTOR (auth.uid()) is
 * suspended — even for a 0-row statement, before any row trigger, and through SECURITY DEFINER
 * functions; plus RESTRICTIVE policies on storage.objects. Decisions D1–D8 (README entry 61).
 *
 * Every refusal below is "sign in → suspend → write with the SAME session": each client signs in
 * before the service role (or an active admin's RPC) sets suspended_at, so the access token in use
 * was issued to an active account. No client that writes ever calls refreshSession / getUser — a
 * failed refresh silently drops supabase-js back to anon and would fake a refusal. Every refusal pins
 * the trigger's exact text, so a policy, grant or other trigger can't pass for it.
 *
 *   * catalog — the service-role OpenAPI relation set is exactly the 26 guarded tables plus the 4
 *     relations with no client write; a new table fails here until it is classified;
 *   * matrix — each table × INSERT / UPDATE / DELETE, probed at a RANDOM id (no real row is ever
 *     touched), from a suspended session and from an active control session;
 *   * own rows — a suspended seller / freelancer / consumer cannot change or delete what they own
 *     (D7, D8), report (D5) or favorite, with service-role ground truth after every refusal;
 *   * orders — D6 both directions: the suspended side is refused, the active counterparty still acts;
 *   * D3 / D4 — a suspended buyer can still open a dispute on their own order and file an export /
 *     deletion request, but not change or delete them;
 *   * storage — upload refused (an active account still uploads), delete a silent no-op; an
 *     overwrite is refused for every account today (no permissive UPDATE policy), pinned as such;
 *   * admins — no bypass (D2): a suspended admin's table writes meet the trigger, and since migration
 *     20261024215559 (is_admin() requires an active admin) its admin RPCs — admin_unsuspend_user on
 *     itself included — are Forbidden and its admin READS are gone; an active admin still reads and
 *     acts on a suspended account;
 *   * the RPCs' exact "already / not currently suspended" raise, which the admin actions' retry
 *     branch keys on;
 *   * unsuspension — the same session writes again;
 *   * the auth ban — setAuthBan against GoTrue: sign-in (right AND wrong password), refresh and
 *     getUser all refused with user_banned, idempotent both ways, unknown id → not_found; syncAuthBan
 *     following suspended_at both ways; and the access-token lifetime that bounds the read-only
 *     window (3600 s, measured 2026-10-24).
 *
 * Fixtures (all `susp-enf-`): two shop owners, a freelancer, a consumer, an active and a suspended
 * admin, a matrix account and its active control, and a ban account. Teardown deletes orders, then
 * the fixture admins' audit rows (admin_id is ON DELETE RESTRICT), then their avatar objects, then
 * the auth users, which cascades to every other row seeded here.
 *
 * The cases are SEQUENTIAL, in file order (vitest's default within a file): the D3 / D4 pairs,
 * the ban chain and the closing unsuspension build on the cases before them. Run the whole file,
 * never one case alone (-t / .only) — an isolated case fails in ways that look like regressions.
 *
 * Pattern A (live-DB). Service role for fixtures, suspensions, ground truth and teardown only.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/suspension-enforcement.test.ts
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { setAuthBan, syncAuthBan, isSuspensionAlreadyApplied } from '@/lib/auth/auth-ban'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'susp-enf-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
// Per run, never committed: this suite promotes two admins in production, and a run killed before
// afterAll leaves them until the next run's teardown — with an unknown password, not a public one.
const PASSWORD = `Se-${randomUUID()}-Aa1!`
const TITLE = 'Suspension enforcement test'

const SUSPENDED = 'Ce compte est suspendu.'
const DENIED = '42501'
const UPLOAD_REFUSED = 'new row violates row-level security policy'
const FORBIDDEN_RPC = 'Forbidden: admin access required' // the admin RPCs' is_admin() gate
const AVATAR = () => new Blob([new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])], { type: 'image/webp' })
// The private verifications bucket keeps its permissive owner INSERT policy after S-3 (the four public image
// buckets lost theirs), so it is where the RESTRICTIVE suspension policy is still observable.
const DOCUMENT = () => new Blob([new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52])], { type: 'application/pdf' })

type Verb = 'insert' | 'update' | 'delete'
const ALL: Verb[] = ['insert', 'update', 'delete']

// The 27 tables on which authenticated holds a table- or column-level write grant: the verbs
// trg_enforce_active_user guards, the verbs authenticated holds NO privilege for (refused by the
// privilege check, which runs before any trigger), and an UPDATE probe column (`set`) / INSERT probe
// column (`insertKey`) where the grant is column-level (profiles, orders, job_posts, data_exports,
// deletion_requests).
const TRIGGERED: Record<string, { guarded: Verb[]; noGrant?: Verb[]; set?: Record<string, unknown>; insertKey?: string }> = {
  profiles: { guarded: ALL, noGrant: ['insert', 'delete'], set: { full_name: 'x' } },
  shops: { guarded: ALL },
  shop_categories: { guarded: ALL },
  shop_payment_methods: { guarded: ALL },
  products: { guarded: ALL },
  product_images: { guarded: ALL, noGrant: ['update'] }, // no UPDATE grant since migration 68 (D3)
  freelancer_profiles: { guarded: ALL },
  freelancer_skills: { guarded: ALL, noGrant: ['update'] }, // D3
  freelancer_tools: { guarded: ALL },
  freelancer_education: { guarded: ALL },
  freelancer_certifications: { guarded: ALL },
  freelancer_languages: { guarded: ALL },
  freelancer_links: { guarded: ALL },
  freelancer_portfolio_items: { guarded: ALL },
  service_listings: { guarded: ALL },
  job_posts: { guarded: ALL, noGrant: ['delete'], set: { status: 'open' }, insertKey: 'consumer_id' }, // id is not client-writable since M-A; no DELETE grant since job_posts_no_hard_delete (#77)
  job_post_skills: { guarded: ALL, noGrant: ['update'] }, // D3
  job_responses: { guarded: ALL, noGrant: ['update'] },
  job_response_skills: { guarded: ALL, noGrant: ['update'] }, // migration 69 (M-C): no UPDATE grant
  favorites: { guarded: ALL, noGrant: ['update'] }, // D3
  categories: { guarded: ALL },
  admin_audit_log: { guarded: ALL, noGrant: ['update', 'delete'] }, // D3
  orders: { guarded: ALL, noGrant: ['delete'], set: { status: 'cancelled' } }, // D6; no DELETE grant since migration 68
  reports: { guarded: ALL, noGrant: ['delete'] }, // D5; no DELETE grant since migration 68
  disputes: { guarded: ['update'], noGrant: ['delete'] }, // D4; no DELETE grant since migration 68
  data_exports: { guarded: ['update'], noGrant: ['delete'], set: { status: 'pending' }, insertKey: 'user_id' }, // D3; column grants since migration 68 (C)
  deletion_requests: { guarded: ['update'], noGrant: ['delete'], set: { status: 'pending' }, insertKey: 'user_id' }, // D3; column grants since migration 68 (C)
}
// Exposed relations with no client write privilege at all, and the error each refusal carries.
const NO_CLIENT_WRITES: Record<string, { key: string; code: string; message?: string }> = {
  uploaded_objects: { key: 'id', code: DENIED, message: 'permission denied for table uploaded_objects' },
  order_events: { key: 'id', code: DENIED, message: 'permission denied for table order_events' },
  public_profiles: { key: 'id', code: DENIED, message: 'permission denied for view public_profiles' },
  // Not auto-updatable: the rewriter refuses before any privilege check (migration 60's test).
  buyer_cancellation_history: { key: 'buyer_id', code: '55000' },
}

const matrixCells = Object.entries(TRIGGERED).flatMap(([table, spec]) => ALL.map((verb) => ({ table, verb, spec })))

// Every probe aims at a fresh random id: it can never match, so no real row is ever written.
function probe(client: SupabaseClient, table: string, verb: Verb, key = 'id') {
  const ghost: string = randomUUID()
  const row: Record<string, unknown> = { [key]: ghost }
  const insertRow: Record<string, unknown> = { [TRIGGERED[table]?.insertKey ?? key]: ghost }
  if (verb === 'insert') return client.from(table).insert(insertRow)
  if (verb === 'update') return client.from(table).update(TRIGGERED[table]?.set ?? row).eq(key, ghost)
  return client.from(table).delete().eq(key, ghost)
}

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

const freshClient = () => createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function signIn(local: string): Promise<SupabaseClient> {
  const client = freshClient()
  const { error } = await client.auth.signInWithPassword({ email: email(local), password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: TITLE, date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

async function serviceUpdate(table: string, values: Record<string, unknown>, id: string): Promise<void> {
  const { error } = await admin.from(table).update(values).eq('id', id)
  if (error) throw new Error(`${table} update failed: ${error.message}`)
}

async function serviceInsert(table: string, values: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin.from(table).insert(values).select('id').single()
  if (error || !data) throw new Error(`${table} insert failed: ${error?.message}`)
  return data.id as string
}

async function readRow(table: string, id: string, columns: string) {
  const { data, error } = await admin.from(table).select(columns).eq('id', id).maybeSingle()
  if (error) throw new Error(`${table} read failed: ${error.message}`)
  return data as Record<string, unknown> | null
}

async function countRows(table: string, column: string, value: string): Promise<number> {
  const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true }).eq(column, value)
  if (error) throw new Error(`${table} count failed: ${error.message}`)
  return count ?? 0
}

async function avatarNames(ownerId: string): Promise<string[]> {
  const { data, error } = await admin.storage.from('avatars').list(ownerId)
  if (error) throw new Error(`avatar list failed: ${error.message}`)
  return (data ?? []).map((o) => o.name).sort()
}

function expectSuspended(error: { code?: string; message?: string } | null) {
  expect(error?.code).toBe(DENIED)
  expect(error?.message).toBe(SUSPENDED)
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id as string)
  if (ids.length === 0) return
  await refuseTeardownOnForeignOrders(admin, ids, PREFIX)

  // orders first — enforce_order_identity_lock guards the product_id SET NULL a cascaded product
  // delete would cause; admin_audit_log next — admin_id is ON DELETE RESTRICT.
  for (const column of ['seller_id', 'buyer_id']) {
    const { error: orderErr } = await admin.from('orders').delete().in(column, ids)
    if (orderErr) throw new Error(`orders cleanup (${column}) failed: ${orderErr.message}`)
  }
  const { error: auditErr } = await admin.from('admin_audit_log').delete().in('admin_id', ids)
  if (auditErr) throw new Error(`admin_audit_log cleanup failed: ${auditErr.message}`)
  for (const id of ids) {
    const names = await avatarNames(id)
    if (names.length > 0) {
      const { error: rmErr } = await admin.storage.from('avatars').remove(names.map((n) => `${id}/${n}`))
      if (rmErr) throw new Error(`avatar cleanup failed: ${rmErr.message}`)
    }
    const { data: docs, error: docsErr } = await admin.storage.from('verifications').list(id)
    if (docsErr) throw new Error(`verifications listing failed: ${docsErr.message}`)
    if ((docs ?? []).length > 0) {
      const { error: docRmErr } = await admin.storage.from('verifications').remove((docs ?? []).map((d) => `${id}/${d.name}`))
      if (docRmErr) throw new Error(`verifications cleanup failed: ${docRmErr.message}`)
    }
  }
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let sellerId: string
let seller2Id: string
let freelancerId: string
let buyerId: string
let adminId: string
let admin2Id: string
let matrixId: string
let controlId: string
let banId: string

let sellerClient: SupabaseClient
let seller2Client: SupabaseClient
let freelancerClient: SupabaseClient
let buyerClient: SupabaseClient
let adminClient: SupabaseClient
let admin2Client: SupabaseClient
let matrixClient: SupabaseClient
let controlClient: SupabaseClient

let shopId: string
let productS: string // the suspended seller's
let productS2: string // the active seller's
let fpId: string
let listingId: string
let jobPostId: string
let orderB: string // suspended buyer → active seller2, accepted
let orderS2: string // active seller2 (as buyer) → suspended seller, pending

const BEFORE_AVATAR = `before-${RUN}.webp`

function productOrder(buyer: string, productId: string) {
  return {
    buyer_id: buyer,
    order_type: 'product',
    product_id: productId,
    service_listing_id: null,
    status: 'pending',
    delivery_name: 'Test Buyer',
    delivery_address: 'Rue test',
    delivery_phone: '+21620000001',
    quantity: 1,
    buyer_note: null,
  }
}

async function placeOrder(client: SupabaseClient, buyer: string, productId: string): Promise<string> {
  const { data, error } = await client.from('orders').insert(productOrder(buyer, productId)).select('id').single()
  if (error || !data) throw new Error(`order insert failed: ${error?.message}`)
  return data.id as string
}

async function suspend(id: string): Promise<void> {
  await serviceUpdate('profiles', { suspended_at: new Date().toISOString(), suspended_reason: TITLE }, id)
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  sellerId = await createUser('seller')
  seller2Id = await createUser('seller2')
  freelancerId = await createUser('freelancer')
  buyerId = await createUser('buyer')
  adminId = await createUser('admin')
  admin2Id = await createUser('admin2')
  matrixId = await createUser('matrix')
  controlId = await createUser('control')
  banId = await createUser('ban')

  await serviceUpdate('profiles', { is_admin: true }, adminId)
  await serviceUpdate('profiles', { is_admin: true }, admin2Id)
  for (const id of [sellerId, seller2Id]) await serviceUpdate('profiles', { seller_type: 'shop_owner' }, id)
  await serviceUpdate('profiles', { seller_type: 'freelancer' }, freelancerId)

  shopId = await serviceInsert('shops', { owner_id: sellerId, name: `${TITLE} ${RUN} — S` })
  const shop2Id = await serviceInsert('shops', { owner_id: seller2Id, name: `${TITLE} ${RUN} — S2` })
  productS = await serviceInsert('products', { shop_id: shopId, title: `${TITLE} — P S`, price_tnd: 80, status: 'active' })
  productS2 = await serviceInsert('products', { shop_id: shop2Id, title: `${TITLE} — P S2`, price_tnd: 80, status: 'active' })
  fpId = await serviceInsert('freelancer_profiles', { profile_id: freelancerId })
  listingId = await serviceInsert('service_listings', { freelancer_profile_id: fpId, title: `${TITLE} — L`, starting_price_tnd: 120, status: 'active' })
  jobPostId = await serviceInsert('job_posts', { consumer_id: buyerId, title: `${TITLE} — JP`, description: `${TITLE} — une annonce de test`, status: 'open' })

  // Every client signs in while its account is active — the sessions below outlive the suspension.
  sellerClient = await signIn('seller')
  seller2Client = await signIn('seller2')
  freelancerClient = await signIn('freelancer')
  buyerClient = await signIn('buyer')
  adminClient = await signIn('admin')
  admin2Client = await signIn('admin2')
  matrixClient = await signIn('matrix')
  controlClient = await signIn('control')

  // Active, through the users' own sessions: two orders, one accepted. The avatar is written by the service role,
  // as the app's upload action does since S-3 (clients can no longer INSERT into the avatars bucket).
  orderB = await placeOrder(buyerClient, buyerId, productS2)
  orderS2 = await placeOrder(seller2Client, seller2Id, productS)
  const { data: accepted, error: acceptErr } = await seller2Client.from('orders').update({ status: 'accepted' }).eq('id', orderB).select('id')
  if (acceptErr || accepted?.length !== 1) throw new Error(`accept failed: ${acceptErr?.message}`)
  const { error: upErr } = await admin.storage.from('avatars').upload(`${sellerId}/${BEFORE_AVATAR}`, AVATAR(), { contentType: 'image/webp' })
  if (upErr) throw new Error(`active avatar upload failed: ${upErr.message}`)

  // Suspend: the buyer through the active admin's real RPC, everyone else through the service role.
  const { error: rpcErr } = await adminClient.rpc('admin_suspend_user', { target_user_id: buyerId, reason: TITLE })
  if (rpcErr) throw new Error(`admin_suspend_user failed: ${rpcErr.message}`)
  for (const id of [sellerId, freelancerId, admin2Id, matrixId]) await suspend(id)
}, 180000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 180000)

describe.skipIf(!hasCreds)('ground truth', () => {
  it('exactly the five accounts under test are suspended; one is an admin', async () => {
    const { data, error } = await admin
      .from('profiles')
      .select('id, suspended_at, is_admin')
      .in('id', [sellerId, freelancerId, buyerId, admin2Id, matrixId, seller2Id, adminId, controlId])
    expect(error).toBeNull()
    const state = new Map((data ?? []).map((r) => [r.id as string, r]))
    for (const id of [sellerId, freelancerId, buyerId, admin2Id, matrixId]) expect(state.get(id)?.suspended_at).not.toBeNull()
    for (const id of [seller2Id, adminId, controlId]) expect(state.get(id)?.suspended_at).toBeNull()
    expect(state.get(admin2Id)?.is_admin).toBe(true)
  })

  it("the active admin's RPC suspension is in the audit log", async () => {
    const { data, error } = await admin.from('admin_audit_log').select('action').eq('admin_id', adminId).eq('target_id', buyerId)
    expect(error).toBeNull()
    expect(data).toEqual([{ action: 'suspend_user' }])
  })
})

describe.skipIf(!hasCreds)('catalog', () => {
  it('the exposed relations are exactly the 27 guarded tables plus the 4 with no client write', async () => {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/openapi+json' },
    })
    expect(res.status).toBe(200)
    const spec = (await res.json()) as { paths: Record<string, unknown> }
    const relations = Object.keys(spec.paths)
      .filter((p) => p !== '/' && !p.startsWith('/rpc/'))
      .map((p) => p.slice(1))
      .sort()
    expect(Object.keys(TRIGGERED)).toHaveLength(27)
    expect(relations).toEqual([...Object.keys(TRIGGERED), ...Object.keys(NO_CLIENT_WRITES)].sort())
  })
})

describe.skipIf(!hasCreds)('matrix — a suspended session, every table × verb, at a random id', () => {
  it.each(matrixCells)('$table $verb', async ({ table, verb, spec }) => {
    const { error } = await probe(matrixClient, table, verb)
    if (spec.noGrant?.includes(verb)) {
      expect(error?.code).toBe(DENIED)
      expect(error?.message).toBe(`permission denied for table ${table}`)
    } else if (spec.guarded.includes(verb)) {
      expectSuspended(error)
    } else {
      // D3 / D4 INSERT: not guarded — the probe fails on its own merits (RLS / NOT NULL), never on suspension.
      expect(error).not.toBeNull()
      expect(error?.message).not.toBe(SUSPENDED)
    }
  })

  it.each(Object.entries(NO_CLIENT_WRITES).flatMap(([table, spec]) => ALL.map((verb) => ({ table, verb, spec }))))(
    'no-client-write $table $verb is refused by privilege, not by the trigger',
    async ({ table, verb, spec }) => {
      const { error } = await probe(matrixClient, table, verb, spec.key)
      expect(error?.code).toBe(spec.code)
      if (spec.message) expect(error?.message).toBe(spec.message)
    },
  )
})

describe.skipIf(!hasCreds)('matrix — the same probes from an active session pass the trigger', () => {
  it.each(matrixCells)('$table $verb', async ({ table, verb, spec }) => {
    const { error } = await probe(controlClient, table, verb)
    if (spec.noGrant?.includes(verb)) {
      expect(error?.message).toBe(`permission denied for table ${table}`)
    } else if (verb === 'insert') {
      // A bare {id} never satisfies a table's NOT NULL columns / RLS — but it got past the trigger.
      expect(error).not.toBeNull()
      expect(error?.message).not.toBe(SUSPENDED)
    } else {
      expect(error).toBeNull() // 0-row UPDATE / DELETE
    }
  })
})

describe.skipIf(!hasCreds)('own rows, same session, after suspension (D5, D7, D8)', () => {
  it('a suspended seller cannot edit their product, and it is unchanged', async () => {
    const { error } = await sellerClient.from('products').update({ title: 'Renamed' }).eq('id', productS)
    expectSuspended(error)
    expect((await readRow('products', productS, 'title'))?.title).toBe(`${TITLE} — P S`)
  })

  it('…nor delete it (D7), nor add one', async () => {
    expectSuspended((await sellerClient.from('products').delete().eq('id', productS)).error)
    expect(await readRow('products', productS, 'id')).not.toBeNull()
    const { error } = await sellerClient.from('products').insert({ shop_id: shopId, title: `${TITLE} — new`, price_tnd: 10 })
    expectSuspended(error)
    expect(await countRows('products', 'shop_id', shopId)).toBe(1)
  })

  it('…nor rename their shop', async () => {
    expectSuspended((await sellerClient.from('shops').update({ name: `${TITLE} renamed` }).eq('id', shopId)).error)
    expect((await readRow('shops', shopId, 'name'))?.name).toBe(`${TITLE} ${RUN} — S`)
  })

  it('…nor edit their own profile (D8)', async () => {
    expectSuspended((await sellerClient.from('profiles').update({ full_name: 'Renamed' }).eq('id', sellerId)).error)
    expect((await readRow('profiles', sellerId, 'full_name'))?.full_name).toBe(TITLE)
  })

  it('…nor favorite, nor report someone (D5)', async () => {
    expectSuspended((await sellerClient.from('favorites').insert({ user_id: sellerId, item_type: 'product', product_id: productS2 })).error)
    expectSuspended(
      (await sellerClient.from('reports').insert({ reporter_id: sellerId, target_type: 'product', target_id: productS2, reason: 'fake_scam' })).error,
    )
    expect(await countRows('favorites', 'user_id', sellerId)).toBe(0)
    expect(await countRows('reports', 'reporter_id', sellerId)).toBe(0)
  })

  it('a suspended freelancer cannot edit their listing, add a skill, or delete their profile (D7)', async () => {
    expectSuspended((await freelancerClient.from('service_listings').update({ title: 'Renamed' }).eq('id', listingId)).error)
    expectSuspended((await freelancerClient.from('freelancer_skills').insert({ freelancer_profile_id: fpId, skill: 'x' })).error)
    expectSuspended((await freelancerClient.from('freelancer_profiles').delete().eq('id', fpId)).error)
    expect((await readRow('service_listings', listingId, 'title'))?.title).toBe(`${TITLE} — L`)
    expect(await readRow('freelancer_profiles', fpId, 'id')).not.toBeNull()
    expect(await countRows('freelancer_skills', 'freelancer_profile_id', fpId)).toBe(0)
  })

  it("…nor respond to a job post — the statement trigger answers before migration 59's row trigger", async () => {
    expectSuspended((await freelancerClient.from('job_responses').insert({ job_post_id: jobPostId, freelancer_id: freelancerId })).error)
    expect(await countRows('job_responses', 'freelancer_id', freelancerId)).toBe(0)
  })

  it('a suspended consumer cannot edit or delete their job post', async () => {
    expectSuspended((await buyerClient.from('job_posts').update({ title: 'Renamed' }).eq('id', jobPostId)).error)
    // No client holds DELETE on job_posts since job_posts_no_hard_delete: the privilege check answers before the
    // suspension trigger, for every consumer (posts are soft-deleted through status). trg_enforce_active_user's
    // DELETE branch is therefore unreachable on job_posts; it stays proven on the tables the matrix guards for DELETE.
    const del = await buyerClient.from('job_posts').delete().eq('id', jobPostId)
    expect(del.error?.code).toBe(DENIED)
    expect(del.error?.message).toBe('permission denied for table job_posts')
    expect((await readRow('job_posts', jobPostId, 'title'))?.title).toBe(`${TITLE} — JP`)
  })
})

describe.skipIf(!hasCreds)('orders — D6, both directions', () => {
  it('a suspended buyer cannot cancel their accepted order', async () => {
    const { error } = await buyerClient.from('orders').update({ status: 'cancelled', cancelled_by: 'buyer' }).eq('id', orderB)
    expectSuspended(error)
    expect((await readRow('orders', orderB, 'status'))?.status).toBe('accepted')
  })

  it('…nor place a new order', async () => {
    expectSuspended((await buyerClient.from('orders').insert(productOrder(buyerId, productS2))).error)
    expect(await countRows('orders', 'buyer_id', buyerId)).toBe(1)
  })

  it("the active seller still advances the suspended buyer's order", async () => {
    const { data, error } = await seller2Client.from('orders').update({ status: 'prepared' }).eq('id', orderB).select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect((await readRow('orders', orderB, 'status'))?.status).toBe('prepared')
  })

  it('a suspended seller cannot accept an order', async () => {
    expectSuspended((await sellerClient.from('orders').update({ status: 'accepted' }).eq('id', orderS2)).error)
    expect((await readRow('orders', orderS2, 'status'))?.status).toBe('pending')
  })

  it('the active buyer still cancels their order from the suspended seller', async () => {
    const { data, error } = await seller2Client
      .from('orders')
      .update({ status: 'cancelled', cancelled_by: 'buyer' })
      .eq('id', orderS2)
      .select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect((await readRow('orders', orderS2, 'status'))?.status).toBe('cancelled')
  })
})

describe.skipIf(!hasCreds)('D3 / D4 — what a suspended account can still file', () => {
  it('a suspended buyer can open a dispute on their own (non-pending) order — D4', async () => {
    const { error } = await buyerClient.from('disputes').insert({ order_id: orderB, created_by_role: 'buyer', reason: 'not_delivered' })
    expect(error).toBeNull()
    expect(await countRows('disputes', 'order_id', orderB)).toBe(1)
  })

  it('…but cannot change or withdraw it', async () => {
    expectSuspended((await buyerClient.from('disputes').update({ reason: 'damaged' }).eq('order_id', orderB)).error)
    // Withdrawing is refused by the privilege check, before the trigger: no client DELETE since migration 68.
    const withdraw = await buyerClient.from('disputes').delete().eq('order_id', orderB)
    expect(withdraw.error?.code).toBe(DENIED)
    expect(withdraw.error?.message).toBe('permission denied for table disputes')
    expect(await countRows('disputes', 'order_id', orderB)).toBe(1)
  })

  it('a suspended account can still request its data export and deletion — D3', async () => {
    expect((await buyerClient.from('data_exports').insert({ user_id: buyerId })).error).toBeNull()
    expect((await buyerClient.from('deletion_requests').insert({ user_id: buyerId, reason: TITLE })).error).toBeNull()
    expect(await countRows('data_exports', 'user_id', buyerId)).toBe(1)
    expect(await countRows('deletion_requests', 'user_id', buyerId)).toBe(1)
  })

  it('…but cannot withdraw either request', async () => {
    // Refused by the privilege check, before the trigger: no client DELETE since migration 68.
    for (const table of ['data_exports', 'deletion_requests'] as const) {
      const { error } = await buyerClient.from(table).delete().eq('user_id', buyerId)
      expect(error?.code).toBe(DENIED)
      expect(error?.message).toBe(`permission denied for table ${table}`)
    }
    expect(await countRows('data_exports', 'user_id', buyerId)).toBe(1)
    expect(await countRows('deletion_requests', 'user_id', buyerId)).toBe(1)
  })
})

describe.skipIf(!hasCreds)('storage — restrictive policies on storage.objects', () => {
  it('a suspended account cannot upload, even under its own folder (verifications keeps a permissive owner INSERT)', async () => {
    const { error } = await sellerClient.storage.from('verifications').upload(`${sellerId}/after-${RUN}.pdf`, DOCUMENT(), { contentType: 'application/pdf' })
    expect(error?.message).toBe(UPLOAD_REFUSED)
    const { data: docs } = await admin.storage.from('verifications').list(sellerId)
    expect(docs ?? []).toEqual([])
    expect(await avatarNames(sellerId)).toEqual([BEFORE_AVATAR])
  })

  it('…and its delete is a silent no-op: the object survives', async () => {
    const { data, error } = await sellerClient.storage.from('avatars').remove([`${sellerId}/${BEFORE_AVATAR}`])
    expect(error).toBeNull()
    expect(data).toEqual([])
    expect(await avatarNames(sellerId)).toEqual([BEFORE_AVATAR])
  })

  it('an active account still uploads (same bucket: the control)', async () => {
    const { error } = await seller2Client.storage.from('verifications').upload(`${seller2Id}/active-${RUN}.pdf`, DOCUMENT(), { contentType: 'application/pdf' })
    expect(error).toBeNull()
    const { data } = await admin.storage.from('verifications').list(seller2Id)
    expect((data ?? []).map((o) => o.name)).toEqual([`active-${RUN}.pdf`])
  })

  // storage.objects has no permissive UPDATE policy, so an overwrite (upsert = INSERT … ON CONFLICT
  // DO UPDATE) is refused for EVERY account today — the active control proves it. This pins that
  // state; it is not evidence for the restrictive UPDATE policy, which stays unobservable until a
  // permissive UPDATE policy exists (then this control flips and the suspended case starts to matter).
  it('an overwrite (upsert) is refused for every account today — active control and suspended alike', async () => {
    const active = await seller2Client.storage
      .from('verifications')
      .upload(`${seller2Id}/active-${RUN}.pdf`, DOCUMENT(), { contentType: 'application/pdf', upsert: true })
    expect(active.error?.message).toBe(UPLOAD_REFUSED)
    const suspended = await sellerClient.storage
      .from('avatars')
      .upload(`${sellerId}/${BEFORE_AVATAR}`, AVATAR(), { contentType: 'image/webp', upsert: true })
    expect(suspended.error?.message).toBe(UPLOAD_REFUSED)
  })
})

// The admin actions' retry branch (src/lib/auth/auth-ban.ts isSuspensionAlreadyApplied) keys on the
// RPCs' exact raise — pinned here against the live functions, not a copied string. Both calls raise,
// so no row and no audit entry is written.
describe.skipIf(!hasCreds)("the RPC raise the admin actions' retry branch keys on", () => {
  it('admin_suspend_user on an already-suspended account', async () => {
    const { error } = await adminClient.rpc('admin_suspend_user', { target_user_id: buyerId, reason: TITLE })
    expect(error).not.toBeNull()
    expect(isSuspensionAlreadyApplied(error!, true)).toBe(true)
  })

  it('admin_unsuspend_user on an active account', async () => {
    const { error } = await adminClient.rpc('admin_unsuspend_user', { target_user_id: controlId })
    expect(error).not.toBeNull()
    expect(isSuspensionAlreadyApplied(error!, false)).toBe(true)
  })
})

describe.skipIf(!hasCreds)('admins — no bypass for a suspended admin (D2); the actor rule for an active one', () => {
  it('a suspended admin cannot write an admin-only table', async () => {
    expectSuspended((await admin2Client.from('categories').update({ name_fr: 'x' }).eq('id', randomUUID())).error)
  })

  // Since migration 20261024215559 is_admin() requires suspended_at IS NULL, so a suspended admin's
  // admin RPCs stop at their is_admin() gate — before any write could reach the statement trigger.
  it('…nor moderate through the SECURITY DEFINER admin RPCs (is_admin() gate)', async () => {
    const { error } = await admin2Client.rpc('admin_hide_content', { target_type: 'product', target_id: productS2, reason: TITLE })
    expect(error?.message).toBe(FORBIDDEN_RPC)
    expect((await readRow('products', productS2, 'admin_hidden_at'))?.admin_hidden_at).toBeNull()
  })

  it('…nor suspend someone else', async () => {
    const { error } = await admin2Client.rpc('admin_suspend_user', { target_user_id: controlId, reason: TITLE })
    expect(error?.message).toBe(FORBIDDEN_RPC)
    expect((await readRow('profiles', controlId, 'suspended_at'))?.suspended_at).toBeNull()
  })

  it('…nor unsuspend themselves — the reason D2 has no admin bypass', async () => {
    const { error } = await admin2Client.rpc('admin_unsuspend_user', { target_user_id: admin2Id })
    expect(error?.message).toBe(FORBIDDEN_RPC)
    expect((await readRow('profiles', admin2Id, 'suspended_at'))?.suspended_at).not.toBeNull()
  })

  it("…nor READ another account's profile through the admin policy (is_admin() requires an active admin)", async () => {
    const { data, error } = await admin2Client.from('profiles').select('id, email, phone, date_of_birth').eq('id', controlId)
    expect(error).toBeNull()
    expect(data).toEqual([])
    expect(await admin2Client.rpc('is_admin')).toMatchObject({ data: false, error: null })
  })

  it("control: an active admin still reads another account's profile", async () => {
    const { data, error } = await adminClient.from('profiles').select('id').eq('id', controlId)
    expect(error).toBeNull()
    expect(data).toEqual([{ id: controlId }])
    expect(await adminClient.rpc('is_admin')).toMatchObject({ data: true, error: null })
  })

  it('an active admin passes the trigger on an admin-only table', async () => {
    expect((await adminClient.from('categories').update({ name_fr: 'x' }).eq('id', randomUUID())).error).toBeNull()
  })

  it("an active admin still moderates a suspended account's content (the check is on the actor)", async () => {
    const { error } = await adminClient.rpc('admin_hide_content', { target_type: 'product', target_id: productS, reason: TITLE })
    expect(error).toBeNull()
    expect((await readRow('products', productS, 'admin_hidden_at'))?.admin_hidden_at).not.toBeNull()
  })
})

describe.skipIf(!hasCreds)('unsuspension restores the same session', () => {
  it('after an active admin unsuspends the seller, their original session writes again', async () => {
    expect((await adminClient.rpc('admin_unsuspend_user', { target_user_id: sellerId })).error).toBeNull()
    const { error } = await sellerClient.from('profiles').update({ full_name: `${TITLE} back` }).eq('id', sellerId)
    expect(error).toBeNull()
    expect((await readRow('profiles', sellerId, 'full_name'))?.full_name).toBe(`${TITLE} back`)
  })
})

// The ban runs on its own account and clients, apart from the trigger matrix above.
describe.skipIf(!hasCreds)('the auth ban — setAuthBan against GoTrue', () => {
  let session: { access_token: string; refresh_token: string }

  beforeAll(async () => {
    if (!hasCreds) return
    const { data, error } = await freshClient().auth.signInWithPassword({ email: email('ban'), password: PASSWORD })
    if (error || !data.session) throw new Error(`ban account signIn failed: ${error?.message}`)
    session = data.session
  })

  it('the access token lives 3600 s — the most a token issued before a ban can still read for', () => {
    const claims = JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64url').toString()) as { iat: number; exp: number }
    expect(claims.exp - claims.iat).toBe(3600)
  })

  it('bans', async () => {
    expect(await setAuthBan(banId, true)).toEqual({ ok: true })
  })

  it('a banned account cannot sign in — user_banned even with a wrong password (GoTrue checks the ban first)', async () => {
    for (const password of [PASSWORD, `Wrong-${PASSWORD}`]) {
      const { error } = await freshClient().auth.signInWithPassword({ email: email('ban'), password })
      expect(error?.code).toBe('user_banned')
    }
    // Contrast: an unknown email stays the generic failure.
    const { error } = await freshClient().auth.signInWithPassword({ email: email(`nobody-${RUN}`), password: PASSWORD })
    expect(error?.code).toBe('invalid_credentials')
  })

  it("getUser() refuses the banned account's still-unexpired token with 403 user_banned (what middleware.ts acts on)", async () => {
    const { error } = await freshClient().auth.getUser(session.access_token)
    expect(error?.status).toBe(403)
    expect(error?.code).toBe('user_banned')
  })

  it('the refresh token is refused', async () => {
    const { error } = await freshClient().auth.refreshSession({ refresh_token: session.refresh_token })
    expect(error?.code).toBe('user_banned')
  })

  it('is idempotent both ways', async () => {
    expect(await setAuthBan(banId, true)).toEqual({ ok: true })
    expect(await setAuthBan(banId, false)).toEqual({ ok: true })
    expect(await setAuthBan(banId, false)).toEqual({ ok: true })
  })

  it('once lifted, the account signs in again', async () => {
    const { error } = await freshClient().auth.signInWithPassword({ email: email('ban'), password: PASSWORD })
    expect(error).toBeNull()
  })

  it('an unknown id is not_found', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await setAuthBan(randomUUID(), true)).toEqual({ ok: false, reason: 'not_found' })
    log.mockRestore()
  })

  // What the admin actions call: the ban follows the COMMITTED suspended_at, both ways.
  it('syncAuthBan bans a suspended account and lifts the ban once suspended_at is cleared', async () => {
    await suspend(banId)
    expect(await syncAuthBan(banId)).toEqual({ ok: true, suspended: true })
    expect((await freshClient().auth.signInWithPassword({ email: email('ban'), password: PASSWORD })).error?.code).toBe('user_banned')

    await serviceUpdate('profiles', { suspended_at: null, suspended_reason: null }, banId)
    expect(await syncAuthBan(banId)).toEqual({ ok: true, suspended: false })
    expect((await freshClient().auth.signInWithPassword({ email: email('ban'), password: PASSWORD })).error).toBeNull()
  })

  it('syncAuthBan reports an id with no profile as not_found', async () => {
    expect(await syncAuthBan(randomUUID())).toEqual({ ok: false, reason: 'not_found' })
  })
})

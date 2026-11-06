/**
 * Live proof for db/migrations/20261106093535_admin_dashboard_stats.sql (docs/discovery/admin-dashboard-stats.md,
 * D1–D12): admin_dashboard_stats, admin_list_orders, admin_count_orders, admin_list_audit_log.
 *
 *   * access — anon has no EXECUTE; a signed-in non-admin meets the is_admin() gate (42501) on all four;
 *   * parameters — an unknown period / tab / type / sort and an 81-character search are 23514;
 *   * KPIs (7 days) — a baseline is read before the orders exist, then each figure must move by exactly the fixtures:
 *     3 orders created (one received now, one pending since 3 days, one accepted), 1 received, declared value = the
 *     received order's article + delivery fee (D1), 1 acceptance sample (order_events), 1 new seller, 1 more blocked
 *     order in the queue, and the funnel (D8);
 *   * orders list — ref search, title search, `%` / `_` taken literally, each tab's total_count = admin_count_orders,
 *     the row fields (amount, seller, blocked, exact « depuis ») and no delivery / phone / e-mail field;
 *   * audit log — a fixture admin action comes back with its target label (the shop's name) and the admin's name.
 *
 * Fixtures (`adm-dash-`, passwords random per run), written by the service role: an admin (signs in), a consumer
 * (signs in), a buyer, a shop owner (signs in, to accept an order) + shop + product, three orders, one audit row.
 * 3 fixture sign-ins.
 * While the suite runs, its orders show on the live dashboard; the teardown removes them (and runs first, to recover a
 * crashed run). A real order placed during the run would move the same counters: on a delta mismatch, re-run once.
 *
 * Run: npx vitest run --config vitest.integration.config.ts --no-file-parallelism src/__tests__/admin-dashboard-stats-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'

type Client = SupabaseClient<Database>
type Stats = {
  current: Record<string, number | null>
  funnel: Record<string, number>
  queue: Record<string, number | string | null>
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'adm-dash-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const RUN = randomUUID().slice(0, 8)
const TITLE = `${PREFIX}${RUN}`
const PRODUCT_TITLE = `${TITLE} 100%_off`
const SHOP_NAME = `${TITLE} — boutique`
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const NOT_ADMIN = 'Accès réservé aux administrateurs.'
const PRICE = 25.5
const FEE = 7

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

type Local = 'admin' | 'consumer' | 'buyer' | 'seller'
const ids = {} as Record<Local, string>
const fx = { shop: '', product: '', received: '', blocked: '', accepted: '' }
let adminClient: Client
let consumerClient: Client
let before: Stats

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
    for (const u of data.users) if (u.email?.startsWith(PREFIX) && u.email.endsWith(EMAIL_SUFFIX)) found.push(u.id)
    if (data.users.length < 1000) return found
  }
}

// Idempotent, surgical to this prefix. admin_audit_log.admin_id is ON DELETE RESTRICT, so its rows go first; then the
// orders (refused while a real customer's order points at the fixture seller); deleting the users cascades the rest.
async function teardown(): Promise<void> {
  const found = await fixtureUserIds()
  if (found.length === 0) return
  await refuseTeardownOnForeignOrders(admin, found, PREFIX)
  const { error: aErr } = await admin.from('admin_audit_log').delete().in('admin_id', found)
  if (aErr) throw new Error(`admin_audit_log cleanup failed: ${aErr.message}`)
  const { error: oErr } = await admin.from('orders').delete().in('buyer_id', found)
  if (oErr) throw new Error(`orders cleanup failed: ${oErr.message}`)
  for (const id of found) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) throw new Error(`deleteUser failed for ${id}: ${error.message}`)
  }
}

async function createUser(local: Local, patch: Database['public']['Tables']['profiles']['Update']): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: `Ad-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: `Adm Dash ${local}`, date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  const { error: pErr } = await admin.from('profiles').update({ phone: '+21620000000', ...patch }).eq('id', data.user.id)
  if (pErr) throw new Error(`profile seed failed for ${local}: ${pErr.message}`)
  return data.user.id
}

async function insertId<T extends keyof Database['public']['Tables']>(
  table: T,
  row: Database['public']['Tables'][T]['Insert'],
): Promise<string> {
  const { data, error } = await (admin as unknown as SupabaseClient).from(table).insert(row).select('id').single()
  if (error || !data) throw new Error(`${String(table)} seed failed: ${error?.message}`)
  return data.id
}

function order(status: string, createdAt?: string): Database['public']['Tables']['orders']['Insert'] {
  return {
    buyer_id: ids.buyer, seller_id: ids.seller, order_type: 'product', product_id: fx.product, status, quantity: 1,
    delivery_name: 'Adm Dash Buyer', delivery_address: 'Rue du test', delivery_phone: '+21620000001',
    ...(createdAt ? { created_at: createdAt } : {}),
  }
}

async function stats(days = 7): Promise<Stats> {
  const { data, error } = await adminClient.rpc('admin_dashboard_stats', { p_days: days })
  if (error || !data) throw new Error(`admin_dashboard_stats failed: ${error?.message}`)
  return data as unknown as Stats
}

async function listOrders(args: Database['public']['Functions']['admin_list_orders']['Args']) {
  const { data, error } = await adminClient.rpc('admin_list_orders', args)
  if (error) throw new Error(`admin_list_orders failed: ${error.message}`)
  return data ?? []
}

const shortRef = (id: string) => `#${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  ids.admin = await createUser('admin', { is_admin: true })
  ids.consumer = await createUser('consumer', {})
  ids.buyer = await createUser('buyer', {})
  ids.seller = await createUser('seller', { seller_type: 'shop_owner' })
  adminClient = await signIn('admin')
  consumerClient = await signIn('consumer')

  before = await stats()
  fx.shop = await insertId('shops', { owner_id: ids.seller, name: SHOP_NAME, description: 'Une boutique de test', city: 'Tunis' })
  fx.product = await insertId('products', { shop_id: fx.shop, title: PRODUCT_TITLE, price_tnd: PRICE, delivery_fee_tnd: FEE, status: 'active' })
  fx.received = await insertId('orders', order('received'))
  fx.blocked = await insertId('orders', order('pending', new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()))
  fx.accepted = await insertId('orders', order('pending'))
  // The seller accepts from their own session (the transition guard refuses the service role), so order_events
  // records a real pending → accepted transition.
  const sellerClient = await signIn('seller')
  const { error: accErr } = await sellerClient.from('orders').update({ status: 'accepted' }).eq('id', fx.accepted)
  if (accErr) throw new Error(`accept failed: ${accErr.message}`)
  const { error: logErr } = await admin.from('admin_audit_log').insert({
    admin_id: ids.admin, action: 'hide_content_shop', target_type: 'shop', target_id: fx.shop, note: `${TITLE} note`,
    before_state: { admin_hidden_at: null }, after_state: { admin_hidden_at: '2026-11-06T00:00:00Z' },
  })
  if (logErr) throw new Error(`audit seed failed: ${logErr.message}`)
}, 120_000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  expect(await fixtureUserIds()).toEqual([])
}, 120_000)

describe.skipIf(!hasCreds)('access', () => {
  const calls: [string, (c: Client) => PromiseLike<{ error: { code?: string; message: string } | null }>][] = [
    ['admin_dashboard_stats', (c) => c.rpc('admin_dashboard_stats', { p_days: 7 })],
    ['admin_list_orders', (c) => c.rpc('admin_list_orders', {})],
    ['admin_count_orders', (c) => c.rpc('admin_count_orders', {})],
    ['admin_list_audit_log', (c) => c.rpc('admin_list_audit_log', {})],
  ]

  it.each(calls)('%s: anon has no EXECUTE', async (_, call) => {
    const { error } = await call(createClient<Database>(url, anonKey, opts))
    expect(error?.code).toBe('42501')
    expect(error?.message).not.toBe(NOT_ADMIN)
  })

  it.each(calls)('%s: a signed-in non-admin meets the gate', async (_, call) => {
    const { error } = await call(consumerClient)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_ADMIN)
  })
})

describe.skipIf(!hasCreds)('parameters', () => {
  it.each([
    ['period 14', () => adminClient.rpc('admin_dashboard_stats', { p_days: 14 })],
    ['period 14 (list)', () => adminClient.rpc('admin_list_orders', { p_days: 14 })],
    ['tab', () => adminClient.rpc('admin_list_orders', { p_tab: 'late' })],
    ['type', () => adminClient.rpc('admin_count_orders', { p_type: 'gift' })],
    ['sort', () => adminClient.rpc('admin_list_orders', { p_sort: 'price' })],
    ['81-character search', () => adminClient.rpc('admin_list_orders', { p_search: 'x'.repeat(81) })],
    ['period 14 (journal)', () => adminClient.rpc('admin_list_audit_log', { p_days: 14 })],
  ])('%s is 23514', async (_, call) => {
    const { error } = await call()
    expect(error?.code).toBe('23514')
  })
})

describe.skipIf(!hasCreds)('admin_dashboard_stats (7 days)', () => {
  it('each KPI moves by exactly the fixtures', async () => {
    const after = await stats()
    const delta = (k: string) => Number(after.current[k]) - Number(before.current[k])
    expect(delta('orders_created')).toBe(3)
    expect(delta('orders_received')).toBe(1)
    expect(delta('created_then_received')).toBe(1)
    expect(delta('created_then_cancelled')).toBe(0)
    expect(delta('declared_value_tnd')).toBeCloseTo(PRICE + FEE, 2)
    expect(delta('acceptance_samples')).toBe(1)
    expect(after.current.acceptance_median_minutes).not.toBeNull()
    expect(delta('active_buyers')).toBe(1)
    expect(delta('new_sellers')).toBe(1)
    expect(Number(after.queue.orders_blocked) - Number(before.queue.orders_blocked)).toBe(1)
  })

  it('the funnel follows the three paths (D8)', async () => {
    const after = await stats()
    const delta = (k: string) => after.funnel[k] - before.funnel[k]
    expect(delta('created')).toBe(3)
    expect(delta('reached_accepted')).toBe(2)
    expect(delta('reached_arrived')).toBe(1)
    expect(delta('received')).toBe(1)
    expect(delta('still_pending')).toBe(1)
    expect(delta('cancelled')).toBe(0)
  })
})

describe.skipIf(!hasCreds)('admin_list_orders + admin_count_orders', () => {
  it('a ref search finds its order, with or without the leading #', async () => {
    for (const q of [shortRef(fx.received), shortRef(fx.received).slice(1).toLowerCase()]) {
      const rows = await listOrders({ p_search: q, p_days: 7 })
      expect(rows.map((r) => r.id)).toContain(fx.received)
    }
  })

  it('the received row: amount, seller, exact « depuis », and no delivery / phone / e-mail field', async () => {
    const [row] = await listOrders({ p_search: shortRef(fx.received), p_days: 7 })
    expect(row).toMatchObject({
      id: fx.received, item_title: PRODUCT_TITLE, status: 'received', seller_name: SHOP_NAME, seller_kind: 'shop',
      buyer_name: 'Adm Dash buyer', status_since_exact: true, is_blocked: false,
    })
    expect(Number(row.amount_tnd)).toBeCloseTo(PRICE + FEE, 2)
    expect(Object.keys(row).filter((k) => /delivery|phone|email/.test(k))).toEqual([])
  })

  it('`%` and `_` in a search are literal', async () => {
    expect((await listOrders({ p_search: `${TITLE} 100%_off`, p_days: 7 })).length).toBe(3)
    expect(await listOrders({ p_search: `${TITLE}%off`, p_days: 7 })).toEqual([])
    expect(await listOrders({ p_search: `${TITLE} 100_`, p_days: 7 })).toEqual([])
  })

  it('each tab total_count equals admin_count_orders (one shared filter)', async () => {
    const { data, error } = await adminClient.rpc('admin_count_orders', { p_search: TITLE, p_days: 7 })
    expect(error).toBeNull()
    const counts = data?.[0]
    expect(counts).toMatchObject({ all_count: 3, blocked: 1, in_progress: 1, received: 1, cancelled: 0 })
    const tabs: [string, number][] = [['all', 3], ['blocked', 1], ['in_progress', 1], ['received', 1], ['cancelled', 0]]
    for (const [tab, n] of tabs) {
      const rows = await listOrders({ p_tab: tab, p_search: TITLE, p_days: 7 })
      expect(rows.length, tab).toBe(n)
      if (n > 0) expect(Number(rows[0].total_count), tab).toBe(n)
    }
    const [blocked] = await listOrders({ p_tab: 'blocked', p_search: TITLE, p_days: 7 })
    expect(blocked).toMatchObject({ id: fx.blocked, status: 'pending', is_blocked: true, status_since_exact: true })
  })

  it('newest first by default, oldest first on request', async () => {
    const newest = await listOrders({ p_search: TITLE, p_days: 7 })
    const oldest = await listOrders({ p_search: TITLE, p_days: 7, p_sort: 'oldest' })
    expect(newest.at(-1)?.id).toBe(fx.blocked)
    expect(oldest[0]?.id).toBe(fx.blocked)
  })
})

describe.skipIf(!hasCreds)('admin_list_audit_log', () => {
  it('a fixture action comes back with the shop name as its label and the admin name', async () => {
    const { data, error } = await adminClient.rpc('admin_list_audit_log', { p_search: `${TITLE} note`, p_days: 7 })
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0]).toMatchObject({
      action: 'hide_content_shop', target_type: 'shop', target_id: fx.shop, target_label: SHOP_NAME, admin_name: 'Adm Dash admin',
    })
    expect(Number(data?.[0].total_count)).toBe(1)
  })
})

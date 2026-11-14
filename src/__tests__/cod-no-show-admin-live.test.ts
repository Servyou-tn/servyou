/**
 * Live-DB proof of the COD no-show rule's admin side (db/migrations/PENDING_cod_no_show.sql; founder decisions 7 and 8,
 * 2026-11-14). Written while the migration is PENDING: red until the architect applies it.
 *
 *   gates    — admin_get_cod_standing, admin_lift_cod_block, admin_void_refusal refuse a non-admin (42501).
 *   lifts    — cod_block_lifts: a client reads no row (RLS admin-only) and can't write (42501); anon can't read (42501).
 *   lift     — a blocked buyer: an empty note is refused (note_required); the lift writes one cod_block_lifts row and
 *              one journal row (lift_cod_block, with the note and the block's end before); the count restarts at 0
 *              (clean slate: two open orders are filed again); a second lift is refused (cod_not_blocked).
 *   void     — admin_void_refusal sets refusal_voided_at, never the status, and logs void_refusal with the note; a
 *              second void (refusal_already_voided), an order that is no refusal (not_a_refusal), an empty or too
 *              long note (note_required, note_too_long) are refused; the voided refusal stops counting at once.
 *   deletion — a buyer whose only order is a refused delivery can be deleted (admin_process_deletion_request approves:
 *              a refusal is a finished order, never an open one).
 *
 * Fixtures (all `coda-`, password random per run, tagged app_metadata.fixture so the erased buyer is still found):
 * an admin, a shop owner with a live product, a buyer, a buyer to erase. Admin rights are revoked FIRST in teardown and
 * assertNoTestAdmin runs last (audit H6). The journal rows, the deletion request and the lifts are deleted before the
 * users. Sign-ins: 2 (admin, buyer).
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/cod-no-show-admin-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { codAdminErrorKey } from '@/lib/admin/cod-rpc-error'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'
import { revokeTestAdmins, assertNoTestAdmin } from './fixture-admin'

type Client = SupabaseClient<Database>
type OrderInsert = Database['public']['Tables']['orders']['Insert']

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'coda-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const DENIED = '42501'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

const LOCALS = ['admin', 'seller', 'buyer', 'erased'] as const
type Local = (typeof LOCALS)[number]
const ids = {} as Record<Local, string>
let adminClient: Client
let buyerClient: Client
let product: string

async function createUser(local: Local): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local), password: `Ca-${randomUUID()}-Aa1!`, email_confirm: true, app_metadata: { fixture: PREFIX },
    user_metadata: { full_name: 'Cod Admin Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

async function signIn(local: Local): Promise<Client> {
  const client = createClient<Database>(url, anonKey, opts)
  const { error } = await fixtureSignIn(client, email(local))
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

function tunisNoonDaysAgo(days: number): string {
  const [y, m, d] = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Tunis' }).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - days, 11, 0)).toISOString()
}

function productOrder(buyer: Local, extra: Partial<OrderInsert> = {}): OrderInsert {
  return {
    buyer_id: ids[buyer], seller_id: ids.seller, order_type: 'product', product_id: product, status: 'pending', quantity: 1,
    delivery_name: 'Cod Test', delivery_address: 'Rue de test, Tunis', delivery_phone: '+21620000000', ...extra,
  }
}

async function seedRefusal(buyer: Local, days: number): Promise<string> {
  const { data, error } = await admin.from('orders').insert(productOrder(buyer, {
    status: 'cancelled', cancelled_by: 'seller', cancellation_reason: 'Refus de test', refusal_reason: 'not_collected',
    cancelled_at: tunisNoonDaysAgo(days),
  })).select('id').single()
  if (error || !data) throw new Error(`refusal seed failed: ${error?.message}`)
  return data.id
}

async function journal(action: string, targetId: string) {
  const { data, error } = await admin.from('admin_audit_log')
    .select('admin_id, action, target_type, before_state, after_state, note').eq('action', action).eq('target_id', targetId)
  if (error) throw new Error(`journal read failed: ${error.message}`)
  return data ?? []
}

async function fixtureUserIds(): Promise<string[]> {
  const found: string[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers failed: ${error.message}`)
    // The erasure rewrites the auth e-mail: an erased fixture is found by its app_metadata tag.
    for (const u of data.users) {
      if ((u.email?.startsWith(PREFIX) && u.email.endsWith(EMAIL_SUFFIX)) || u.app_metadata?.fixture === PREFIX) found.push(u.id)
    }
    if (data.users.length < 1000) return found
  }
}

// Admin rights go first (audit H6); admin_audit_log.admin_id is ON DELETE RESTRICT and deletion_requests.processed_by has
// no ON DELETE action, so both go before the users; deleting the users cascades orders and lifts.
async function teardown(): Promise<void> {
  const found = await fixtureUserIds()
  await revokeTestAdmins(found)
  if (found.length === 0) return
  await refuseTeardownOnForeignOrders(admin, found, PREFIX)
  const steps: [string, PromiseLike<{ error: { message: string } | null }>][] = [
    ['admin_audit_log', admin.from('admin_audit_log').delete().in('admin_id', found)],
    ['deletion_requests', admin.from('deletion_requests').delete().in('user_id', found)],
    ['cod_block_lifts', admin.from('cod_block_lifts').delete().in('buyer_id', found)],
    ['orders', admin.from('orders').delete().in('buyer_id', found)],
  ]
  for (const [label, step] of steps) {
    const { error } = await step
    if (error) throw new Error(`${label} cleanup failed: ${error.message}`)
  }
  for (const id of found) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) throw new Error(`deleteUser failed for ${id}: ${error.message}`)
  }
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  for (const local of LOCALS) ids[local] = await createUser(local)
  const { error: aErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', ids.admin)
  if (aErr) throw new Error(`admin promotion failed: ${aErr.message}`)
  const { error: sErr } = await admin.from('profiles').update({ seller_type: 'shop_owner', phone: '+21620000004' }).eq('id', ids.seller)
  if (sErr) throw new Error(`seller upgrade failed: ${sErr.message}`)
  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: ids.seller, name: `Cod Admin Shop ${RUN}` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  const { data: p, error: pErr } = await admin.from('products')
    .insert({ shop_id: shop.id, title: `Cod Admin Product ${RUN}`, price_tnd: 80, status: 'active', tracks_stock: false })
    .select('id').single()
  if (pErr || !p) throw new Error(`product insert failed: ${pErr?.message}`)
  product = p.id
  adminClient = await signIn('admin')
  buyerClient = await signIn('buyer')
}, 180_000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const found = await fixtureUserIds()
  expect(found).toEqual([])
  const { count: orders } = await admin.from('orders').select('id', { count: 'exact', head: true }).in('buyer_id', Object.values(ids))
  expect(orders).toBe(0)
  const { count: logs } = await admin.from('admin_audit_log').select('id', { count: 'exact', head: true }).in('admin_id', Object.values(ids))
  expect(logs).toBe(0)
  await assertNoTestAdmin()
}, 180_000)

describe.skipIf(!hasCreds)('gates — every admin RPC refuses a non-admin; the lifts table is not a client surface', () => {
  it('admin_get_cod_standing / admin_lift_cod_block / admin_void_refusal → 42501 for the buyer', async () => {
    const order = await seedRefusal('buyer', 3)
    const calls = [
      buyerClient.rpc('admin_get_cod_standing', { p_buyer: ids.buyer }),
      buyerClient.rpc('admin_lift_cod_block', { p_buyer: ids.buyer, p_note: 'moi-même' }),
      buyerClient.rpc('admin_void_refusal', { p_order: order, p_note: 'moi-même' }),
    ]
    for (const { error } of await Promise.all(calls)) {
      expect(error?.code).toBe(DENIED)
      expect(codAdminErrorKey(error!)).toBe('admin.users.error_forbidden')
    }
    const { data: row } = await admin.from('orders').select('refusal_voided_at').eq('id', order).single()
    expect(row?.refusal_voided_at).toBeNull()
  })

  it('cod_block_lifts: no row for a client, no client write, no anon read', async () => {
    const read = await buyerClient.from('cod_block_lifts').select('id')
    expect(read.error).toBeNull()
    expect(read.data).toEqual([])
    const write = await buyerClient.from('cod_block_lifts').insert({ buyer_id: ids.buyer, note: 'auto-levée' }).select('id')
    expect(write.error?.code).toBe(DENIED)
    const anon = createClient<Database>(url, anonKey, opts)
    expect((await anon.from('cod_block_lifts').select('id')).error?.code).toBe(DENIED)
  })
})

describe.skipIf(!hasCreds)('admin_lift_cod_block — a clean slate, logged', () => {
  it('lifts a blocked buyer, logs it, and the count restarts at 0', async () => {
    await admin.from('orders').delete().eq('buyer_id', ids.buyer)
    await seedRefusal('buyer', 20)
    await seedRefusal('buyer', 15)
    await seedRefusal('buyer', 10)
    const { data: before } = await adminClient.rpc('admin_get_cod_standing', { p_buyer: ids.buyer })
    expect(before![0]).toMatchObject({ refusals_90d: 3, open_order_cap: true })
    expect(before![0].blocked_until).not.toBeNull()

    const empty = await adminClient.rpc('admin_lift_cod_block', { p_buyer: ids.buyer, p_note: '   ' })
    expect(empty.error?.hint).toBe('note_required')

    const NOTE = `Livraisons non tentées, vérifié avec le vendeur ${RUN}`
    expect((await adminClient.rpc('admin_lift_cod_block', { p_buyer: ids.buyer, p_note: NOTE })).error).toBeNull()

    const { data: after } = await adminClient.rpc('admin_get_cod_standing', { p_buyer: ids.buyer })
    expect(after![0]).toMatchObject({ refusals_90d: 0, open_order_cap: false, blocked_until: null })
    expect(after![0].last_lift_at).not.toBeNull()

    const { data: lifts } = await adminClient.from('cod_block_lifts').select('buyer_id, lifted_by, note').eq('buyer_id', ids.buyer)
    expect(lifts).toEqual([{ buyer_id: ids.buyer, lifted_by: ids.admin, note: NOTE }])
    const logs = await journal('lift_cod_block', ids.buyer)
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ admin_id: ids.admin, target_type: 'user', note: NOTE, after_state: { blocked_until: null, refusals_90d: 0 } })
    expect((logs[0].before_state as { blocked_until: string | null }).blocked_until).not.toBeNull()

    // Clean slate: two open product orders are filed again.
    const file = () => buyerClient.from('orders').insert(productOrder('buyer')).select('id')
    expect((await file()).error).toBeNull()
    expect((await file()).error).toBeNull()

    const again = await adminClient.rpc('admin_lift_cod_block', { p_buyer: ids.buyer, p_note: NOTE })
    expect(again.error?.hint).toBe('cod_not_blocked')
    expect(codAdminErrorKey(again.error!)).toBe('admin.cod.error_not_blocked')
  })
})

describe.skipIf(!hasCreds)('admin_void_refusal — never the status, logged, once', () => {
  it('voids a refusal: the status stays « Annulée », the journal has the note, the refusal stops counting', async () => {
    await admin.from('orders').delete().eq('buyer_id', ids.buyer)
    await admin.from('cod_block_lifts').delete().eq('buyer_id', ids.buyer)
    await seedRefusal('buyer', 12)
    const contested = await seedRefusal('buyer', 6)
    const { data: before } = await adminClient.rpc('admin_get_cod_standing', { p_buyer: ids.buyer })
    expect(before![0]).toMatchObject({ refusals_90d: 2, open_order_cap: true })

    const NOTE = `Le client n'a jamais été appelé ${RUN}`
    expect((await adminClient.rpc('admin_void_refusal', { p_order: contested, p_note: NOTE })).error).toBeNull()

    const { data: row } = await admin.from('orders').select('status, refusal_reason, refusal_voided_at').eq('id', contested).single()
    expect(row).toMatchObject({ status: 'cancelled', refusal_reason: 'not_collected' })
    expect(row!.refusal_voided_at).not.toBeNull()
    const logs = await journal('void_refusal', contested)
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ admin_id: ids.admin, target_type: 'order', note: NOTE, before_state: { buyer_id: ids.buyer } })

    const { data: after } = await adminClient.rpc('admin_get_cod_standing', { p_buyer: ids.buyer })
    expect(after![0]).toMatchObject({ refusals_90d: 1, open_order_cap: false })
  })

  it('refuses a second void, an order that is no refusal, and an empty or too long note', async () => {
    const order = await seedRefusal('buyer', 4)
    expect((await adminClient.rpc('admin_void_refusal', { p_order: order, p_note: 'premier' })).error).toBeNull()
    expect((await adminClient.rpc('admin_void_refusal', { p_order: order, p_note: 'second' })).error?.hint).toBe('refusal_already_voided')
    const { data: plain } = await admin.from('orders').insert(productOrder('buyer', { status: 'received' })).select('id').single()
    expect((await adminClient.rpc('admin_void_refusal', { p_order: plain!.id, p_note: 'x' })).error?.hint).toBe('not_a_refusal')
    const fresh = await seedRefusal('buyer', 3)
    expect((await adminClient.rpc('admin_void_refusal', { p_order: fresh, p_note: '' })).error?.hint).toBe('note_required')
    expect((await adminClient.rpc('admin_void_refusal', { p_order: fresh, p_note: 'x'.repeat(501) })).error?.hint).toBe('note_too_long')
    const { data: still } = await admin.from('orders').select('refusal_voided_at').eq('id', fresh).single()
    expect(still?.refusal_voided_at).toBeNull()
  })
})

describe.skipIf(!hasCreds)('account deletion — a refused delivery is a finished order', () => {
  it('a buyer whose only order is a refusal is erased (admin_process_deletion_request approves)', async () => {
    await seedRefusal('erased', 5)
    const { data: reqRow, error: reqErr } = await admin.from('deletion_requests')
      .insert({ user_id: ids.erased, reason: `Test ${RUN}` }).select('id').single()
    expect(reqErr).toBeNull()
    const { data, error } = await adminClient.rpc('admin_process_deletion_request', { p_request_id: reqRow!.id, p_decision: 'approve' })
    expect(error).toBeNull()
    expect(data).toMatchObject({ status: 'approved', user_id: ids.erased })
    const { data: profile } = await admin.from('profiles').select('full_name').eq('id', ids.erased).single()
    expect(profile?.full_name).toBe('Compte supprimé')
  })
})

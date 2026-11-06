/**
 * Live proof for db/migrations/20261106153901_journey_gates.sql (docs/discovery/journey-gates.md, D1–D7), through the
 * real API:
 *
 *   G1 — proposal outcome:
 *     * a freelancer cannot send a proposal as `chosen` (42501 invalid_status), nor change a status (no UPDATE grant);
 *     * a sent proposal is `pending`; each freelancer reads his own, not another's;
 *     * choose_job_response: anon has no EXECUTE; another account / an unknown id get P0002 not_found; the owner's
 *       choice makes it `chosen`, the other `not_chosen`, the post `filled`; a second choice is job_filled; a reopen is
 *       job_response_chosen; the losing freelancer can no longer withdraw;
 *     * a post closed / reopened / deleted by hand moves its proposals not_chosen → pending → not_chosen;
 *     * an expired post (older than 30 days) cannot be chosen on (job_expired);
 *     * D1: the message rule is now a trigger, with the same constraint name in the error.
 *   G2 — a seller without a phone cannot accept (23514 seller_phone_required); with a phone, the same accept passes.
 *   G10 — an open post older than 30 days is invisible to anon and to a freelancer who never answered it; its owner
 *     and its responder still read it.
 *
 * Fixtures (`jgate-`, random passwords), written by the service role: a post owner, two freelancers (+ profiles),
 * a shop owner with no phone (+ shop, product), a buyer, four posts, one pending order. 4 fixture sign-ins.
 * Teardown removes them, and runs first too (it recovers a crashed run).
 *
 * Run: npx vitest run --config vitest.integration.config.ts --no-file-parallelism src/__tests__/journey-gates-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders, refuseTeardownOnForeignResponses } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'

type Client = SupabaseClient<Database>
type DbError = { code?: string; hint?: string; message: string } | null

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'jgate-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const RUN = randomUUID().slice(0, 8)
const TITLE = `${PREFIX}${RUN}`
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const MESSAGE = 'Je peux réaliser cette mission rapidement et proprement.'
const PHONE = '+21620000000'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)
const anon = () => createClient<Database>(url, anonKey, opts)

type Local = 'owner' | 'f1' | 'f2' | 'seller' | 'buyer'
const ids = {} as Record<Local, string>
const fx = { p: '', q: '', x: '', fresh: '', r1: '', r2: '', rq: '', rx: '', order: '' }
let owner: Client
let f1: Client
let f2: Client
let seller: Client

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

// Idempotent, surgical to this prefix. Refused while a real customer's order points at the fixture seller, or a real
// freelancer answered a fixture post; then the orders; deleting the users cascades the rest.
async function teardown(): Promise<void> {
  const found = await fixtureUserIds()
  if (found.length === 0) return
  await refuseTeardownOnForeignOrders(admin, found, PREFIX)
  await refuseTeardownOnForeignResponses(admin, found, PREFIX)
  const { error } = await admin.from('orders').delete().in('buyer_id', found)
  if (error) throw new Error(`orders cleanup failed: ${error.message}`)
  for (const id of found) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

async function createUser(local: Local, patch: Database['public']['Tables']['profiles']['Update']): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: `Jg-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: `Jgate ${local}`, date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  const { error: pErr } = await admin.from('profiles').update(patch).eq('id', data.user.id)
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

async function propose(client: Client, freelancerId: string, postId: string): Promise<string> {
  const { data, error } = await client
    .from('job_responses')
    .insert({ job_post_id: postId, freelancer_id: freelancerId, proposal_message: MESSAGE })
    .select('id, status')
    .single()
  if (error || !data) throw new Error(`proposal failed: ${error?.message}`)
  expect(data.status).toBe('pending')
  return data.id
}

async function statusOf(responseId: string): Promise<string | undefined> {
  const { data, error } = await admin.from('job_responses').select('status').eq('id', responseId).maybeSingle()
  if (error) throw new Error(`status read failed: ${error.message}`)
  return data?.status
}

async function postStatus(postId: string): Promise<string | undefined> {
  const { data, error } = await admin.from('job_posts').select('status').eq('id', postId).maybeSingle()
  if (error) throw new Error(`post read failed: ${error.message}`)
  return data?.status
}

const expectError = (error: DbError, code: string, hint?: string) => {
  expect(error?.code, error?.message).toBe(code)
  if (hint) expect(error?.hint).toBe(hint)
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  ids.owner = await createUser('owner', {})
  ids.f1 = await createUser('f1', { seller_type: 'freelancer', phone: PHONE })
  ids.f2 = await createUser('f2', { seller_type: 'freelancer', phone: PHONE })
  ids.seller = await createUser('seller', { seller_type: 'shop_owner' }) // no phone: the G2 case
  ids.buyer = await createUser('buyer', {})
  for (const id of [ids.f1, ids.f2]) {
    const { error } = await admin.from('freelancer_profiles').insert({ profile_id: id })
    if (error) throw new Error(`freelancer_profiles seed failed: ${error.message}`)
  }
  const post = (label: string) => insertId('job_posts', {
    consumer_id: ids.owner, title: `${TITLE} — ${label}`, description: 'Mission de test pour les statuts.', budget_max: 300,
  })
  fx.p = await post('choose')
  fx.q = await post('by hand')
  fx.x = await post('expired')
  fx.fresh = await post('fresh') // never touched: the G10 positive control

  const shop = await insertId('shops', { owner_id: ids.seller, name: `${TITLE} — shop` })
  const product = await insertId('products', { shop_id: shop, title: `${TITLE} — product`, price_tnd: 40, status: 'active' })
  fx.order = await insertId('orders', {
    buyer_id: ids.buyer, seller_id: ids.seller, order_type: 'product', product_id: product, status: 'pending', quantity: 1,
    delivery_name: 'Jgate Buyer', delivery_address: 'Rue du test', delivery_phone: '+21620000001',
  })

  owner = await signIn('owner')
  f1 = await signIn('f1')
  f2 = await signIn('f2')
  seller = await signIn('seller')

  // f1 answers the post that will expire, then the service role backdates it.
  fx.rx = await propose(f1, ids.f1, fx.x)
  const { error: oldErr } = await admin.from('job_posts')
    .update({ created_at: new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString() }).eq('id', fx.x)
  if (oldErr) throw new Error(`backdate failed: ${oldErr.message}`)
}, 120_000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  expect(await fixtureUserIds()).toEqual([])
}, 120_000)

describe.skipIf(!hasCreds)('G1 — sending a proposal', () => {
  it('a proposal sent as « chosen » is refused (invalid_status)', async () => {
    const { error } = await f1.from('job_responses')
      .insert({ job_post_id: fx.p, freelancer_id: ids.f1, proposal_message: MESSAGE, status: 'chosen' })
    expectError(error, '42501', 'invalid_status')
  })

  it('D1: a short message is still refused, with the same constraint name', async () => {
    const { error } = await f1.from('job_responses')
      .insert({ job_post_id: fx.p, freelancer_id: ids.f1, proposal_message: 'x'.repeat(19) })
    expectError(error, '23514')
    expect(error?.message).toContain('job_responses_proposal_message_length')
  })

  it('a normal proposal is pending; each freelancer reads his own only', async () => {
    fx.r1 = await propose(f1, ids.f1, fx.p)
    fx.r2 = await propose(f2, ids.f2, fx.p)
    const { data: mine } = await f1.from('job_responses').select('id, status').eq('job_post_id', fx.p)
    expect(mine).toEqual([{ id: fx.r1, status: 'pending' }])
  })

  it('no client changes a status (no UPDATE grant)', async () => {
    const { error } = await f1.from('job_responses').update({ status: 'chosen' }).eq('id', fx.r1)
    expectError(error, '42501')
    expect(await statusOf(fx.r1)).toBe('pending')
  })
})

describe.skipIf(!hasCreds)('G1 — choose_job_response', () => {
  it('anon has no EXECUTE', async () => {
    const { error } = await anon().rpc('choose_job_response', { p_response_id: fx.r1 })
    expectError(error, '42501')
  })

  it('another account and an unknown id get the same not_found', async () => {
    expectError((await f2.rpc('choose_job_response', { p_response_id: fx.r1 })).error, 'P0002', 'not_found')
    expectError((await owner.rpc('choose_job_response', { p_response_id: randomUUID() })).error, 'P0002', 'not_found')
    expect(await statusOf(fx.r1)).toBe('pending')
  })

  it('an expired post cannot be chosen on (job_expired)', async () => {
    expectError((await owner.rpc('choose_job_response', { p_response_id: fx.rx })).error, '23514', 'job_expired')
    expect(await statusOf(fx.rx)).toBe('pending')
  })

  it('the owner chooses: chosen, the other not_chosen, the post filled — each freelancer reads his own outcome', async () => {
    const { data, error } = await owner.rpc('choose_job_response', { p_response_id: fx.r1 })
    expect(error).toBeNull()
    expect(data).toBe(fx.p)
    expect(await postStatus(fx.p)).toBe('filled')
    expect((await f1.from('job_responses').select('status').eq('id', fx.r1).single()).data?.status).toBe('chosen')
    expect((await f2.from('job_responses').select('status').eq('id', fx.r2).single()).data?.status).toBe('not_chosen')
  })

  it('a second choice is job_filled; a reopen is job_response_chosen; the loser can no longer withdraw', async () => {
    expectError((await owner.rpc('choose_job_response', { p_response_id: fx.r2 })).error, '23514', 'job_filled')
    expectError((await owner.from('job_posts').update({ status: 'open' }).eq('id', fx.p)).error, '23514', 'job_response_chosen')
    expect(await postStatus(fx.p)).toBe('filled')
    const { data, error } = await f2.from('job_responses').delete().eq('id', fx.r2).select('id')
    expect(error).toBeNull()
    expect(data).toEqual([])
    expect(await statusOf(fx.r2)).toBe('not_chosen')
  })
})

describe.skipIf(!hasCreds)('G1 — a post changed by hand keeps its proposals coherent', () => {
  it('close → not_chosen, reopen → pending, delete → not_chosen', async () => {
    fx.rq = await propose(f2, ids.f2, fx.q)
    expect((await owner.from('job_posts').update({ status: 'filled' }).eq('id', fx.q)).error).toBeNull()
    expect(await statusOf(fx.rq)).toBe('not_chosen')
    expect((await owner.from('job_posts').update({ status: 'open' }).eq('id', fx.q)).error).toBeNull()
    expect(await statusOf(fx.rq)).toBe('pending')
    expect((await owner.from('job_posts').update({ status: 'deleted' }).eq('id', fx.q)).error).toBeNull()
    expect(await statusOf(fx.rq)).toBe('not_chosen')
  })
})

describe.skipIf(!hasCreds)('G10 — an expired post is not public any more', () => {
  const sees = async (client: Client, id: string) => (await client.from('job_posts').select('id').eq('id', id)).data?.length ?? -1

  it('anon and a freelancer who never answered: the expired post is hidden, the fresh one of the same owner is not', async () => {
    for (const client of [anon(), f2]) {
      expect(await sees(client, fx.fresh)).toBe(1) // positive control: the public branch still matches this caller
      expect(await sees(client, fx.x)).toBe(0)
    }
  })

  it('its owner and its responder: still visible', async () => {
    expect(await sees(owner, fx.x)).toBe(1)
    expect(await sees(f1, fx.x)).toBe(1)
  })
})

describe.skipIf(!hasCreds)('G2 — accepting needs a seller phone', () => {
  it('without a phone: seller_phone_required, the order stays pending', async () => {
    const { error } = await seller.from('orders').update({ status: 'accepted' }).eq('id', fx.order)
    expectError(error, '23514', 'seller_phone_required')
    const { data } = await admin.from('orders').select('status').eq('id', fx.order).single()
    expect(data?.status).toBe('pending')
  })

  it('with a phone: the same accept passes', async () => {
    const { error: phoneErr } = await admin.from('profiles').update({ phone: PHONE }).eq('id', ids.seller)
    expect(phoneErr).toBeNull()
    const { data, error } = await seller.from('orders').update({ status: 'accepted' }).eq('id', fx.order).select('status')
    expect(error).toBeNull()
    expect(data).toEqual([{ status: 'accepted' }])
  })
})

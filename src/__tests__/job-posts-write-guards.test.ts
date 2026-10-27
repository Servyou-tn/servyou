/**
 * Live-DB proof for db/migrations/20261027203831_job_posts_write_guards.sql — founder decisions 4–8, 9a
 * and 10 (2026-10-27), plus the job_responses withdrawal window of H11 « Retirer » (PR #211).
 *
 *   job_posts       — JWT callers (admins included): INSERT only at open; deleted is terminal; open /
 *                     filled / expired → deleted; open ↔ filled only within 30 days; nothing into or out
 *                     of expired; once response_count > 0 the 8 content columns are frozen (content_locked).
 *   job_post_skills — insert / delete refused once the post has a response (content_locked); a cascade
 *                     from a post delete still passes.
 *   job_responses   — a freelancer withdraws their response only while its post is open, unmoderated and
 *                     within 30 days; otherwise the DELETE matches 0 rows and the response stays.
 *   orders          — no is_admin() override for an admin who is a party (9a); on a JWT INSERT the cancel
 *                     columns are discarded unless the order is inserted at cancelled, and then cancelled_at
 *                     is the database's clock (10).
 *
 * The service role (no JWT) seeds fixtures and backdates created_at: every guard here bypasses it. Every
 * refusal is checked by its hint / message and paired with a service-role read showing the row unchanged.
 *
 * Fixtures (all `jp-guard-`, password random per run: the repo is public and this suite promotes an admin
 * in production): a poster, a responding freelancer, an admin, and a shop owner with one live product
 * (the admin's own orders). Open fixture posts are on the board while this runs, hence the response
 * teardown guard.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/job-posts-write-guards.test.ts
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

const PREFIX = 'jp-guard-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Jg-${randomUUID()}-Aa1!`
const TITLE = `Job post guards ${RUN}`
const MESSAGE = 'Bonjour, je suis disponible pour cette mission de test.'
const OLD = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() // past the 30-day window

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Job Post Guards Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
//   0. the guards — an open fixture post and a live fixture product are public while this runs;
//   1. orders, by buyer and by seller; 2. admin_audit_log (admin_id is ON DELETE RESTRICT);
//   3. users — cascades profiles -> job_posts -> job_post_skills / job_responses, shops -> products.
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
let adminId: string
let productId: string

let posterClient: Client
let responderClient: Client
let adminClient: Client

// A fresh open post seeded by the service role (bypasses every guard).
async function seedPost(label: string): Promise<string> {
  const { data, error } = await admin
    .from('job_posts')
    .insert({ consumer_id: posterId, title: `${TITLE} — ${label}`, description: 'Mission de test.', budget_max: 300 })
    .select('id')
    .single()
  if (error || !data) throw new Error(`job_posts seed failed (${label}): ${error?.message}`)
  return data.id
}

async function seedStatus(postId: string, patch: Database['public']['Tables']['job_posts']['Update']): Promise<void> {
  const { error } = await admin.from('job_posts').update(patch).eq('id', postId)
  if (error) throw new Error(`job_posts service-role update failed: ${error.message}`)
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

async function post(postId: string) {
  const { data, error } = await admin
    .from('job_posts')
    .select('status, title, budget_max, response_count')
    .eq('id', postId)
    .single()
  if (error || !data) throw new Error(`job_posts read failed: ${error?.message}`)
  return data
}

async function responseExists(responseId: string): Promise<boolean> {
  const { count, error } = await admin.from('job_responses').select('id', { count: 'exact', head: true }).eq('id', responseId)
  if (error) throw new Error(`job_responses read failed: ${error.message}`)
  return count === 1
}

async function setStatus(client: Client, postId: string, status: string) {
  return client
    .from('job_posts')
    .update({ status } as Database['public']['Tables']['job_posts']['Update'])
    .eq('id', postId)
    .select('id')
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  posterId = await createUser('poster')
  responderId = await createUser('responder')
  adminId = await createUser('admin')
  const sellerId = await createUser('seller')

  const { error: typeErr } = await admin.from('profiles').update({ seller_type: 'freelancer' }).eq('id', responderId)
  if (typeErr) throw new Error(`seller_type seed failed: ${typeErr.message}`)
  const { error: fpErr } = await admin.from('freelancer_profiles').insert({ profile_id: responderId })
  if (fpErr) throw new Error(`freelancer_profiles seed failed: ${fpErr.message}`)
  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)

  const { error: shopTypeErr } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', sellerId)
  if (shopTypeErr) throw new Error(`shop_owner seed failed: ${shopTypeErr.message}`)
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
}, 120000)

// ─── job_posts: INSERT ───────────────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('job_posts INSERT — only at open (createAnnonce shape)', () => {
  it('the poster inserts at open and the RETURNING sees it', async () => {
    const { data, error } = await posterClient
      .from('job_posts')
      .insert({ consumer_id: posterId, title: `${TITLE} — client insert`, description: 'Mission de test.', status: 'open' })
      .select('id, status')
      .single()
    expect(error).toBeNull()
    expect(data?.status).toBe('open')
  })

  for (const status of ['filled', 'deleted', 'expired'] as const) {
    it(`an INSERT at ${status} is refused (invalid_status) and writes nothing`, async () => {
      const title = `${TITLE} — client insert at ${status}`
      const { error } = await posterClient
        .from('job_posts')
        .insert({ consumer_id: posterId, title, description: 'Mission de test.', status })
      expect(error?.code).toBe('42501')
      expect(error?.hint).toBe('invalid_status')
      const { count } = await admin.from('job_posts').select('id', { count: 'exact', head: true }).eq('title', title)
      expect(count).toBe(0)
    })
  }
})

// ─── job_posts: status transitions ───────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('job_posts status — the app paths pass, everything else is refused', () => {
  it('open → filled → open → deleted (close, reopen, delete) within 30 days', async () => {
    const id = await seedPost('lifecycle')
    for (const status of ['filled', 'open', 'deleted']) {
      const { data, error } = await setStatus(posterClient, id, status)
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect((await post(id)).status).toBe(status)
    }
  })

  it('deleted is terminal: deleted → open is refused (job_deleted)', async () => {
    const id = await seedPost('deleted terminal')
    await seedStatus(id, { status: 'deleted' })
    const { error } = await setStatus(posterClient, id, 'open')
    expect(error?.code).toBe('42501')
    expect(error?.hint).toBe('job_deleted')
    expect((await post(id)).status).toBe('deleted')
  })

  it('nothing goes into expired by hand (invalid_transition), nor out of it except to deleted', async () => {
    const id = await seedPost('expired')
    const into = await setStatus(posterClient, id, 'expired')
    expect(into.error?.code).toBe('42501')
    expect(into.error?.hint).toBe('invalid_transition')
    expect((await post(id)).status).toBe('open')

    await seedStatus(id, { status: 'expired' })
    const out = await setStatus(posterClient, id, 'open')
    expect(out.error?.hint).toBe('invalid_transition')
    const del = await setStatus(posterClient, id, 'deleted')
    expect(del.error).toBeNull()
    expect((await post(id)).status).toBe('deleted')
  })

  it('past 30 days: open → filled and filled → open are refused (job_expired); → deleted still passes', async () => {
    const openId = await seedPost('old open')
    await seedStatus(openId, { created_at: OLD } as Database['public']['Tables']['job_posts']['Update'])
    const close = await setStatus(posterClient, openId, 'filled')
    expect(close.error?.code).toBe('23514')
    expect(close.error?.hint).toBe('job_expired')
    expect((await post(openId)).status).toBe('open')

    const filledId = await seedPost('old filled')
    await seedStatus(filledId, { status: 'filled', created_at: OLD } as Database['public']['Tables']['job_posts']['Update'])
    const reopen = await setStatus(posterClient, filledId, 'open')
    expect(reopen.error?.hint).toBe('job_expired')
    expect((await post(filledId)).status).toBe('filled')

    const del = await setStatus(posterClient, openId, 'deleted')
    expect(del.error).toBeNull()
  })

  it('an admin who owns a post follows the same rules (no is_admin() bypass)', async () => {
    const { data, error } = await adminClient
      .from('job_posts')
      .insert({ consumer_id: adminId, title: `${TITLE} — admin's own post`, description: 'Mission de test.', status: 'filled' })
      .select('id')
    expect(error?.hint).toBe('invalid_status')
    expect(data).toBeNull()
  })
})

// ─── content lock ────────────────────────────────────────────────────────────────────────────────

const CONTENT_COLUMNS = 'title, description, category_id, city, is_remote, budget_min, budget_max, deadline'

describe.skipIf(!hasCreds)('content lock — frozen once a freelancer has answered', () => {
  let answered: string
  let unanswered: string
  let answeredSkill: string
  let unansweredSkill: string

  beforeAll(async () => {
    if (!hasCreds) return
    answered = await seedPost('answered')
    unanswered = await seedPost('unanswered')
    // Off the board (older than 30 days), so no real freelancer can answer it mid-run; the content lock does
    // not look at the age.
    await seedStatus(unanswered, { created_at: OLD } as Database['public']['Tables']['job_posts']['Update'])
    for (const [postId, set] of [[answered, (v: string) => (answeredSkill = v)], [unanswered, (v: string) => (unansweredSkill = v)]] as const) {
      const { data, error } = await admin.from('job_post_skills').insert({ job_post_id: postId, skill: `${TITLE} skill` }).select('id').single()
      if (error || !data) throw new Error(`job_post_skills seed failed: ${error?.message}`)
      set(data.id)
    }
    await respond(answered) // through the response trigger, which bumps response_count under the freelancer's JWT
  })

  it('ground truth: the answered post has response_count 1, the other 0', async () => {
    expect((await post(answered)).response_count).toBe(1)
    expect((await post(unanswered)).response_count).toBe(0)
  })

  it('editing any of the 8 content columns of the answered post is refused (content_locked), row unchanged', async () => {
    const { data: before, error: beforeErr } = await admin.from('job_posts').select(CONTENT_COLUMNS).eq('id', answered).single()
    expect(beforeErr).toBeNull()
    const { data: cat, error: catErr } = await admin.from('categories').select('id').eq('kind', 'service').is('parent_id', null).limit(1).single()
    expect(catErr).toBeNull()
    const patches: Database['public']['Tables']['job_posts']['Update'][] = [
      { title: `${TITLE} — rewritten` },
      { description: 'Mission réécrite après les réponses.' },
      { category_id: cat!.id },
      { city: 'Sfax' },
      { is_remote: true },
      { budget_min: 100 },
      { budget_max: 9000 },
      { deadline: '2030-01-01' },
    ]
    for (const patch of patches) {
      const { error } = await posterClient.from('job_posts').update(patch).eq('id', answered)
      expect(error?.code, JSON.stringify(patch)).toBe('42501')
      expect(error?.hint, JSON.stringify(patch)).toBe('content_locked')
    }
    const { data: after } = await admin.from('job_posts').select(CONTENT_COLUMNS).eq('id', answered).single()
    expect(after).toEqual(before)
  })

  it('the unanswered post stays editable', async () => {
    const { data, error } = await posterClient.from('job_posts').update({ budget_max: 450 }).eq('id', unanswered).select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(Number((await post(unanswered)).budget_max)).toBe(450)
  })

  it('job_post_skills: insert and delete are refused on the answered post, allowed on the other', async () => {
    const add = await posterClient.from('job_post_skills').insert({ job_post_id: answered, skill: `${TITLE} added` })
    expect(add.error?.hint).toBe('content_locked')
    const del = await posterClient.from('job_post_skills').delete().eq('id', answeredSkill)
    expect(del.error?.hint).toBe('content_locked')
    const { count } = await admin.from('job_post_skills').select('id', { count: 'exact', head: true }).eq('job_post_id', answered)
    expect(count).toBe(1)

    const addOk = await posterClient.from('job_post_skills').insert({ job_post_id: unanswered, skill: `${TITLE} added` })
    expect(addOk.error).toBeNull()
    const delOk = await posterClient.from('job_post_skills').delete().eq('id', unansweredSkill).select('id')
    expect(delOk.error).toBeNull()
    expect(delOk.data).toHaveLength(1)
  })

  it('status still moves on the answered post: open → filled', async () => {
    const { error } = await setStatus(posterClient, answered, 'filled')
    expect(error).toBeNull()
    expect((await post(answered)).status).toBe('filled')
  })

  it('a hard delete of an unanswered post cascades its skills through the lock (parent already gone)', async () => {
    const id = await seedPost('hard delete')
    const { error: skillErr } = await admin.from('job_post_skills').insert({ job_post_id: id, skill: `${TITLE} cascade` })
    expect(skillErr).toBeNull()
    const { data, error } = await posterClient.from('job_posts').delete().eq('id', id).select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    const { count } = await admin.from('job_post_skills').select('id', { count: 'exact', head: true }).eq('job_post_id', id)
    expect(count).toBe(0)
  })
})

// ─── job_responses: withdrawal window ────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('job_responses DELETE — « Retirer » only while the post is open', () => {
  async function withdraw(responseId: string) {
    return responderClient.from('job_responses').delete().eq('id', responseId).eq('freelancer_id', responderId).select('id')
  }

  it('open, unmoderated, within 30 days: withdrawn (1 row), and response_count goes back down', async () => {
    const id = await seedPost('withdraw open')
    const responseId = await respond(id)
    expect((await post(id)).response_count).toBe(1)
    const { data, error } = await withdraw(responseId)
    expect(error).toBeNull()
    expect(data).toEqual([{ id: responseId }])
    expect(await responseExists(responseId)).toBe(false)
    expect((await post(id)).response_count).toBe(0)
  })

  const closed: Array<[string, (postId: string) => Promise<void>]> = [
    ['filled', (postId) => seedStatus(postId, { status: 'filled' })],
    ['deleted', (postId) => seedStatus(postId, { status: 'deleted' })],
    ['older than 30 days (still stored open)', (postId) => seedStatus(postId, { created_at: OLD } as Database['public']['Tables']['job_posts']['Update'])],
    [
      'admin-moderated',
      async (postId) => {
        const { error } = await adminClient.rpc('admin_hide_content', { target_type: 'job_post', target_id: postId, reason: `${TITLE} moderation` })
        if (error) throw new Error(`admin_hide_content failed: ${error.message}`)
      },
    ],
  ]

  for (const [label, close] of closed) {
    it(`${label}: the DELETE matches 0 rows and the response stays`, async () => {
      const id = await seedPost(`withdraw ${label}`)
      const responseId = await respond(id)
      await close(id)
      const { data, error } = await withdraw(responseId)
      expect(error).toBeNull()
      expect(data).toEqual([])
      expect(await responseExists(responseId)).toBe(true)
    })
  }
})

// ─── orders: admin as a party ────────────────────────────────────────────────────────────────────

function adminOrder(extra: Partial<OrderInsert>): OrderInsert {
  // seller_id is derived by trg_enforce_order_insert_integrity; the generated Insert type still requires it.
  const payload: Omit<OrderInsert, 'seller_id'> = {
    buyer_id: adminId,
    order_type: 'product',
    product_id: productId,
    service_listing_id: null,
    status: 'pending',
    delivery_name: 'Test Admin Buyer',
    delivery_address: 'Rue test',
    delivery_phone: '+21620000002',
    quantity: 1,
    buyer_note: null,
    ...extra,
  }
  return payload as OrderInsert
}

describe.skipIf(!hasCreds)('orders — an admin who is a party follows the chain (9a, 10)', () => {
  it('JWT INSERT not at cancelled: client-supplied cancel columns are discarded', async () => {
    const { data, error } = await adminClient
      .from('orders')
      .insert(adminOrder({ cancelled_by: 'seller', cancellation_reason: 'forged', cancelled_at: '2000-01-01T00:00:00Z' }))
      .select('status, cancelled_by, cancellation_reason, cancelled_at')
      .single()
    expect(error).toBeNull()
    expect(data).toEqual({ status: 'pending', cancelled_by: null, cancellation_reason: null, cancelled_at: null })
  })

  it('JWT INSERT at cancelled: cancelled_at is the database clock, not the client value', async () => {
    const before = Date.now()
    const { data, error } = await adminClient
      .from('orders')
      .insert(adminOrder({ status: 'cancelled', cancelled_by: 'buyer', cancellation_reason: 'test', cancelled_at: '2000-01-01T00:00:00Z' }))
      .select('id, cancelled_at')
      .single()
    expect(error).toBeNull()
    const stamped = new Date(data!.cancelled_at as string).getTime()
    expect(stamped).toBeGreaterThan(before - 60_000) // DB clock, allowing for skew
  })

  it('the admin buyer cannot leave a terminal state, nor advance the seller chain', async () => {
    const { data: cancelled } = await adminClient
      .from('orders')
      .insert(adminOrder({ status: 'cancelled', cancelled_by: 'buyer' }))
      .select('id')
      .single()
    const reopen = await adminClient.from('orders').update({ status: 'pending' }).eq('id', cancelled!.id)
    expect(reopen.error?.message).toBe('Cette commande est terminée et ne peut plus être modifiée.')
    const { data: still } = await admin.from('orders').select('status').eq('id', cancelled!.id).single()
    expect(still?.status).toBe('cancelled')

    const { data: pending } = await adminClient.from('orders').insert(adminOrder({})).select('id').single()
    const advance = await adminClient.from('orders').update({ status: 'accepted' }).eq('id', pending!.id)
    expect(advance.error?.message).toBe('Seul le vendeur peut faire avancer la commande.')
    const { data: row } = await admin.from('orders').select('status').eq('id', pending!.id).single()
    expect(row?.status).toBe('pending')
  })
})

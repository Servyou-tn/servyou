/**
 * Live-DB proof for db/migrations/20261026173800_job_posts_response_count.sql — missions M-A, gaps G3 + G9
 * (docs/design/h9-h13-measurements.md §6.4; architect decisions 1–7, 2026-10-26).
 *
 * G3 — job_posts.response_count, kept by trg_sync_job_post_response_count (AFTER INSERT / DELETE / UPDATE
 *   OF job_post_id on job_responses): +1 per response, −1 per deleted response, moved with a response that
 *   changes post; a response refused by a BEFORE trigger leaves it alone; concurrent responses all count;
 *   a deleted freelancer account decrements, a hard-deleted post takes its responses without error. It is
 *   readable by anyone who can read the post — the whole point: job_responses RLS hides other freelancers'
 *   rows. Decision 3: every counter write bumps the post's updated_at.
 * G9 — the write lock is column grants (decision 1, the orders pattern): authenticated may INSERT only the
 *   ten columns createAnnonce sends and UPDATE only the nine content / status columns. Naming any other
 *   column — even with its current value — fails the whole statement with 42501 « permission denied for
 *   table job_posts », on INSERT too (decision 2), for admins too (decision 4); anon writes nothing.
 *   Controls: the createAnnonce insert, a title edit and the filled → open path still work.
 *
 * Fixtures (all `jp-count-`, password random per run: the repo is public and this suite promotes an admin
 * in production): a poster, four freelancers, an unrelated signed-in outsider and an admin. Every post is
 * created through its owner's own session with createAnnonce's exact payload.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/job-posts-response-count.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignResponses } from './live-teardown-guard'

type Client = SupabaseClient<Database>
type PostInsert = Database['public']['Tables']['job_posts']['Insert']
type PostUpdate = Database['public']['Tables']['job_posts']['Update']

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'jp-count-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Jp-${randomUUID()}-Aa1!`
const TITLE = `Response count test ${RUN}`

// The refusals under test, pinned by text so another rejection can't pass for them.
const DENIED = '42501'
const PERMISSION_DENIED = 'permission denied for table job_posts'
const DUPLICATE = 'Vous avez déjà répondu à cette annonce.' // check_job_response_limits, unchanged

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)
const anon: Client = hasCreds ? createClient<Database>(url, anonKey, opts) : (undefined as unknown as Client)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Response Count Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

// Service role: auth.uid() is NULL, so the seller-type age gate and capability triggers let it through.
async function makeFreelancer(local: string): Promise<{ id: string; client: Client }> {
  const id = await createUser(local)
  const { error: typeErr } = await admin.from('profiles').update({ seller_type: 'freelancer' }).eq('id', id)
  if (typeErr) throw new Error(`seller_type seed failed: ${typeErr.message}`)
  const { error: fpErr } = await admin.from('freelancer_profiles').insert({ profile_id: id })
  if (fpErr) throw new Error(`freelancer_profiles seed failed: ${fpErr.message}`)
  return { id, client: await signIn(local) }
}

// The exact payload of mes-annonces/nouvelle/actions.ts — createAnnonce: these ten columns, no more.
function annonce(consumerId: string, label: string): PostInsert {
  return {
    consumer_id: consumerId,
    title: `${TITLE} — ${label}`,
    description: 'Mission de test pour le compteur de réponses.',
    category_id: null,
    city: 'Tunis',
    is_remote: false,
    budget_min: 100,
    budget_max: 300,
    deadline: null,
    status: 'open',
  }
}

async function createPost(client: Client, consumerId: string, label: string): Promise<string> {
  const { data, error } = await client.from('job_posts').insert(annonce(consumerId, label)).select('id').single()
  if (error || !data) throw new Error(`job_posts insert failed (${label}): ${error?.message}`)
  return data.id
}

const POST_COLUMNS = 'id, consumer_id, title, status, created_at, updated_at, response_count, admin_hidden_at, admin_hidden_reason'

// Ground truth, read with the service role.
async function post(id: string) {
  const { data, error } = await admin.from('job_posts').select(POST_COLUMNS).eq('id', id).single()
  if (error || !data) throw new Error(`job_posts read failed: ${error?.message}`)
  return data
}

async function trueCount(postId: string): Promise<number> {
  const { count, error } = await admin.from('job_responses').select('id', { count: 'exact', head: true }).eq('job_post_id', postId)
  if (error) throw new Error(`job_responses count failed: ${error.message}`)
  return count ?? 0
}

// The stored counter, checked against a real count every time so a lucky constant can't pass.
async function expectCount(postId: string, expected: number): Promise<void> {
  expect(await trueCount(postId)).toBe(expected)
  expect((await post(postId)).response_count).toBe(expected)
}

function respond(client: Client, postId: string, freelancerId: string) {
  return client.from('job_responses').insert({ job_post_id: postId, freelancer_id: freelancerId, proposal_message: 'Proposition de test pour le compteur' })
}

function expectDenied(error: { code?: string; message?: string } | null) {
  expect(error?.code).toBe(DENIED)
  expect(error?.message).toBe(PERMISSION_DENIED)
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// The fixture posts are open on the board while this runs, so a real freelancer could answer one:
// refuseTeardownOnForeignResponses refuses rather than cascade that response away. Then the users:
// deleting them cascades profiles -> job_posts -> job_responses, and freelancer_profiles. No orders, no
// orderable item (so no orders guard), no audited admin RPC.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return
  await refuseTeardownOnForeignResponses(admin, ids, PREFIX)

  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let posterId: string
let adminId: string
let posterClient: Client
let outsiderClient: Client
let adminClient: Client
let f1: { id: string; client: Client }
let f2: { id: string; client: Client }
let f3: { id: string; client: Client }
let f4: { id: string; client: Client }

// A: the counter's main post. B: receives a moved response, then a deleted account's, then is
// hard-deleted. C: concurrent responses. L: the write-lock target. M: the admin's own post.
let postA: string
let postB: string
let postC: string
let postL: string
let postM: string

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  posterId = await createUser('poster')
  await createUser('outsider')
  adminId = await createUser('admin')
  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)

  f1 = await makeFreelancer('f1')
  f2 = await makeFreelancer('f2')
  f3 = await makeFreelancer('f3')
  f4 = await makeFreelancer('f4')

  posterClient = await signIn('poster')
  outsiderClient = await signIn('outsider')
  adminClient = await signIn('admin')

  postA = await createPost(posterClient, posterId, 'A')
  postB = await createPost(posterClient, posterId, 'B')
  postC = await createPost(posterClient, posterId, 'C')
  postL = await createPost(posterClient, posterId, 'L')
  postM = await createPost(adminClient, adminId, 'M (admin)')
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
  const { count: posts, error: postsErr } = await admin
    .from('job_posts')
    .select('id', { count: 'exact', head: true })
    .like('title', `${TITLE}%`)
  if (postsErr) throw new Error(`cleanup check (posts) failed: ${postsErr.message}`)
  if ((posts ?? 0) !== 0) throw new Error(`teardown left ${posts} fixture posts`)
}, 120000)

describe.skipIf(!hasCreds)('the createAnnonce insert still works, and the database owns created_at and the count', () => {
  it('every fixture post starts at 0, with created_at = updated_at (both the insert-time default)', async () => {
    for (const id of [postA, postB, postC, postL, postM]) {
      const row = await post(id)
      expect(row.response_count).toBe(0)
      expect(row.created_at).toBe(row.updated_at)
    }
  })
})

describe.skipIf(!hasCreds)('G3 — response_count follows job_responses', () => {
  it('+1 per response, and the response bumps updated_at (decision 3)', async () => {
    const before = await post(postA)
    expect((await respond(f1.client, postA, f1.id)).error).toBeNull()
    await expectCount(postA, 1)
    expect(Date.parse((await post(postA)).updated_at)).toBeGreaterThan(Date.parse(before.updated_at))
    expect((await respond(f2.client, postA, f2.id)).error).toBeNull()
    await expectCount(postA, 2)
  })

  // A regression pin rather than a discovery: a refused statement rolls back, so today this holds by
  // construction. It fails if the counter ever moves to a BEFORE trigger or a deferred path.
  it('a response refused by a BEFORE trigger leaves the count alone', async () => {
    const { error } = await respond(f2.client, postA, f2.id)
    expect(error?.message).toBe(DUPLICATE)
    await expectCount(postA, 2)
  })

  it('−1 when a freelancer deletes their own response', async () => {
    const { data, error } = await f1.client.from('job_responses').delete().eq('job_post_id', postA).eq('freelancer_id', f1.id).select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    await expectCount(postA, 1)
  })

  it('a response that changes post moves its count (service role: no client holds UPDATE on job_responses)', async () => {
    const { data, error } = await admin
      .from('job_responses')
      .update({ job_post_id: postB })
      .eq('job_post_id', postA)
      .eq('freelancer_id', f2.id)
      .select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    await expectCount(postA, 0)
    await expectCount(postB, 1)
  })

  it('a deleted freelancer account takes its count with it', async () => {
    expect((await respond(f3.client, postB, f3.id)).error).toBeNull()
    await expectCount(postB, 2)
    const { error } = await admin.auth.admin.deleteUser(f3.id)
    expect(error).toBeNull()
    await expectCount(postB, 1)
  })

  it('the poster cannot hard-delete an answered post (job_posts_no_hard_delete): refused, the responses stay', async () => {
    const { error } = await posterClient.from('job_posts').delete().eq('id', postB)
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe('permission denied for table job_posts')
    await expectCount(postB, 1)
    const { count, error: countErr } = await admin.from('job_responses').select('id', { count: 'exact', head: true }).eq('job_post_id', postB)
    expect(countErr).toBeNull()
    expect(count).toBe(1)
  })

  it('a hard delete on the cascade path (service role, as account deletion) takes its responses, and the counter does not get in the way', async () => {
    const { data, error } = await admin.from('job_posts').delete().eq('id', postB).select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    const { count, error: countErr } = await admin.from('job_responses').select('id', { count: 'exact', head: true }).eq('job_post_id', postB)
    expect(countErr).toBeNull()
    expect(count).toBe(0)
  })

  // Three requests in flight at once. REST cannot force them to interleave inside the database, so this
  // proves the end state; that "+ 1" survives a real overlap rests on the SQL (see the migration header).
  it('concurrent responses all count', async () => {
    const results = await Promise.all([f1, f2, f4].map((f) => respond(f.client, postC, f.id)))
    for (const { error } of results) expect(error).toBeNull()
    await expectCount(postC, 3)
  })

  it('anyone who can read the post can read its count: a responder (who sees only its own response), an outsider, anon', async () => {
    for (const reader of [f4.client, outsiderClient, anon]) {
      const { data, error } = await reader.from('job_posts').select('id, response_count').eq('id', postC).single()
      expect(error).toBeNull()
      expect(data).toEqual({ id: postC, response_count: 3 })
    }
  })
})

describe.skipIf(!hasCreds)('G9 — job_posts write lock (column grants)', () => {
  // Each value differs from the stored one except consumer_id, which is the owner's own id: the grant
  // refuses the column, not the value.
  const lockedOnUpdate = (): [string, PostUpdate][] => [
    ['created_at', { created_at: '2099-01-01T00:00:00+00:00' }],
    ['updated_at', { updated_at: '2099-01-01T00:00:00+00:00' }],
    ['response_count', { response_count: 7 }],
    ['consumer_id (own id)', { consumer_id: posterId }],
    ['id', { id: randomUUID() }],
    ['admin_hidden_at', { admin_hidden_at: new Date().toISOString(), admin_hidden_reason: 'test' }],
  ]

  it('the owner cannot UPDATE a locked column, and the row does not move', async () => {
    const before = await post(postL)
    for (const [label, patch] of lockedOnUpdate()) {
      const { error } = await posterClient.from('job_posts').update(patch).eq('id', postL).select('id')
      expect(error, label).not.toBeNull()
      expectDenied(error)
    }
    expect(await post(postL)).toEqual(before)
  })

  it('a locked column fails the whole statement, granted columns included', async () => {
    const before = await post(postL)
    const { error } = await posterClient.from('job_posts').update({ title: `${TITLE} — renamed`, created_at: before.created_at }).eq('id', postL)
    expectDenied(error)
    expect(await post(postL)).toEqual(before)
  })

  it('the owner cannot INSERT a locked column (decision 2), and no row is created', async () => {
    const locked: [string, Partial<PostInsert>][] = [
      ['created_at', { created_at: '2099-01-01T00:00:00+00:00' }],
      ['updated_at', { updated_at: '2099-01-01T00:00:00+00:00' }],
      ['response_count', { response_count: 9 }],
      ['id', { id: randomUUID() }],
      ['admin_hidden_at', { admin_hidden_at: new Date().toISOString(), admin_hidden_reason: 'test' }],
    ]
    for (const [label, extra] of locked) {
      const payload = { ...annonce(posterId, `forged ${label}`), ...extra }
      const { error } = await posterClient.from('job_posts').insert(payload).select('id')
      expectDenied(error)
      const { count, error: countErr } = await admin
        .from('job_posts')
        .select('id', { count: 'exact', head: true })
        .eq('title', payload.title as string)
      expect(countErr).toBeNull()
      expect(count, label).toBe(0)
    }
  })

  it('an admin is refused on its own post too (decision 4)', async () => {
    const before = await post(postM)
    const { error } = await adminClient.from('job_posts').update({ created_at: '2099-01-01T00:00:00+00:00' }).eq('id', postM)
    expectDenied(error)
    expect(await post(postM)).toEqual(before)
  })

  it('anon can neither INSERT nor UPDATE', async () => {
    expectDenied((await anon.from('job_posts').update({ title: 'Pwned' }).eq('id', postL)).error)
    expectDenied((await anon.from('job_posts').insert(annonce(posterId, 'anon'))).error)
    expect((await post(postL)).title).toBe(`${TITLE} — L`)
  })

  it('controls: the owner still edits a granted column and walks filled → open', async () => {
    const { data: renamed, error: renameErr } = await posterClient
      .from('job_posts')
      .update({ title: `${TITLE} — L edited` })
      .eq('id', postL)
      .select('title')
    expect(renameErr).toBeNull()
    expect(renamed).toEqual([{ title: `${TITLE} — L edited` }])
    for (const status of ['filled', 'open'] as const) {
      const { data, error } = await posterClient.from('job_posts').update({ status }).eq('id', postL).select('status')
      expect(error).toBeNull()
      expect(data).toEqual([{ status }])
    }
    expect((await post(postL)).response_count).toBe(0)
  })
})

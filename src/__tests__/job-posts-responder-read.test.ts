/**
 * Live-DB proof for db/migrations/20261026200934_job_posts_responder_read.sql — missions M-B, gap G2
 * (docs/design/h9-h13-measurements.md §6.4; decision D3; M-B-1 and P2-2, 2026-10-26).
 *
 * A freelancer reads every post they answered while it is not deleted and not moderated — open, filled or
 * expired — and its skills with it; nobody else gains anything (another freelancer and anon still see only
 * open posts, the owner still sees all their own). The policy's helper reads job_responses as its owner,
 * so neither side's job_responses read recurses (42P17). has_responded() is callable by authenticated only
 * and answers about the caller alone. The H11 / dashboard embed shape (job_responses -> job_posts(title))
 * now returns the title of a closed post instead of null.
 *
 * Fixtures (all `jp-read-`, password random per run: the repo is public and this suite promotes an admin
 * in production): a poster, a responding freelancer, a freelancer who did not respond, an admin. Every
 * response goes through the freelancer's own session while its post is open; the post is then closed by
 * the service role (status) or moderated through the real admin_hide_content RPC.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/job-posts-responder-read.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignResponses } from './live-teardown-guard'

type Client = SupabaseClient<Database>

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'jp-read-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Jr-${randomUUID()}-Aa1!`
const TITLE = `Responder read test ${RUN}`
const MESSAGE = 'Bonjour, je suis disponible pour cette mission.'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)
const anon: Client = hasCreds ? createClient<Database>(url, anonKey, opts) : (undefined as unknown as Client)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Responder Read Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

async function makeFreelancer(local: string): Promise<{ id: string; client: Client }> {
  const id = await createUser(local)
  const { error: typeErr } = await admin.from('profiles').update({ seller_type: 'freelancer' }).eq('id', id)
  if (typeErr) throw new Error(`seller_type seed failed: ${typeErr.message}`)
  const { error: fpErr } = await admin.from('freelancer_profiles').insert({ profile_id: id })
  if (fpErr) throw new Error(`freelancer_profiles seed failed: ${fpErr.message}`)
  return { id, client: await signIn(local) }
}

async function seedPost(consumerId: string, label: string): Promise<string> {
  const { data, error } = await admin
    .from('job_posts')
    .insert({ consumer_id: consumerId, title: `${TITLE} — ${label}`, description: 'Mission de test.' })
    .select('id')
    .single()
  if (error || !data) throw new Error(`job_posts seed failed (${label}): ${error?.message}`)
  return data.id
}

// The ids of `ids` that `client` can read from job_posts, sorted. A read error fails the test: an empty
// list must mean "the policy filtered", never "the query broke" (a 42P17 would surface here).
async function readablePosts(client: Client, ids: string[]): Promise<string[]> {
  const { data, error } = await client.from('job_posts').select('id').in('id', ids)
  expect(error).toBeNull()
  return (data ?? []).map((row) => row.id).sort()
}

const sorted = (...ids: string[]): string[] => [...ids].sort()

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// The open fixture post is on the board while this runs: refuse while a real freelancer has answered a
// fixture post. Then the audit rows (admin_hide_content) and the users (cascades posts -> responses).
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return
  await refuseTeardownOnForeignResponses(admin, ids, PREFIX)
  const { error: auditErr } = await admin.from('admin_audit_log').delete().in('admin_id', ids)
  if (auditErr) throw new Error(`admin_audit_log cleanup failed: ${auditErr.message}`)
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let posterClient: Client
let responder: { id: string; client: Client }
let other: { id: string; client: Client }

// Answered by the responder: open (stays open), filled, expired (stored), deleted, moderated.
// Unanswered: filled, never answered by anyone.
const p: Record<'open' | 'filled' | 'expired' | 'deleted' | 'moderated' | 'unanswered', string> = {
  open: '', filled: '', expired: '', deleted: '', moderated: '', unanswered: '',
}
const all = () => Object.values(p)
let skillId: string

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  const posterId = await createUser('poster')
  const adminId = await createUser('admin')
  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)
  responder = await makeFreelancer('responder')
  other = await makeFreelancer('other')
  posterClient = await signIn('poster')
  const adminClient = await signIn('admin')

  for (const key of Object.keys(p) as (keyof typeof p)[]) p[key] = await seedPost(posterId, key)
  const { data: skill, error: skillErr } = await admin
    .from('job_post_skills')
    .insert({ job_post_id: p.filled, skill: `${TITLE} skill` })
    .select('id')
    .single()
  if (skillErr || !skill) throw new Error(`job_post_skills seed failed: ${skillErr?.message}`)
  skillId = skill.id

  // The responder answers five posts while they are open — the only way a response can exist.
  for (const key of ['open', 'filled', 'expired', 'deleted', 'moderated'] as const) {
    const { error } = await responder.client
      .from('job_responses')
      .insert({ job_post_id: p[key], freelancer_id: responder.id, proposal_message: MESSAGE })
    if (error) throw new Error(`response insert failed (${key}): ${error.message}`)
  }

  // Then the posts close.
  for (const [key, status] of [['filled', 'filled'], ['expired', 'expired'], ['deleted', 'deleted'], ['unanswered', 'filled']] as const) {
    const { error } = await admin.from('job_posts').update({ status }).eq('id', p[key])
    if (error) throw new Error(`status seed failed (${key}): ${error.message}`)
  }
  const { error: hideErr } = await adminClient.rpc('admin_hide_content', { target_type: 'job_post', target_id: p.moderated, reason: TITLE })
  if (hideErr) throw new Error(`admin_hide_content failed: ${hideErr.message}`)
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
  const { count: posts } = await admin.from('job_posts').select('id', { count: 'exact', head: true }).like('title', `${TITLE}%`)
  if ((posts ?? 0) !== 0) throw new Error(`teardown left ${posts} fixture posts`)
}, 120000)

describe.skipIf(!hasCreds)('ground truth', () => {
  it('the posts hold exactly the states under test, and the responder answered five of them', async () => {
    const { data } = await admin.from('job_posts').select('id, status, admin_hidden_at').in('id', all())
    const state = new Map((data ?? []).map((row) => [row.id, row]))
    expect(state.get(p.open)).toMatchObject({ status: 'open', admin_hidden_at: null })
    expect(state.get(p.filled)).toMatchObject({ status: 'filled', admin_hidden_at: null })
    expect(state.get(p.expired)).toMatchObject({ status: 'expired', admin_hidden_at: null })
    expect(state.get(p.deleted)).toMatchObject({ status: 'deleted', admin_hidden_at: null })
    expect(state.get(p.moderated)?.status).toBe('open')
    expect(state.get(p.moderated)?.admin_hidden_at).not.toBeNull()
    expect(state.get(p.unanswered)).toMatchObject({ status: 'filled', admin_hidden_at: null })
    const { count } = await admin.from('job_responses').select('id', { count: 'exact', head: true }).eq('freelancer_id', responder.id)
    expect(count).toBe(5)
  })
})

describe.skipIf(!hasCreds)('G2 — who reads which post', () => {
  it('the responder: open, filled and expired — not deleted, not moderated, not the one they never answered', async () => {
    expect(await readablePosts(responder.client, all())).toEqual(sorted(p.open, p.filled, p.expired))
  })

  it('another freelancer and anon: only the open post (nothing gained)', async () => {
    expect(await readablePosts(other.client, all())).toEqual([p.open])
    expect(await readablePosts(anon, all())).toEqual([p.open])
  })

  it('the owner still reads every own post', async () => {
    expect(await readablePosts(posterClient, all())).toEqual(sorted(...all()))
  })

  it("the filled post's skills follow it: the responder reads them, another freelancer and anon do not", async () => {
    for (const [client, expected] of [[responder.client, [skillId]], [other.client, []], [anon, []]] as const) {
      const { data, error } = await client.from('job_post_skills').select('id').eq('job_post_id', p.filled)
      expect(error).toBeNull()
      expect((data ?? []).map((row) => row.id)).toEqual(expected)
    }
  })
})

describe.skipIf(!hasCreds)('no recursion, and the H11 / dashboard shape', () => {
  it('job_responses reads by the responder and by the post owner both work (no 42P17)', async () => {
    const { data: own, error: ownErr } = await responder.client.from('job_responses').select('id').eq('freelancer_id', responder.id)
    expect(ownErr).toBeNull()
    expect(own).toHaveLength(5)
    const { data: received, error: receivedErr } = await posterClient.from('job_responses').select('id').in('job_post_id', all())
    expect(receivedErr).toBeNull()
    expect(received).toHaveLength(5)
  })

  it('the embedded post title is there for open / filled / expired, null for deleted / moderated', async () => {
    const { data, error } = await responder.client
      .from('job_responses')
      .select('job_post_id, job_posts(title)')
      .eq('freelancer_id', responder.id)
    expect(error).toBeNull()
    const titles = new Map((data ?? []).map((row) => [row.job_post_id, row.job_posts?.title ?? null]))
    expect(titles.get(p.open)).toBe(`${TITLE} — open`)
    expect(titles.get(p.filled)).toBe(`${TITLE} — filled`)
    expect(titles.get(p.expired)).toBe(`${TITLE} — expired`)
    expect(titles.get(p.deleted)).toBeNull()
    expect(titles.get(p.moderated)).toBeNull()
  })
})

describe.skipIf(!hasCreds)('has_responded() — authenticated only, about the caller only', () => {
  it('answers for the caller, and anon cannot call it', async () => {
    expect(await responder.client.rpc('has_responded', { p_job_post_id: p.filled })).toMatchObject({ data: true, error: null })
    expect(await other.client.rpc('has_responded', { p_job_post_id: p.filled })).toMatchObject({ data: false, error: null })
    const { error } = await anon.rpc('has_responded', { p_job_post_id: p.filled })
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe('permission denied for function has_responded')
  })
})

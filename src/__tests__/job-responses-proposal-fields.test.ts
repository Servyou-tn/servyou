/**
 * Live-DB proof for db/migrations/20261026195409_job_responses_proposal_fields.sql — missions M-C: the H12
 * proposal fields (G4), moderated posts in the response trigger (G5), typed trigger failures (G7) and the
 * two response-cap races (docs/design/h9-h13-measurements.md §6.4; decisions MC-1…MC-4, 2026-10-26).
 *
 * G4 — every field rule refuses with its constraint name (CHECKs) or the `invalid_links` hint (trigger);
 *   a valid proposal stores every field. job_response_skills: responder-only writes, readable with the
 *   response (responder + post owner), no anon access and no UPDATE, unique per response
 *   case-insensitively, at most 8.
 * G7 — each refusal carries its stable HINT code, the French message unchanged.
 * G5 — a moderated post is refused (`job_unavailable`) and no longer counts toward the 5-active cap.
 * Races — more concurrent responses than slots: exactly the free slots succeed, for the 10-per-post cap
 *   (`job_full`) and the 5-active cap (`cap_active`). REST cannot force interleaving inside the database;
 *   firing a burst wider than the free slots is what makes an overlap likely enough to catch a regression.
 *
 * Fixtures (all `jr-fields-`, password random per run: the repo is public and this suite promotes an admin
 * in production). Posts are seeded by the service role (it may set status / created_at / the moderation
 * marker on INSERT); every response under test goes through a freelancer's own session.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/job-responses-proposal-fields.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignResponses } from './live-teardown-guard'

type Client = SupabaseClient<Database>
type ResponseInsert = Database['public']['Tables']['job_responses']['Insert']
type Freelancer = { id: string; client: Client }

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'jr-fields-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Jf-${randomUUID()}-Aa1!`
const TITLE = `Proposal fields test ${RUN}`
const MESSAGE = 'Bonjour, je peux réaliser cette mission rapidement.' // ≥ 20 characters (MC-1)

const NOT_OPEN = "Cette annonce n'est plus ouverte."
const EXPIRED = 'Cette annonce a expiré.'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)
const anon: Client = hasCreds ? createClient<Database>(url, anonKey, opts) : (undefined as unknown as Client)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Proposal Fields Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

async function makeFreelancer(local: string): Promise<Freelancer> {
  const id = await createUser(local)
  const { error: typeErr } = await admin.from('profiles').update({ seller_type: 'freelancer' }).eq('id', id)
  if (typeErr) throw new Error(`seller_type seed failed: ${typeErr.message}`)
  const { error: fpErr } = await admin.from('freelancer_profiles').insert({ profile_id: id })
  if (fpErr) throw new Error(`freelancer_profiles seed failed: ${fpErr.message}`)
  return { id, client: await signIn(local) }
}

type PostSeed = { status?: string; created_at?: string; admin_hidden_at?: string; admin_hidden_reason?: string }

async function seedPost(consumerId: string, label: string, extra: PostSeed = {}): Promise<string> {
  const { data, error } = await admin
    .from('job_posts')
    .insert({ consumer_id: consumerId, title: `${TITLE} — ${label}`, description: 'Mission de test.', ...extra })
    .select('id')
    .single()
  if (error || !data) throw new Error(`job_posts seed failed (${label}): ${error?.message}`)
  return data.id
}

// Service role: auth.uid() is NULL, so the capability trigger lets any profile respond; the limits still apply.
async function seedResponse(postId: string, freelancerId: string): Promise<void> {
  const { error } = await admin.from('job_responses').insert({ job_post_id: postId, freelancer_id: freelancerId, proposal_message: MESSAGE })
  if (error) throw new Error(`job_responses seed failed: ${error.message}`)
}

function respond(f: Freelancer, postId: string, extra: Partial<ResponseInsert> = {}) {
  return f.client.from('job_responses').insert({ job_post_id: postId, freelancer_id: f.id, proposal_message: MESSAGE, ...extra })
}

function expectCheck(error: { code?: string; message?: string } | null, constraint: string) {
  expect(error?.code).toBe('23514')
  expect(error?.message).toContain(`"${constraint}"`)
}

function expectHint(error: { code?: string; message?: string; hint?: string } | null, code: string, hint: string, message?: string) {
  expect(error?.code).toBe(code)
  expect(error?.hint).toBe(hint)
  if (message) expect(error?.message).toBe(message)
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// The open fixture posts are on the board while this runs: refuse while a real freelancer has answered one.
// Then the audit rows (admin_hide_content) and the users (cascades posts -> responses -> skills).
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

let posterId: string
let posterClient: Client
let adminClient: Client
let fMain: Freelancer
let fOther: Freelancer
let fA: Freelancer
let fB: Freelancer
let burst: Freelancer[]
let seeders: string[]

const post: Record<string, string> = {}
let capPosts: string[] // P1…P8 for the 5-active race
let gPosts: string[] // Q1…Q6 for the G5 cap exclusion
let mainResponseId: string

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  posterId = await createUser('poster')
  const adminId = await createUser('admin')
  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)

  fMain = await makeFreelancer('main')
  fOther = await makeFreelancer('other')
  fA = await makeFreelancer('cap-a')
  fB = await makeFreelancer('cap-b')
  burst = []
  for (let i = 1; i <= 8; i++) burst.push(await makeFreelancer(`burst-${i}`))
  seeders = []
  for (let i = 1; i <= 6; i++) seeders.push(await createUser(`seed-${i}`))

  posterClient = await signIn('poster')
  adminClient = await signIn('admin')

  const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString()
  post.main = await seedPost(posterId, 'main')
  post.filled = await seedPost(posterId, 'filled', { status: 'filled' })
  post.deleted = await seedPost(posterId, 'deleted', { status: 'deleted' })
  post.expiredStatus = await seedPost(posterId, 'expired status', { status: 'expired' })
  post.old = await seedPost(posterId, 'older than 30 days', { created_at: old })
  post.moderated = await seedPost(posterId, 'moderated', { admin_hidden_at: new Date().toISOString(), admin_hidden_reason: TITLE })
  post.own = await seedPost(fMain.id, "freelancer's own post")
  post.cap10 = await seedPost(posterId, '10-cap race')
  capPosts = []
  for (let i = 1; i <= 8; i++) capPosts.push(await seedPost(posterId, `P${i}`))
  gPosts = []
  for (let i = 1; i <= 6; i++) gPosts.push(await seedPost(posterId, `Q${i}`))
}, 300000)

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

describe.skipIf(!hasCreds)('G4 — proposal field rules', () => {
  it('the message must be 20–1000 characters after trim (MC-1), and is required', async () => {
    expectCheck((await respond(fMain, post.main, { proposal_message: 'x'.repeat(19) })).error, 'job_responses_proposal_message_length')
    expectCheck((await respond(fMain, post.main, { proposal_message: `   ${'x'.repeat(19)}   ` })).error, 'job_responses_proposal_message_length')
    expectCheck((await respond(fMain, post.main, { proposal_message: 'x'.repeat(1001) })).error, 'job_responses_proposal_message_length')
    expectCheck((await respond(fMain, post.main, { proposal_message: null })).error, 'job_responses_proposal_message_length')
  })

  it('price 0 ≤ x < 1 000 000 and délai 1–60 characters', async () => {
    expectCheck((await respond(fMain, post.main, { proposed_price_tnd: -1 })).error, 'job_responses_proposed_price_range')
    expectCheck((await respond(fMain, post.main, { proposed_price_tnd: 1000000 })).error, 'job_responses_proposed_price_range')
    expectCheck((await respond(fMain, post.main, { proposed_timeframe: '   ' })).error, 'job_responses_proposed_timeframe_length')
    expectCheck((await respond(fMain, post.main, { proposed_timeframe: 'x'.repeat(61) })).error, 'job_responses_proposed_timeframe_length')
  })

  it('links: an array of at most 3 (CHECK), each a clean http(s) {url, label?} (trigger)', async () => {
    const link = (n: number) => ({ url: `https://example.com/${n}`, label: `Lien ${n}` })
    expectCheck((await respond(fMain, post.main, { portfolio_links: { url: 'https://example.com' } })).error, 'job_responses_portfolio_links_shape')
    expectCheck((await respond(fMain, post.main, { portfolio_links: [link(1), link(2), link(3), link(4)] })).error, 'job_responses_portfolio_links_shape')
    const invalid: [string, unknown[]][] = [
      ['javascript: scheme', [{ url: 'javascript:alert(1)' }]],
      ['no scheme', [{ url: 'example.com' }]],
      ['a scalar element', ['https://example.com']],
      ['an extra key', [{ url: 'https://example.com', onclick: 'x' }]],
      ['a label over 60', [{ url: 'https://example.com', label: 'x'.repeat(61) }]],
      ['a url over 500', [{ url: `https://example.com/${'x'.repeat(490)}` }]],
      ['a duplicate url', [{ url: 'https://example.com/a' }, { url: 'HTTPS://EXAMPLE.COM/A' }]],
    ]
    for (const [label, links] of invalid) {
      const { error } = await respond(fMain, post.main, { portfolio_links: links as ResponseInsert['portfolio_links'] })
      expect(error?.hint, label).toBe('invalid_links')
      expect(error?.code, label).toBe('23514')
    }
    const { count } = await admin.from('job_responses').select('id', { count: 'exact', head: true }).eq('job_post_id', post.main)
    expect(count).toBe(0)
  })

  it('a valid proposal stores every field', async () => {
    const links = [{ url: 'https://www.behance.net/servyou-test', label: 'Behance' }, { url: 'http://example.com/portfolio' }]
    const { data, error } = await respond(fMain, post.main, { proposed_price_tnd: 250, proposed_timeframe: '5 jours', portfolio_links: links })
      .select('id, proposed_price_tnd, proposed_timeframe, portfolio_links')
      .single()
    expect(error).toBeNull()
    expect(data).toMatchObject({ proposed_price_tnd: 250, proposed_timeframe: '5 jours', portfolio_links: links })
    mainResponseId = data!.id
  })
})

describe.skipIf(!hasCreds)('G4 — job_response_skills', () => {
  it('the responder adds skills; a case-insensitive duplicate and a bad length are refused', async () => {
    const add = (skill: string) => fMain.client.from('job_response_skills').insert({ job_response_id: mainResponseId, skill })
    expect((await add('Figma')).error).toBeNull()
    expect((await add('  figma ')).error?.code).toBe('23505')
    // Probed while the response has room: the 8-skill trigger (BEFORE ROW) runs before RLS's WITH CHECK.
    const { error: foreign } = await fOther.client.from('job_response_skills').insert({ job_response_id: mainResponseId, skill: 'Intrus' })
    expect(foreign?.code).toBe('42501')
    expect(foreign?.message).toBe('new row violates row-level security policy for table "job_response_skills"')
    expectCheck((await add('   ')).error, 'job_response_skills_skill_length')
    expectCheck((await add('x'.repeat(61))).error, 'job_response_skills_skill_length')
  })

  it('at most 8 per response, rows of the same statement included', async () => {
    const rows = ['Illustrator', 'Photoshop', 'Logo', 'Branding', 'Typographie', 'InDesign', 'Canva'].map((skill) => ({ job_response_id: mainResponseId, skill }))
    expect((await fMain.client.from('job_response_skills').insert(rows)).error).toBeNull() // 1 + 7 = 8
    expectHint((await fMain.client.from('job_response_skills').insert({ job_response_id: mainResponseId, skill: 'Blender' })).error, '23514', 'too_many_skills')
    const { count } = await admin.from('job_response_skills').select('id', { count: 'exact', head: true }).eq('job_response_id', mainResponseId)
    expect(count).toBe(8)
  })

  it('the responder and the post owner read; another freelancer and anon do not; no UPDATE; responder-only DELETE', async () => {
    for (const [reader, expected] of [[fMain.client, 8], [posterClient, 8], [fOther.client, 0]] as const) {
      const { data, error } = await reader.from('job_response_skills').select('id').eq('job_response_id', mainResponseId)
      expect(error).toBeNull()
      expect(data).toHaveLength(expected)
    }
    const { error: anonErr } = await anon.from('job_response_skills').select('id').limit(1)
    expect(anonErr?.message).toBe('permission denied for table job_response_skills')
    const { error: updErr } = await fMain.client.from('job_response_skills').update({ skill: 'Renamed' }).eq('job_response_id', mainResponseId)
    expect(updErr?.message).toBe('permission denied for table job_response_skills')
    const { data: gone } = await fOther.client.from('job_response_skills').delete().eq('job_response_id', mainResponseId).select('id')
    expect(gone).toEqual([])
    const { data: removed, error: delErr } = await fMain.client.from('job_response_skills').delete().eq('skill', 'Canva').select('id')
    expect(delErr).toBeNull()
    expect(removed).toHaveLength(1)
  })
})

describe.skipIf(!hasCreds)('G7 — typed refusals (G5 included)', () => {
  it('post state: filled / deleted / stored expired / past 30 days / moderated / missing', async () => {
    expectHint((await respond(fOther, post.filled)).error, '23514', 'job_filled', NOT_OPEN)
    expectHint((await respond(fOther, post.deleted)).error, '23514', 'job_deleted', NOT_OPEN)
    expectHint((await respond(fOther, post.expiredStatus)).error, '23514', 'job_expired', NOT_OPEN)
    expectHint((await respond(fOther, post.old)).error, '23514', 'job_expired', EXPIRED)
    expectHint((await respond(fOther, post.moderated)).error, '23514', 'job_unavailable', NOT_OPEN)
    expectHint((await respond(fOther, randomUUID())).error, '23503', 'job_not_found', 'Annonce introuvable.')
  })

  it('caller state: own post, duplicate, not the caller, not a freelancer', async () => {
    expectHint((await respond(fMain, post.own)).error, '42501', 'own_post', 'Vous ne pouvez pas répondre à votre propre annonce.')
    expectHint((await respond(fMain, post.main)).error, '23505', 'duplicate', 'Vous avez déjà répondu à cette annonce.')
    const { error: notSelf } = await fMain.client.from('job_responses').insert({ job_post_id: post.main, freelancer_id: fOther.id, proposal_message: MESSAGE })
    expectHint(notSelf, '42501', 'not_self')
    const { error: notFreelancer } = await posterClient.from('job_responses').insert({ job_post_id: post.main, freelancer_id: posterId, proposal_message: MESSAGE })
    expectHint(notFreelancer, '42501', 'not_freelancer')
  })

  it('G5: a moderated post no longer counts toward the 5-active cap', async () => {
    for (const q of gPosts.slice(0, 5)) await seedResponse(q, fB.id)
    expectHint((await respond(fB, gPosts[5])).error, '23514', 'cap_active')
    const { error: hideErr } = await adminClient.rpc('admin_hide_content', { target_type: 'job_post', target_id: gPosts[0], reason: TITLE })
    expect(hideErr).toBeNull()
    expect((await respond(fB, gPosts[5])).error).toBeNull()
  })
})

describe.skipIf(!hasCreds)('races — a burst wider than the free slots fills exactly the free slots', () => {
  it('10 per post: 6 seeded + 8 at once → exactly 4 succeed, 4 job_full, response_count 10', async () => {
    for (const s of seeders) await seedResponse(post.cap10, s)
    const results = await Promise.all(burst.map((f) => respond(f, post.cap10)))
    const ok = results.filter((r) => r.error === null)
    const full = results.filter((r) => r.error?.hint === 'job_full')
    expect(ok).toHaveLength(4)
    expect(full).toHaveLength(4)
    const { count } = await admin.from('job_responses').select('id', { count: 'exact', head: true }).eq('job_post_id', post.cap10)
    expect(count).toBe(10)
    const { data } = await admin.from('job_posts').select('response_count').eq('id', post.cap10).single()
    expect(data?.response_count).toBe(10)
  })

  it('5 active: 2 seeded + 6 at once → exactly 3 succeed, 3 cap_active', async () => {
    for (const p of capPosts.slice(0, 2)) await seedResponse(p, fA.id)
    const results = await Promise.all(capPosts.slice(2).map((p) => respond(fA, p)))
    expect(results.filter((r) => r.error === null)).toHaveLength(3)
    expect(results.filter((r) => r.error?.hint === 'cap_active')).toHaveLength(3)
    const { count } = await admin.from('job_responses').select('id', { count: 'exact', head: true }).eq('freelancer_id', fA.id)
    expect(count).toBe(5)
  })
})

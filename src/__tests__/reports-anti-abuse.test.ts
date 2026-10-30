/**
 * Live-DB proof for db/migrations/20261029183540_reports_anti_abuse.sql (migration 99; founder brief 2026-10-29, from
 * docs/follow-ups/signaler-product-service-b3.md item 1). Written while the migration was PENDING: 11 red / 5 green
 * before apply (no dedupe, no cap, every column client-writable), all green after.
 *
 *   dedupe  — one open / under_review report per (reporter, target_type, target_id): 23505 on
 *             reports_one_open_per_reporter_target, which the app maps (reportInsertRefusalKey) to
 *             « Vous avez déjà signalé ce contenu »; another reporter / another target_type is a different key;
 *             a resolved / dismissed report frees the slot; two parallel identical inserts file exactly one.
 *   columns — INSERT is column-granted: a client naming status / admin_note / created_at / id is refused 42501.
 *   cap     — 10 reports per reporter per rolling 24 h, 23514 hint rate_limited (also for an 11th that is a
 *             duplicate: the trigger runs before the index); service role is not capped; reports older than 24 h
 *             do not count; 12 parallel inserts file exactly 10 (the advisory lock).
 *
 * Fixtures (all `rep-abuse-`, password random per run): six consumers, no shop / listing / order. reports.target_id
 * has no FK, so every target is a random uuid: nothing orderable is ever live, no teardown guard needed. Every
 * report is filed by a fixture and cascades away with its reporter (reports.reporter_id ON DELETE CASCADE).
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/reports-anti-abuse.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { reportInsertRefusalKey } from '@/lib/reports/insert-refusal'
import { fixtureSignIn } from './fixture-session'

type Client = SupabaseClient<Database>
type ReportInsert = Database['public']['Tables']['reports']['Insert']

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'rep-abuse-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PASSWORD = `Ra-${randomUUID()}-Aa1!`
const DENIED = '42501'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

const LOCALS = ['dup', 'other', 'cols', 'cap', 'race', 'window'] as const
type Local = (typeof LOCALS)[number]
const ids = {} as Record<Local, string>
const clients = {} as Record<Local, Client>

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Rep Abuse Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

// Idempotent and surgical to this file's prefix; runs first and last. Deleting the users cascades their profiles
// and every report they filed.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

function report(local: Local, targetId: string, extra: Partial<ReportInsert> = {}): ReportInsert {
  return { reporter_id: ids[local], target_type: 'product', target_id: targetId, reason: 'other', ...extra }
}

async function file(local: Local, targetId: string, extra: Partial<ReportInsert> = {}) {
  return clients[local].from('reports').insert(report(local, targetId, extra))
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  for (const local of LOCALS) ids[local] = await createUser(local)
  for (const local of LOCALS) clients[local] = await signIn(local)
}, 120_000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  // Read-only proof the cleanup is complete: no fixture profile and no fixture report left.
  const { count: profiles } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  expect(profiles).toBe(0)
  const { count: reports } = await admin
    .from('reports')
    .select('id', { count: 'exact', head: true })
    .in('reporter_id', Object.values(ids))
  expect(reports).toBe(0)
}, 120_000)

describe.skipIf(!hasCreds)('dedupe — one live report per reporter per target', () => {
  const target = randomUUID()

  it('the first report is filed', async () => {
    expect((await file('dup', target)).error).toBeNull()
  })

  it('a second open report on the same target is refused 23505, mapped to « déjà signalé »', async () => {
    const { error } = await file('dup', target, { reason: 'fake_scam' })
    expect(error?.code).toBe('23505')
    expect(reportInsertRefusalKey(error!)).toBe('report.already_reported')
  })

  it('another reporter on the same target, and the same reporter on another target_type, are different keys', async () => {
    expect((await file('other', target)).error).toBeNull()
    expect((await file('dup', target, { target_type: 'service' })).error).toBeNull()
  })

  it('under_review still holds the slot; once dismissed, the reporter can report the target again', async () => {
    const setStatus = (patch: Database['public']['Tables']['reports']['Update']) =>
      admin.from('reports').update(patch).eq('reporter_id', ids.dup).eq('target_id', target).eq('target_type', 'product')
    expect((await setStatus({ status: 'under_review' })).error).toBeNull()
    expect((await file('dup', target)).error?.code).toBe('23505')
    expect((await setStatus({ status: 'dismissed', admin_note: 'test: dismissed' })).error).toBeNull()
    expect((await file('dup', target)).error).toBeNull()
  })

  it('two parallel identical inserts file exactly one', async () => {
    const twin = randomUUID()
    const results = await Promise.all([file('dup', twin), file('dup', twin)])
    expect(results.filter((r) => r.error === null)).toHaveLength(1)
    expect(results.map((r) => r.error?.code).filter(Boolean)).toEqual(['23505'])
  })
})

describe.skipIf(!hasCreds)('columns — the client writes only reporter / target / reason / description', () => {
  it.each([
    ['status + admin_note (would dodge the open-only index)', { status: 'dismissed', admin_note: 'self-dismissed' }],
    ['a backdated created_at (would dodge the 24 h window)', { created_at: '2020-01-01T00:00:00Z' }],
    ['updated_at', { updated_at: '2020-01-01T00:00:00Z' }],
    ['a chosen id', { id: randomUUID() }],
  ] as const)('refuses %s with 42501, nothing filed', async (_label, extra) => {
    const target = randomUUID()
    const { error } = await file('cols', target, extra as Partial<ReportInsert>)
    expect(error?.code).toBe(DENIED)
    expect(error?.message).toBe('permission denied for table reports')
    const { count } = await admin.from('reports').select('id', { count: 'exact', head: true }).eq('target_id', target)
    expect(count).toBe(0)
  })

  it('the five allowed columns still file a report, with status open and created_at now', async () => {
    const target = randomUUID()
    expect((await file('cols', target, { description: 'ok' })).error).toBeNull()
    const { data } = await admin.from('reports').select('status, admin_note, created_at').eq('target_id', target).single()
    expect(data?.status).toBe('open')
    expect(data?.admin_note).toBeNull()
    expect(Math.abs(Date.now() - new Date(data!.created_at).getTime())).toBeLessThan(5 * 60_000)
  })
})

describe.skipIf(!hasCreds)('cap — 10 reports per reporter per rolling 24 h', () => {
  const firstTarget = randomUUID()

  it('10 reports are filed; the 11th is refused 23514 rate_limited, mapped to the rate-limit message', async () => {
    for (let i = 0; i < 10; i++) {
      const { error } = await file('cap', i === 0 ? firstTarget : randomUUID())
      expect(error, `report ${i + 1}`).toBeNull()
    }
    const { error } = await file('cap', randomUUID())
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('rate_limited')
    expect(reportInsertRefusalKey(error!)).toBe('report.rate_limited')
  })

  it('an 11th that is also a duplicate answers rate_limited (the trigger runs before the index)', async () => {
    const { error } = await file('cap', firstTarget)
    expect(error?.hint).toBe('rate_limited')
  })

  it('a report filed in a capped user’s name is refused by RLS (42501), never rate_limited (no quota leak)', async () => {
    const { error } = await file('cols', randomUUID(), { reporter_id: ids.cap })
    expect(error?.code).toBe(DENIED)
    expect(error?.hint).not.toBe('rate_limited')
  })

  it('service role is not capped', async () => {
    const { error } = await admin.from('reports').insert(report('cap', randomUUID()))
    expect(error).toBeNull()
  })

  it('12 parallel inserts file exactly 10 (the per-reporter lock)', async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => file('race', randomUUID())))
    expect(results.filter((r) => r.error === null)).toHaveLength(10)
    expect(results.filter((r) => r.error?.hint === 'rate_limited')).toHaveLength(2)
  })

  it('reports older than 24 h do not count', async () => {
    for (let i = 0; i < 10; i++) expect((await file('window', randomUUID())).error).toBeNull()
    expect((await file('window', randomUUID())).error?.hint).toBe('rate_limited')
    const old = new Date(Date.now() - 25 * 3600_000).toISOString()
    const { error: ageErr } = await admin.from('reports').update({ created_at: old }).eq('reporter_id', ids.window)
    expect(ageErr).toBeNull()
    expect((await file('window', randomUUID())).error).toBeNull()
  })
})

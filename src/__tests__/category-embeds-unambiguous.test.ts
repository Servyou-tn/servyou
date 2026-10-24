/**
 * Live-PostgREST regression guard for the PGRST201 hotfix (fix/pgrst201-category-embeds).
 *
 * Since 20260909203226 (service_listings.subcategory_id) service_listings has TWO foreign keys to
 * categories (category_id, subcategory_id). A bare `categories(...)` embed reached through
 * service_listings is then ambiguous: PostgREST answers HTTP 300 / PGRST201 for the whole request,
 * which broke /services/<id> (404), /mes-commandes (500) and emptied the marketplace lists. Every
 * such embed now names the FK: `categories!service_listings_category_id_fkey(...)`.
 *
 * Mock tests cannot catch this class — the ambiguity lives in PostgREST's schema cache — so this file
 * runs each production select string verbatim against the real API and asserts `error === null`
 * (which also catches PGRST200 from a wrong hint, e.g. the service_listings hint left on a products
 * embed). PostgREST resolves embeds before RLS, so a select that returns zero visible rows still
 * proves the string parses; the public marketplace selects additionally assert a row comes back with
 * a `categories` object, proving the result key the mappers read is unchanged.
 *
 * When you add or change a select that embeds categories through service_listings, update
 * category-embed-cases.ts (the hint-guard unit test fails until you do).
 *
 * Pattern A (live-DB). Service role for the fixture user and teardown only.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/category-embeds-unambiguous.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { CASES } from './category-embed-cases'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'cat-embed-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PASSWORD = `Ce-${randomUUID()}-Aa1!` // per run, never committed

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)
const anon: SupabaseClient = hasCreds
  ? createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)


// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id as string)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

let userClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { data, error } = await admin.auth.admin.createUser({
    email: email('buyer'),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Category Embeds Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  userClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: signInErr } = await userClient.auth.signInWithPassword({ email: email('buyer'), password: PASSWORD })
  if (signInErr) throw new Error(`signIn failed: ${signInErr.message}`)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

describe.skipIf(!hasCreds)('categories embeds through service_listings are unambiguous', () => {
  it.each(CASES.map((c) => [c.site, c] as const))('%s', async (_site, c) => {
    const client = c.role === 'anon' ? anon : userClient
    let query = client.from(c.table).select(c.select)
    if (c.expectRowWithCategory) {
      query = query.eq('status', 'active').not('category_id', 'is', null)
    }
    const { data, error, status } = await query.limit(5)

    expect(status).not.toBe(300)
    expect(error?.code).not.toBe('PGRST201')
    expect(error).toBeNull()

    if (c.expectRowWithCategory) {
      const rows = (data ?? []) as unknown as { categories: unknown }[]
      expect(rows.length).toBeGreaterThan(0)
      const category = rows[0].categories
      expect(category).toBeTruthy()
      expect(Array.isArray(category)).toBe(false)
    }
  })
})

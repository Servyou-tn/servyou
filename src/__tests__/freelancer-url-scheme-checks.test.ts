/**
 * Live proof for db/migrations/PENDING_freelancer_url_scheme_checks.sql — the five freelancer link columns hold
 * http(s) URLs only (`^https?://`, case-insensitive; NULL allowed), whoever writes them.
 *
 * ⚠ Red until that migration is applied: before it, the owner's REST write of `javascript:` is accepted.
 *
 *   * the owner's direct REST write (the path HTTP_URL does not cover) of `javascript:`, `data:` or '' is refused
 *     with 23514 naming the constraint, on each column;
 *   * `https://`, `HTTP://` (any case) and NULL (on the nullable columns) pass;
 *   * the service role is bound too (proven on freelancer_portfolio_items.url);
 *   * portfolio image_url: refused today by the provenance trigger (P0001), which fires before the CHECK for every
 *     writer — the CHECK there is a floor no write path reaches while that trigger exists.
 *
 * Fixtures (all `url-chk-`, password random per run): one freelancer with a profile, written by the service role,
 * plus `uploaded_objects` rows for made-up portfolio image paths (the provenance trigger checks the row, not a stored
 * file). Deleting the user cascades everything. 1 fixture sign-in (the live sign-in budget).
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/freelancer-url-scheme-checks.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'

type Client = SupabaseClient<Database>

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'url-chk-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PASSWORD = `Uc-${randomUUID()}-Aa1!`

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

const BAD = ['javascript:alert(1)', 'data:text/html,<script>alert(1)</script>', '', 'ftp://example.com/x', ' https://lead.space']
const GOOD = ['https://example.com/p', 'HTTP://Example.com/P', 'http://localhost:54321/x']

type Err = { code?: string; message?: string } | null
function expectRefused(error: Err, constraint: string) {
  expect(error?.code).toBe('23514')
  expect(error?.message).toContain(constraint)
}

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  await refuseTeardownOnForeignOrders(admin, ids, PREFIX)
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let freelancerId: string
let profileId: string
let owner: Client

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { data, error } = await admin.auth.admin.createUser({
    email: email('freelancer'),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Url Check Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  freelancerId = data.user.id
  const { data: profile, error: profErr } = await admin.from('freelancer_profiles').insert({ profile_id: freelancerId }).select('id').single()
  if (profErr || !profile) throw new Error(`freelancer profile insert failed: ${profErr?.message}`)
  profileId = profile.id

  owner = createClient<Database>(url, anonKey, opts)
  const { error: signErr } = await fixtureSignIn(owner, email('freelancer'))
  if (signErr) throw new Error(`signIn failed: ${signErr.message}`)
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 120000)

describe.skipIf(!hasCreds)('freelancer_profiles.portfolio_link', () => {
  const C = 'freelancer_profiles_portfolio_link_http'
  const set = (v: string | null) => owner.from('freelancer_profiles').update({ portfolio_link: v }).eq('id', profileId)

  it.each(BAD)('the owner cannot PATCH %j', async (v) => {
    expectRefused((await set(v)).error, C)
  })
  it.each([...GOOD, null])('%j passes', async (v) => {
    expect((await set(v)).error).toBeNull()
  })
})

describe.skipIf(!hasCreds)('freelancer_links.url', () => {
  const C = 'freelancer_links_url_http'
  const add = (v: string) => owner.from('freelancer_links').insert({ freelancer_profile_id: profileId, label: 'Lien', url: v })

  it.each(BAD)('the owner cannot INSERT %j', async (v) => {
    expectRefused((await add(v)).error, C)
  })
  it.each(GOOD)('%j passes', async (v) => {
    expect((await add(v)).error).toBeNull()
  })
  it('an UPDATE to javascript: is refused too', async () => {
    const { error } = await owner.from('freelancer_links').update({ url: 'javascript:alert(1)' }).eq('freelancer_profile_id', profileId)
    expectRefused(error, C)
  })
})

describe.skipIf(!hasCreds)('freelancer_certifications.credential_url', () => {
  const C = 'freelancer_certifications_credential_url_http'
  const add = (v: string | null) => owner.from('freelancer_certifications').insert({ freelancer_id: profileId, name: 'Certif', credential_url: v })

  it.each(BAD)('the owner cannot INSERT %j', async (v) => {
    expectRefused((await add(v)).error, C)
  })
  it.each([...GOOD, null])('%j passes', async (v) => {
    expect((await add(v)).error).toBeNull()
  })
})

describe.skipIf(!hasCreds)('freelancer_portfolio_items.url / image_url (CHECK proven with the service role)', () => {
  // A valid image needs its provenance row: trg_enforce_portfolio_image_provenance binds the service role too, and a
  // BEFORE trigger fires before the CHECK — without the row, every insert would fail P0001 for the wrong reason.
  async function img(): Promise<string> {
    const path = `${freelancerId}/${randomUUID()}.webp`
    const { error } = await admin.from('uploaded_objects').insert({ bucket: 'portfolio-media', path, owner_id: freelancerId })
    if (error) throw new Error(`provenance insert failed: ${error.message}`)
    return `${url}/storage/v1/object/public/portfolio-media/${path}`
  }
  const add = async (row: { url?: string | null; image_url?: string }) =>
    admin.from('freelancer_portfolio_items').insert({ freelancer_profile_id: profileId, title: 'Projet', image_url: await img(), ...row })

  it.each(BAD)('url %j is refused, even for the service role', async (v) => {
    expectRefused((await add({ url: v })).error, 'freelancer_portfolio_items_url_http')
  })
  // image_url is refused by trg_enforce_portfolio_image_provenance (P0001, every writer: only this project's
  // portfolio-media URLs with an upload record), a BEFORE trigger that fires before the CHECK — so the CHECK on this
  // column is a floor that no write path can reach while the trigger exists. Pinned here so it stays refused.
  it.each(BAD)('image_url %j is refused (provenance trigger, before the CHECK), even for the service role', async (v) => {
    const { error } = await add({ image_url: v })
    expect(error?.code).toBe('P0001')
    expect(error?.message).toContain('provenance check failed')
  })
  it('an http(s) url and a NULL url pass', async () => {
    // The 6-item cap (migration 105) does not bind the service role, but keep this to 2 rows anyway.
    expect((await add({ url: 'https://example.com/projet' })).error).toBeNull()
    expect((await add({ url: null })).error).toBeNull()
  })
  it("the owner's REST PATCH of url to javascript: is refused", async () => {
    const { error } = await owner.from('freelancer_portfolio_items').update({ url: 'javascript:alert(1)' }).eq('freelancer_profile_id', profileId)
    expectRefused(error, 'freelancer_portfolio_items_url_http')
  })
})

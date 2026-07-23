/**
 * RLS boundary tests for the shop configurable-workspace child tables
 * (shop_payment_methods, shop_categories) shipped by PR-E.
 *
 * These tables are low-sensitivity public-read marketplace surfaces — no PII.
 * The boundary worth regression-guarding is: anyone can READ them, but only the
 * owning shop's owner can WRITE. This locks in what PR-E shipped so a future
 * RLS refactor can't silently widen the owner-manage gate.
 *
 * Pattern A (live-DB), mirroring profiles-rls.test.ts:
 *   - admin (service role): fixture setup + teardown ONLY, never an assertion
 *   - anon client:          unauthenticated public reads
 *   - signed-in clients:    owner (write-allowed) vs non-owner (write-denied)
 *
 * Every deny is paired with a positive control on the SAME table so a bare
 * "errored" is never mistaken for a real RLS denial.
 *
 * Run: npx vitest run src/__tests__/shop-config-rls.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Creds injected via loadEnv/.env.local. Absent in CI / credential-less runs by design —
// describe.skipIf(!hasCreds) skips the suite and the hooks no-op instead of throwing.
const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

// File-specific email prefix so teardown is surgical and never collides with the
// rls-smoke script (alice/bob/charlie) or the freelancer-config test (frl-cfg-).
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'shop-cfg-'
const OWNER_EMAIL = `${EMAIL_PREFIX}owner${EMAIL_SUFFIX}`
const OTHER_EMAIL = `${EMAIL_PREFIX}other${EMAIL_SUFFIX}`
const PASSWORD = 'Rls-Config-Test-7k2!' // ephemeral test users only; never a real account

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)
const anon: SupabaseClient = hasCreds
  ? createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${email}: ${error.message}`)
  return client
}

async function createUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Shop Config Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
  return data.user.id
}

// Idempotent teardown, surgical to this file's prefix. Deleting the user cascades
// profiles -> shops -> shop_payment_methods/shop_categories (all ON DELETE CASCADE).
async function teardown() {
  const { data, error } = await admin
    .from('profiles').select('id').like('email', `${EMAIL_PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

let ownerId: string
let shopId: string
let catA: string
let catB: string
let ownerClient: SupabaseClient
let otherClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown() // teardown-first: recover from any crashed prior run

  ownerId = await createUser(OWNER_EMAIL)
  await createUser(OTHER_EMAIL)

  // The shop owned by ownerId, created via service role (bypasses RLS for setup).
  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: ownerId, name: 'RLS Config Shop' }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  shopId = shop.id

  // Two real categories for the shop_categories fixtures (junction needs valid FKs).
  const { data: cats, error: catErr } = await admin
    .from('categories').select('id').order('slug').limit(2)
  if (catErr || !cats || cats.length < 2) throw new Error(`need >=2 categories: ${catErr?.message}`)
  catA = cats[0].id
  catB = cats[1].id

  // Seed one row in each child table so the anon-read controls have a row to find.
  const { error: pmErr } = await admin
    .from('shop_payment_methods').insert({ shop_id: shopId, method: 'cod' })
  if (pmErr) throw new Error(`seed shop_payment_methods failed: ${pmErr.message}`)
  const { error: scErr } = await admin
    .from('shop_categories').insert({ shop_id: shopId, category_id: catA })
  if (scErr) throw new Error(`seed shop_categories failed: ${scErr.message}`)

  ownerClient = await signIn(OWNER_EMAIL)
  otherClient = await signIn(OTHER_EMAIL)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

// ─── shop_payment_methods: public read, owner-only write ──────────────────────

describe.skipIf(!hasCreds)('shop_payment_methods RLS', () => {
  it('anon CAN read shop_payment_methods (public read)', async () => {
    const { data, error } = await anon
      .from('shop_payment_methods').select('id, method').eq('shop_id', shopId).eq('method', 'cod')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('non-owner CANNOT insert a payment method on another shop', async () => {
    const { error } = await otherClient
      .from('shop_payment_methods').insert({ shop_id: shopId, method: 'd17' })
    expect(error).not.toBeNull()
  })

  it('owner CAN insert a payment method on own shop (control)', async () => {
    const { error } = await ownerClient
      .from('shop_payment_methods').insert({ shop_id: shopId, method: 'bank_transfer' })
    expect(error).toBeNull()
  })
})

// ─── shop_categories: public read, owner-only write ───────────────────────────

describe.skipIf(!hasCreds)('shop_categories RLS', () => {
  it('anon CAN read shop_categories (public read)', async () => {
    const { data, error } = await anon
      .from('shop_categories').select('id, category_id').eq('shop_id', shopId).eq('category_id', catA)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('non-owner CANNOT insert a category on another shop', async () => {
    const { error } = await otherClient
      .from('shop_categories').insert({ shop_id: shopId, category_id: catB })
    expect(error).not.toBeNull()
  })

  it('owner CAN insert a category on own shop (control)', async () => {
    const { error } = await ownerClient
      .from('shop_categories').insert({ shop_id: shopId, category_id: catB })
    expect(error).toBeNull()
  })
})

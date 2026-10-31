/**
 * Live proof for db/migrations/PENDING_listing_upload_caps.sql (pre-beta review M2 / M3) — the shop and upload halves:
 *   * at most 100 products per shop: the owner's 101st insert is refused (23514, hint products_per_shop_cap); the
 *     service role is not capped (seeds, admin tooling);
 *   * at most 100 image uploads per account per rolling 24 h: the 101st `uploaded_objects` row for one owner is
 *     refused (23514, hint daily_upload_cap) WHOEVER writes it — these rows are always written by the service role,
 *     so this cap deliberately has no service-role bypass; a backfilled row and a shop-assets row are not counted.
 * The services half (20 per freelancer) is services-cap-live.test.ts (it needs a freelancer: one seller capability
 * per account).
 *
 * ⚠ Red until that migration is applied.
 *
 * Fixtures (`lim-cap-`, password random per run): one shop owner and a shop, written by the service role; 99 products
 * and 99 provenance rows (made-up paths, no stored file — the trigger counts rows) pre-filled by the service role.
 * Deleting the user cascades everything. 1 fixture sign-in (the live sign-in budget).
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/listing-caps-live.test.ts
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

const PREFIX = 'lim-cap-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

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

const product = (shopId: string, n: number) => ({ shop_id: shopId, title: `Limit ${RUN} #${n}`, price_tnd: 10, status: 'hidden' })
const upload = (ownerId: string, bucket = 'product-images', backfilled = false) => ({
  bucket,
  path: `${ownerId}/${randomUUID()}.webp`,
  owner_id: ownerId,
  backfilled,
})
async function count(table: 'products' | 'uploaded_objects', id: string): Promise<number> {
  const query = admin.from(table).select('id', { count: 'exact', head: true })
  const { count: n, error } = await (table === 'products' ? query.eq('shop_id' as never, id) : query.eq('owner_id' as never, id))
  if (error) throw new Error(`count failed: ${error.message}`)
  return n ?? 0
}

let ownerId: string
let shopId: string
let owner: Client

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { data, error } = await admin.auth.admin.createUser({
    email: email('owner'),
    password: `Lc-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: 'Limit Cap Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  ownerId = data.user.id

  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: ownerId, name: `Limit Cap Shop ${RUN}`, description: 'x', city: 'Tunis' }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  shopId = shop.id

  // 99 of each, by the service role (not capped on products; under the cap on uploads).
  const { error: pErr } = await admin.from('products').insert(Array.from({ length: 99 }, (_, i) => product(shopId, i)))
  if (pErr) throw new Error(`product prefill failed: ${pErr.message}`)
  const { error: uErr } = await admin.from('uploaded_objects').insert(Array.from({ length: 99 }, () => upload(ownerId)))
  if (uErr) throw new Error(`upload prefill failed: ${uErr.message}`)

  owner = createClient<Database>(url, anonKey, opts)
  const { error: signErr } = await fixtureSignIn(owner, email('owner'))
  if (signErr) throw new Error(`signIn failed: ${signErr.message}`)
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count: n, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((n ?? 0) !== 0) throw new Error(`teardown left ${n} ${PREFIX} profiles`)
}, 120000)

describe.skipIf(!hasCreds)('products — at most 100 per shop', () => {
  it("the owner's 100th product passes; the 101st is refused with 23514 + products_per_shop_cap", async () => {
    expect((await owner.from('products').insert(product(shopId, 99))).error).toBeNull()
    expect(await count('products', shopId)).toBe(100)

    const { error } = await owner.from('products').insert(product(shopId, 100))
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('products_per_shop_cap')
    expect(await count('products', shopId)).toBe(100)
  })

  it('the service role is not capped (seeds, admin tooling)', async () => {
    expect((await admin.from('products').insert(product(shopId, 101))).error).toBeNull()
    expect(await count('products', shopId)).toBe(101)
  })
})

describe.skipIf(!hasCreds)('uploads — at most 100 per account per rolling 24 h, for every writer', () => {
  it('the 100th upload row passes; the 101st is refused with 23514 + daily_upload_cap, even for the service role', async () => {
    expect((await admin.from('uploaded_objects').insert(upload(ownerId))).error).toBeNull()
    const { error } = await admin.from('uploaded_objects').insert(upload(ownerId))
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('daily_upload_cap')
  })

  it('portfolio and avatar uploads count toward the same cap', async () => {
    for (const bucket of ['portfolio-media', 'avatars']) {
      const { error } = await admin.from('uploaded_objects').insert(upload(ownerId, bucket))
      expect(error?.hint).toBe('daily_upload_cap')
    }
  })

  it('a shop-assets row and a backfilled row are not counted', async () => {
    expect((await admin.from('uploaded_objects').insert(upload(ownerId, 'shop-assets'))).error).toBeNull()
    expect((await admin.from('uploaded_objects').insert(upload(ownerId, 'product-images', true))).error).toBeNull()
    expect(await count('uploaded_objects', ownerId)).toBe(102)
  })
})

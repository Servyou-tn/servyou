/**
 * Live proof for db/migrations/20261030100604_storage_verifications_drop_client_insert.sql (README 104) — S1:
 * the private verifications bucket lost its owner INSERT policy (identity verification is not built; nothing
 * writes there), so no client can PUT into any bucket any more.
 *
 *   * a signed-in user's PUT into their OWN verifications folder is refused by RLS and stores nothing;
 *   * the other buckets still accept their normal uploads — the service role's PUT (the app's path since
 *     S-3, src/lib/images/upload-guard.ts) into avatars / portfolio-media / shop-assets / product-images,
 *     and into verifications for a future server-side writer;
 *   * the owner still reads their own verifications object (the read policy stays).
 *
 * Fixtures (all `st-s1-`, password random per run): a consumer and a shop owner with a shop. Every object
 * written here is removed by the service role in teardown.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/storage-verifications-no-client-insert.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>
type Bucket = 'avatars' | 'portfolio-media' | 'shop-assets' | 'product-images' | 'verifications'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'st-s1-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `S1-${randomUUID()}-Aa1!`
const TITLE = `Storage S1 test ${RUN}`
const RLS_REFUSED = 'new row violates row-level security policy'
const WEBP = () => new Blob([new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])], { type: 'image/webp' })
const PDF = () => new Blob([new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52])], { type: 'application/pdf' })
const BUCKETS: Bucket[] = ['avatars', 'portfolio-media', 'shop-assets', 'product-images', 'verifications']

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Storage S1 Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

async function listNames(bucket: Bucket, folder: string): Promise<string[]> {
  const { data, error } = await admin.storage.from(bucket).list(folder)
  if (error) throw new Error(`${bucket} listing failed: ${error.message}`)
  return (data ?? []).map((o) => o.name)
}

// Removes everything under each fixture folder (uid folders, and the shop's folder) in every bucket.
async function sweep(folders: string[]): Promise<void> {
  for (const bucket of BUCKETS) {
    for (const folder of folders) {
      const names = (await listNames(bucket, folder)).map((n) => `${folder}/${n}`)
      if (names.length > 0) {
        const { error } = await admin.storage.from(bucket).remove(names)
        if (error) throw new Error(`${bucket} cleanup failed: ${error.message}`)
      }
    }
  }
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last. The
// fixture shop has no product, so nothing is orderable; objects first, then the users.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return
  const { data: shops, error: shopsErr } = await admin.from('shops').select('id').in('owner_id', ids)
  if (shopsErr) throw new Error(`teardown shop lookup failed: ${shopsErr.message}`)
  await sweep([...ids, ...(shops ?? []).map((s) => s.id)])
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let userId: string
let ownerId: string
let shopId: string
let userClient: Client

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  userId = await createUser('user')
  ownerId = await createUser('owner')
  const { error: typeErr } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', ownerId)
  if (typeErr) throw new Error(`seller upgrade failed: ${typeErr.message}`)
  const { data: shop, error: shopErr } = await admin.from('shops').insert({ owner_id: ownerId, name: `${TITLE} — shop` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  shopId = shop.id
  userClient = await signIn('user')
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 120000)

describe.skipIf(!hasCreds)('S1 — no client PUT into the verifications bucket', () => {
  it("a signed-in user's PUT into their own verifications folder is refused and stores nothing", async () => {
    const { error } = await userClient.storage
      .from('verifications')
      .upload(`${userId}/${randomUUID()}.pdf`, PDF(), { contentType: 'application/pdf' })
    expect(error?.message).toContain(RLS_REFUSED)
    expect(await listNames('verifications', userId)).toEqual([])
  })

  it('the service role (the upload actions’ path) still writes to the four public buckets', async () => {
    const cases: [Bucket, string][] = [
      ['avatars', userId],
      ['portfolio-media', userId],
      ['shop-assets', shopId],
      ['product-images', shopId],
    ]
    for (const [bucket, folder] of cases) {
      const name = `${randomUUID()}.webp`
      const { error } = await admin.storage.from(bucket).upload(`${folder}/${name}`, WEBP(), { contentType: 'image/webp' })
      expect(error, bucket).toBeNull()
      expect(await listNames(bucket, folder), bucket).toContain(name)
    }
  })

  it('the service role still writes to verifications, and the owner still reads their own document', async () => {
    const name = `${randomUUID()}.pdf`
    const { error } = await admin.storage.from('verifications').upload(`${userId}/${name}`, PDF(), { contentType: 'application/pdf' })
    expect(error).toBeNull()
    const { data, error: listErr } = await userClient.storage.from('verifications').list(userId)
    expect(listErr).toBeNull()
    expect((data ?? []).map((o) => o.name)).toContain(name)
  })
})

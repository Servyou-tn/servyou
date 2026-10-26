/**
 * Live proof for db/migrations/<version>_storage_drop_client_inserts.sql — S-3: clients can no longer INSERT
 * objects into the four public image buckets; only the service role writes there (the upload actions, after
 * normalize.ts, ownership re-derivation and the active-caller check — src/lib/images/upload-guard.ts).
 *
 * ⚠ Red until that migration is applied (it is applied only after this PR is deployed): before it, a client
 * PUT into its own folder still succeeds.
 *
 *   * a signed-in user's PUT into their OWN folder of avatars / portfolio-media / shop-assets /
 *     product-images is refused by RLS;
 *   * the service role's PUT into the same folder works (the app's path), and the owner can still list and
 *     delete their own object (the owner read / delete policies stay);
 *   * the private verifications bucket keeps its owner upload policy.
 *
 * Fixtures (all `st-s3-`, password random per run): a consumer, a shop owner with a shop, a freelancer.
 * Every object written here is removed by the service role in teardown.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/storage-uploads-service-role.test.ts
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

const PREFIX = 'st-s3-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `S3-${randomUUID()}-Aa1!`
const TITLE = `Storage S-3 test ${RUN}`
const RLS_REFUSED = 'new row violates row-level security policy'
const WEBP = () => new Blob([new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])], { type: 'image/webp' })
const PDF = () => new Blob([new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52])], { type: 'application/pdf' })

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Storage S3 Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

// Removes everything under each fixture folder (uid folders, and the shops' folders) in every bucket.
async function sweep(folders: string[]): Promise<void> {
  for (const bucket of ['avatars', 'portfolio-media', 'shop-assets', 'product-images', 'verifications'] as Bucket[]) {
    for (const folder of folders) {
      const { data, error } = await admin.storage.from(bucket).list(folder)
      if (error) throw new Error(`${bucket} listing failed: ${error.message}`)
      const names = (data ?? []).map((o) => `${folder}/${o.name}`)
      if (names.length > 0) {
        const { error: rmErr } = await admin.storage.from(bucket).remove(names)
        if (rmErr) throw new Error(`${bucket} cleanup failed: ${rmErr.message}`)
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
let freelancerId: string
let shopId: string
let userClient: Client
let ownerClient: Client
let freelancerClient: Client

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  userId = await createUser('user')
  ownerId = await createUser('owner')
  freelancerId = await createUser('freelancer')
  const { error: typeErr } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', ownerId)
  if (typeErr) throw new Error(`seller upgrade failed: ${typeErr.message}`)
  const { data: shop, error: shopErr } = await admin.from('shops').insert({ owner_id: ownerId, name: `${TITLE} — shop` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  shopId = shop.id
  userClient = await signIn('user')
  ownerClient = await signIn('owner')
  freelancerClient = await signIn('freelancer')
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

describe.skipIf(!hasCreds)('S-3 — no client PUT into the public image buckets', () => {
  it("a signed-in user's PUT into their own folder is refused in all four buckets", async () => {
    const cases: [string, Client, Bucket, string][] = [
      ['avatars', userClient, 'avatars', userId],
      ['portfolio-media', freelancerClient, 'portfolio-media', freelancerId],
      ['shop-assets', ownerClient, 'shop-assets', shopId],
      ['product-images', ownerClient, 'product-images', shopId],
    ]
    for (const [label, client, bucket, folder] of cases) {
      const { error } = await client.storage.from(bucket).upload(`${folder}/${randomUUID()}.webp`, WEBP(), { contentType: 'image/webp' })
      expect(error?.message, label).toContain(RLS_REFUSED)
      const { data } = await admin.storage.from(bucket).list(folder)
      expect(data ?? [], label).toHaveLength(0)
    }
  })

  it("the service role writes into the user's folder (the app's path); the owner still lists and deletes it", async () => {
    const path = `${userId}/${randomUUID()}.webp`
    expect((await admin.storage.from('avatars').upload(path, WEBP(), { contentType: 'image/webp' })).error).toBeNull()
    const { data: listed, error: listErr } = await userClient.storage.from('avatars').list(userId)
    expect(listErr).toBeNull()
    expect((listed ?? []).map((o) => `${userId}/${o.name}`)).toContain(path)
    const { data: removed, error: rmErr } = await userClient.storage.from('avatars').remove([path])
    expect(rmErr).toBeNull()
    expect(removed).toHaveLength(1)
  })

  it('the private verifications bucket keeps its owner upload policy', async () => {
    const { error } = await userClient.storage.from('verifications').upload(`${userId}/${randomUUID()}.pdf`, PDF(), { contentType: 'application/pdf' })
    expect(error).toBeNull()
  })
})

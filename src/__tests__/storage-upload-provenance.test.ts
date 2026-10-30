/**
 * Live-DB proof for db/migrations/20261026205458_storage_upload_provenance.sql — the column side of the
 * « raw bytes PUT straight to the Storage REST API » bypass (docs/follow-ups.md; decisions S-1 no bypass,
 * S-2 host anchored, 2026-10-26).
 *
 * profiles.avatar_url and shops.logo_url / banner_url accept only NULL, an unchanged value, or this project's
 * public URL of an object with an uploaded_objects record owned by the row's owner. Refused, 42501 HINT
 * unverified_upload: a foreign URL; a foreign host carrying a recorded path; bytes stored in the user's own
 * folder without a provenance record (an orphan / pre-S-3 upload — since S-3 clients cannot PUT there at all);
 * another user's recorded object; the service role too (no bypass). product_images / freelancer_portfolio_items keep their
 * own messages and now also require this project's host.
 *
 * Provenance records are seeded by the service role, exactly as src/lib/images/provenance.ts writes them;
 * the trigger reads only that table, so no bytes are needed except for the unrecorded-object case (planted by
 * the service role).
 *
 * Fixtures (all `st-prov-`, password random per run): a consumer, two shop owners, a freelancer.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/storage-upload-provenance.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'

type Client = SupabaseClient<Database>
type Bucket = 'avatars' | 'shop-assets' | 'product-images' | 'portfolio-media'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'st-prov-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `St-${randomUUID()}-Aa1!`
const TITLE = `Storage provenance test ${RUN}`
const HINT = 'unverified_upload'
const MESSAGE = "Cette image n'a pas été téléversée par Servyou."
// The smallest body the avatars bucket accepts (declared image/webp; the bucket does not sniff).
const RAW_BYTES = () => new Blob([new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])], { type: 'image/webp' })

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Storage Provenance Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

// Exactly what the app stores: storage.from(bucket).getPublicUrl(path).
const publicUrl = (bucket: Bucket, path: string) => admin.storage.from(bucket).getPublicUrl(path).data.publicUrl
const foreignHost = (bucket: Bucket, path: string) => `https://evil.example/storage/v1/object/public/${bucket}/${path}`

// What recordUploadProvenance writes after normalize + upload; the trigger reads only this table.
async function record(bucket: Bucket, folder: string, ownerId: string): Promise<string> {
  const path = `${folder}/${randomUUID()}.webp`
  const { error } = await admin.from('uploaded_objects').insert({ bucket, path, owner_id: ownerId })
  if (error) throw new Error(`uploaded_objects seed failed: ${error.message}`)
  return path
}

function expectUnverified(error: { code?: string; message?: string; hint?: string } | null) {
  expect(error?.code).toBe('42501')
  expect(error?.hint).toBe(HINT)
  expect(error?.message).toBe(MESSAGE)
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// The planted (unrecorded) objects are removed from storage first (uploaded_objects rows cascade from auth.users); the
// fixture product is hidden, but the orders guard runs anyway; then the users (cascades profiles -> shops ->
// products -> product_images, freelancer_profiles -> portfolio items).
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return
  await refuseTeardownOnForeignOrders(admin, ids, PREFIX)
  for (const id of ids) {
    const { data: objects, error: listErr } = await admin.storage.from('avatars').list(id)
    if (listErr) throw new Error(`avatar listing failed: ${listErr.message}`)
    if ((objects ?? []).length > 0) {
      const { error: rmErr } = await admin.storage.from('avatars').remove((objects ?? []).map((o) => `${id}/${o.name}`))
      if (rmErr) throw new Error(`avatar cleanup failed: ${rmErr.message}`)
    }
  }
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let userId: string
let ownerId: string
let otherOwnerId: string
let userClient: Client
let ownerClient: Client
let freelancerClient: Client
let shopId: string
let productId: string
let freelancerProfileId: string
let freelancerId: string

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  userId = await createUser('user')
  ownerId = await createUser('owner')
  otherOwnerId = await createUser('other-owner')
  freelancerId = await createUser('freelancer')

  for (const id of [ownerId, otherOwnerId]) {
    const { error } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', id)
    if (error) throw new Error(`seller upgrade failed: ${error.message}`)
  }
  const { data: shop, error: shopErr } = await admin.from('shops').insert({ owner_id: ownerId, name: `${TITLE} — shop` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  shopId = shop.id
  const { data: product, error: productErr } = await admin
    .from('products')
    .insert({ shop_id: shopId, title: `${TITLE} — product`, price_tnd: 10, status: 'hidden' })
    .select('id')
    .single()
  if (productErr || !product) throw new Error(`product insert failed: ${productErr?.message}`)
  productId = product.id

  const { error: ftErr } = await admin.from('profiles').update({ seller_type: 'freelancer' }).eq('id', freelancerId)
  if (ftErr) throw new Error(`freelancer upgrade failed: ${ftErr.message}`)
  const { data: fp, error: fpErr } = await admin.from('freelancer_profiles').insert({ profile_id: freelancerId }).select('id').single()
  if (fpErr || !fp) throw new Error(`freelancer_profiles insert failed: ${fpErr?.message}`)
  freelancerProfileId = fp.id

  userClient = await signIn('user')
  ownerClient = await signIn('owner')
  freelancerClient = await signIn('freelancer')
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
}, 120000)

async function avatarOf(id: string): Promise<string | null> {
  const { data, error } = await admin.from('profiles').select('avatar_url').eq('id', id).single()
  if (error) throw new Error(`profile read failed: ${error.message}`)
  return data.avatar_url
}

describe.skipIf(!hasCreds)('profiles.avatar_url', () => {
  it('a foreign URL, and a foreign host carrying a recorded path, are refused (S-2)', async () => {
    const recorded = await record('avatars', userId, userId)
    expectUnverified((await userClient.from('profiles').update({ avatar_url: 'https://example.com/a.webp' }).eq('id', userId)).error)
    expectUnverified((await userClient.from('profiles').update({ avatar_url: foreignHost('avatars', recorded) }).eq('id', userId)).error)
    expect(await avatarOf(userId)).toBeNull()
  })

  // Since S-3 a client can no longer PUT into the bucket (storage-uploads-service-role.test.ts proves that), so
  // the raw bytes are planted by the service role: the shape of an orphan or a pre-S-3 upload, i.e. bytes in the
  // user's own folder with no provenance record. Publishing them must still be refused.
  it('bytes stored in the own folder without a provenance record cannot be published', async () => {
    const path = `${userId}/${randomUUID()}.webp`
    const { error: putErr } = await admin.storage.from('avatars').upload(path, RAW_BYTES(), { contentType: 'image/webp' })
    expect(putErr).toBeNull()
    expectUnverified((await userClient.from('profiles').update({ avatar_url: publicUrl('avatars', path) }).eq('id', userId)).error)
    expect(await avatarOf(userId)).toBeNull()
  })

  it("another user's recorded object is refused", async () => {
    const theirs = await record('avatars', ownerId, ownerId)
    expectUnverified((await userClient.from('profiles').update({ avatar_url: publicUrl('avatars', theirs) }).eq('id', userId)).error)
  })

  it('the own recorded upload is accepted (query string included), re-sent unchanged, then cleared', async () => {
    const mine = await record('avatars', userId, userId)
    const value = `${publicUrl('avatars', mine)}?t=${RUN}`
    expect((await userClient.from('profiles').update({ avatar_url: value }).eq('id', userId)).error).toBeNull()
    expect(await avatarOf(userId)).toBe(value)
    // Unchanged passes on its own: with the record gone (as after a folder sweep), only the short-circuit can let it through.
    const { error: dropErr } = await admin.from('uploaded_objects').delete().eq('bucket', 'avatars').eq('path', mine)
    expect(dropErr).toBeNull()
    expect((await userClient.from('profiles').update({ avatar_url: value, city: 'Sfax' }).eq('id', userId)).error).toBeNull()
    expect((await userClient.from('profiles').update({ avatar_url: null }).eq('id', userId)).error).toBeNull()
    expect(await avatarOf(userId)).toBeNull()
  })

  it('no bypass: the service role is refused too (S-1)', async () => {
    expectUnverified((await admin.from('profiles').update({ avatar_url: 'https://example.com/a.webp' }).eq('id', userId)).error)
  })
})

describe.skipIf(!hasCreds)('shops.logo_url / banner_url', () => {
  it('unrecorded, foreign or another owner\'s images are refused; the owner\'s recorded ones pass; NULL passes', async () => {
    const unrecorded = `${shopId}/${randomUUID()}.webp`
    expectUnverified((await ownerClient.from('shops').update({ logo_url: publicUrl('shop-assets', unrecorded) }).eq('id', shopId)).error)
    const mine = await record('shop-assets', shopId, ownerId)
    expectUnverified((await ownerClient.from('shops').update({ banner_url: foreignHost('shop-assets', mine) }).eq('id', shopId)).error)
    const theirs = await record('shop-assets', shopId, otherOwnerId)
    expectUnverified((await ownerClient.from('shops').update({ banner_url: publicUrl('shop-assets', theirs) }).eq('id', shopId)).error)

    const banner = await record('shop-assets', shopId, ownerId)
    const { error } = await ownerClient
      .from('shops')
      .update({ logo_url: publicUrl('shop-assets', mine), banner_url: publicUrl('shop-assets', banner) })
      .eq('id', shopId)
    expect(error).toBeNull()
    const { data } = await admin.from('shops').select('logo_url, banner_url').eq('id', shopId).single()
    expect(data).toEqual({ logo_url: publicUrl('shop-assets', mine), banner_url: publicUrl('shop-assets', banner) })
    // An unchanged logo does not block a banner-only change, even with the logo's record gone.
    const { error: dropErr } = await admin.from('uploaded_objects').delete().eq('bucket', 'shop-assets').eq('path', mine)
    expect(dropErr).toBeNull()
    const nextBanner = await record('shop-assets', shopId, ownerId)
    const { error: bannerErr } = await ownerClient
      .from('shops')
      .update({ logo_url: publicUrl('shop-assets', mine), banner_url: publicUrl('shop-assets', nextBanner) })
      .eq('id', shopId)
    expect(bannerErr).toBeNull()
    expect((await ownerClient.from('shops').update({ logo_url: null, banner_url: null }).eq('id', shopId)).error).toBeNull()
  })

  it('the INSERT path is checked too, for every caller (S-1)', async () => {
    const { error } = await admin.from('shops').insert({ owner_id: otherOwnerId, name: `${TITLE} — forged`, logo_url: 'https://example.com/logo.webp' })
    expectUnverified(error)
  })
})

describe.skipIf(!hasCreds)('S-2 — product and portfolio images require this project\'s host', () => {
  it('product_images: a foreign host with a recorded path is refused; the own URL passes', async () => {
    const path = await record('product-images', shopId, ownerId)
    const { error } = await ownerClient.from('product_images').insert({ product_id: productId, image_url: foreignHost('product-images', path), display_order: 0 })
    expect(error?.message).toBe(`product-images provenance check failed: ${foreignHost('product-images', path)} is not a recognized product-images object url`)
    const { error: okErr } = await ownerClient.from('product_images').insert({ product_id: productId, image_url: publicUrl('product-images', path), display_order: 0 })
    expect(okErr).toBeNull()
  })

  it('freelancer_portfolio_items: the same (service role, no bypass)', async () => {
    const path = await record('portfolio-media', freelancerId, freelancerId)
    const { error } = await admin.from('freelancer_portfolio_items').insert({ freelancer_profile_id: freelancerProfileId, image_url: foreignHost('portfolio-media', path), title: TITLE })
    expect(error?.message).toBe(`portfolio-media provenance check failed: ${foreignHost('portfolio-media', path)} is not a recognized portfolio-media object url`)
    const { error: okErr } = await admin.from('freelancer_portfolio_items').insert({ freelancer_profile_id: freelancerProfileId, image_url: publicUrl('portfolio-media', path), title: TITLE })
    expect(okErr).toBeNull()
  })

  it('migration 73: portfolio image_url is checked on UPDATE too; unchanged and other columns pass', async () => {
    const first = await record('portfolio-media', freelancerId, freelancerId)
    const { data: item, error } = await freelancerClient
      .from('freelancer_portfolio_items')
      .insert({ freelancer_profile_id: freelancerProfileId, image_url: publicUrl('portfolio-media', first), title: `${TITLE} — own` })
      .select('id')
      .single()
    expect(error).toBeNull()
    const patch = (values: Database['public']['Tables']['freelancer_portfolio_items']['Update']) =>
      freelancerClient.from('freelancer_portfolio_items').update(values).eq('id', item!.id)
    const foreign = foreignHost('portfolio-media', first)
    expect((await patch({ image_url: foreign })).error?.message).toBe(`portfolio-media provenance check failed: ${foreign} is not a recognized portfolio-media object url`)
    const unrecorded = `${freelancerId}/${randomUUID()}.webp`
    expect((await patch({ image_url: publicUrl('portfolio-media', unrecorded) })).error?.message).toBe(
      `portfolio-media provenance check failed: ${unrecorded} has no validated upload record for owner ${freelancerId}`,
    )
    // With the record gone, only the unchanged short-circuit can let this through.
    const { error: dropErr } = await admin.from('uploaded_objects').delete().eq('bucket', 'portfolio-media').eq('path', first)
    expect(dropErr).toBeNull()
    expect((await patch({ image_url: publicUrl('portfolio-media', first), title: `${TITLE} — renamed` })).error).toBeNull()
    const second = await record('portfolio-media', freelancerId, freelancerId)
    expect((await patch({ image_url: publicUrl('portfolio-media', second) })).error).toBeNull()
    const { data } = await admin.from('freelancer_portfolio_items').select('image_url, title').eq('id', item!.id).single()
    expect(data).toEqual({ image_url: publicUrl('portfolio-media', second), title: `${TITLE} — renamed` })
  })
})

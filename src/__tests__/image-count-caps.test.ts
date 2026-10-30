/**
 * Live proof for db/migrations/20261030202059_image_count_caps.sql (#105) — the upload COUNT caps in the database:
 * at most 8 product_images per product and 6 freelancer_portfolio_items per freelancer profile.
 *
 *   * an owner's 8 images in one multi-row insert pass; the 9th is refused (23514, hint product_images_cap);
 *   * a single insert of 9 at once is refused whole (the statement is atomic, so nothing is stored);
 *   * another product of the same owner is not affected by the first one's count;
 *   * a freelancer's 6 portfolio items pass; the 7th is refused (23514, hint portfolio_items_cap);
 *   * the service role is not capped (seeds / admin tooling).
 *
 * Fixtures (all `img-cap-`, password random per run): a shop owner (shop + 2 products) and a freelancer (profile).
 * Provenance rows are written by the service role for made-up paths — the provenance triggers check the
 * uploaded_objects row, not a stored file. Deleting the users cascades everything (shops → products → images,
 * freelancer_profiles → portfolio items, uploaded_objects). 2 fixture sign-ins (the live sign-in budget).
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/image-count-caps.test.ts
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

const PREFIX = 'img-cap-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Ic-${randomUUID()}-Aa1!`

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)

const publicUrl = (bucket: string, path: string) => `${url}/storage/v1/object/public/${bucket}/${path}`

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Image Cap Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

// Provenance rows (service role) for `n` made-up paths under `prefix` in `bucket`, owned by `owner`.
async function provenance(bucket: 'product-images' | 'portfolio-media', prefix: string, owner: string, n: number): Promise<string[]> {
  const paths = Array.from({ length: n }, () => `${prefix}/${randomUUID()}.webp`)
  const { error } = await admin.from('uploaded_objects').insert(paths.map((path) => ({ bucket, path, owner_id: owner })))
  if (error) throw new Error(`provenance insert failed: ${error.message}`)
  return paths
}

async function countRows(table: 'product_images' | 'freelancer_portfolio_items', column: string, id: string): Promise<number> {
  const { count, error } = await admin.from(table).select('id', { count: 'exact', head: true }).eq(column, id)
  if (error) throw new Error(`count failed: ${error.message}`)
  return count ?? 0
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

let ownerId: string
let shopId: string
let productA: string
let productB: string
let freelancerId: string
let profileId: string
let ownerClient: Client
let freelancerClient: Client

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  ownerId = await createUser('owner')
  freelancerId = await createUser('freelancer')

  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: ownerId, name: `Image Cap Shop ${RUN}`, description: 'x', city: 'Tunis' }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  shopId = shop.id
  const { data: products, error: prodErr } = await admin
    .from('products')
    .insert([
      { shop_id: shopId, title: `Image Cap A ${RUN}`, price_tnd: 10 },
      { shop_id: shopId, title: `Image Cap B ${RUN}`, price_tnd: 10 },
    ])
    .select('id')
  if (prodErr || !products || products.length !== 2) throw new Error(`product insert failed: ${prodErr?.message}`)
  ;[productA, productB] = [products[0].id, products[1].id]

  const { data: profile, error: profErr } = await admin.from('freelancer_profiles').insert({ profile_id: freelancerId }).select('id').single()
  if (profErr || !profile) throw new Error(`freelancer profile insert failed: ${profErr?.message}`)
  profileId = profile.id

  ownerClient = await signIn('owner')
  freelancerClient = await signIn('freelancer')
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 120000)

describe.skipIf(!hasCreds)('product_images — at most 8 per product', () => {
  it('8 images in one insert pass; the 9th is refused with 23514 + product_images_cap', async () => {
    const paths = await provenance('product-images', `${shopId}/${productA}`, ownerId, 9)
    const eight = paths.slice(0, 8).map((p, i) => ({ product_id: productA, image_url: publicUrl('product-images', p), display_order: i }))
    expect((await ownerClient.from('product_images').insert(eight)).error).toBeNull()
    expect(await countRows('product_images', 'product_id', productA)).toBe(8)

    const { error } = await ownerClient
      .from('product_images')
      .insert({ product_id: productA, image_url: publicUrl('product-images', paths[8]), display_order: 8 })
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('product_images_cap')
    expect(await countRows('product_images', 'product_id', productA)).toBe(8)
  })

  it('a single insert of 9 at once is refused whole — nothing is stored', async () => {
    const paths = await provenance('product-images', `${shopId}/${productB}`, ownerId, 9)
    const { error } = await ownerClient
      .from('product_images')
      .insert(paths.map((p, i) => ({ product_id: productB, image_url: publicUrl('product-images', p), display_order: i })))
    expect(error?.code).toBe('23514')
    expect(await countRows('product_images', 'product_id', productB)).toBe(0)
  })

  it("another product is not affected by the first one's count", async () => {
    const [p] = await provenance('product-images', `${shopId}/${productB}`, ownerId, 1)
    const { error } = await ownerClient.from('product_images').insert({ product_id: productB, image_url: publicUrl('product-images', p), display_order: 0 })
    expect(error).toBeNull()
    expect(await countRows('product_images', 'product_id', productB)).toBe(1)
  })

  it('the service role is not capped (seeds, admin tooling)', async () => {
    const [p] = await provenance('product-images', `${shopId}/${productA}`, ownerId, 1)
    const { error } = await admin.from('product_images').insert({ product_id: productA, image_url: publicUrl('product-images', p), display_order: 9 })
    expect(error).toBeNull()
    expect(await countRows('product_images', 'product_id', productA)).toBe(9)
  })
})

describe.skipIf(!hasCreds)('freelancer_portfolio_items — at most 6 per profile', () => {
  it('6 items pass; the 7th is refused with 23514 + portfolio_items_cap', async () => {
    const paths = await provenance('portfolio-media', freelancerId, freelancerId, 7)
    const six = paths.slice(0, 6).map((p, i) => ({
      freelancer_profile_id: profileId,
      image_url: publicUrl('portfolio-media', p),
      title: `Réalisation ${i + 1}`,
      display_order: i,
    }))
    expect((await freelancerClient.from('freelancer_portfolio_items').insert(six)).error).toBeNull()
    expect(await countRows('freelancer_portfolio_items', 'freelancer_profile_id', profileId)).toBe(6)

    const { error } = await freelancerClient.from('freelancer_portfolio_items').insert({
      freelancer_profile_id: profileId,
      image_url: publicUrl('portfolio-media', paths[6]),
      title: 'Réalisation 7',
      display_order: 6,
    })
    expect(error?.code).toBe('23514')
    expect(error?.hint).toBe('portfolio_items_cap')
    expect(await countRows('freelancer_portfolio_items', 'freelancer_profile_id', profileId)).toBe(6)
  })

  it('editing an item on the same profile is not counted (only a move to another profile is)', async () => {
    const { data, error } = await freelancerClient
      .from('freelancer_portfolio_items')
      .update({ title: 'Réalisation renommée' })
      .eq('freelancer_profile_id', profileId)
      .eq('display_order', 0)
      .select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

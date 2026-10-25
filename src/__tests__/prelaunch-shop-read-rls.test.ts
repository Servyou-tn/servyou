/**
 * Live-DB proof for db/migrations/20261025213214_prelaunch_shop_read_rls.sql — pre-launch security batch
 * PR-1, item A (architect decisions 3–6, 2026-10-25; discovery:
 * docs/design/prelaunch-security-batch-discovery.md §2).
 *
 * The SELECT policies that were `using (true)` now read:
 *   shops     — live (admin_hidden_at null), own, admin, or a buyer who ordered a product from the owner;
 *   products  — live (active, not moderated, shop not moderated), own, admin, or the buyer of an order;
 *   product_images / shop_payment_methods / shop_categories — readable exactly when their parent is;
 *   job_posts — the open branch also requires admin_hidden_at null; job_post_skills follow their post.
 *
 * Every negative read is paired with a service-role read proving the row exists in the state under
 * test, so an empty result is the policy working, not an empty fixture. Moderation goes through the
 * real admin_hide_content RPC; the owner pauses through their own session; the buyer's orders are
 * inserted through the buyer's own session while the item is live — the only way the buyer branch can
 * exist, since migration 54 refuses an order on a non-live item (asserted below).
 *
 * Fixtures (all `pl-read-`, password random per run: the repo is public and this suite promotes an
 * admin in production): eight users — the owners of shop S (live), shop H (moderated at setup) and
 * shop B (moderated AFTER the buyer orders from it), a shop owner with no shop yet (the create path's
 * RETURNING), the buyer, an unrelated signed-in outsider, a job poster and an admin. Product images
 * need a matching uploaded_objects row (enforce_product_image_provenance has no service-role bypass),
 * seeded by the service role; deleting the users cascades both away.
 *
 * Deliberately no global count: another suite or agent writing products in the same run would make
 * it flaky. Every read is scoped to this file's fixture ids.
 *
 * Pattern A (live-DB), mirroring h6-service-listings-hardening-rls.test.ts. Service role for
 * fixtures, ground truth and teardown only.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/prelaunch-shop-read-rls.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'

type Client = SupabaseClient<Database>
// The seven tables whose SELECT policies this migration owns.
type PolicyTable =
  | 'products'
  | 'product_images'
  | 'shops'
  | 'shop_payment_methods'
  | 'shop_categories'
  | 'job_posts'
  | 'job_post_skills'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'pl-read-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Pl-${randomUUID()}-Aa1!`
const TITLE = `Prelaunch read RLS ${RUN}`

// Migration 54's refusal of an order on a non-live item, pinned by text so another rejection can't
// pass for it.
const NOT_LIVE = "Cet article n'est plus disponible."

const noSession = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds
  ? createClient<Database>(url, serviceKey, noSession)
  : (undefined as unknown as Client)
const anon: Client = hasCreds
  ? createClient<Database>(url, anonKey, noSession)
  : (undefined as unknown as Client)

type Embed<T> = T | T[] | null

function one<T>(embed: Embed<T> | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

async function signIn(local: string): Promise<Client> {
  const client = createClient<Database>(url, anonKey, noSession)
  const { error } = await client.auth.signInWithPassword({ email: email(local), password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Prelaunch Read Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

async function makeShopOwner(profileId: string): Promise<void> {
  const { error } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', profileId)
  if (error) throw new Error(`seller upgrade failed: ${error.message}`)
}

// shops.name is unique case-insensitively (shops_name_lower_key); RUN keeps names unique across runs.
async function makeShop(ownerId: string, label: string): Promise<string> {
  await makeShopOwner(ownerId)
  const { data, error } = await admin
    .from('shops')
    .insert({ owner_id: ownerId, name: `${TITLE} — ${label}` })
    .select('id')
    .single()
  if (error || !data) throw new Error(`shop insert failed (${label}): ${error?.message}`)
  return data.id as string
}

async function makeProduct(shopId: string, label: string, status: 'active' | 'hidden'): Promise<string> {
  const { data, error } = await admin
    .from('products')
    .insert({ shop_id: shopId, title: `${TITLE} — ${label}`, price_tnd: 40, status })
    .select('id')
    .single()
  if (error || !data) throw new Error(`product insert failed (${label}): ${error?.message}`)
  return data.id as string
}

function publicUrl(path: string): string {
  return `${url}/storage/v1/object/public/product-images/${path}`
}

// enforce_product_image_provenance checks uploaded_objects for EVERY caller, the service role
// included, so the provenance row comes first. No storage object is written: the gate reads only the
// table, and uploaded_objects.owner_id cascades from auth.users.
async function seedUpload(ownerId: string, shopId: string): Promise<string> {
  const path = `${shopId}/${randomUUID()}.webp`
  const { error } = await admin.from('uploaded_objects').insert({ bucket: 'product-images', path, owner_id: ownerId })
  if (error) throw new Error(`uploaded_objects seed failed: ${error.message}`)
  return path
}

async function makeImage(ownerId: string, shopId: string, productId: string): Promise<string> {
  const path = await seedUpload(ownerId, shopId)
  const { data, error } = await admin
    .from('product_images')
    .insert({ product_id: productId, image_url: publicUrl(path), display_order: 0 })
    .select('id')
    .single()
  if (error || !data) throw new Error(`product_images insert failed: ${error?.message}`)
  return data.id as string
}

async function makeShopChildren(shopId: string, categoryId: string): Promise<{ method: string; category: string }> {
  const { data: m, error: mErr } = await admin
    .from('shop_payment_methods')
    .insert({ shop_id: shopId, method: 'cod' })
    .select('id')
    .single()
  if (mErr || !m) throw new Error(`shop_payment_methods insert failed: ${mErr?.message}`)
  const { data: c, error: cErr } = await admin
    .from('shop_categories')
    .insert({ shop_id: shopId, category_id: categoryId })
    .select('id')
    .single()
  if (cErr || !c) throw new Error(`shop_categories insert failed: ${cErr?.message}`)
  return { method: m.id as string, category: c.id as string }
}

async function makePost(consumerId: string, label: string, status: 'open' | 'filled'): Promise<{ post: string; skill: string }> {
  const { data: p, error: pErr } = await admin
    .from('job_posts')
    .insert({ consumer_id: consumerId, title: `${TITLE} — ${label}`, description: 'Test description', status })
    .select('id')
    .single()
  if (pErr || !p) throw new Error(`job_posts insert failed (${label}): ${pErr?.message}`)
  const { data: s, error: sErr } = await admin
    .from('job_post_skills')
    .insert({ job_post_id: p.id, skill: `${TITLE} ${label}` })
    .select('id')
    .single()
  if (sErr || !s) throw new Error(`job_post_skills insert failed (${label}): ${sErr?.message}`)
  return { post: p.id as string, skill: s.id as string }
}

async function makeFavorite(userId: string, productId: string): Promise<string> {
  const { data, error } = await admin
    .from('favorites')
    .insert({ user_id: userId, item_type: 'product', product_id: productId })
    .select('id')
    .single()
  if (error || !data) throw new Error(`favorites insert failed: ${error?.message}`)
  return data.id as string
}

async function hide(client: Client, target_type: 'product' | 'shop' | 'job_post', target_id: string): Promise<void> {
  const { error } = await client.rpc('admin_hide_content', { target_type, target_id, reason: `${TITLE} moderation` })
  if (error) throw new Error(`admin_hide_content(${target_type}) failed: ${error.message}`)
}

type OrderInsert = Database['public']['Tables']['orders']['Insert']

// The exact payload shape of demander/[id]/actions.ts — submitProductRequest. seller_id is NOT NULL,
// so the generated Insert type requires it, but the real payload never sends it:
// trg_enforce_order_insert_integrity (migration 54) derives it from the product. Hence the one cast.
function productOrder(buyer: string, productId: string): OrderInsert {
  const payload: Omit<OrderInsert, 'seller_id'> = {
    buyer_id: buyer,
    order_type: 'product',
    product_id: productId,
    service_listing_id: null,
    status: 'pending',
    delivery_name: 'Test Buyer',
    delivery_address: 'Rue test',
    delivery_phone: '+21620000001',
    quantity: 1,
    buyer_note: null,
  }
  return payload as OrderInsert
}

async function placeOrder(client: Client, buyer: string, productId: string): Promise<string> {
  const { data, error } = await client.from('orders').insert(productOrder(buyer, productId)).select('id').single()
  if (error || !data) throw new Error(`order insert failed: ${error?.message}`)
  return data.id as string
}

// The ids of `ids` that `client` can read from `table`, sorted. A read error fails the test: an empty
// list must mean "the policy filtered", never "the query broke" (a 42P17 would surface here).
async function readable(client: Client, table: PolicyTable, ids: string[]): Promise<string[]> {
  const { data, error } = await client.from(table).select('id').in('id', ids)
  expect(error).toBeNull()
  return ((data ?? []) as { id: string }[]).map((row) => row.id).sort()
}

const sorted = (...ids: string[]): string[] => [...ids].sort()

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// The order matters:
//   1. orders — enforce_order_identity_lock guards the orders.product_id SET NULL that a cascaded
//      product delete would cause;
//   2. admin_audit_log — admin_id is ON DELETE RESTRICT;
//   3. users — cascades profiles -> shops -> products -> product_images / shop_payment_methods /
//      shop_categories, profiles -> job_posts -> job_post_skills, favorites, and (via auth.users)
//      uploaded_objects.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id as string)
  if (ids.length === 0) return

  for (const column of ['seller_id', 'buyer_id']) {
    const { error: orderErr } = await admin.from('orders').delete().in(column, ids)
    if (orderErr) throw new Error(`orders cleanup (${column}) failed: ${orderErr.message}`)
  }
  const { error: auditErr } = await admin.from('admin_audit_log').delete().in('admin_id', ids)
  if (auditErr) throw new Error(`admin_audit_log cleanup failed: ${auditErr.message}`)
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let buyerId: string
let ownerNewId: string

let shopS: string
let shopH: string
let shopB: string

// S: L live; P ordered while live, then paused by its owner; P2 paused, never ordered; M moderated.
// H (moderated): X, itself active. B (moderated after the order): B1 ordered, B2 never ordered.
let productL: string
let productP: string
let productP2: string
let productM: string
let productX: string
let productB1: string
let productB2: string

let imageL: string
let imageP: string
let imageP2: string
let imageM: string
let imageX: string
let imageB1: string
let imageB2: string

let childrenS: { method: string; category: string }
let childrenH: { method: string; category: string }

let postOpen: { post: string; skill: string }
let postModerated: { post: string; skill: string }
let postFilled: { post: string; skill: string }

let orderP: string
let orderB1: string
let favoriteL: string
let favoriteP2: string
let pauseReturned: { id: string; status: string }[]

let adminClient: Client
let ownerSClient: Client
let ownerHClient: Client
let ownerNewClient: Client
let buyerClient: Client
let outsiderClient: Client
let posterClient: Client

const allProducts = () => [productL, productP, productP2, productM, productX, productB1, productB2]
const allImages = () => [imageL, imageP, imageP2, imageM, imageX, imageB1, imageB2]
const allShops = () => [shopS, shopH, shopB]
const allMethods = () => [childrenS.method, childrenH.method]
const allShopCategories = () => [childrenS.category, childrenH.category]
const allPosts = () => [postOpen.post, postModerated.post, postFilled.post]
const allSkills = () => [postOpen.skill, postModerated.skill, postFilled.skill]

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  const ownerSId = await createUser('owner-s')
  const ownerHId = await createUser('owner-h')
  const ownerBId = await createUser('owner-b')
  ownerNewId = await createUser('owner-new')
  buyerId = await createUser('buyer')
  const outsiderId = await createUser('outsider')
  const posterId = await createUser('poster')
  const adminId = await createUser('admin')

  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)
  await makeShopOwner(ownerNewId)

  // Read only — any existing category will do for shop_categories' FK.
  const { data: cats, error: catErr } = await admin.from('categories').select('id').order('slug').limit(1)
  if (catErr || !cats?.[0]) throw new Error(`categories lookup failed: ${catErr?.message}`)
  const categoryId = cats[0].id as string

  shopS = await makeShop(ownerSId, 'S live')
  shopH = await makeShop(ownerHId, 'H moderated')
  shopB = await makeShop(ownerBId, 'B moderated after the order')

  productL = await makeProduct(shopS, 'L live', 'active')
  productP = await makeProduct(shopS, 'P ordered then paused', 'active')
  productP2 = await makeProduct(shopS, 'P2 paused, never ordered', 'hidden')
  productM = await makeProduct(shopS, 'M moderated', 'active')
  productX = await makeProduct(shopH, 'X live in a moderated shop', 'active')
  productB1 = await makeProduct(shopB, 'B1 ordered', 'active')
  productB2 = await makeProduct(shopB, 'B2 never ordered', 'active')

  imageL = await makeImage(ownerSId, shopS, productL)
  imageP = await makeImage(ownerSId, shopS, productP)
  imageP2 = await makeImage(ownerSId, shopS, productP2)
  imageM = await makeImage(ownerSId, shopS, productM)
  imageX = await makeImage(ownerHId, shopH, productX)
  imageB1 = await makeImage(ownerBId, shopB, productB1)
  imageB2 = await makeImage(ownerBId, shopB, productB2)

  childrenS = await makeShopChildren(shopS, categoryId)
  childrenH = await makeShopChildren(shopH, categoryId)

  postOpen = await makePost(posterId, 'open', 'open')
  postModerated = await makePost(posterId, 'open then moderated', 'open')
  postFilled = await makePost(posterId, 'filled', 'filled')

  favoriteL = await makeFavorite(outsiderId, productL)
  favoriteP2 = await makeFavorite(outsiderId, productP2)

  adminClient = await signIn('admin')
  ownerSClient = await signIn('owner-s')
  ownerHClient = await signIn('owner-h')
  ownerNewClient = await signIn('owner-new')
  buyerClient = await signIn('buyer')
  outsiderClient = await signIn('outsider')
  posterClient = await signIn('poster')

  // The buyer orders while both items are live — the real path, and the only one migration 54 allows.
  orderP = await placeOrder(buyerClient, buyerId, productP)
  orderB1 = await placeOrder(buyerClient, buyerId, productB1)

  // The owner pauses P through their own session after the order; the RETURNING is asserted below.
  const { data: paused, error: pauseErr } = await ownerSClient
    .from('products')
    .update({ status: 'hidden' })
    .eq('id', productP)
    .select('id, status')
  if (pauseErr) throw new Error(`owner pause failed: ${pauseErr.message}`)
  pauseReturned = (paused ?? []) as { id: string; status: string }[]

  await hide(adminClient, 'product', productM)
  await hide(adminClient, 'shop', shopH)
  await hide(adminClient, 'shop', shopB)
  await hide(adminClient, 'job_post', postModerated.post)
}, 180000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  // Cleanup verified by a read, not assumed.
  const { count: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (pErr) throw new Error(`cleanup check (profiles) failed: ${pErr.message}`)
  if ((profiles ?? 0) !== 0) throw new Error(`teardown left ${profiles} ${PREFIX} profiles`)
  const { count: shops, error: sErr } = await admin
    .from('shops')
    .select('id', { count: 'exact', head: true })
    .like('name', `${TITLE}%`)
  if (sErr) throw new Error(`cleanup check (shops) failed: ${sErr.message}`)
  if ((shops ?? 0) !== 0) throw new Error(`teardown left ${shops} fixture shops`)
}, 120000)

type GroundProduct = {
  id: string
  status: string
  admin_hidden_at: string | null
  shops: Embed<{ admin_hidden_at: string | null }>
}

describe.skipIf(!hasCreds)('ground truth for every negative read below', () => {
  it('the products exist in exactly the states under test', async () => {
    const { data, error } = await admin
      .from('products')
      .select('id, status, admin_hidden_at, shops ( admin_hidden_at )')
      .in('id', allProducts())
    expect(error).toBeNull()
    const rows = new Map(((data ?? []) as unknown as GroundProduct[]).map((row) => [row.id, row]))
    expect(rows.size).toBe(7)
    expect(rows.get(productL)?.status).toBe('active')
    expect(one(rows.get(productL)?.shops)?.admin_hidden_at).toBeNull()
    expect(rows.get(productP)?.status).toBe('hidden') // paused by its owner after the order
    expect(rows.get(productP2)?.status).toBe('hidden')
    expect(rows.get(productM)?.status).toBe('hidden')
    expect(rows.get(productM)?.admin_hidden_at).not.toBeNull()
    for (const id of [productX, productB1, productB2]) {
      expect(rows.get(id)?.status).toBe('active') // the item itself is live …
      expect(one(rows.get(id)?.shops)?.admin_hidden_at).not.toBeNull() // … its shop is moderated
    }
  })

  it('every image, shop child, post and skill exists; the posts are open, open+moderated and filled', async () => {
    expect(await readable(admin, 'product_images', allImages())).toHaveLength(7)
    expect(await readable(admin, 'shop_payment_methods', allMethods())).toHaveLength(2)
    expect(await readable(admin, 'shop_categories', allShopCategories())).toHaveLength(2)
    expect(await readable(admin, 'job_post_skills', allSkills())).toHaveLength(3)
    const { data, error } = await admin.from('job_posts').select('id, status, admin_hidden_at').in('id', allPosts())
    expect(error).toBeNull()
    const posts = new Map(((data ?? []) as { id: string; status: string; admin_hidden_at: string | null }[]).map((row) => [row.id, row]))
    expect(posts.get(postOpen.post)).toMatchObject({ status: 'open', admin_hidden_at: null })
    expect(posts.get(postModerated.post)?.status).toBe('open')
    expect(posts.get(postModerated.post)?.admin_hidden_at).not.toBeNull()
    expect(posts.get(postFilled.post)?.status).toBe('filled')
  })

  it("the buyer's two orders exist, on P and on B1", async () => {
    const { data, error } = await admin.from('orders').select('id, buyer_id, product_id').in('id', [orderP, orderB1])
    expect(error).toBeNull()
    expect(data).toHaveLength(2)
    for (const row of (data ?? []) as { buyer_id: string; product_id: string }[]) {
      expect(row.buyer_id).toBe(buyerId)
      expect([productP, productB1]).toContain(row.product_id)
    }
  })
})

const publicViewers: Array<[string, () => Client]> = [
  ['anon', () => anon],
  ['an unrelated signed-in user', () => outsiderClient],
]

for (const [who, viewer] of publicViewers) {
  describe.skipIf(!hasCreds)(`public — ${who} reads live rows only`, () => {
    it('products: only L (not paused, not moderated, not in a moderated shop)', async () => {
      expect(await readable(viewer(), 'products', allProducts())).toEqual([productL])
    })

    it("product_images: only L's", async () => {
      expect(await readable(viewer(), 'product_images', allImages())).toEqual([imageL])
    })

    it('shops: only S', async () => {
      expect(await readable(viewer(), 'shops', allShops())).toEqual([shopS])
    })

    it("payment methods and shop categories: only S's", async () => {
      expect(await readable(viewer(), 'shop_payment_methods', allMethods())).toEqual([childrenS.method])
      expect(await readable(viewer(), 'shop_categories', allShopCategories())).toEqual([childrenS.category])
    })

    it('job posts and their skills: only the open, unmoderated post', async () => {
      expect(await readable(viewer(), 'job_posts', allPosts())).toEqual([postOpen.post])
      expect(await readable(viewer(), 'job_post_skills', allSkills())).toEqual([postOpen.skill])
    })
  })
}

describe.skipIf(!hasCreds)('owner — every own row, whatever its state', () => {
  it("S's owner reads all four of its products and their images, paused and moderated included", async () => {
    expect(await readable(ownerSClient, 'products', allProducts())).toEqual(sorted(productL, productP, productP2, productM))
    expect(await readable(ownerSClient, 'product_images', allImages())).toEqual(sorted(imageL, imageP, imageP2, imageM))
  })

  it("the moderated shop's owner still reads it, its product, image and children", async () => {
    expect(await readable(ownerHClient, 'shops', allShops())).toEqual(sorted(shopS, shopH))
    expect(await readable(ownerHClient, 'products', allProducts())).toEqual(sorted(productL, productX))
    expect(await readable(ownerHClient, 'product_images', allImages())).toEqual(sorted(imageL, imageX))
    expect(await readable(ownerHClient, 'shop_payment_methods', allMethods())).toEqual(sorted(childrenS.method, childrenH.method))
    expect(await readable(ownerHClient, 'shop_categories', allShopCategories())).toEqual(sorted(childrenS.category, childrenH.category))
  })

  it("pausing through the owner's own session returns the row (UPDATE … RETURNING)", () => {
    expect(pauseReturned).toEqual([{ id: productP, status: 'hidden' }])
  })

  it('the create path keeps every RETURNING: shop, a paused product, its image, then the delete', async () => {
    const { data: shop, error: shopErr } = await ownerNewClient
      .from('shops')
      .insert({ owner_id: ownerNewId, name: `${TITLE} — created by its owner` })
      .select('id')
      .single()
    expect(shopErr).toBeNull()
    if (!shop) throw new Error('shop insert returned no row')

    const { data: product, error: productErr } = await ownerNewClient
      .from('products')
      .insert({ shop_id: shop.id, title: `${TITLE} — created paused`, price_tnd: 25, status: 'hidden' })
      .select('id, status')
      .single()
    expect(productErr).toBeNull()
    expect(product?.status).toBe('hidden')
    if (!product) throw new Error('product insert returned no row')

    // The image's RETURNING goes through the delegated policy: readable because its product is.
    const path = await seedUpload(ownerNewId, shop.id as string)
    const { data: image, error: imageErr } = await ownerNewClient
      .from('product_images')
      .insert({ product_id: product.id, image_url: publicUrl(path), display_order: 0 })
      .select('id')
      .single()
    expect(imageErr).toBeNull()
    expect(image?.id).toBeTruthy()

    const { data: deleted, error: deleteErr } = await ownerNewClient.from('products').delete().eq('id', product.id).select('id')
    expect(deleteErr).toBeNull()
    expect(deleted).toEqual([{ id: product.id }])
  })
})

describe.skipIf(!hasCreds)('admin — everything', () => {
  it('reads every fixture row in every table', async () => {
    expect(await readable(adminClient, 'products', allProducts())).toEqual(sorted(...allProducts()))
    expect(await readable(adminClient, 'product_images', allImages())).toEqual(sorted(...allImages()))
    expect(await readable(adminClient, 'shops', allShops())).toEqual(sorted(...allShops()))
    expect(await readable(adminClient, 'shop_payment_methods', allMethods())).toEqual(sorted(...allMethods()))
    expect(await readable(adminClient, 'shop_categories', allShopCategories())).toEqual(sorted(...allShopCategories()))
    expect(await readable(adminClient, 'job_posts', allPosts())).toEqual(sorted(...allPosts()))
    expect(await readable(adminClient, 'job_post_skills', allSkills())).toEqual(sorted(...allSkills()))
  })
})

type OrderEmbedRow = {
  id: string
  products: Embed<{
    id: string
    title: string
    shop_id: string
    shops: Embed<{ id: string; name: string | null }>
    product_images: { image_url: string; display_order: number }[] | null
  }>
}

// The products branch of lib/marche/order-detail.ts's select, verbatim.
const ORDER_DETAIL_EMBED = `id,
  products ( id, title, price_tnd, shop_id,
             categories ( name_fr ),
             shops ( id, name, city, logo_url ),
             product_images ( image_url, display_order ) )`

describe.skipIf(!hasCreds)('buyer — keeps what they ordered, nothing more', () => {
  it('products: the live one plus its two orders (P paused, B1 in a moderated shop) — not P2, M, X, B2', async () => {
    expect(await readable(buyerClient, 'products', allProducts())).toEqual(sorted(productL, productP, productB1))
    expect(await readable(buyerClient, 'product_images', allImages())).toEqual(sorted(imageL, imageP, imageB1))
  })

  it('shops: the moderated shop it bought from, not the other moderated shop', async () => {
    expect(await readable(buyerClient, 'shops', allShops())).toEqual(sorted(shopS, shopB))
  })

  it('the order-detail embed keeps the title, the shop and the image on both orders', async () => {
    const { data, error } = await buyerClient.from('orders').select(ORDER_DETAIL_EMBED).in('id', [orderP, orderB1])
    expect(error).toBeNull()
    const rows = new Map(((data ?? []) as unknown as OrderEmbedRow[]).map((row) => [row.id, one(row.products)]))
    expect(rows.size).toBe(2)
    const cases: Array<[order: string, product: string, shop: string]> = [
      [orderP, productP, shopS],
      [orderB1, productB1, shopB],
    ]
    for (const [orderId, productId, shopId] of cases) {
      const product = rows.get(orderId)
      expect(product?.id).toBe(productId)
      expect(product?.title).toContain(TITLE)
      expect(one(product?.shops)?.id).toBe(shopId)
      expect(product?.product_images).toHaveLength(1)
    }
  })

  it('cannot mint the branch: an order on a non-live product is refused, and the product stays unreadable', async () => {
    const { error } = await buyerClient.from('orders').insert(productOrder(buyerId, productP2))
    expect(error?.message).toBe(NOT_LIVE)
    const { count, error: countErr } = await admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productP2)
    expect(countErr).toBeNull()
    expect(count).toBe(0)
    expect(await readable(buyerClient, 'products', [productP2])).toEqual([])
  })
})

type FavoriteRow = { id: string; products: Embed<{ id: string }> }

describe.skipIf(!hasCreds)('favorites — what /mes-favoris receives', () => {
  it('the live favourite embeds its product; the paused one embeds null (my-data.ts drops it)', async () => {
    const { data, error } = await outsiderClient.from('favorites').select('id, products ( id )').in('id', [favoriteL, favoriteP2])
    expect(error).toBeNull()
    const byId = new Map(((data ?? []) as unknown as FavoriteRow[]).map((row) => [row.id, one(row.products)]))
    expect(byId.size).toBe(2)
    expect(byId.get(favoriteL)?.id).toBe(productL)
    expect(byId.get(favoriteP2)).toBeNull()
  })
})

describe.skipIf(!hasCreds)('job posts — the poster keeps every own post', () => {
  it('reads all three own posts and their skills, moderated and filled included', async () => {
    expect(await readable(posterClient, 'job_posts', allPosts())).toEqual(sorted(...allPosts()))
    expect(await readable(posterClient, 'job_post_skills', allSkills())).toEqual(sorted(...allSkills()))
  })
})

const embedViewers: Array<[string, () => Client]> = [
  ['anon', () => anon],
  ['outsider', () => outsiderClient],
  ['buyer', () => buyerClient],
  ['owner', () => ownerSClient],
  ['admin', () => adminClient],
]

describe.skipIf(!hasCreds)('the policy graph is acyclic — nested embeds through every new policy return no error', () => {
  for (const [who, viewer] of embedViewers) {
    it(`${who}: product_images → products → shops, shop children → shops, skills → posts`, async () => {
      const images = await viewer().from('product_images').select('id, products ( id, shops ( id ) )').in('id', allImages())
      expect(images.error).toBeNull()
      const methods = await viewer().from('shop_payment_methods').select('id, shops ( id )').in('id', allMethods())
      expect(methods.error).toBeNull()
      const categories = await viewer().from('shop_categories').select('id, shops ( id )').in('id', allShopCategories())
      expect(categories.error).toBeNull()
      const skills = await viewer().from('job_post_skills').select('id, job_posts ( id )').in('id', allSkills())
      expect(skills.error).toBeNull()
    })
  }
})

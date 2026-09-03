/**
 * Live-DB proof for the storage-provenance gate
 * (db/migrations/20260903143928_uploaded_objects_provenance_gate.sql).
 *
 * The gap this closes: `createProductAction` / `addProductImageAction` (src/app/actions/
 * products.ts) only check that a caller-supplied image path starts with `{shopId}/{productId}/` —
 * both segments are server-derived, so that stops attaching another shop's or product's object,
 * but NOT an object the caller PUT directly into storage under their OWN permitted prefix, entirely
 * bypassing `normalizeProductImage`'s decode/re-encode gate. `uploaded_objects` + the
 * `enforce_product_image_provenance` trigger on `product_images` is the fix; this file proves the
 * fix holds against the real database, not just against a mocked query builder (that layer is
 * already covered by create-product-action.test.ts).
 *
 * Pattern A (live-DB), mirroring freelancer-publish-gate-rls.test.ts / shop-config-rls.test.ts.
 * Service role for fixtures, teardown, and simulating recordUploadProvenance's own write shape.
 *
 * Run: npx vitest run src/__tests__/uploaded-objects-provenance-rls.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'prov-'
const ATTACKER_EMAIL = `${EMAIL_PREFIX}attacker${EMAIL_SUFFIX}`
const PASSWORD = 'Rls-Provenance-Test-7k2!' // ephemeral test users only; never a real account

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
    user_metadata: { full_name: 'Provenance Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
  return data.user.id
}

// Every path this file PUTs directly into real storage (the attack simulations), so teardown can
// remove them precisely — storage.objects has no FK/cascade tying it to auth.users, so deleting the
// test user does NOT clean these up on its own.
const uploadedTestPaths: string[] = []

// Idempotent, surgical to this file's prefix. Deleting the user cascades profiles -> shops ->
// products -> product_images (ON DELETE CASCADE), and uploaded_objects.owner_id -> auth.users is
// also ON DELETE CASCADE, so provenance rows attributed to a torn-down test user go with it.
async function teardown(): Promise<void> {
  if (uploadedTestPaths.length > 0) {
    await admin.storage.from('product-images').remove(uploadedTestPaths.splice(0))
  }
  const { data, error } = await admin
    .from('profiles').select('id').like('email', `${EMAIL_PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

let attackerId: string
let attackerShopId: string | undefined
let attackerProductId: string
let attackerClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown() // teardown-first: recover from any crashed prior run

  attackerId = await createUser(ATTACKER_EMAIL)

  const { data: shop, error: shopErr } = await admin
    .from('shops')
    .insert({ owner_id: attackerId, name: `Provenance Test Shop ${randomUUID().slice(0, 8)}`, description: 'x', city: 'Tunis' })
    .select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  attackerShopId = shop.id

  const { data: product, error: productErr } = await admin
    .from('products')
    .insert({ shop_id: attackerShopId, title: 'Provenance Test Product', price_tnd: 10 })
    .select('id').single()
  if (productErr || !product) throw new Error(`product insert failed: ${productErr?.message}`)
  attackerProductId = product.id

  attackerClient = await signIn(ATTACKER_EMAIL)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

function publicUrl(bucket: string, path: string): string {
  return `${url}/storage/v1/object/public/${bucket}/${path}`
}

// Not real WebP bytes — deliberately. The bucket's `allowed_mime_types` only checks the
// CLIENT-DECLARED Content-Type header (see the upload calls below), never the actual bytes, so
// sending non-image data under a forged `image/webp` header is the realistic attack shape, not a
// shortcut around the bucket config. The provenance gate itself never inspects the bytes either —
// only `uploaded_objects` — so a real PUT through the authenticated client's own storage RLS is
// what makes this a faithful simulation of "direct-PUT bypassing normalizeProductImage".
const RAW_BYTES = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])

describe.skipIf(!hasCreds)('the demonstrated attack: direct-PUT then reference, both call sites', () => {
  it('REJECTS via the addProductImageAction shape (single-row insert)', async () => {
    const path = `${attackerShopId}/${attackerProductId}/${randomUUID()}.webp`

    // Step 1: authenticated attacker direct-PUTs into their OWN permitted prefix. This must
    // succeed — the storage RLS policy legitimately allows it; that grant is what the app's real
    // upload action also relies on. The point is that raw bytes never touched normalizeProductImage.
    const { error: putError } = await attackerClient.storage.from('product-images').upload(path, RAW_BYTES, {
      contentType: 'image/webp', // client-declared, trivially forged -- the real attack shape (see normalize.ts's own header comment)
    })
    expect(putError).toBeNull()
    uploadedTestPaths.push(path)

    // Step 2: the attacker references that path exactly the way addProductImageAction does —
    // a single-row insert with product_id + image_url + display_order.
    const { error: insertError } = await attackerClient
      .from('product_images')
      .insert({ product_id: attackerProductId, image_url: publicUrl('product-images', path), display_order: 0 })

    expect(insertError).not.toBeNull()
    expect(insertError!.message).toContain('provenance check failed')
  })

  it('REJECTS via the createProductAction shape (multi-row insert, one tainted row)', async () => {
    const legitPath = `${attackerShopId}/${attackerProductId}/${randomUUID()}.webp`
    const attackPath = `${attackerShopId}/${attackerProductId}/${randomUUID()}.webp`

    // A validated row for the first image (mirrors what uploadProductImageAction would have
    // already committed) ...
    const { error: provErr } = await admin
      .from('uploaded_objects')
      .insert({ bucket: 'product-images', path: legitPath, owner_id: attackerId })
    expect(provErr).toBeNull()

    // ... but the second image is a direct-PUT the attacker never ran through the pipeline.
    const { error: putError } = await attackerClient.storage.from('product-images').upload(attackPath, RAW_BYTES, {
      contentType: 'image/webp', // client-declared, trivially forged -- the real attack shape (see normalize.ts's own header comment)
    })
    expect(putError).toBeNull()
    uploadedTestPaths.push(attackPath)

    // createProductAction inserts every row from `imagePaths` in ONE multi-row statement.
    // Postgres fires the BEFORE INSERT trigger per row, so one tainted row must fail the whole
    // statement — proving the trigger holds under a batch insert, not just a single-row one.
    const { error: insertError } = await attackerClient.from('product_images').insert([
      { product_id: attackerProductId, image_url: publicUrl('product-images', legitPath), display_order: 0 },
      { product_id: attackerProductId, image_url: publicUrl('product-images', attackPath), display_order: 1 },
    ])

    expect(insertError).not.toBeNull()
    expect(insertError!.message).toContain('provenance check failed')

    // And because the statement failed atomically, NEITHER row landed — not even the legit one.
    const { data: rows, error: readErr } = await admin
      .from('product_images').select('id').eq('product_id', attackerProductId)
    expect(readErr).toBeNull()
    expect(rows).toEqual([])
  })
})

describe.skipIf(!hasCreds)('normal flow — a real upload still succeeds', () => {
  it('a path WITH a matching uploaded_objects row is accepted', async () => {
    const path = `${attackerShopId}/${attackerProductId}/${randomUUID()}.webp`

    const { error: provErr } = await admin
      .from('uploaded_objects')
      .insert({ bucket: 'product-images', path, owner_id: attackerId })
    expect(provErr).toBeNull()

    const { data, error } = await attackerClient
      .from('product_images')
      .insert({ product_id: attackerProductId, image_url: publicUrl('product-images', path), display_order: 0 })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()

    if (data) await admin.from('product_images').delete().eq('id', data.id)
  })
})

describe.skipIf(!hasCreds)('uploaded_objects RLS — the theater check', () => {
  it('authenticated CANNOT insert a provenance row directly via PostgREST', async () => {
    const { error } = await attackerClient
      .from('uploaded_objects')
      .insert({ bucket: 'product-images', path: `${attackerShopId}/forged/${randomUUID()}.webp`, owner_id: attackerId })
    expect(error).not.toBeNull()
  })

  it('anon CANNOT insert a provenance row directly via PostgREST', async () => {
    const { error } = await anon
      .from('uploaded_objects')
      .insert({ bucket: 'product-images', path: `anything/${randomUUID()}.webp`, owner_id: attackerId })
    expect(error).not.toBeNull()
  })

  it('authenticated CANNOT select from uploaded_objects, even their own rows', async () => {
    const path = `${attackerShopId}/${attackerProductId}/${randomUUID()}.webp`
    const { error: provErr } = await admin
      .from('uploaded_objects').insert({ bucket: 'product-images', path, owner_id: attackerId })
    expect(provErr).toBeNull()

    const { data, error } = await attackerClient.from('uploaded_objects').select('id').eq('path', path)
    // No SELECT grant at all (not just an RLS-empty result) -- PostgREST returns an error, not [].
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })

  it('anon CANNOT select from uploaded_objects', async () => {
    const { error, data } = await anon.from('uploaded_objects').select('id').limit(1)
    expect(error).not.toBeNull()
    expect(data).toBeNull()
  })
})

describe.skipIf(!hasCreds)('backfilled rows satisfy the trigger identically to a fresh upload', () => {
  it('the migration backfilled exactly the 37 rows verified live before this PR (33 product_images + 2 avatars + 2 shop-assets)', async () => {
    // `backfilled = true` is set ONLY by this migration's one-time DO block — nothing else in the
    // app ever sets it, so unlike the migration's own dynamically-recomputed assertion (which had
    // to tolerate a live-changing database at APPLY time), this count is now a fixed historical
    // fact and hardcoding it here is the correct, stable assertion, not a brittle one. This file's
    // own fixtures are never backfilled=true (they take the column default, false), so they cannot
    // inflate this count.
    const { count, error } = await admin
      .from('uploaded_objects').select('id', { count: 'exact', head: true }).eq('backfilled', true)
    expect(error).toBeNull()
    expect(count).toBe(37)
  })

  it('a synthetic pre-migration-shaped row (backfilled=true, historical created_at) satisfies the trigger the same as a fresh one', async () => {
    const path = `${attackerShopId}/${attackerProductId}/${randomUUID()}.webp`

    const { error: provErr } = await admin.from('uploaded_objects').insert({
      bucket: 'product-images',
      path,
      owner_id: attackerId,
      created_at: '2026-01-01T00:00:00Z',
      backfilled: true,
    })
    expect(provErr).toBeNull()

    const { data, error } = await attackerClient
      .from('product_images')
      .insert({ product_id: attackerProductId, image_url: publicUrl('product-images', path), display_order: 0 })
      .select('id')
      .single()

    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()

    if (data) await admin.from('product_images').delete().eq('id', data.id)
  })
})

describe.skipIf(!hasCreds)('the trigger applies even to service_role — no bypass exists', () => {
  it('a service-role direct insert into product_images with NO provenance still raises', async () => {
    // Documented for whoever writes the next fixture: unlike some triggers in this schema
    // (enforce_profile_admin_marker_lock, whose bypass cascade explicitly allows `auth.uid() IS
    // NULL` for service_role/SQL-editor writes), enforce_product_image_provenance has NO such
    // bypass. It is a data-integrity gate, not an authorization gate, so it holds for every
    // caller including service_role. A fixture that seeds product_images directly via the admin
    // client for an UNRELATED test MUST also seed a matching uploaded_objects row first, or the
    // seed insert itself will fail here exactly as it does in this test.
    const path = `${attackerShopId}/${attackerProductId}/${randomUUID()}.webp`

    const { error } = await admin
      .from('product_images')
      .insert({ product_id: attackerProductId, image_url: publicUrl('product-images', path), display_order: 0 })

    expect(error).not.toBeNull()
    expect(error!.message).toContain('provenance check failed')
  })
})

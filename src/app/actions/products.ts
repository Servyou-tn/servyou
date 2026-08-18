'use server'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { resolveOwnedShopId } from '@/lib/shops/owner-shop'
import { isPathWithinProduct, nextDisplayOrder } from '@/lib/products/gallery'
import { PRODUCTS_PER_PAGE } from '@/lib/marche/seller-products'
import {
  MAX_PRODUCT_IMAGES,
  type ProductActionResult,
  type UploadImageResult,
  type BulkProductActionResult,
  type AddProductImageResult,
  type UpdateProductResult,
} from '@/lib/products/constants'
import {
  normalizeProductImage,
  MAX_INPUT_BYTES,
  MAX_INPUT_MB,
  type NormalizeFailure,
} from '@/lib/images/normalize'

// G6 « Ajouter un produit » — the FIRST write path to `products` anywhere in the app. The seller
// product surface was stripped in PR #83 and nothing has written this table since.
//
// Full reasoning, decided before the code: docs/design/g6-write-path.md
//
// Same three-layer posture as `advanceOrderAction` (src/app/actions/orders.ts:51), which is the
// named pattern for every G-zone write:
//   1. Zod parses the input before anything touches the database.
//   2. The action re-derives auth + ownership server-side, never taking either from the caller.
//   3. RLS enforces it again in Postgres — `products` INSERT is gated on
//      `exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid())`.
//
// ⚑ TWO ACTIONS, NOT ONE, AND THAT IS ARCHITECTURAL. Vercel caps a whole function request payload
// at 4.5 MB (413 FUNCTION_PAYLOAD_TOO_LARGE, unraisable by any bodySizeLimit). The gallery accepts
// up to 8 images and two phone photos already exceed the cap, so 8 files in one FormData CANNOT
// fit. Images upload one per call, before the product row exists; submit carries only their paths.
// Do not "simplify" these into a single submit.

const PRODUCT_BUCKET = 'product-images'

// One year, matching next.config.ts's minimumCacheTTL. Safe only because a path is never
// overwritten — every upload gets a fresh uuid, and the storage policies grant INSERT/DELETE with
// no UPDATE, which enforces that structurally. See mon-compte/actions.ts:64.
const PRODUCT_CACHE_CONTROL = '31536000'

// ⚑ MAX_PRODUCT_IMAGES and the result types live in @/lib/products/constants, NOT here. A
// 'use server' module may export only async functions; a single `export const` beside them makes
// Next.js resolve this module with NO exports at all, and the build then reports the ACTION as
// missing — pointing at the importer rather than the cause.

const FAILURE_KEY: Record<NormalizeFailure, string> = {
  unsupported_heic: 'product.image.error.heic',
  not_an_image: 'product.image.error.notImage',
  decode_failed: 'product.image.error.decode',
  too_large: 'product.image.error.tooLarge',
}

// Zod validates the SHAPE that crossed the boundary, and is deliberately NOT the content gate: a
// File's `type` is client-declared and trivially forged. `normalizeProductImage`'s full decode and
// re-encode is what establishes the bytes are an image — arbitrary bytes cannot survive it, and a
// re-encoded output cannot carry a payload smuggled in the input container.
const productImageFileSchema = z
  .instanceof(File, { message: 'no_file' })
  .refine((f) => f.size > 0, 'no_file')
  .refine((f) => f.size <= MAX_INPUT_BYTES, 'too_large')

/**
 * Upload ONE product image. Called up to `MAX_PRODUCT_IMAGES` times before the product row exists.
 *
 * The object lands at `{shopId}/{productId}/{uuid}.webp`. That path needs no database row — only
 * the `product_images` FK does — which is exactly what lets the uploads precede the product and is
 * why the product uuid is generated server-side up front.
 *
 * A failure here leaves NO product row, so nothing is half-created from a buyer's point of view.
 * The residue is orphaned objects under a productId that may never exist, which is what the
 * reconciliation sweep in image-storage-discovery.md §6c is for. This PR is that sweep's trigger;
 * building it here would widen a form PR into a storage-maintenance PR.
 */
// ⚑ EVERY EARLY RETURN LOGS ITS REASON. Five of the six failure paths here used to return a
// translated string and log NOTHING, so a failing upload produced a generic tile message and a
// SILENT server. The G6 upload failure of 2026-08-07 therefore needed a dev-server restart to
// diagnose, because the record could not say which branch had fired — the storage error was the
// only one that left a trace, and it was the one that had not happened.
//
// A caller-facing string is not a diagnostic. It is deliberately vague (it crosses a trust
// boundary) and it is translated, so it cannot carry a reason code. The log line is where the
// reason belongs. Do not remove these to "reduce noise": they only run on a failed upload.
export async function uploadProductImageAction(formData: FormData): Promise<UploadImageResult> {
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[uploadProductImage] rejected: no authenticated user')
    return { ok: false, error: t('product.error.notAuth', lang) }
  }

  const rawProductId = formData.get('productId')
  const productId = z.string().uuid().safeParse(rawProductId)
  if (!productId.success) {
    // ⚑ THE RECEIVED VALUE IS LOGGED, not just "invalid uuid". The failure that actually happened
    // was a client sending the literal string "undefined" — a stale bundle reading a prop that had
    // been renamed. The value names that in one line; a reason code alone would not have.
    console.error(
      `[uploadProductImage] rejected: productId is not a uuid — received ${JSON.stringify(rawProductId)} from user ${user.id}`,
    )
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const rawFile = formData.get('image')
  const parsed = productImageFileSchema.safeParse(rawFile)
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message
    // Name/size/type, because "which file failed?" is the first question asked and the answer was
    // previously unrecoverable — nothing reaches storage on this path, so there is no object to
    // inspect afterwards.
    console.error(
      `[uploadProductImage] rejected: file failed schema (${code}) — ` +
        (rawFile instanceof File
          ? `name=${rawFile.name} size=${rawFile.size} type=${rawFile.type}`
          : `not a File (${typeof rawFile})`) +
        ` for user ${user.id}`,
    )
    return {
      ok: false,
      error: t(
        code === 'too_large' ? 'product.image.error.tooLarge' : 'product.image.error.notImage',
        lang,
        { max: MAX_INPUT_MB },
      ),
    }
  }

  // Ownership BEFORE the (expensive) decode: resolving the shop is one indexed lookup, normalizing
  // a 4 MB photo is not. A caller with no shop should not be able to spend our CPU.
  const shop = await resolveOwnedShopId(supabase, user.id)
  if (!shop.ok) {
    console.error(`[uploadProductImage] rejected: shop unresolved (${shop.reason}) for user ${user.id}`)
    return {
      ok: false,
      error: t(shop.reason === 'no_shop' ? 'product.error.noShop' : 'common.error_generic', lang),
    }
  }

  const normalized = await normalizeProductImage(Buffer.from(await parsed.data.arrayBuffer()))
  if (!normalized.ok) {
    // `reason` distinguishes HEIC from a non-image from a decode failure — the three are one
    // generic-looking tile to the seller but three different answers to "is this our bug?".
    console.error(
      `[uploadProductImage] rejected: normalize failed (${normalized.reason}) — ` +
        `name=${parsed.data.name} size=${parsed.data.size} type=${parsed.data.type} for user ${user.id}`,
    )
    return { ok: false, error: t(FAILURE_KEY[normalized.reason], lang, { max: MAX_INPUT_MB }) }
  }

  // First segment MUST be the shop id — the storage policy gates on exactly that
  // (`(storage.foldername(objects.name))[1] in (select id::text from shops where owner_id = auth.uid())`,
  // migration 20260804104541). Both segments are server-derived; neither comes from the caller.
  const path = `${shop.shopId}/${productId.data}/${randomUUID()}.webp`

  const { error: uploadError } = await supabase.storage.from(PRODUCT_BUCKET).upload(path, normalized.blob, {
    contentType: 'image/webp',
    cacheControl: PRODUCT_CACHE_CONTROL,
    upsert: false,
  })
  if (uploadError) {
    console.error('[uploadProductImage] storage upload failed:', uploadError.message)
    return { ok: false, error: t('product.image.error.upload', lang) }
  }

  // ⚑ READ THE STORED SIZE BACK AND COMPARE. A successful upload() proves the request was accepted,
  // NOT that the bytes survived — storage-js silently stringified Buffers through UTF-8, so five
  // images landed ~1.8x inflated and undecodable while every call here returned ok. The whole class
  // of body-encoding faults changes the object's LENGTH, so one integer comparison catches it at
  // write time instead of letting it surface to a buyer three screens away.
  //
  // This runs on the seller's own client, so it is also an RLS assertion: the SELECT policy
  // ("product-images: shop owner reads own") gates on the first path segment being one of their
  // shops, which is the same segment the INSERT policy gated on.
  const { data: stored, error: infoError } = await supabase.storage.from(PRODUCT_BUCKET).info(path)
  if (infoError || !stored || stored.size !== normalized.blob.size) {
    // The object is uploaded but no product_images row will reference it, so it is an orphan for
    // the reconciliation sweep (image-storage-discovery.md §6c) — the same residue class this
    // action's header already documents. It is deliberately NOT deleted here: a corrupt object we
    // can still inspect is worth more than a silent removal, and .remove() fails open.
    console.error(
      `[uploadProductImage] INTEGRITY CHECK FAILED — sent ${normalized.blob.size} bytes, ` +
        `stored ${stored?.size ?? 'unknown'} at ${path}` +
        (infoError ? ` (info error: ${infoError.message})` : ''),
    )
    return { ok: false, error: t('product.image.error.upload', lang) }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path)

  return { ok: true, path, url: publicUrl }
}

// Numeric bounds mirror the live CHECK constraints (`price_tnd >= 0`, `delivery_fee_tnd >= 0`,
// `stock_count >= 0`) so a clear message beats a raised constraint — the same reasoning as
// setOrderTrackingAction:153. multipleOf(0.01) matches numeric(10,2): a price of 12.345 would
// otherwise be silently rounded by Postgres rather than rejected here.
const CreateProductInput = z
  .object({
    productId: z.string().uuid(),
    title: z.string().trim().min(1).max(100),
    categoryId: z.string().uuid(),
    description: z.string().trim().max(2000).optional(),
    priceTnd: z.number().nonnegative().multipleOf(0.01),
    deliveryFeeTnd: z.number().nonnegative().multipleOf(0.01),
    tracksStock: z.boolean(),
    stockCount: z.number().int().nonnegative().optional(),
    imagePaths: z.array(z.string()).max(MAX_PRODUCT_IMAGES),
    publish: z.boolean(),
  })
  // The ≥1-image publish gate, enforced server-side rather than trusted from the client.
  //
  // ⚑ CONDITIONAL ON `publish`, NOT UNCONDITIONAL. « Enregistrer le brouillon » is deliberately
  // UNGATED — an ungated save is the whole reason the two-CTA footer exists, and a seller must be
  // able to save a half-finished product before they have a photo. An unconditional min(1) would
  // make the draft CTA impossible. See docs/design/g6-write-path.md §6.
  .superRefine((v, ctx) => {
    if (v.publish && v.imagePaths.length < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['imagePaths'], message: 'image_required' })
    }
  })

/**
 * Create the product and its gallery rows.
 *
 * ⚑ ON FAILURE OF THE IMAGE INSERT, THE PRODUCT ROW IS DELETED. See the compensation note at that
 * call site — the property being protected is that a buyer never sees a product with a partial
 * gallery, and both `products` and `product_images` are publicly SELECTable, so a half-written
 * product is visible immediately.
 */
export async function createProductAction(input: unknown): Promise<ProductActionResult> {
  const lang = await getLang()
  const parsed = CreateProductInput.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    // Every issue, not just the first — a form that fails validation usually fails it in more than
    // one place, and the seller sees one generic sentence for all of them. Paths only; the VALUES
    // are not logged, because this input carries the whole product description.
    console.error(
      `[createProduct] rejected: input failed validation — ` +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    if (issue?.message === 'image_required') {
      return { ok: false, error: t('product.error.image_required', lang) }
    }
    return { ok: false, error: t('product.error_add', lang) }
  }
  const p = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[createProduct] rejected: no authenticated user')
    return { ok: false, error: t('product.error.notAuth', lang) }
  }

  // Ownership is `products.shop_id -> shops.owner_id`; `products` has no owner_id of its own. The
  // shop is resolved from the SESSION and never accepted as an argument — a `shopId` parameter
  // would let a caller aim this write at someone else's shop. RLS would reject it, but the check
  // belongs before the round trip.
  const shop = await resolveOwnedShopId(supabase, user.id)
  if (!shop.ok) {
    console.error(`[createProduct] rejected: shop unresolved (${shop.reason}) for user ${user.id}`)
    return {
      ok: false,
      error: t(shop.reason === 'no_shop' ? 'product.error.noShop' : 'common.error_generic', lang),
    }
  }

  // ⚑ THE SECURITY-RELEVANT CHECK. `imagePaths` is caller-supplied. Both segments of the required
  // prefix are server-derived (shopId from the session above, productId Zod-validated), so this is
  // what stops a caller attaching another shop's objects — or another product's — to their row.
  // The storage policy independently gated the UPLOAD; only this gates what reaches image_url.
  const prefix = `${shop.shopId}/${p.productId}/`
  if (!p.imagePaths.every((path) => path.startsWith(prefix))) {
    console.error(
      `[createProduct] rejected image paths outside ${prefix} for user ${user.id} — possible tampering`,
    )
    return { ok: false, error: t('product.error_add', lang) }
  }

  const { error: insertError } = await supabase.from('products').insert({
    id: p.productId,
    shop_id: shop.shopId,
    title: p.title,
    category_id: p.categoryId,
    description: p.description && p.description.length > 0 ? p.description : null,
    price_tnd: p.priceTnd,
    delivery_fee_tnd: p.deliveryFeeTnd,
    tracks_stock: p.tracksStock,
    // NULL when the toggle is off, so "Toujours disponible" is a real state and not a stale count.
    stock_count: p.tracksStock ? (p.stockCount ?? 0) : null,
    // `products.status` has no 'draft' value — CHECK is active|hidden|sold_out. Brouillon maps to
    // 'hidden' (g6-discovery.md §8, founder call: option B, no migration this cycle). It is not the
    // same thing as a deliberately withdrawn product and will read as "Masqué" in G5; logged.
    status: p.publish ? 'active' : 'hidden',
  })

  if (insertError) {
    console.error('[createProduct] insert failed:', insertError.message, insertError.code, insertError.details)
    return { ok: false, error: t('product.error_add', lang) }
  }

  if (p.imagePaths.length > 0) {
    const rows = p.imagePaths.map((path, i) => ({
      product_id: p.productId,
      image_url: supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path).data.publicUrl,
      // Insert order IS gallery order; the first upload is the cover. Drag-reorder is deferred to
      // G7 because `product_images` has no UPDATE policy — reordering has to be delete+reinsert.
      display_order: i,
    }))

    // ⚑ ONE STATEMENT, NOT A LOOP. Postgres applies a multi-row insert atomically, which is what
    // keeps the failure window exactly one statement wide. Refactoring this into per-row inserts
    // for readability is what would make a genuinely partial gallery possible. Do not.
    const { error: imagesError } = await supabase.from('product_images').insert(rows)

    if (imagesError) {
      console.error('[createProduct] image rows failed:', imagesError.message, imagesError.code, imagesError.details)

      // COMPENSATING DELETE. The product exists but its gallery does not, and both tables are
      // publicly SELECTable — leaving it would put a product with a partial gallery in front of
      // buyers. The compensation is exact because product_images.product_id is ON DELETE CASCADE,
      // so any rows that did land go with the parent. Same shape as uploadAvatarAction:136-139,
      // one layer up.
      const { error: rollbackError } = await supabase.from('products').delete().eq('id', p.productId)

      if (rollbackError) {
        // 🔴 RESIDUAL. The product persists degraded: it exists with no gallery (or a partial one)
        // and may be live if it was published. There is no transaction spanning these two
        // statements to fall back on.
        //
        // The product id is in this line because it is the ONLY thing that makes the row findable
        // afterwards. THIS LOG IS THE TRIGGER CONDITION for building the
        // `create_product_with_images` RPC — one Postgres function is one transaction, which closes
        // this window properly instead of compensating around it. The other trigger is G7 needing
        // transactional gallery replacement, where a failed reinsert after a successful delete
        // would destroy images the seller already had. See docs/design/g6-write-path.md §4e-4f.
        console.error(
          `[createProduct] 🔴 COMPENSATION FAILED — product ${p.productId} persists WITHOUT its gallery ` +
            `(status=${p.publish ? 'active' : 'hidden'}, shop=${shop.shopId}). ` +
            `rollback: ${rollbackError.message} ${rollbackError.code ?? ''} ${rollbackError.details ?? ''}`,
        )
      }
      return { ok: false, error: t('product.error_add', lang) }
    }
  }

  // Fixed allow-list, as SELLER_PATHS is in orders.ts — a caller must never get to name a route.
  revalidatePath('/tableau-de-bord-vendeur')
  // G5 /mes-produits now exists (this PR) — without this a newly created product doesn't show up
  // in the seller's own list until an unrelated navigation happens to revalidate it.
  revalidatePath('/mes-produits')
  // /marche/produits is a REAL surface as of C1 — it renders the published catalogue from
  // `searchMarketplace`, so a new product must purge it or the marketplace serves a stale page.
  //
  // ⚑ This line was briefly DROPPED (PR #119) and is restored here, and the sequence is the whole
  // point: while the route was a ComingSoon stub the call revalidated a page holding no product
  // data — a cache purge that bought nothing while reading as though the marketplace updated. The
  // rule the two PRs encode together is that a revalidatePath target must actually render the data
  // being invalidated. Check that before adding the next one.
  revalidatePath('/marche/produits')
  return { ok: true }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// G5 « Mes produits » write actions — docs/design/g5-discovery.md §8.5, §8.7.
//
// Two risky bulk actions share one shape (§8.5): pre-check eligibility, act on the eligible
// subset, name what was skipped and why. Neither is a single atomic `WHERE id IN (…)` — that
// would let one blocked row sink the whole batch, which is exactly the all-or-nothing behaviour
// the founder rejected in favour of pre-check-and-report.
// ─────────────────────────────────────────────────────────────────────────────────────────────

function revalidateProductSurfaces() {
  revalidatePath('/mes-produits')
  revalidatePath('/tableau-de-bord-vendeur')
  revalidatePath('/marche/produits')
}

const ToggleStatusInput = z.object({
  productId: z.string().uuid(),
  nextStatus: z.enum(['active', 'hidden']),
})

/**
 * Single-row status toggle (Activer / Masquer). `enforce_admin_moderation_lock` blocks moving an
 * admin-moderated row's status away from 'hidden' for a non-admin — that raise is the ONE error
 * this needs to distinguish from a generic failure, surfaced with the same string the moderation
 * banner already uses (§8.7), not a raw exception.
 */
export async function toggleProductStatusAction(input: unknown): Promise<ProductActionResult> {
  const lang = await getLang()
  const parsed = ToggleStatusInput.safeParse(input)
  if (!parsed.success) {
    console.error('[toggleProductStatus] rejected: invalid input —', parsed.error.issues[0]?.message)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[toggleProductStatus] rejected: no authenticated user')
    return { ok: false, error: t('product.error.notAuth', lang) }
  }

  const { data, error } = await supabase
    .from('products')
    .update({ status: parsed.data.nextStatus })
    .eq('id', parsed.data.productId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[toggleProductStatus] update failed:', error.message, error.code, error.details)
    if (error.message.includes('admin-moderated')) {
      return { ok: false, error: t('owner.moderation_banner.product', lang) }
    }
    return { ok: false, error: t('product.error_update', lang) }
  }
  if (!data) {
    // RLS scoped the UPDATE to zero rows — not this seller's product, or it no longer exists.
    console.error(
      `[toggleProductStatus] no row updated for product ${parsed.data.productId}, user ${user.id}`,
    )
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidateProductSurfaces()
  return { ok: true }
}

const DeleteProductInput = z.object({ productId: z.string().uuid() })

/**
 * Single-row hard delete, restricted to zero-order products (docs/design/g5-discovery.md §7
 * ruling). The row's disabled "Supprimer" is UI only — eligibility is re-derived here, not trusted
 * from the client.
 */
export async function deleteProductAction(input: unknown): Promise<ProductActionResult> {
  const lang = await getLang()
  const parsed = DeleteProductInput.safeParse(input)
  if (!parsed.success) {
    console.error('[deleteProduct] rejected: invalid input —', parsed.error.issues[0]?.message)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const { productId } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[deleteProduct] rejected: no authenticated user')
    return { ok: false, error: t('product.error.notAuth', lang) }
  }

  const { count, error: countError } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productId)
  if (countError) {
    console.error('[deleteProduct] order count failed:', countError.message, countError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if ((count ?? 0) > 0) {
    console.error(`[deleteProduct] rejected: product ${productId} has ${count} order(s)`)
    return { ok: false, error: t('product.error_delete_has_orders', lang) }
  }

  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[deleteProduct] delete failed:', error.message, error.code, error.details)
    // TOCTOU: an order landed between the count check above and this delete, and
    // `enforce_order_identity_lock` raised on the cascading SET NULL — verified live, §7.
    if (error.code === '42501') {
      return { ok: false, error: t('product.error_delete_has_orders', lang) }
    }
    return { ok: false, error: t('product.error_delete', lang) }
  }
  if (!data) {
    console.error(`[deleteProduct] no row deleted for product ${productId}, user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // `product_images` rows cascade-delete (ON DELETE CASCADE), but the STORAGE objects they
  // pointed at do not — the same residue class uploadProductImageAction already documents, owned
  // by the reconciliation sweep (image-storage-discovery.md §6c), not swept here.
  revalidateProductSurfaces()
  return { ok: true }
}

const BulkIdsInput = z.object({
  // Selection is scoped to the current page only (§8.5's ruling) — PRODUCTS_PER_PAGE is a real
  // invariant on the input size, not an arbitrary cap.
  productIds: z.array(z.string().uuid()).min(1).max(PRODUCTS_PER_PAGE),
})

/**
 * Bulk Activer. Pre-checks `admin_hidden_at` on the selection, updates only the eligible subset,
 * and reports the rest — `enforce_admin_moderation_lock` only blocks moving AWAY from 'hidden', so
 * this is the one bulk action that can hit it (§8.5, §8.7).
 */
export async function bulkActivateProductsAction(input: unknown): Promise<BulkProductActionResult> {
  const lang = await getLang()
  const parsed = BulkIdsInput.safeParse(input)
  if (!parsed.success) {
    console.error('[bulkActivateProducts] rejected: invalid input —', parsed.error.issues[0]?.message)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('product.error.notAuth', lang) }

  const shop = await resolveOwnedShopId(supabase, user.id)
  if (!shop.ok) {
    console.error(`[bulkActivateProducts] shop unresolved (${shop.reason}) for user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // Scoped by shop ownership explicitly — `products` is public-read, so the caller's ids alone
  // cannot be trusted to be theirs.
  const { data: rows, error: fetchError } = await supabase
    .from('products')
    .select('id, title, admin_hidden_at')
    .eq('shop_id', shop.shopId)
    .in('id', parsed.data.productIds)
  if (fetchError) {
    console.error('[bulkActivateProducts] pre-check fetch failed:', fetchError.message, fetchError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const eligible = (rows ?? []).filter((r) => r.admin_hidden_at == null)
  const preSkipped = (rows ?? [])
    .filter((r) => r.admin_hidden_at != null)
    .map((r) => ({ id: r.id, title: r.title, reason: 'moderated' as const }))

  if (eligible.length === 0) {
    return { ok: true, updatedCount: 0, skipped: preSkipped }
  }

  // `.is('admin_hidden_at', null)` is the race-closer: a row moderated between the pre-check above
  // and this write simply won't match, rather than raising inside the trigger and sinking the
  // whole UPDATE.
  const { data: updated, error: updateError } = await supabase
    .from('products')
    .update({ status: 'active' })
    .in(
      'id',
      eligible.map((r) => r.id),
    )
    .is('admin_hidden_at', null)
    .select('id')

  if (updateError) {
    console.error('[bulkActivateProducts] update failed:', updateError.message, updateError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const updatedIds = new Set((updated ?? []).map((r) => r.id))
  const raceSkipped = eligible
    .filter((r) => !updatedIds.has(r.id))
    .map((r) => ({ id: r.id, title: r.title, reason: 'moderated' as const }))

  revalidateProductSurfaces()
  return { ok: true, updatedCount: updated?.length ?? 0, skipped: [...preSkipped, ...raceSkipped] }
}

/**
 * Bulk Supprimer. Pre-checks order history (ANY order, not just delivered — matches the single-row
 * rule) on the selection, then deletes the eligible subset ONE ROW AT A TIME, not one
 * `DELETE … WHERE id IN (…)` — a batch delete is atomic, so a row blocked by
 * `enforce_order_identity_lock` (a TOCTOU order landing after the pre-check) would roll back every
 * row in the batch, recreating the all-or-nothing failure this design exists to avoid.
 */
export async function bulkDeleteProductsAction(input: unknown): Promise<BulkProductActionResult> {
  const lang = await getLang()
  const parsed = BulkIdsInput.safeParse(input)
  if (!parsed.success) {
    console.error('[bulkDeleteProducts] rejected: invalid input —', parsed.error.issues[0]?.message)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('product.error.notAuth', lang) }

  const shop = await resolveOwnedShopId(supabase, user.id)
  if (!shop.ok) {
    console.error(`[bulkDeleteProducts] shop unresolved (${shop.reason}) for user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const { data: rows, error: fetchError } = await supabase
    .from('products')
    .select('id, title')
    .eq('shop_id', shop.shopId)
    .in('id', parsed.data.productIds)
  if (fetchError) {
    console.error('[bulkDeleteProducts] pre-check fetch failed:', fetchError.message, fetchError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (!rows || rows.length === 0) return { ok: true, updatedCount: 0, skipped: [] }

  const { data: orderRows, error: ordersError } = await supabase
    .from('orders')
    .select('product_id')
    .in(
      'product_id',
      rows.map((r) => r.id),
    )
  if (ordersError) {
    console.error('[bulkDeleteProducts] order pre-check failed:', ordersError.message, ordersError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const withOrders = new Set((orderRows ?? []).map((o) => o.product_id).filter((id): id is string => !!id))
  const eligible = rows.filter((r) => !withOrders.has(r.id))
  const skipped = rows
    .filter((r) => withOrders.has(r.id))
    .map((r) => ({ id: r.id, title: r.title, reason: 'has_orders' as const }))

  let updatedCount = 0
  for (const row of eligible) {
    const { error: deleteError } = await supabase.from('products').delete().eq('id', row.id)
    if (deleteError) {
      // Same TOCTOU as the single-row action — reported as a skip, not a 500.
      console.error(`[bulkDeleteProducts] delete failed for ${row.id}:`, deleteError.message, deleteError.code)
      skipped.push({ id: row.id, title: row.title, reason: 'has_orders' })
    } else {
      updatedCount++
    }
  }

  revalidateProductSurfaces()
  return { ok: true, updatedCount, skipped }
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// G7 « Modifier un produit » write actions — docs/design/g5-discovery.md §7's ruling still
// applies unchanged (hard delete, zero-order products only); nothing below reopens it.
// ─────────────────────────────────────────────────────────────────────────────────────────────

// ⚑ NO ORDER-HISTORY GATE HERE, AND THAT IS DELIBERATE, NOT AN OVERSIGHT. It is tempting to assume
// `deleteProductAction`'s zero-order restriction (§7) applies to every write on a product with
// sales history — it does not. `enforce_order_identity_lock` (db/migrations/
// 20260801112027_delivery_fee_tnd_product_and_order.sql:126-176) is a trigger ON `orders`, not on
// `products`: it freezes columns WITHIN an order row (item_title, unit_price_tnd, ...) at the
// moment `set_order_snapshot()` copies them from the product at insert. Once that snapshot exists,
// the ORDER's copy is what's locked — the live `products` row is never touched by that trigger and
// carries no equivalent lock of its own (`products` UPDATE RLS is ownership-only, no order-history
// clause). So every field here — including category — stays editable regardless of sales history.
// DELETE is the one write that's actually blocked by order history, and only because deleting the
// row would cascade `orders.product_id` to NULL, which the identity lock catches as a change to a
// frozen column. UPDATE never touches that column, so there's nothing for the trigger to catch.
const UpdateProductInput = z.object({
  productId: z.string().uuid(),
  title: z.string().trim().min(1).max(100),
  categoryId: z.string().uuid(),
  description: z.string().trim().max(2000).optional(),
  priceTnd: z.number().nonnegative().multipleOf(0.01),
  deliveryFeeTnd: z.number().nonnegative().multipleOf(0.01),
  tracksStock: z.boolean(),
  stockCount: z.number().int().nonnegative().optional(),
})

// Zod path -> the field the client-side Errors record keys on. Only the fields the form can
// actually get wrong on its own (a blank/negative number, a blank title) are mapped; categoryId
// and tracksStock/description have no free-text failure mode worth attributing.
const FIELD_FOR_PATH: Record<string, 'title' | 'price' | 'deliveryFee' | 'stockCount'> = {
  title: 'title',
  priceTnd: 'price',
  deliveryFeeTnd: 'deliveryFee',
  stockCount: 'stockCount',
}

/**
 * Identity/pricing/stock fields only — status is `toggleProductStatusAction`'s job (§5's
 * Actif/Masqué control calls that existing action directly; this one does not touch `status` at
 * all, so there is no second status path to keep in sync). Images are their own write surface
 * (`addProductImageAction`/`deleteProductImageAction` below) for the same reason G6 split the
 * gallery from the product row: this update carries no file bytes, so there is no payload-size
 * reason to entangle them, and entangling them would mean every text-only save re-touches a
 * gallery it isn't changing.
 */
export async function updateProductAction(input: unknown): Promise<UpdateProductResult> {
  const lang = await getLang()
  const parsed = UpdateProductInput.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    console.error(
      `[updateProduct] rejected: input failed validation — ` +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    const field = issue ? FIELD_FOR_PATH[issue.path[0] as string] : undefined
    return { ok: false, error: t('product.error_update', lang), field }
  }
  const p = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[updateProduct] rejected: no authenticated user')
    return { ok: false, error: t('product.error.notAuth', lang) }
  }

  // Ownership re-derived via the UPDATE's own WHERE — same shape as toggleProductStatusAction and
  // deleteProductAction: RLS scopes the write to rows this session's shop owns, and `.select().
  // maybeSingle()` reading back zero rows is what tells "not mine" apart from "the write failed".
  const { data, error } = await supabase
    .from('products')
    .update({
      title: p.title,
      category_id: p.categoryId,
      description: p.description && p.description.length > 0 ? p.description : null,
      price_tnd: p.priceTnd,
      delivery_fee_tnd: p.deliveryFeeTnd,
      tracks_stock: p.tracksStock,
      stock_count: p.tracksStock ? (p.stockCount ?? 0) : null,
    })
    .eq('id', p.productId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[updateProduct] update failed:', error.message, error.code, error.details)
    return { ok: false, error: t('product.error_update', lang) }
  }
  if (!data) {
    console.error(`[updateProduct] no row updated for product ${p.productId}, user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidateProductSurfaces()
  return { ok: true }
}

// Mirrors updateShopAsset's pathFromPublicUrl (ma-boutique/modifier/actions.ts), restated rather
// than imported — that one is private to its own module and scoped to SHOP_BUCKET; this one is
// scoped to PRODUCT_BUCKET. Same shape: derive the object path from a stored public URL so the
// object can be targeted for deletion without a second column remembering its path.
function pathFromProductPublicUrl(url: string): string | null {
  const marker = `/object/public/${PRODUCT_BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
}

const AddProductImageInput = z.object({
  productId: z.string().uuid(),
  path: z.string().min(1),
})

/**
 * Insert ONE `product_images` row for a product that already exists — the write
 * `createProductAction` batches inline at create time (§ above) has no equivalent for an existing
 * row. `uploadProductImageAction` already puts the bytes in storage; this is the second half for
 * an edit, done as its own call rather than folded into `updateProductAction` for the same reason
 * uploads are one-per-call there: this action is invoked once per picked file, from the gallery's
 * own upload loop, and keeping it single-image keeps one failure from disturbing tiles that
 * already succeeded.
 */
export async function addProductImageAction(input: unknown): Promise<AddProductImageResult> {
  const lang = await getLang()
  const parsed = AddProductImageInput.safeParse(input)
  if (!parsed.success) {
    console.error('[addProductImage] rejected: invalid input —', parsed.error.issues[0]?.message)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const { productId, path } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[addProductImage] rejected: no authenticated user')
    return { ok: false, error: t('product.error.notAuth', lang) }
  }

  // Same shop-resolution shape as every other action here (uploadProductImageAction,
  // createProductAction): resolve the caller's shop first, then confirm the product is actually
  // one of theirs via an explicit shop_id match — products is public-SELECT, so this WHERE clause
  // is the real ownership check, not RLS.
  const shop = await resolveOwnedShopId(supabase, user.id)
  if (!shop.ok) {
    console.error(`[addProductImage] shop unresolved (${shop.reason}) for user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('id, product_images(id)')
    .eq('id', productId)
    .eq('shop_id', shop.shopId)
    .maybeSingle()

  if (fetchError) {
    console.error('[addProductImage] ownership fetch failed:', fetchError.message, fetchError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (!product) {
    console.error(`[addProductImage] rejected: product ${productId} not owned by user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const existingImages = (product as unknown as { product_images: { id: string }[] }).product_images ?? []
  if (existingImages.length >= MAX_PRODUCT_IMAGES) {
    console.error(`[addProductImage] rejected: product ${productId} already at ${MAX_PRODUCT_IMAGES} images`)
    return { ok: false, error: t('product.image.error.max', lang, { max: MAX_PRODUCT_IMAGES }) }
  }

  if (!isPathWithinProduct(path, shop.shopId, productId)) {
    console.error(`[addProductImage] rejected path outside ${shop.shopId}/${productId}/ for user ${user.id} — possible tampering`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const { data: existingOrders, error: ordersError } = await supabase
    .from('product_images')
    .select('display_order')
    .eq('product_id', productId)
  if (ordersError) {
    console.error('[addProductImage] display_order lookup failed:', ordersError.message, ordersError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const nextOrder = nextDisplayOrder((existingOrders ?? []).map((r) => r.display_order))

  const {
    data: { publicUrl },
  } = supabase.storage.from(PRODUCT_BUCKET).getPublicUrl(path)

  const { data: inserted, error: insertError } = await supabase
    .from('product_images')
    .insert({ product_id: productId, image_url: publicUrl, display_order: nextOrder })
    .select('id')
    .single()

  if (insertError || !inserted) {
    console.error(
      '[addProductImage] insert failed:',
      insertError?.message,
      insertError?.code,
      insertError?.details,
    )
    // The storage object is now an orphan (row insert failed, nothing references it) — same
    // residue class uploadProductImageAction's own header documents, owned by the reconciliation
    // sweep (image-storage-discovery.md §6c), not swept here.
    return { ok: false, error: t('product.image.error.upload', lang) }
  }

  revalidateProductSurfaces()
  return { ok: true, imageId: inserted.id, url: publicUrl }
}

const DeleteProductImageInput = z.object({
  productId: z.string().uuid(),
  imageId: z.string().uuid(),
})

/**
 * Delete one gallery row and best-effort clean up its storage object. G3's `updateShopAsset`
 * principle applies — write success before destroying anything, cleanup is non-fatal — but not its
 * mechanism: that swaps one column pointing at one object, this deletes one row out of a
 * one-to-many child table. No order-history gate (see the header note above this section) and no
 * reorder — `product_images` has no UPDATE policy, so removing an image never needs to renumber
 * the rows that remain; display_order stays whatever it already was and the lowest surviving value
 * is simply the new cover.
 */
export async function deleteProductImageAction(input: unknown): Promise<ProductActionResult> {
  const lang = await getLang()
  const parsed = DeleteProductImageInput.safeParse(input)
  if (!parsed.success) {
    console.error('[deleteProductImage] rejected: invalid input —', parsed.error.issues[0]?.message)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const { productId, imageId } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[deleteProductImage] rejected: no authenticated user')
    return { ok: false, error: t('product.error.notAuth', lang) }
  }

  // Read the row BEFORE deleting it — this is what makes the storage object findable afterward.
  // Scoped by productId too, not just imageId: a caller cannot delete a real row by guessing its
  // uuid unless it also names the product RLS already confirms they own.
  const { data: image, error: fetchError } = await supabase
    .from('product_images')
    .select('image_url')
    .eq('id', imageId)
    .eq('product_id', productId)
    .maybeSingle()
  if (fetchError) {
    console.error('[deleteProductImage] fetch failed:', fetchError.message, fetchError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (!image) {
    // RLS scoped the read to zero rows — not this seller's product, or already gone.
    console.error(`[deleteProductImage] no row found for image ${imageId} on product ${productId}, user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // Same shape as deleteProductAction: `.select('id').maybeSingle()` after the DELETE, not a
  // count — `count` requires an extra `{ count: 'exact' }` option this codebase's other delete
  // actions don't use, and `!data` is the established "nothing matched" signal here.
  const { data: deleted, error: deleteError } = await supabase
    .from('product_images')
    .delete()
    .eq('id', imageId)
    .eq('product_id', productId)
    .select('id')
    .maybeSingle()

  if (deleteError) {
    console.error('[deleteProductImage] delete failed:', deleteError.message, deleteError.code, deleteError.details)
    return { ok: false, error: t('product.error_delete', lang) }
  }
  if (!deleted) {
    console.error(`[deleteProductImage] no row deleted for image ${imageId}, user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // Best-effort, non-fatal — the row is already gone, so a failed cleanup here strands the object
  // (the same residue class the reconciliation sweep owns) rather than leaving a dangling row.
  const path = pathFromProductPublicUrl(image.image_url)
  if (path) {
    const { error: removeError } = await supabase.storage.from(PRODUCT_BUCKET).remove([path])
    if (removeError) {
      console.error('[deleteProductImage] storage cleanup failed (stranded, not fatal):', removeError.message)
    }
  }

  revalidateProductSurfaces()
  return { ok: true }
}

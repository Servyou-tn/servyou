'use server'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { resolveOwnedShopId } from '@/lib/shops/owner-shop'
import {
  MAX_PRODUCT_IMAGES,
  type ProductActionResult,
  type UploadImageResult,
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
  // G5 /mes-produits is unbuilt, so the dashboard is where the seller lands.
  revalidatePath('/tableau-de-bord-vendeur')
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

'use server'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { resolveOwnedShopId } from '@/lib/shops/owner-shop'
import {
  normalizeShopLogo,
  normalizeShopBanner,
  MAX_INPUT_BYTES,
  MAX_INPUT_MB,
  type NormalizeFailure,
  type NormalizeResult,
} from '@/lib/images/normalize'

// G3 "Modifier ma boutique" — the identity-field edit surface (name, city, description, logo,
// banner). The other six accordions (type, livraison, horaires, adresse, paiement, catégories)
// already have a real edit surface at /ma-boutique/creer/configuration (shipped in #129) and need
// nothing here — this file is scoped to exactly the fields with no prior edit path.
//
// ⚑ shopId is ALWAYS re-derived server-side via resolveOwnedShopId, never accepted from the
// caller. ma-boutique/creer/actions.ts's upload actions accept a client-supplied shopId only
// because the row does not exist yet at the point those run (step 1 of onboarding); here the row
// always already exists, so re-deriving it removes that IDOR surface entirely — the same choice
// configuration/actions.ts already made for the identical reason.

const SHOP_BUCKET = 'shop-assets'
const SHOP_ASSET_CACHE_CONTROL = '31536000' // matches every other bucket — see mon-compte/actions.ts:64

const NAME_MAX = 100
const DESC_MIN = 50
const DESC_MAX = 2000

export type UpdateShopResult =
  | { ok: true }
  | { ok: false; error: string; field?: 'name' | 'city' | 'description' }

const UpdateShopInput = z.object({
  name: z.string().trim().min(1).max(NAME_MAX),
  city: z.string().trim().min(1),
  description: z.string().trim().min(DESC_MIN).max(DESC_MAX),
})

export async function updateShopAction(input: unknown): Promise<UpdateShopResult> {
  const lang = await getLang()
  const parsed = UpdateShopInput.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    console.error(
      `[updateShop] rejected: input failed validation — ` +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    const field = issue?.path[0]
    if (field === 'name') return { ok: false, error: t('shop.create.error.name_invalid', lang), field: 'name' }
    if (field === 'description') {
      return { ok: false, error: t('shop.create.error.desc_min', lang, { min: DESC_MIN }), field: 'description' }
    }
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const { name, city, description } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('shop.create.error.notAuth', lang) }

  if (!GOVERNORATES.some((g) => g.value === city)) {
    return { ok: false, error: t('common.error_generic', lang), field: 'city' }
  }

  const owned = await resolveOwnedShopId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[updateShop] rejected: user ${user.id} has no shop to edit (${owned.reason})`)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const shopId = owned.shopId

  // Self-collision safe — .neq excludes the row being updated, so saving the shop's OWN unchanged
  // name never reads as taken. Matches the DB: the lower(name) unique index (migration
  // 20260811055734) never fires against the row being updated either, so this pre-check and the
  // index agree on the same case.
  const { data: collision, error: collisionErr } = await supabase
    .from('shops')
    .select('id')
    .ilike('name', name)
    .neq('id', shopId)
    .maybeSingle()
  if (collisionErr) {
    console.error(
      '[updateShop] name pre-check failed:',
      collisionErr.message,
      collisionErr.code,
      collisionErr.details,
    )
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (collision) {
    return { ok: false, error: t('shop.create.error.name_taken', lang), field: 'name' }
  }

  const { error: updErr } = await supabase.from('shops').update({ name, city, description }).eq('id', shopId)
  if (updErr) {
    console.error('[updateShop] update failed:', updErr.message, updErr.code, updErr.details)
    // 23505 — the lower(name) index caught a race the pre-check missed (two concurrent saves to
    // the same new name). Never possible against the shop's own unchanged name: see the .neq above.
    if (updErr.code === '23505') {
      return { ok: false, error: t('shop.create.error.name_taken', lang), field: 'name' }
    }
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidatePath('/tableau-de-bord-vendeur')
  revalidatePath(`/boutique/${shopId}`)
  return { ok: true }
}

export type UpdateShopAssetResult = { ok: true; url: string } | { ok: false; error: string }

const shopImageFileSchema = z
  .instanceof(File, { message: 'no_file' })
  .refine((f) => f.size > 0, 'no_file')
  .refine((f) => f.size <= MAX_INPUT_BYTES, 'too_large')

// Reuses product.image.error.* — same generic-enough copy ma-boutique/creer/actions.ts already
// reuses for the identical reason.
const FAILURE_KEY: Record<NormalizeFailure, string> = {
  unsupported_heic: 'product.image.error.heic',
  not_an_image: 'product.image.error.notImage',
  decode_failed: 'product.image.error.decode',
  too_large: 'product.image.error.tooLarge',
}

// Derives the object path from a stored public URL — {shopId}/{kind}/{uuid}.webp — so the
// previous object can be targeted for deletion without a second column just to remember its path.
// Returns null on anything that doesn't match the expected shape; callers treat that as "nothing
// to clean up" rather than an error, since a malformed URL should never block the caller.
function pathFromPublicUrl(url: string | null, bucket: string): string | null {
  if (!url) return null
  const marker = `/object/public/${bucket}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  // Verified against this project's actual getPublicUrl() output: no query string today. Stripped
  // defensively anyway — a future transform/query-carrying URL shape must not corrupt the path.
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
}

/**
 * Shared REPLACE body for both asset kinds. Unlike ma-boutique/creer/actions.ts's uploadShopAsset
 * (create — the column starts null, nothing to clean up), this one reads the column's CURRENT
 * value before touching anything, uploads the new object, points the column at it, and only THEN
 * — after the update has succeeded — deletes the old object through the Storage API. Never SQL,
 * per the standing rule (docs/follow-ups.md:2000-2004). If the delete fails it is logged and the
 * update stands: a stranded object beats a lost image. New follow-up class logged in
 * docs/follow-ups.md, distinct from the existing CASCADE-delete reconciliation-sweep entry — that
 * one covers a shop row disappearing out from under its images with no application code involved;
 * this one is an in-action replace with a single, precisely-known old object.
 */
async function updateShopAsset(params: {
  kind: 'logo' | 'banner'
  column: 'logo_url' | 'banner_url'
  normalize: (input: Buffer) => Promise<NormalizeResult>
  formData: FormData
}): Promise<UpdateShopAssetResult> {
  const { kind, column, normalize, formData } = params
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error(`[updateShopAsset:${kind}] rejected: no authenticated user`)
    return { ok: false, error: t('shop.create.error.notAuth', lang) }
  }

  const owned = await resolveOwnedShopId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[updateShopAsset:${kind}] rejected: user ${user.id} has no shop to edit (${owned.reason})`)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const shopId = owned.shopId

  const rawFile = formData.get('file')
  const parsed = shopImageFileSchema.safeParse(rawFile)
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message
    console.error(
      `[updateShopAsset:${kind}] rejected: file failed schema (${code}) — ` +
        (rawFile instanceof File
          ? `name=${rawFile.name} size=${rawFile.size} type=${rawFile.type}`
          : `not a File (${typeof rawFile})`),
    )
    return {
      ok: false,
      error: t(code === 'too_large' ? 'product.image.error.tooLarge' : 'product.image.error.notImage', lang, {
        max: MAX_INPUT_MB,
      }),
    }
  }

  // Read BEFORE the swap — this is what makes the old object findable afterward. Re-selected
  // fresh, not trusted from the page render, which could be stale by the time this action runs.
  const { data: current, error: currentErr } = await supabase
    .from('shops')
    .select('logo_url, banner_url')
    .eq('id', shopId)
    .single()
  if (currentErr) {
    console.error(
      `[updateShopAsset:${kind}] current-value fetch failed:`,
      currentErr.message,
      currentErr.code,
      currentErr.details,
    )
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const previousUrl = kind === 'logo' ? current.logo_url : current.banner_url

  const normalized = await normalize(Buffer.from(await parsed.data.arrayBuffer()))
  if (!normalized.ok) {
    console.error(
      `[updateShopAsset:${kind}] rejected: normalize failed (${normalized.reason}) — ` +
        `name=${parsed.data.name} size=${parsed.data.size} type=${parsed.data.type}`,
    )
    return { ok: false, error: t(FAILURE_KEY[normalized.reason], lang, { max: MAX_INPUT_MB }) }
  }

  // A NEW path every time — never overwrite in place, same reasoning as every other bucket here
  // (no Smart CDN auto-invalidation on the free tier; an in-place overwrite would serve the OLD
  // image for the full one-year TTL).
  const path = `${shopId}/${kind}/${randomUUID()}.webp`

  const { error: uploadError } = await supabase.storage.from(SHOP_BUCKET).upload(path, normalized.blob, {
    contentType: 'image/webp',
    cacheControl: SHOP_ASSET_CACHE_CONTROL,
    upsert: false,
  })
  if (uploadError) {
    console.error(`[updateShopAsset:${kind}] storage upload failed:`, uploadError.message)
    return { ok: false, error: t('product.image.error.upload', lang) }
  }

  // Post-upload integrity assertion — same forensics as ma-boutique/creer/actions.ts (#122).
  const { data: stored, error: infoError } = await supabase.storage.from(SHOP_BUCKET).info(path)
  if (infoError || !stored || stored.size !== normalized.blob.size) {
    console.error(
      `[updateShopAsset:${kind}] INTEGRITY CHECK FAILED — sent ${normalized.blob.size} bytes, ` +
        `stored ${stored?.size ?? 'unknown'} at ${path}` +
        (infoError ? ` (info error: ${infoError.message})` : ''),
    )
    await supabase.storage.from(SHOP_BUCKET).remove([path])
    return { ok: false, error: t('product.image.error.upload', lang) }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(SHOP_BUCKET).getPublicUrl(path)

  const { error: updateError } = await supabase.from('shops').update({ [column]: publicUrl }).eq('id', shopId)
  if (updateError) {
    // The new object is uploaded but unreferenced — clean it up, same compensating-delete shape
    // as every other upload action in this codebase.
    await supabase.storage.from(SHOP_BUCKET).remove([path])
    console.error(`[updateShopAsset:${kind}] shop update failed:`, updateError.message, updateError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // ⚑ DELETE THE OLD OBJECT ONLY NOW, after the update has succeeded — the column must never
  // point at nothing in between. Best-effort and non-fatal: the column already points at the new
  // object, so a failed delete here strands the old one (untidy, not user-visible) rather than
  // losing the image the owner just set.
  const oldPath = pathFromPublicUrl(previousUrl, SHOP_BUCKET)
  if (oldPath && oldPath !== path) {
    const { error: removeError } = await supabase.storage.from(SHOP_BUCKET).remove([oldPath])
    if (removeError) {
      console.error(`[updateShopAsset:${kind}] old-object delete failed (stranded, not fatal):`, removeError.message)
    }
  }

  revalidatePath('/tableau-de-bord-vendeur')
  revalidatePath(`/boutique/${shopId}`)
  return { ok: true, url: publicUrl }
}

export async function updateShopLogoAction(formData: FormData): Promise<UpdateShopAssetResult> {
  return updateShopAsset({ kind: 'logo', column: 'logo_url', normalize: normalizeShopLogo, formData })
}

export async function updateShopBannerAction(formData: FormData): Promise<UpdateShopAssetResult> {
  return updateShopAsset({ kind: 'banner', column: 'banner_url', normalize: normalizeShopBanner, formData })
}

export type RemoveShopBannerResult = { ok: true } | { ok: false; error: string }

// Clears an existing banner entirely. BannerField's "Retirer l'image" affordance is reused
// unmodified from the create flow, where onRemove only clears LOCAL pre-upload state (nothing has
// been written yet). Here the banner may already be a stored object, so removing it needs a real
// delete path — null the column, then clean up the object — mirroring mon-compte/actions.ts's
// removeAvatarAction.
export async function removeShopBannerAction(): Promise<RemoveShopBannerResult> {
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('shop.create.error.notAuth', lang) }

  const owned = await resolveOwnedShopId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[removeShopBanner] rejected: user ${user.id} has no shop to edit (${owned.reason})`)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const shopId = owned.shopId

  const { data: current, error: currentErr } = await supabase
    .from('shops')
    .select('banner_url')
    .eq('id', shopId)
    .single()
  if (currentErr) {
    console.error(
      '[removeShopBanner] current-value fetch failed:',
      currentErr.message,
      currentErr.code,
      currentErr.details,
    )
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const { error: updateError } = await supabase.from('shops').update({ banner_url: null }).eq('id', shopId)
  if (updateError) {
    console.error('[removeShopBanner] shop update failed:', updateError.message, updateError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const oldPath = pathFromPublicUrl(current.banner_url, SHOP_BUCKET)
  if (oldPath) {
    const { error: removeError } = await supabase.storage.from(SHOP_BUCKET).remove([oldPath])
    if (removeError) {
      console.error('[removeShopBanner] old-object delete failed (stranded, not fatal):', removeError.message)
    }
  }

  revalidatePath('/tableau-de-bord-vendeur')
  revalidatePath(`/boutique/${shopId}`)
  return { ok: true }
}

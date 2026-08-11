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

// G2 "Créer ma boutique" step 1. Full reasoning: docs/design/g2-discovery.md §7.
//
// ⚑ INSERT-THEN-UPLOAD, NOT THE OTHER WAY AROUND. Both logo and banner are optional (measured:
// "optionnel mais recommandé" / "(optionnel)"), so nothing requires them to precede the shop row
// the way G6's gallery precedes the product row. createShopAction is the ONLY write that creates
// the row; the two upload actions below run AFTER it, against a shopId that already exists —
// which is what lets the shop-assets storage policy's ownership EXISTS check pass with no
// relaxation. See g2-discovery.md §7b for the early-insert design this replaced and why.
//
// ⚑ seller_type FLIPS BEFORE THE shops INSERT, in the same action, not the reverse. If the insert
// happens first and the seller_type UPDATE fails afterward (the age-gate trigger, 23514), the
// account would hold a shop row while still reading as consumer — a state nothing in the app
// handles and that risks a redirect loop between /devenir-vendeur and this route's own guard.
// Flipping first means the only way a shop-less flip can happen is the name pre-check racing a
// concurrent insert, which lands on "shop_owner with no shop" — a state require-seller.ts already
// names and handles (G4 renders its own "create your shop" state; only this route can fix it).

const SHOP_BUCKET = 'shop-assets'
const SHOP_ASSET_CACHE_CONTROL = '31536000' // matches every other bucket — see mon-compte/actions.ts:64

const NAME_MAX = 100
const DESC_MIN = 50
const DESC_MAX = 2000

export type CreateShopResult =
  | { ok: true; shopId: string }
  | { ok: false; error: string; field?: 'name' | 'city' | 'description' }

const CreateShopInput = z.object({
  name: z.string().trim().min(1).max(NAME_MAX),
  city: z.string().trim().min(1),
  description: z.string().trim().min(DESC_MIN).max(DESC_MAX),
})

export async function createShopAction(input: unknown): Promise<CreateShopResult> {
  const lang = await getLang()
  const parsed = CreateShopInput.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    console.error(
      `[createShop] rejected: input failed validation — ` +
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

  // Defense in depth — the page guard already keeps an existing shop owner and an existing
  // freelancer out of this form, but a server action must re-derive rather than trust the render.
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('seller_type')
    .eq('id', user.id)
    .single()
  if (profileErr) {
    console.error('[createShop] profile fetch failed:', profileErr.message, profileErr.code, profileErr.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (profile.seller_type === 'freelancer') {
    console.error(`[createShop] rejected: user ${user.id} is seller_type=freelancer — switch flow does not exist`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const existing = await resolveOwnedShopId(supabase, user.id)
  if (existing.ok) {
    console.error(`[createShop] rejected: user ${user.id} already owns shop ${existing.shopId}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (existing.reason === 'query_failed') {
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // Founder-directed case-insensitive pre-check, matching the DB's lower(name) unique index
  // (migration 20260811055734) — an eq() pre-check here would pass a name that only differs by
  // case and then hit 23505 at insert, disagreeing with the friendly error this is meant to give.
  const { data: collision, error: collisionErr } = await supabase
    .from('shops')
    .select('id')
    .ilike('name', name)
    .maybeSingle()
  if (collisionErr) {
    console.error('[createShop] name pre-check failed:', collisionErr.message, collisionErr.code, collisionErr.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (collision) {
    return { ok: false, error: t('shop.create.error.name_taken', lang), field: 'name' }
  }

  const { error: roleErr } = await supabase
    .from('profiles')
    .update({ seller_type: 'shop_owner' })
    .eq('id', user.id)
  if (roleErr) {
    console.error('[createShop] seller_type update failed:', roleErr.message, roleErr.code, roleErr.details)
    if (roleErr.code === '23514') {
      return { ok: false, error: t('shop.create.error.age_gate', lang) }
    }
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const { data: shop, error: insErr } = await supabase
    .from('shops')
    .insert({ owner_id: user.id, name, city, description })
    .select('id')
    .single()

  if (insErr || !shop) {
    console.error('[createShop] insert failed:', insErr?.message, insErr?.code, insErr?.details)
    // 23505 — the lower(name) index caught a race the pre-check missed (two concurrent submits of
    // the same name). seller_type is already 'shop_owner' with no shop: not rolled back — see the
    // header note, this is require-seller.ts's own "shop_owner who never completed G2" state, and
    // this same form is the way back to it.
    if (insErr?.code === '23505') {
      return { ok: false, error: t('shop.create.error.name_taken', lang), field: 'name' }
    }
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidatePath('/tableau-de-bord-vendeur')
  return { ok: true, shopId: shop.id }
}

export type UploadShopAssetResult = { ok: true; url: string } | { ok: false; error: string }

const shopImageFileSchema = z
  .instanceof(File, { message: 'no_file' })
  .refine((f) => f.size > 0, 'no_file')
  .refine((f) => f.size <= MAX_INPUT_BYTES, 'too_large')

// Reuses product.image.error.* — the copy ("cette photo", "l'envoi de la photo") is generic
// enough to cover a logo/banner and a dedicated shop.create.error.* set would only duplicate it.
const FAILURE_KEY: Record<NormalizeFailure, string> = {
  unsupported_heic: 'product.image.error.heic',
  not_an_image: 'product.image.error.notImage',
  decode_failed: 'product.image.error.decode',
  too_large: 'product.image.error.tooLarge',
}

/**
 * Shared upload body for both asset kinds — the two exported actions differ only in which
 * normalize function, storage sub-path and `shops` column they use. Runs AFTER createShopAction:
 * the shop row already exists, so the storage policy's ownership EXISTS check passes unmodified.
 */
async function uploadShopAsset(params: {
  kind: 'logo' | 'banner'
  column: 'logo_url' | 'banner_url'
  normalize: (input: Buffer) => Promise<NormalizeResult>
  formData: FormData
}): Promise<UploadShopAssetResult> {
  const { kind, column, normalize, formData } = params
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error(`[uploadShopAsset:${kind}] rejected: no authenticated user`)
    return { ok: false, error: t('shop.create.error.notAuth', lang) }
  }

  const rawShopId = formData.get('shopId')
  const shopId = z.string().uuid().safeParse(rawShopId)
  if (!shopId.success) {
    console.error(`[uploadShopAsset:${kind}] rejected: shopId is not a uuid — received ${JSON.stringify(rawShopId)}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const rawFile = formData.get('file')
  const parsed = shopImageFileSchema.safeParse(rawFile)
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message
    console.error(
      `[uploadShopAsset:${kind}] rejected: file failed schema (${code}) — ` +
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

  // Ownership re-derived from the session, not trusted from the client — the storage policy gates
  // the SAME check independently, this is the "before the round trip" half of it.
  const { data: shop, error: shopErr } = await supabase
    .from('shops')
    .select('id')
    .eq('id', shopId.data)
    .eq('owner_id', user.id)
    .maybeSingle()
  if (shopErr) {
    console.error(`[uploadShopAsset:${kind}] shop fetch failed:`, shopErr.message, shopErr.code, shopErr.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (!shop) {
    console.error(`[uploadShopAsset:${kind}] rejected: shop ${shopId.data} not owned by user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const normalized = await normalize(Buffer.from(await parsed.data.arrayBuffer()))
  if (!normalized.ok) {
    console.error(
      `[uploadShopAsset:${kind}] rejected: normalize failed (${normalized.reason}) — ` +
        `name=${parsed.data.name} size=${parsed.data.size} type=${parsed.data.type}`,
    )
    return { ok: false, error: t(FAILURE_KEY[normalized.reason], lang, { max: MAX_INPUT_MB }) }
  }

  // First segment is the shop id — the storage policy gates on exactly that (migration
  // 20260811055734's SELECT policy, plus the INSERT/DELETE pair fixed in 20260804104541).
  const path = `${shopId.data}/${kind}/${randomUUID()}.webp`

  const { error: uploadError } = await supabase.storage.from(SHOP_BUCKET).upload(path, normalized.blob, {
    contentType: 'image/webp',
    cacheControl: SHOP_ASSET_CACHE_CONTROL,
    upsert: false,
  })
  if (uploadError) {
    console.error(`[uploadShopAsset:${kind}] storage upload failed:`, uploadError.message)
    return { ok: false, error: t('product.image.error.upload', lang) }
  }

  // Post-upload integrity assertion (#122 forensics) — needs the SELECT policy added alongside
  // this PR's migration; see g2-discovery.md §6/§7a for why that policy had to ship here.
  const { data: stored, error: infoError } = await supabase.storage.from(SHOP_BUCKET).info(path)
  if (infoError || !stored || stored.size !== normalized.blob.size) {
    console.error(
      `[uploadShopAsset:${kind}] INTEGRITY CHECK FAILED — sent ${normalized.blob.size} bytes, ` +
        `stored ${stored?.size ?? 'unknown'} at ${path}` +
        (infoError ? ` (info error: ${infoError.message})` : ''),
    )
    await supabase.storage.from(SHOP_BUCKET).remove([path])
    return { ok: false, error: t('product.image.error.upload', lang) }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(SHOP_BUCKET).getPublicUrl(path)

  const { error: updateError } = await supabase.from('shops').update({ [column]: publicUrl }).eq('id', shopId.data)
  if (updateError) {
    // The object is uploaded but unreferenced — same compensating-delete shape as
    // uploadAvatarAction (mon-compte/actions.ts:157-163).
    await supabase.storage.from(SHOP_BUCKET).remove([path])
    console.error(`[uploadShopAsset:${kind}] shop update failed:`, updateError.message, updateError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidatePath('/tableau-de-bord-vendeur')
  return { ok: true, url: publicUrl }
}

export async function uploadShopLogoAction(formData: FormData): Promise<UploadShopAssetResult> {
  return uploadShopAsset({ kind: 'logo', column: 'logo_url', normalize: normalizeShopLogo, formData })
}

export async function uploadShopBannerAction(formData: FormData): Promise<UploadShopAssetResult> {
  return uploadShopAsset({ kind: 'banner', column: 'banner_url', normalize: normalizeShopBanner, formData })
}

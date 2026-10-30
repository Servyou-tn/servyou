'use server'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { normalizePortfolioImage, MAX_INPUT_BYTES, MAX_INPUT_MB } from '@/lib/images/normalize'
import { recordUploadProvenance } from '@/lib/images/provenance'
import { isCallerActive, uploadBucket } from '@/lib/images/upload-guard'
import {
  validateForPublish,
  urlErrorSummary,
  URL_FIELD_SECTION_KEYS,
  type UrlField,
} from '@/lib/marche/freelancer-profile-edit'
import { SaveProfileInput } from './schema'
import { applyProfileSave } from './apply-save'

// Publish model — option A (founder ruling, H3 discovery pass).
//
// is_published stays exactly what PR #164 made it: trigger-derived from
// freelancer_has_active_listing(), never written by app code. This module does NOT set that flag.
// publishProfileAction:
//   1. Saves the current form state (same write path as saveProfileAction).
//   2. Validates the required fields and surfaces what's missing — same shape as the measured
//      "échec de validation" specimen (409:15513).
//   3. If validation passes but the freelancer has zero active service_listings, explains that
//      the profile goes live once a service is published, with a link to create one. It does not
//      try to flip is_published itself — that would race the trigger and duplicate its logic in
//      two places that could drift.
//
// If a future PR is tempted to add a second "published" column or flag to make this button
// "actually do something": don't. The gate PR #164 built is deliberately the single source of
// truth. Route the fix through service_listings, not through a new column here.

// `urlFields` rides along when the rejection was a URL: `error` is translated in the request's
// language, and the client rebuilds the summary from `urlFields` so it re-translates on a language
// switch (router.refresh keeps client state; a stored string would not).
export type SaveProfileResult = { ok: true } | { ok: false; error: string; urlFields?: UrlField[] }
export type PublishProfileResult =
  | { ok: true; status: 'published' }
  | { ok: true; status: 'needs_active_listing' }
  | { ok: false; status: 'validation_failed'; missing: ('headline' | 'bio' | 'skills')[] }
  | { ok: false; status: 'error'; error: string; urlFields?: UrlField[] }


// A URL that fails HTTP_URL names its accordion ("À corriger dans : Portfolio") instead of a bare
// generic error. ProfileEditForm's isHttpUrl check normally catches these first; this covers a
// payload that gets past it. Leaf = the URL-bearing key at the end of the Zod issue path.
const URL_LEAVES = new Set(['url', 'imageUrl', 'credentialUrl', 'portfolioLink'])

function urlFieldsIn(issues: readonly { path: readonly PropertyKey[] }[]): UrlField[] {
  const fields = issues
    .filter((i) => URL_LEAVES.has(String(i.path[i.path.length - 1])))
    .map((i) => i.path[0])
    .filter((f): f is UrlField => typeof f === 'string' && f in URL_FIELD_SECTION_KEYS)
  return [...new Set(fields)]
}

// The rejection for a payload that failed SaveProfileInput: the section summary (+ urlFields) when a
// URL was the problem, the generic error otherwise.
function rejection(issues: readonly { path: readonly PropertyKey[] }[], lang: Lang): { error: string; urlFields?: UrlField[] } {
  const urlFields = urlFieldsIn(issues)
  if (urlFields.length === 0) return { error: t('common.error_generic', lang) }
  return { error: urlErrorSummary(urlFields, lang) ?? t('common.error_generic', lang), urlFields }
}

function revalidateProfileEditSurfaces() {
  revalidatePath('/mon-profil-freelance/modifier')
  revalidatePath('/tableau-de-bord')
}

export async function saveProfileAction(input: unknown): Promise<SaveProfileResult> {
  const lang = await getLang()
  const parsed = SaveProfileInput.safeParse(input)
  if (!parsed.success) {
    console.error(
      '[saveProfile] rejected: input failed validation — ' +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    return { ok: false, ...rejection(parsed.error.issues, lang) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('freelance.create.error.notAuth', lang) }

  const owned = await resolveOwnedFreelancerProfileId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[saveProfile] rejected: user ${user.id} has no freelancer profile (${owned.reason})`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const result = await applyProfileSave(supabase, owned.freelancerProfileId, parsed.data)
  if (!result.ok) return { ok: false, error: t('common.error_generic', lang) }

  revalidateProfileEditSurfaces()
  return { ok: true }
}

export async function publishProfileAction(input: unknown): Promise<PublishProfileResult> {
  const lang = await getLang()
  const parsed = SaveProfileInput.safeParse(input)
  if (!parsed.success) {
    console.error(
      '[publishProfile] rejected: input failed validation — ' +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    return { ok: false, status: 'error', ...rejection(parsed.error.issues, lang) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, status: 'error', error: t('freelance.create.error.notAuth', lang) }

  const owned = await resolveOwnedFreelancerProfileId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[publishProfile] rejected: user ${user.id} has no freelancer profile (${owned.reason})`)
    return { ok: false, status: 'error', error: t('common.error_generic', lang) }
  }

  const saveResult = await applyProfileSave(supabase, owned.freelancerProfileId, parsed.data)
  if (!saveResult.ok) return { ok: false, status: 'error', error: t('common.error_generic', lang) }

  const validation = validateForPublish({
    headline: parsed.data.headline,
    bio: parsed.data.bio,
    skillsCount: parsed.data.skills.length,
  })
  if (!validation.ok) {
    revalidateProfileEditSurfaces()
    return { ok: false, status: 'validation_failed', missing: validation.missing }
  }

  // is_published is trigger-derived (sync_freelancer_is_published, PR #164) -- read it back fresh
  // rather than trusting any value carried in from before this save. Never written here.
  const { data: fresh, error: freshErr } = await supabase
    .from('freelancer_profiles')
    .select('is_published')
    .eq('id', owned.freelancerProfileId)
    .maybeSingle()
  if (freshErr) {
    console.error('[publishProfile] is_published re-read failed:', freshErr.message, freshErr.code)
    return { ok: false, status: 'error', error: t('common.error_generic', lang) }
  }

  revalidateProfileEditSurfaces()
  return { ok: true, status: fresh?.is_published ? 'published' : 'needs_active_listing' }
}

// ── Portfolio image upload — same three-layer posture as uploadProductImageAction
// (src/app/actions/products.ts), simplified: ownership is direct (freelancer_profile_id ->
// freelancer_profiles.profile_id = auth.uid()), no shop/product indirection. ────────────────────

const PORTFOLIO_BUCKET = 'portfolio-media'
const PORTFOLIO_CACHE_CONTROL = '31536000' // one year — a path is never overwritten, fresh uuid every upload.

// Same shape gate as the other four upload paths (products.ts productImageFileSchema): the size cap refuses an
// oversized body before the (expensive) decode, with the honest « too large » message.
const portfolioImageFileSchema = z
  .instanceof(File, { message: 'no_file' })
  .refine((f) => f.size > 0, 'no_file')
  .refine((f) => f.size <= MAX_INPUT_BYTES, 'too_large')

export type UploadPortfolioImageResult = { ok: true; path: string; url: string } | { ok: false; error: string }

export async function uploadPortfolioImageAction(formData: FormData): Promise<UploadPortfolioImageResult> {
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[uploadPortfolioImage] rejected: no authenticated user')
    return { ok: false, error: t('common.error_generic', lang) }
  }
  // S-3: the bytes below are written by the service role, which skips the RESTRICTIVE « Suspended accounts
  // cannot upload » storage policy -- so a suspended account is refused here, before anything is stored.
  if (!(await isCallerActive(supabase))) return { ok: false, error: t('auth.suspended_banner', lang) }

  const rawFile = formData.get('image')
  const parsed = portfolioImageFileSchema.safeParse(rawFile)
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message
    console.error(
      `[uploadPortfolioImage] rejected: file failed schema (${code}) — ` +
        (rawFile instanceof File ? `name=${rawFile.name} size=${rawFile.size} type=${rawFile.type}` : `not a File (${typeof rawFile})`) +
        ` for user ${user.id}`,
    )
    if (code === 'too_large') return { ok: false, error: t('product.image.error.tooLarge', lang, { max: MAX_INPUT_MB }) }
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const owned = await resolveOwnedFreelancerProfileId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[uploadPortfolioImage] rejected: freelancer profile unresolved (${owned.reason}) for user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const normalized = await normalizePortfolioImage(Buffer.from(await parsed.data.arrayBuffer()))
  if (!normalized.ok) {
    console.error(
      `[uploadPortfolioImage] rejected: normalize failed (${normalized.reason}) — name=${parsed.data.name} size=${parsed.data.size} for user ${user.id}`,
    )
    return { ok: false, error: t('product.image.error.notImage', lang, { max: MAX_INPUT_MB }) }
  }

  // First segment MUST be the caller's own uid — matches the storage policy
  // ("portfolio-media: owner inserts under own uid", `(storage.foldername(name))[1] = auth.uid()`).
  // Since S-3 the bytes go through the service role (uploadBucket), which skips storage RLS: this first segment is
  // safe because it is the caller's own user.id, never a value from the client.
  const path = `${user.id}/${randomUUID()}.webp`

  const { error: uploadError } = await uploadBucket(PORTFOLIO_BUCKET).upload(path, normalized.blob, {
    contentType: 'image/webp',
    cacheControl: PORTFOLIO_CACHE_CONTROL,
    upsert: false,
  })
  if (uploadError) {
    console.error('[uploadPortfolioImage] storage upload failed:', uploadError.message)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // PROVENANCE BEFORE RETURNING THE PATH — the freelancer_portfolio_items BEFORE INSERT trigger
  // (trg_enforce_portfolio_image_provenance) requires this row to already be committed. Written
  // with a service_role client, never this action's own session client — uploaded_objects denies
  // INSERT to `authenticated` by design (20260903143928).
  const provenance = await recordUploadProvenance('portfolio-media', path, user.id)
  if (!provenance.ok) {
    console.error(`[uploadPortfolioImage] provenance insert failed for ${path}, user ${user.id} — object left for reconciliation`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // Read the stored size back and compare, like the other four upload paths (products.ts explains why: a
  // body-encoding fault changes the object's LENGTH while upload() still returns ok). Left in place on a
  // mismatch, for the reconciliation sweep -- never returned to the caller as a usable path.
  const { data: stored, error: infoError } = await uploadBucket(PORTFOLIO_BUCKET).info(path)
  if (infoError || !stored || stored.size !== normalized.blob.size) {
    console.error(
      `[uploadPortfolioImage] INTEGRITY CHECK FAILED — sent ${normalized.blob.size} bytes, ` +
        `stored ${stored?.size ?? 'unknown'} at ${path}` +
        (infoError ? ` (info error: ${infoError.message})` : ''),
    )
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path)

  return { ok: true, path, url: publicUrl }
}

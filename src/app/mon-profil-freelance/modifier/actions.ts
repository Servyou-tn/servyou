'use server'

import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { reconcile } from '@/lib/shops/reconcile'
import { diffLanguages } from '@/lib/freelancer/diff-languages'
import { normalizePortfolioImage, MAX_INPUT_MB } from '@/lib/images/normalize'
import { recordUploadProvenance } from '@/lib/images/provenance'
import { validateForPublish } from '@/lib/marche/freelancer-profile-edit'
import { SaveProfileInput, type SaveProfileInputType } from './schema'

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

export type SaveProfileResult = { ok: true } | { ok: false; error: string }
export type PublishProfileResult =
  | { ok: true; status: 'published' }
  | { ok: true; status: 'needs_active_listing' }
  | { ok: false; status: 'validation_failed'; missing: ('headline' | 'bio' | 'skills')[] }
  | { ok: false; status: 'error'; error: string }

/**
 * Core write, factored out so it's exercisable directly against a real Supabase client in tests
 * (same split every other route in this codebase uses for the identical reason — createClient()
 * needs next/headers' cookies()). Full-set replacement for links/portfolio/education/
 * certifications (no natural business key to diff on, same reasoning as applyFreelancerDetailsSave
 * for education/certifications — cap 3-6, single owner, no concurrent editors). Reconcile for
 * skills/tools (scalar identity), diff for languages (composite key) — mirrors saveCompetencesAction
 * exactly, because it is the same three tables.
 */
export async function applyProfileSave(
  supabase: SupabaseClient,
  freelancerProfileId: string,
  input: SaveProfileInputType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: profileErr } = await supabase
    .from('freelancer_profiles')
    .update({
      headline: input.headline || null,
      bio: input.bio || null,
      years_experience: input.yearsExperience,
      working_hours: input.workingHours,
      workplace_location: input.workplaceLocation || null,
    })
    .eq('id', freelancerProfileId)
  if (profileErr) {
    console.error('[saveProfile] freelancer_profiles update failed:', profileErr.message, profileErr.code, profileErr.details)
    return { ok: false, error: 'freelancer_profiles update failed' }
  }

  const { data: existingSkills, error: skillsFetchErr } = await supabase
    .from('freelancer_skills')
    .select('skill')
    .eq('freelancer_profile_id', freelancerProfileId)
  if (skillsFetchErr) {
    console.error('[saveProfile] freelancer_skills fetch failed:', skillsFetchErr.message, skillsFetchErr.code)
    return { ok: false, error: 'freelancer_skills fetch failed' }
  }
  const skillsDiff = reconcile((existingSkills ?? []).map((r) => r.skill as string), input.skills)
  if (skillsDiff.toDelete.length > 0) {
    const { error } = await supabase.from('freelancer_skills').delete().eq('freelancer_profile_id', freelancerProfileId).in('skill', skillsDiff.toDelete)
    if (error) {
      console.error('[saveProfile] freelancer_skills delete failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_skills delete failed' }
    }
  }
  if (skillsDiff.toInsert.length > 0) {
    const { error } = await supabase
      .from('freelancer_skills')
      .insert(skillsDiff.toInsert.map((skill) => ({ freelancer_profile_id: freelancerProfileId, skill })))
    if (error) {
      console.error('[saveProfile] freelancer_skills insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_skills insert failed' }
    }
  }

  const { data: existingLanguages, error: langFetchErr } = await supabase
    .from('freelancer_languages')
    .select('language, proficiency')
    .eq('freelancer_profile_id', freelancerProfileId)
  if (langFetchErr) {
    console.error('[saveProfile] freelancer_languages fetch failed:', langFetchErr.message, langFetchErr.code)
    return { ok: false, error: 'freelancer_languages fetch failed' }
  }
  const languagesDiff = diffLanguages((existingLanguages ?? []) as { language: string; proficiency: string }[], input.languages)
  if (languagesDiff.toDelete.length > 0) {
    const { error } = await supabase
      .from('freelancer_languages')
      .delete()
      .eq('freelancer_profile_id', freelancerProfileId)
      .in('language', languagesDiff.toDelete)
    if (error) {
      console.error('[saveProfile] freelancer_languages delete failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_languages delete failed' }
    }
  }
  if (languagesDiff.toInsert.length > 0) {
    const { error } = await supabase.from('freelancer_languages').insert(
      languagesDiff.toInsert.map((row) => ({ freelancer_profile_id: freelancerProfileId, language: row.language, proficiency: row.proficiency })),
    )
    if (error) {
      console.error('[saveProfile] freelancer_languages insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_languages insert failed' }
    }
  }

  const { data: existingTools, error: toolsFetchErr } = await supabase
    .from('freelancer_tools')
    .select('name')
    .eq('freelancer_id', freelancerProfileId)
  if (toolsFetchErr) {
    console.error('[saveProfile] freelancer_tools fetch failed:', toolsFetchErr.message, toolsFetchErr.code)
    return { ok: false, error: 'freelancer_tools fetch failed' }
  }
  const toolsDiff = reconcile((existingTools ?? []).map((r) => r.name as string), input.tools)
  if (toolsDiff.toDelete.length > 0) {
    const { error } = await supabase.from('freelancer_tools').delete().eq('freelancer_id', freelancerProfileId).in('name', toolsDiff.toDelete)
    if (error) {
      console.error('[saveProfile] freelancer_tools delete failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_tools delete failed' }
    }
  }
  if (toolsDiff.toInsert.length > 0) {
    const { error } = await supabase.from('freelancer_tools').insert(toolsDiff.toInsert.map((name) => ({ freelancer_id: freelancerProfileId, name })))
    if (error) {
      console.error('[saveProfile] freelancer_tools insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_tools insert failed' }
    }
  }

  const { error: linksDelErr } = await supabase.from('freelancer_links').delete().eq('freelancer_profile_id', freelancerProfileId)
  if (linksDelErr) {
    console.error('[saveProfile] freelancer_links delete failed:', linksDelErr.message, linksDelErr.code)
    return { ok: false, error: 'freelancer_links delete failed' }
  }
  if (input.links.length > 0) {
    const { error } = await supabase.from('freelancer_links').insert(
      input.links.map((row, i) => ({ freelancer_profile_id: freelancerProfileId, label: row.label, url: row.url, display_order: i })),
    )
    if (error) {
      console.error('[saveProfile] freelancer_links insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_links insert failed' }
    }
  }

  const { error: portfolioDelErr } = await supabase.from('freelancer_portfolio_items').delete().eq('freelancer_profile_id', freelancerProfileId)
  if (portfolioDelErr) {
    console.error('[saveProfile] freelancer_portfolio_items delete failed:', portfolioDelErr.message, portfolioDelErr.code)
    return { ok: false, error: 'freelancer_portfolio_items delete failed' }
  }
  if (input.portfolio.length > 0) {
    const { error } = await supabase.from('freelancer_portfolio_items').insert(
      input.portfolio.map((row, i) => ({
        freelancer_profile_id: freelancerProfileId,
        image_url: row.imageUrl,
        title: row.title,
        url: row.url,
        description: row.description,
        display_order: i,
      })),
    )
    if (error) {
      console.error('[saveProfile] freelancer_portfolio_items insert failed:', error.message, error.code, error.details)
      return { ok: false, error: 'freelancer_portfolio_items insert failed' }
    }
  }

  const { error: eduDelErr } = await supabase.from('freelancer_education').delete().eq('freelancer_id', freelancerProfileId)
  if (eduDelErr) {
    console.error('[saveProfile] freelancer_education delete failed:', eduDelErr.message, eduDelErr.code)
    return { ok: false, error: 'freelancer_education delete failed' }
  }
  if (input.education.length > 0) {
    const { error } = await supabase.from('freelancer_education').insert(
      // field is deliberately never written — the frame draws one input, mapped to degree; see
      // schema.ts's own comment on EducationRowInput.
      input.education.map((row) => ({
        freelancer_id: freelancerProfileId,
        institution: row.institution,
        degree: row.degree,
        year_start: row.yearStart,
        year_end: row.yearEnd,
      })),
    )
    if (error) {
      console.error('[saveProfile] freelancer_education insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_education insert failed' }
    }
  }

  const { error: certDelErr } = await supabase.from('freelancer_certifications').delete().eq('freelancer_id', freelancerProfileId)
  if (certDelErr) {
    console.error('[saveProfile] freelancer_certifications delete failed:', certDelErr.message, certDelErr.code)
    return { ok: false, error: 'freelancer_certifications delete failed' }
  }
  if (input.certifications.length > 0) {
    const { error } = await supabase.from('freelancer_certifications').insert(
      input.certifications.map((row) => ({
        freelancer_id: freelancerProfileId,
        name: row.name,
        issuing_org: row.issuingOrg,
        year_obtained: row.yearObtained,
        credential_url: row.credentialUrl,
      })),
    )
    if (error) {
      console.error('[saveProfile] freelancer_certifications insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_certifications insert failed' }
    }
  }

  return { ok: true }
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
    return { ok: false, error: t('common.error_generic', lang) }
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
    return { ok: false, status: 'error', error: t('common.error_generic', lang) }
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

const portfolioImageFileSchema = z
  .instanceof(File, { message: 'no_file' })
  .refine((f) => f.size > 0, 'no_file')

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

  const rawFile = formData.get('image')
  const parsed = portfolioImageFileSchema.safeParse(rawFile)
  if (!parsed.success) {
    console.error(
      `[uploadPortfolioImage] rejected: file failed schema — ` +
        (rawFile instanceof File ? `name=${rawFile.name} size=${rawFile.size} type=${rawFile.type}` : `not a File (${typeof rawFile})`) +
        ` for user ${user.id}`,
    )
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
  const path = `${user.id}/${randomUUID()}.webp`

  const { error: uploadError } = await supabase.storage.from(PORTFOLIO_BUCKET).upload(path, normalized.blob, {
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

  const {
    data: { publicUrl },
  } = supabase.storage.from(PORTFOLIO_BUCKET).getPublicUrl(path)

  return { ok: true, path, url: publicUrl }
}

'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { reconcile } from '@/lib/shops/reconcile'
import { SaveDetailsInput, type DetailsInput } from './schema'

// H2 step 3 "Détails" — Figma 468:20502 measured the four accordion HEADERS only (lede text,
// titles, "(optionnel)" suffix, collapsed state); the bodies were never authored in the file
// (confirmed live, 2026-09-02 — each `acc` node has exactly two children, label + chevron, no
// third body child, and no expanded specimen exists anywhere in the registry). Field shapes are a
// FOUNDER RULING off the known schema (./schema.ts), not a measurement — a later Figma pass may
// correct them. See the PR description for the exact FR strings this ruling chose.

export type SaveDetailsResult =
  | { ok: true }
  | { ok: false; error: string; field?: 'education' | 'certifications' | 'tools' | 'workingHours' }

type ApplyResult = { ok: true } | { ok: false; error: string }

// Core write, factored out from the 'use server' wrapper below so it can be exercised directly
// against a real Supabase client in tests (createClient() needs next/headers' cookies(), which
// only resolves inside a real request — resolveOwnedFreelancerProfileId already set this
// precedent for reads, this is the same split applied to a write). A 'use server' file may only
// export async functions, which is also why the Zod schema lives in ./schema.ts, not here.
//
// WRITE ORDER, deliberately: education, then certifications, then tools, then working_hours
// LAST. All four accordions are optional and any of them may be entirely empty — but
// working_hours is the ONE column this wizard's steps 1/2 never touch, and this action is the
// ONLY code path that writes it (until H3 ships). Writing it last, unconditionally (even ''),
// means `freelancer_profiles.working_hours IS NOT NULL` becomes a true "step 3 was submitted at
// least once" signal, in the same existence-based shape step 2's guard already uses
// (`freelancer_languages` row existence — chosen there for the identical partial-failure-safety
// reason: if an earlier accordion's write fails, this action returns before reaching
// working_hours, and the guard correctly still treats step 3 as unfinished).
//
// 🔴 FUTURE H3 EDITOR: if H3 ever offers a "clear working hours" action, it must write '' there,
// not NULL — writing NULL would flip this signal back to "step 3 never submitted" and re-trigger
// this wizard's guard for a freelancer who already finished it. Flagged here so it doesn't drift
// silently; not resolved, since H3 does not exist yet.
//
// Education and certifications are FULL-SET REPLACEMENTS (delete all, insert the submitted set),
// not a reconcile() diff — unlike skills/tools (freelancer_id, name) or languages
// (freelancer_id, language), a Formation/Certification row has no natural business-key identity
// to diff on (institution/cert names can legitimately repeat). Safe at this scale (cap 5, single
// owner, no concurrent editors) and simpler than inventing one.
export async function applyFreelancerDetailsSave(
  supabase: SupabaseClient,
  freelancerProfileId: string,
  input: DetailsInput,
): Promise<ApplyResult> {
  const { error: eduDelErr } = await supabase
    .from('freelancer_education')
    .delete()
    .eq('freelancer_id', freelancerProfileId)
  if (eduDelErr) {
    console.error('[saveDetails] freelancer_education delete failed:', eduDelErr.message, eduDelErr.code, eduDelErr.details)
    return { ok: false, error: 'freelancer_education delete failed' }
  }
  if (input.education.length > 0) {
    const { error: eduInsErr } = await supabase.from('freelancer_education').insert(
      input.education.map((row) => ({
        freelancer_id: freelancerProfileId,
        institution: row.institution,
        degree: row.degree,
        field: row.field,
        year_start: row.yearStart,
        year_end: row.yearEnd,
      })),
    )
    if (eduInsErr) {
      console.error('[saveDetails] freelancer_education insert failed:', eduInsErr.message, eduInsErr.code, eduInsErr.details)
      return { ok: false, error: 'freelancer_education insert failed' }
    }
  }

  const { error: certDelErr } = await supabase
    .from('freelancer_certifications')
    .delete()
    .eq('freelancer_id', freelancerProfileId)
  if (certDelErr) {
    console.error('[saveDetails] freelancer_certifications delete failed:', certDelErr.message, certDelErr.code, certDelErr.details)
    return { ok: false, error: 'freelancer_certifications delete failed' }
  }
  if (input.certifications.length > 0) {
    const { error: certInsErr } = await supabase.from('freelancer_certifications').insert(
      input.certifications.map((row) => ({
        freelancer_id: freelancerProfileId,
        name: row.name,
        issuing_org: row.issuingOrg,
        year_obtained: row.yearObtained,
        credential_url: row.credentialUrl,
      })),
    )
    if (certInsErr) {
      console.error('[saveDetails] freelancer_certifications insert failed:', certInsErr.message, certInsErr.code, certInsErr.details)
      return { ok: false, error: 'freelancer_certifications insert failed' }
    }
  }

  const { data: existingTools, error: toolsFetchErr } = await supabase
    .from('freelancer_tools')
    .select('name')
    .eq('freelancer_id', freelancerProfileId)
  if (toolsFetchErr) {
    console.error('[saveDetails] freelancer_tools fetch failed:', toolsFetchErr.message, toolsFetchErr.code, toolsFetchErr.details)
    return { ok: false, error: 'freelancer_tools fetch failed' }
  }
  const toolsDiff = reconcile((existingTools ?? []).map((r) => r.name as string), input.tools)
  if (toolsDiff.toDelete.length > 0) {
    const { error: toolsDelErr } = await supabase
      .from('freelancer_tools')
      .delete()
      .eq('freelancer_id', freelancerProfileId)
      .in('name', toolsDiff.toDelete)
    if (toolsDelErr) {
      console.error('[saveDetails] freelancer_tools delete failed:', toolsDelErr.message, toolsDelErr.code, toolsDelErr.details)
      return { ok: false, error: 'freelancer_tools delete failed' }
    }
  }
  if (toolsDiff.toInsert.length > 0) {
    const { error: toolsInsErr } = await supabase
      .from('freelancer_tools')
      .insert(toolsDiff.toInsert.map((name) => ({ freelancer_id: freelancerProfileId, name })))
    if (toolsInsErr) {
      console.error('[saveDetails] freelancer_tools insert failed:', toolsInsErr.message, toolsInsErr.code, toolsInsErr.details)
      return { ok: false, error: 'freelancer_tools insert failed' }
    }
  }

  const { error: hoursErr } = await supabase
    .from('freelancer_profiles')
    .update({ working_hours: input.workingHours })
    .eq('id', freelancerProfileId)
  if (hoursErr) {
    console.error('[saveDetails] working_hours update failed:', hoursErr.message, hoursErr.code, hoursErr.details)
    return { ok: false, error: 'working_hours update failed' }
  }

  return { ok: true }
}

export async function saveDetailsAction(input: unknown): Promise<SaveDetailsResult> {
  const lang = await getLang()
  const parsed = SaveDetailsInput.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    console.error(
      '[saveDetails] rejected: input failed validation — ' +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    const field = issue?.path[0]
    if (field === 'education') return { ok: false, error: t('freelance.create.step3.error.education_cap', lang), field: 'education' }
    if (field === 'certifications') return { ok: false, error: t('freelance.create.step3.error.certifications_cap', lang), field: 'certifications' }
    if (field === 'tools') return { ok: false, error: t('freelance.create.step3.error.tools_cap', lang), field: 'tools' }
    if (field === 'workingHours') return { ok: false, error: t('freelance.create.step3.error.working_hours_max', lang), field: 'workingHours' }
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('freelance.create.error.notAuth', lang) }

  const owned = await resolveOwnedFreelancerProfileId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[saveDetails] rejected: user ${user.id} has no freelancer profile to configure (${owned.reason})`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const result = await applyFreelancerDetailsSave(supabase, owned.freelancerProfileId, parsed.data)
  if (!result.ok) {
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidatePath('/tableau-de-bord')
  revalidatePath('/mon-profil-freelance/creer')
  revalidatePath('/mon-profil-freelance/creer/details')
  return { ok: true }
}

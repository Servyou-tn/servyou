'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { reconcile } from '@/lib/shops/reconcile'
import { diffLanguages } from '@/lib/freelancer/diff-languages'
import { LANGUAGE_CODES, PROFICIENCY_CODES } from '@/lib/freelancer/language-options'

// H2 step 2 "Compétences & langues" — Figma 467:20404, full reasoning in
// docs/design/h2-discovery.md §3.
//
// UPDATE/reconcile, NOT blind insert — the freelancer_profiles row already exists by the time
// this action runs (step 1's job, same posture as G2's saveShopConfigAction). Every write here
// reads current state first and diffs against the new selection, which is also what makes a
// retry after a partial failure safe: a resubmit after e.g. skills succeeded but languages failed
// re-reads the (now non-empty) skills set and inserts only the delta, instead of duplicating rows
// that already landed.
//
// SKILLS_MIN/MAX duplicated from CompetencesForm.tsx (a 'use client' module, itself now the sole
// owner of these two numbers since PR-D promoted SkillsInput.tsx to the generic `ui/tag-input`,
// which takes min/max as props) rather than imported — pulling a client-boundary file's local
// const into server action code is avoidable friction for two numbers already fixed by the
// frame's own helper text ("Minimum 3, maximum 15").
const SKILLS_MIN = 3
const SKILLS_MAX = 15
const SKILL_MAX_LEN = 60
const YEARS_MAX = 80

export type SaveCompetencesResult = { ok: true } | { ok: false; error: string; field?: 'skills' | 'languages' | 'portfolioLink' }

const SaveCompetencesInput = z.object({
  skills: z.array(z.string().trim().min(1).max(SKILL_MAX_LEN)).min(SKILLS_MIN).max(SKILLS_MAX),
  languages: z
    .array(
      z.object({
        language: z.enum(LANGUAGE_CODES),
        proficiency: z.enum(PROFICIENCY_CODES),
      }),
    )
    .min(1)
    .max(LANGUAGE_CODES.length),
  yearsExperience: z.number().int().min(0).max(YEARS_MAX),
  // '' from an untouched Input collapses to null — matches saveShopConfigAction's optionalText
  // convention (the DB stores "never set" as NULL, not "").
  portfolioLink: z
    .union([z.string().trim().max(500).url(), z.literal('')])
    .transform((v) => v || null),
})

export async function saveCompetencesAction(input: unknown): Promise<SaveCompetencesResult> {
  const lang = await getLang()
  const parsed = SaveCompetencesInput.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    console.error(
      '[saveCompetences] rejected: input failed validation — ' +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    const field = issue?.path[0]
    if (field === 'skills') return { ok: false, error: t('freelance.create.step2.error.skills_min', lang, { min: SKILLS_MIN }), field: 'skills' }
    if (field === 'languages') return { ok: false, error: t('freelance.create.step2.error.languages_min', lang), field: 'languages' }
    if (field === 'portfolioLink') return { ok: false, error: t('freelance.create.step2.error.portfolio_url', lang), field: 'portfolioLink' }
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const { skills, languages, yearsExperience, portfolioLink } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('freelance.create.error.notAuth', lang) }

  const owned = await resolveOwnedFreelancerProfileId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[saveCompetences] rejected: user ${user.id} has no freelancer profile to configure (${owned.reason})`)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const freelancerProfileId = owned.freelancerProfileId

  const { error: profileErr } = await supabase
    .from('freelancer_profiles')
    .update({ years_experience: yearsExperience, portfolio_link: portfolioLink })
    .eq('id', freelancerProfileId)
  if (profileErr) {
    console.error('[saveCompetences] freelancer_profiles update failed:', profileErr.message, profileErr.code, profileErr.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // Skills first — freelancer_skills is the scalar-identity shape reconcile.ts was built for
  // (one row, one column, no composite key), same as shop_payment_methods/shop_categories.
  const { data: existingSkills, error: skillsFetchErr } = await supabase
    .from('freelancer_skills')
    .select('skill')
    .eq('freelancer_profile_id', freelancerProfileId)
  if (skillsFetchErr) {
    console.error('[saveCompetences] freelancer_skills fetch failed:', skillsFetchErr.message, skillsFetchErr.code, skillsFetchErr.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const previousSkills = (existingSkills ?? []).map((row) => row.skill as string)
  const skillsDiff = reconcile(previousSkills, skills)

  if (skillsDiff.toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from('freelancer_skills')
      .delete()
      .eq('freelancer_profile_id', freelancerProfileId)
      .in('skill', skillsDiff.toDelete)
    if (delErr) {
      console.error('[saveCompetences] freelancer_skills delete failed:', delErr.message, delErr.code, delErr.details)
      return { ok: false, error: t('common.error_generic', lang) }
    }
  }
  if (skillsDiff.toInsert.length > 0) {
    const { error: insErr } = await supabase
      .from('freelancer_skills')
      .insert(skillsDiff.toInsert.map((skill) => ({ freelancer_profile_id: freelancerProfileId, skill })))
    if (insErr) {
      console.error('[saveCompetences] freelancer_skills insert failed:', insErr.message, insErr.code, insErr.details)
      return { ok: false, error: t('common.error_generic', lang) }
    }
  }

  // Languages LAST — deliberately the last write in this action. The step-1 guard
  // (mon-profil-freelance/creer/page.tsx) reads "does this profile have a freelancer_languages
  // row" as its "has this user finished step 2" signal, specifically because it's written last:
  // if skills succeed but languages fail, the guard must still treat the profile as unfinished
  // and route back into the wizard, not to the dashboard.
  const { data: existingLanguages, error: langFetchErr } = await supabase
    .from('freelancer_languages')
    .select('language, proficiency')
    .eq('freelancer_profile_id', freelancerProfileId)
  if (langFetchErr) {
    console.error('[saveCompetences] freelancer_languages fetch failed:', langFetchErr.message, langFetchErr.code, langFetchErr.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const previousLanguages = (existingLanguages ?? []) as { language: string; proficiency: string }[]
  const languagesDiff = diffLanguages(previousLanguages, languages)

  // Delete BEFORE insert — UNIQUE (freelancer_profile_id, language) means a niveau-only change
  // (e.g. fr/natif -> fr/courant) inserts a row for a language that still exists until the
  // matching delete runs; reversing the order collides on the still-present row (23505).
  if (languagesDiff.toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from('freelancer_languages')
      .delete()
      .eq('freelancer_profile_id', freelancerProfileId)
      .in('language', languagesDiff.toDelete)
    if (delErr) {
      console.error('[saveCompetences] freelancer_languages delete failed:', delErr.message, delErr.code, delErr.details)
      return { ok: false, error: t('common.error_generic', lang) }
    }
  }
  if (languagesDiff.toInsert.length > 0) {
    const { error: insErr } = await supabase.from('freelancer_languages').insert(
      languagesDiff.toInsert.map((row) => ({
        freelancer_profile_id: freelancerProfileId,
        language: row.language,
        proficiency: row.proficiency,
      })),
    )
    if (insErr) {
      console.error('[saveCompetences] freelancer_languages insert failed:', insErr.message, insErr.code, insErr.details)
      return { ok: false, error: t('common.error_generic', lang) }
    }
  }

  // Step 3 does not exist yet (docs/design/h2-discovery.md §4) — both buttons land on
  // /tableau-de-bord for now, same forward-compat posture step 1 already documented.
  revalidatePath('/tableau-de-bord')
  revalidatePath('/mon-profil-freelance/creer')
  return { ok: true }
}

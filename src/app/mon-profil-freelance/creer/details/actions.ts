'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'
import { SaveDetailsInput } from './schema'
import { applyFreelancerDetailsSave } from './apply-save'

// H2 step 3 "Détails" — Figma 468:20502 measured the four accordion HEADERS only (lede text,
// titles, "(optionnel)" suffix, collapsed state); the bodies were never authored in the file
// (confirmed live, 2026-09-02 — each `acc` node has exactly two children, label + chevron, no
// third body child, and no expanded specimen exists anywhere in the registry). Field shapes are a
// FOUNDER RULING off the known schema (./schema.ts), not a measurement — a later Figma pass may
// correct them. See the PR description for the exact FR strings this ruling chose.

export type SaveDetailsResult =
  | { ok: true }
  | { ok: false; error: string; field?: 'education' | 'certifications' | 'tools' | 'workingHours' }


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

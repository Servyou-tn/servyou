'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { reportQueryError } from '@/lib/supabase/query-error'
import { verifyTurnstile } from '@/lib/security/turnstile'
import { reportInsertRefusalKey } from '@/lib/reports/insert-refusal'
import { FREELANCER_REPORT_REASONS } from './report-reasons'

// D4's « Signaler ce profil » — mirrors boutique/[id]/actions.ts's createShopReportAction exactly.
// reports.target_type already carries 'freelancer_profile' as a valid value (favorites_and_reports
// migration) — this is the first caller to exercise it, not a new column or concept.
//
// Only 3 reasons offered, not the full 4-value `reports.reason` CHECK — same call D3 made:
// 'wrong_category' is a listing-shape concept that does not apply to a freelancer as a whole.

const CreateFreelancerReportInput = z.object({
  freelancerProfileId: z.string().uuid(),
  reason: z.enum(FREELANCER_REPORT_REASONS),
  description: z
    .string()
    .max(500)
    .transform((v) => v.trim() || null)
    .optional(),
})

export type CreateFreelancerReportResult = { ok: true } | { ok: false; error: string }

export async function createFreelancerReportAction(input: unknown, turnstileToken?: unknown): Promise<CreateFreelancerReportResult> {
  const lang = await getLang()
  const parsed = CreateFreelancerReportInput.safeParse(input)
  if (!parsed.success) {
    console.error(
      '[createFreelancerReport] rejected: input failed validation — ' +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const { freelancerProfileId, reason, description } = parsed.data
  // Bot check (Turnstile) before any database work: skipped without TURNSTILE_SECRET_KEY, fails closed with it.
  if (!(await verifyTurnstile(turnstileToken)).ok) return { ok: false, error: t('common.error_bot_check', lang) }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Defensive backstop only — the modal trigger already redirects a logged-out visitor to
  // /connexion?next= before this action can be called (FreelancerReportModal.tsx).
  if (!user) return { ok: false, error: t('common.error_generic', lang) }

  // The target must exist and be visible to this reporter (audit pass 2 « Logged »; same check as listing-reports.ts),
  // so a made-up uuid cannot fill the admin queue with « cible introuvable » rows. RLS decides visibility: a hidden or
  // unpublished target is « not found » here too.
  const target = await supabase.from('freelancer_profiles').select('id').eq('id', freelancerProfileId).maybeSingle()
  if (target.error) {
    reportQueryError('createFreelancerReport target lookup', target.error)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (!target.data) {
    // warn, not error: an expected refusal a caller can trigger at will.
    console.warn(`[createFreelancerReport] rejected: freelancer profile ${freelancerProfileId} not found or not visible to the reporter`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: 'freelancer_profile',
    target_id: freelancerProfileId,
    reason,
    description: description ?? null,
  })
  if (error) {
    // Already reported / 10 in 24 h: the reporter's own doing, so say which (warn, not error: expected refusals).
    const refusal = reportInsertRefusalKey(error)
    if (refusal) {
      console.warn('[createFreelancerReport] refused:', error.code, error.hint)
      return { ok: false, error: t(refusal, lang) }
    }
    console.error('[createFreelancerReport] insert failed:', error.message, error.code, error.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  return { ok: true }
}

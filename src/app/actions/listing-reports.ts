'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { verifyTurnstile } from '@/lib/security/turnstile'
import { reportQueryError } from '@/lib/supabase/query-error'
import { reportInsertRefusalKey } from '@/lib/reports/insert-refusal'
import {
  LISTING_REPORT_DESCRIPTION_MAX,
  LISTING_REPORT_KINDS,
  LISTING_REPORT_REASONS,
  LISTING_REPORT_TARGET_TYPE,
} from '@/lib/reports/listing-report'

// « Signaler ce produit / ce service » (Figma 563:39705) — the third consumer-facing report write, after
// boutique/[id]/actions.ts and freelance/[id]/actions.ts, whose shape this follows: Zod first, the reporter is
// the SESSION user (never a client value), one insert through the `reports` « Reporter creates own report »
// RLS policy, errors logged as message/code/details and answered with the generic key.
//
// One addition over those two: the target must EXIST and be visible to the reporter. `reports.target_id` has no
// foreign key (it points at five different tables), so without this a crafted call could file a report against
// any uuid and the admin queue would show « cible introuvable » rows. The read goes through the reporter's own
// session, so RLS applies: a hidden / moderated listing is exactly as invisible here as on its detail page.
//
// The reason constants live in lib/reports/listing-report.ts, NOT here — a 'use server' module may only export
// async functions.

const CreateListingReportInput = z.object({
  kind: z.enum(LISTING_REPORT_KINDS),
  targetId: z.string().uuid(),
  reason: z.enum(LISTING_REPORT_REASONS),
  description: z
    .string()
    .max(LISTING_REPORT_DESCRIPTION_MAX)
    .transform((v) => v.trim() || null)
    .optional(),
})

export type CreateListingReportResult = { ok: true } | { ok: false; error: string }

export async function createListingReportAction(input: unknown, turnstileToken?: unknown): Promise<CreateListingReportResult> {
  const lang = await getLang()
  const generic: CreateListingReportResult = { ok: false, error: t('common.error_generic', lang) }

  const parsed = CreateListingReportInput.safeParse(input)
  if (!parsed.success) {
    console.error(
      '[createListingReport] rejected: input failed validation — ' +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    return generic
  }
  const { kind, targetId, reason, description } = parsed.data
  // Bot check (Turnstile) before any database work: skipped without TURNSTILE_SECRET_KEY, fails closed with it.
  if (!(await verifyTurnstile(turnstileToken)).ok) return { ok: false, error: t('common.error_bot_check', lang) }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Backstop only: the modal trigger sends a logged-out visitor to /connexion?next= before this can be called.
  if (!user) return generic

  // The target must exist and be visible to this reporter.
  const lookup =
    kind === 'product'
      ? await supabase.from('products').select('id').eq('id', targetId).maybeSingle()
      : await supabase.from('service_listings').select('id').eq('id', targetId).maybeSingle()
  if (lookup.error) {
    reportQueryError(`createListingReport ${kind} lookup`, lookup.error)
    return generic
  }
  if (!lookup.data) {
    // warn, not error: « not found / not visible » is an expected refusal, not a failure (and a caller can trigger it at will).
    console.warn(`[createListingReport] rejected: ${kind} ${targetId} not found or not visible to the reporter`)
    return generic
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: LISTING_REPORT_TARGET_TYPE[kind],
    target_id: targetId,
    reason,
    description: description ?? null,
  })
  if (error) {
    // Already reported / 10 in 24 h: the reporter's own doing, so say which (warn, not error: expected refusals).
    const refusal = reportInsertRefusalKey(error)
    if (refusal) {
      console.warn('[createListingReport] refused:', error.code, error.hint)
      return { ok: false, error: t(refusal, lang) }
    }
    console.error('[createListingReport] insert failed:', error.message, error.code, error.details)
    return generic
  }

  return { ok: true }
}

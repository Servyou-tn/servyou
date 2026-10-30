'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { reportQueryError } from '@/lib/supabase/query-error'
import { verifyTurnstile } from '@/lib/security/turnstile'
import { reportInsertRefusalKey } from '@/lib/reports/insert-refusal'
import { SHOP_REPORT_REASONS } from './report-reasons'

// D3's « Signaler cette boutique » — 543:33895. First CONSUMER-facing report-creation surface in
// the app: everything under src/app/admin/signalements/* only reads/moderates existing `reports`
// rows: no prior action ever wrote one from the buyer side. RLS already allows it —
// "Reporter creates own report" (INSERT, with_check reporter_id = auth.uid()) — this action is
// the first caller to exercise that policy.
//
// Only 3 reasons offered (not the full 4-value `reports.reason` CHECK): 'wrong_category' is a
// listing-shape concept ("this product is filed under the wrong category") that does not apply to
// a shop as a whole, so it is not offered here — same reasoning the report modal's own Figma
// specimen already reflects (3 options in its dropdown, not 4).
//
// SHOP_REPORT_REASONS/ShopReportReason live in ./report-reasons.ts, NOT here — see that file's
// header for why a 'use server' module can only export async functions.

const CreateShopReportInput = z.object({
  shopId: z.string().uuid(),
  reason: z.enum(SHOP_REPORT_REASONS),
  description: z
    .string()
    .max(500)
    .transform((v) => v.trim() || null)
    .optional(),
})

export type CreateShopReportResult = { ok: true } | { ok: false; error: string }

export async function createShopReportAction(input: unknown, turnstileToken?: unknown): Promise<CreateShopReportResult> {
  const lang = await getLang()
  const parsed = CreateShopReportInput.safeParse(input)
  if (!parsed.success) {
    console.error(
      '[createShopReport] rejected: input failed validation — ' +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const { shopId, reason, description } = parsed.data
  // Bot check (Turnstile) before any database work: skipped without TURNSTILE_SECRET_KEY, fails closed with it.
  if (!(await verifyTurnstile(turnstileToken)).ok) return { ok: false, error: t('common.error_bot_check', lang) }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  // Defensive backstop only — the modal trigger already redirects a logged-out visitor to
  // /connexion?next= before this action can be called (ShopReportModal.tsx), so a real user
  // reaching this branch would mean a direct call bypassing the UI, not a normal flow.
  if (!user) return { ok: false, error: t('common.error_generic', lang) }

  // The target must exist and be visible to this reporter (audit pass 2 « Logged »; same check as listing-reports.ts),
  // so a made-up uuid cannot fill the admin queue with « cible introuvable » rows. RLS decides visibility: a hidden or
  // unpublished target is « not found » here too.
  const target = await supabase.from('shops').select('id').eq('id', shopId).maybeSingle()
  if (target.error) {
    reportQueryError('createShopReport target lookup', target.error)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (!target.data) {
    // warn, not error: an expected refusal a caller can trigger at will.
    console.warn(`[createShopReport] rejected: shop ${shopId} not found or not visible to the reporter`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    target_type: 'shop',
    target_id: shopId,
    reason,
    description: description ?? null,
  })
  if (error) {
    // Already reported / 10 in 24 h: the reporter's own doing, so say which (warn, not error: expected refusals).
    const refusal = reportInsertRefusalKey(error)
    if (refusal) {
      console.warn('[createShopReport] refused:', error.code, error.hint)
      return { ok: false, error: t(refusal, lang) }
    }
    console.error('[createShopReport] insert failed:', error.message, error.code, error.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  return { ok: true }
}

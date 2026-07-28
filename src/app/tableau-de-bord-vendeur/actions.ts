'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { nextSellerStatus, type SellerOrderKind } from '@/lib/marche/seller-dashboard'

// Seller-side order transitions — the first write path in the shop-owner world, and deliberately
// the pattern the other nine G pages copy: server action, Zod-validated input, auth + ownership
// checked server-side, no client-side .update() on a table.
//
// (The three buyer-side transitions still call supabase.update() straight from a client component
// — OrdersList.tsx, ReceiptConfirmButton.tsx, CancelOrderModal.tsx. They are correct-but-unmigrated
// and logged in docs/follow-ups.md; deliberately NOT touched here, per the one-PR-one-focus rule.)
//
// THREE layers guard this, and the DB is the authority in all of them:
//   1. Zod parses the input before anything touches the database.
//   2. This action re-reads the order and checks seller_id === auth.uid() before writing.
//   3. RLS + `check_order_status_transition` enforce it again in Postgres. If this action's idea
//      of the next status ever drifts from the trigger's, the trigger wins and the write fails —
//      which is why the error is surfaced verbatim rather than swallowed.

const AdvanceOrderInput = z.object({
  orderId: z.string().uuid(),
})

export type ActionResult = { ok: true } | { ok: false; error: string }

/**
 * Advance one order by exactly one hop along the seller-owned chain.
 *
 * The target status is DERIVED here from the order's current status and type, never taken from
 * the client: accepting an arbitrary `status` argument would let a caller try to skip the chain,
 * and while the trigger would reject it, the check belongs before the round trip, not after.
 */
export async function advanceOrderAction(input: unknown): Promise<ActionResult> {
  const lang = await getLang()
  const parsed = AdvanceOrderInput.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('common.error_generic', lang) }

  const { data: order, error: readError } = await supabase
    .from('orders')
    .select('id, seller_id, status, order_type')
    .eq('id', parsed.data.orderId)
    .maybeSingle()

  if (readError) {
    console.error('[advanceOrder] read error:', readError.message, readError.code, readError.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  // Not found and not-yours collapse to the same answer on purpose — a distinct "not yours"
  // would confirm the existence of an order id the caller has no business knowing about.
  if (!order || order.seller_id !== user.id) {
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const next = nextSellerStatus(order.order_type as SellerOrderKind, order.status)
  if (!next) {
    return { ok: false, error: t('seller.dashboard.error_no_transition', lang) }
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: next })
    .eq('id', order.id)

  if (updateError) {
    // The trigger raises human-readable French for a genuinely invalid transition (e.g. someone
    // advanced the same order in another tab first). Surface that rather than a generic message —
    // it is the DB telling the seller precisely what happened.
    console.error('[advanceOrder] update error:', updateError.message, updateError.code)
    return { ok: false, error: updateError.message || t('common.error_generic', lang) }
  }

  revalidatePath('/tableau-de-bord-vendeur')
  return { ok: true }
}

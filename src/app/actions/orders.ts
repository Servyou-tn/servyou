'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import {
  nextSellerStatus,
  isCancellable,
  requiresCancellationReason,
  type OrderStatus,
  type OrderType,
} from '@/lib/types/order-status'

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

// The caller passes the path to revalidate: G4, G8 and G9 all render the same orders and each
// needs its own page refreshed after a transition. Constrained to a known set rather than
// accepting an arbitrary string from the client — `revalidatePath` takes a route, and letting a
// caller name any route is a needless capability.
const SELLER_PATHS = ['/tableau-de-bord-vendeur', '/commandes-recues'] as const

const AdvanceOrderInput = z.object({
  orderId: z.string().uuid(),
  revalidate: z.enum(SELLER_PATHS).optional(),
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

  const next = nextSellerStatus(order.status as OrderStatus, order.order_type as OrderType)
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

  revalidatePath(parsed.data.revalidate ?? '/tableau-de-bord-vendeur')
  return { ok: true }
}

// ── Cancellation ──────────────────────────────────────────────────────────────────────────────
//
// Separate from advancing because the rules are genuinely different: cancellation is available
// from any non-terminal state, it is the one transition BOTH parties may drive, and after the
// pivot the trigger demands a reason (`dispatched/in_delivery/arrived` for products,
// `accepted/arrived` for services).
//
// `cancelledBy` is NOT taken from the client — it is derived from which side of the order the
// caller is on. The trigger cross-checks it (`cancelled_by doit correspondre à votre rôle`), so a
// spoofed value would bounce anyway, but the value should never have been client-supplied.
// Written role-aware from the start so the three buyer-side client `.update()` calls can migrate
// onto it without a rewrite (logged in docs/follow-ups.md).

const CancelOrderInput = z.object({
  orderId: z.string().uuid(),
  // Free text OR a preset key resolved to text by the caller. Trimmed; the trigger rejects blank
  // after the pivot, and this check keeps that round trip from being needed.
  reason: z.string().trim().max(500).optional(),
  revalidate: z.enum(SELLER_PATHS).optional(),
})

export async function cancelOrderAction(input: unknown): Promise<ActionResult> {
  const lang = await getLang()
  const parsed = CancelOrderInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: t('common.error_generic', lang) }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('common.error_generic', lang) }

  const { data: order, error: readError } = await supabase
    .from('orders')
    .select('id, seller_id, buyer_id, status, order_type')
    .eq('id', parsed.data.orderId)
    .maybeSingle()

  if (readError) {
    console.error('[cancelOrder] read error:', readError.message, readError.code, readError.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if (!order) return { ok: false, error: t('common.error_generic', lang) }

  // Which side is the caller on? Neither → the same generic answer as not-found, so the response
  // cannot be used to probe whether an order id exists.
  const role =
    order.seller_id === user.id ? 'seller' : order.buyer_id === user.id ? 'buyer' : null
  if (!role) return { ok: false, error: t('common.error_generic', lang) }

  const status = order.status as OrderStatus
  const orderType = order.order_type as OrderType

  if (!isCancellable(status)) {
    return { ok: false, error: t('seller.orders.error_not_cancellable', lang) }
  }

  const reason = parsed.data.reason?.trim() ?? ''
  if (requiresCancellationReason(status, orderType) && reason === '') {
    return { ok: false, error: t('seller.orders.error_reason_required', lang) }
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      status: 'cancelled',
      cancelled_by: role,
      cancellation_reason: reason === '' ? null : reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('[cancelOrder] update error:', updateError.message, updateError.code)
    return { ok: false, error: updateError.message || t('common.error_generic', lang) }
  }

  revalidatePath(parsed.data.revalidate ?? '/commandes-recues')
  return { ok: true }
}

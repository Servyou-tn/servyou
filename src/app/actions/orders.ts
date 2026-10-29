'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { SELLER_ORDER_PATHS } from '@/lib/orders/seller-paths'
import { t } from '@/lib/i18n'
import { cancelErrorKey } from '@/lib/orders/cancel-error'
import { advanceErrorKey, trackingErrorKey } from '@/lib/orders/order-write-error'
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
// (The buyer-side transitions used to call supabase.update() straight from client components — OrdersList.tsx,
// ReceiptConfirmButton.tsx, CancelOrderModal.tsx. All three are gone: the receipt goes through confirmReceiptAction
// below and the cancel through cancelOrderAction (pre-launch audit pass 2); CancelOrderModal was deleted in #238.)
//
// THREE layers guard this, and the DB is the authority in all of them:
//   1. Zod parses the input before anything touches the database.
//   2. This action re-reads the order and checks seller_id === auth.uid() before writing.
//   3. RLS + `check_order_status_transition` enforce it again in Postgres. If this action's idea
//      of the next status ever drifts from the trigger's, the trigger wins and the write fails. The
//      refusal is mapped to an FR + AR key (lib/orders/order-write-error.ts, cancel-error.ts), never
//      returned verbatim: trigger text is French-only and not written for the client (audit pass 2).

// The caller passes the path to revalidate: G4, G8, G9 and H8 all render the same orders and each
// needs its own page refreshed after a transition. Constrained to a known set (SELLER_ORDER_PATHS, a
// plain module a client button can import too) rather than accepting an arbitrary string from the
// client — `revalidatePath` takes a route, and letting a caller name any route is a needless capability.
const SELLER_PATHS = SELLER_ORDER_PATHS

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
    // A stale transition (advanced in another tab, cancelled by the buyer) answers « n'attend plus d'action »;
    // anything else the generic error. Never the raw trigger text (audit pass 2).
    console.error('[advanceOrder] update error:', updateError.message, updateError.code)
    return { ok: false, error: t(advanceErrorKey(updateError), lang) }
  }

  revalidatePath(parsed.data.revalidate ?? '/tableau-de-bord-vendeur')
  return { ok: true }
}

// ── Shipment tracking ─────────────────────────────────────────────────────────────────────────
//
// G9's panel-suivi (Figma 497:26411). Same three-layer posture as advanceOrderAction: Zod parses,
// this action re-checks ownership, and the database enforces it again.
//
// What the DB enforces independently, so this action is defence in depth and not the only gate:
//   · a column-level UPDATE grant naming ONLY (carrier, tracking_number) — migration
//     20260729111938. Nothing else on `orders` is writable through PostgREST by `authenticated`.
//   · enforce_order_identity_lock rejects the write unless auth.uid() = old.seller_id. A column
//     grant cannot express that: buyer and seller are BOTH the `authenticated` role.
//   · the same lock rejects any shipment edit once status is received/cancelled.
//   · CHECK orders_shipment_requires_product rejects it on a service order.
//
// ⚑ CARRIER IS NOT WRITTEN HERE. Figma renders "Société de livraison" as static text and gives an
// Input only to the tracking number, and there is no surface that can populate `carrier` (see
// docs/follow-ups.md — shops.preferred_carriers is free text with no edit route). Accepting a
// carrier here would build a write path for a field no UI collects.

const SetTrackingInput = z.object({
  orderId: z.string().uuid(),
  // Trimmed, and empty means CLEAR (a mistyped 12-digit code must be correctable back to nothing).
  // 80 is the Figma Input's own counter budget (I497:26416;22:520).
  trackingNumber: z.string().trim().max(80),
})

export async function setOrderTrackingAction(input: unknown): Promise<ActionResult> {
  const lang = await getLang()
  const parsed = SetTrackingInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: t('common.error_generic', lang) }

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
    console.error('[setOrderTracking] read error:', readError.message, readError.code, readError.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  // Not found and not-yours collapse to one answer, as everywhere else in this file.
  if (!order || order.seller_id !== user.id) {
    return { ok: false, error: t('common.error_generic', lang) }
  }

  // Checked before the round trip even though the CHECK and the lock both enforce it — a clear
  // message beats a raised constraint, and the UI should never have offered the field here.
  if (order.order_type !== 'product') {
    return { ok: false, error: t('seller.orderDetail.tracking_product_only', lang) }
  }
  const status = order.status as OrderStatus
  if (status === 'received' || status === 'cancelled') {
    return { ok: false, error: t('seller.orderDetail.tracking_terminal', lang) }
  }

  const value = parsed.data.trackingNumber
  const { error: updateError } = await supabase
    .from('orders')
    .update({ tracking_number: value === '' ? null : value })
    .eq('id', order.id)

  if (updateError) {
    console.error('[setOrderTracking] update error:', updateError.message, updateError.code)
    // Mapped (terminal order / service order) or generic — never the raw DB text (audit pass 2).
    return { ok: false, error: t(trackingErrorKey(updateError), lang) }
  }

  // The order id is a Zod-validated uuid, not arbitrary client text, so interpolating it is safe
  // and precise. SELLER_PATHS deliberately stays a fixed allow-list for the list/dashboard routes —
  // revalidating a dynamic detail route needs the id, and widening that enum to accept any string
  // would hand a caller the ability to name any route.
  revalidatePath(`/commandes-recues/${order.id}`)
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

  // Founder ruling (E4 / #233): a BUYER cannot cancel a SERVICE order — the freelancer is the only party who can decline it.
  // The UI already hides the control; this closes the same gap server-side. The matching database rule is a separate DB PR.
  if (role === 'buyer' && orderType === 'service') {
    return { ok: false, error: t('buyerOrder.error_service_cancel', lang) }
  }

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
      // NOT `cancelled_at`: `authenticated` has no UPDATE grant on that column (the column allow-list is
      // status, cancelled_by, cancellation_reason, received_at, carrier, tracking_number), and Postgres
      // refuses an UPDATE whose SET list names a column the role cannot write — 42501 for the WHOLE
      // statement. trg_set_cancelled_at_on_transition stamps it from now() on the status change anyway.
      // Sending it here made every seller-side cancel fail (G8, G9) with nothing in a mock test to say so.
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('[cancelOrder] update error:', updateError.message, updateError.code, updateError.hint)
    // Mapped by hint / known trigger wording to FR + AR text, never the raw DB message (lib/orders/cancel-error.ts).
    return { ok: false, error: t(cancelErrorKey(updateError), lang) }
  }

  // The buyer's own list is a fixed route derived from the caller's role (never from the client); the seller
  // side keeps the allow-listed `revalidate` it always had.
  revalidatePath(role === 'buyer' ? '/mes-commandes' : (parsed.data.revalidate ?? '/commandes-recues'))
  return { ok: true }
}

// ── Buyer receipt confirmation ────────────────────────────────────────────────────────────────
//
// The final 'arrived' → 'received' hop, the buyer's alone. Replaces the two browser-side
// `.update({ status: 'received' })` calls (OrdersList's ConfirmReceipt, ReceiptConfirmButton) — pre-launch audit
// pass 2: same three layers as the seller writes (Zod, ownership re-read, the trigger).
// Only the status is written: `received_at` is stamped by the database on the transition (H8 PR-2, DB-batch ruling
// #12), never from a client clock — do not add it to the payload.

const ConfirmReceiptInput = z.object({ orderId: z.string().uuid() })

export async function confirmReceiptAction(input: unknown): Promise<ActionResult> {
  const lang = await getLang()
  const generic: ActionResult = { ok: false, error: t('common.error_generic', lang) }
  const parsed = ConfirmReceiptInput.safeParse(input)
  if (!parsed.success) return generic

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return generic

  const { data: order, error: readError } = await supabase
    .from('orders')
    .select('id, buyer_id, status')
    .eq('id', parsed.data.orderId)
    .maybeSingle()

  if (readError) {
    console.error('[confirmReceipt] read error:', readError.message, readError.code, readError.details)
    return generic
  }
  // Not found and not-yours collapse to one answer, as everywhere else in this file.
  if (!order || order.buyer_id !== user.id) return generic
  // The trigger refuses anything but 'arrived' too; answering here saves the round trip.
  if (order.status !== 'arrived') return generic

  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: 'received' })
    .eq('id', order.id)

  if (updateError) {
    console.error('[confirmReceipt] update error:', updateError.message, updateError.code)
    return generic
  }

  revalidatePath('/mes-commandes')
  revalidatePath(`/mes-commandes/${order.id}`)
  return { ok: true }
}

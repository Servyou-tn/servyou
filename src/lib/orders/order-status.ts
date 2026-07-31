import type { StatusValue } from '@/components/ui/status-pill'
import type { Lang } from '@/lib/i18n'

// Order presentation helpers, shared by BOTH sides of an order: E3 `/mes-commandes` (buyer) and
// G8 `/commandes-recues` (seller). Promoted out of `app/mes-commandes/_components/` when G8 became
// the second consumer — `STATUS_PILL`, `shortRef`, `shortDate`/`longDate` and `stageState` are
// role-agnostic and were never buyer-specific.
//
// NOTE `RAIL_STAGES` IS buyer-shaped: it is the 4-stage SERVICE rail E3 draws. The seller side
// runs the full 7-step product chain, so G8/G9 use `lifecycleFor()` from `@/lib/types/order-status`
// instead. Do not widen RAIL_STAGES to serve both — they are different journeys, not one journey
// at two widths.
//
// Pure — no React, no data client — so the mapping is readable in one place and testable.
//
// The DB CHECK holds 8 statuses; a SERVICE order can only ever be one of these 5 (the trigger's
// service chain is pending → accepted → arrived → received, plus cancelled from any non-terminal
// state). `prepared` / `dispatched` / `in_delivery` are product-chain-only and cannot appear.

/** The 4 rail stages, in order. `cancelled` is terminal and sits OFF the rail. */
export const RAIL_STAGES = ['pending', 'accepted', 'arrived', 'received'] as const
export type RailStage = (typeof RAIL_STAGES)[number]

export type StageState = 'completed' | 'current' | 'upcoming'

/**
 * Status → StatusPill token + label key.
 *
 * Two deliberate divergences from Figma 709:59662, both founder decisions:
 *
 *  1. `arrived` uses the SHIPPED string `common.status_arrived_service` ("Travail livré" /
 *     "العمل مُسلَّم"), not the frame's "Livrée" (rail) or "Livré" (pill — which also disagree
 *     with each other in gender). It is already in both locales and it is correct for a service:
 *     work delivered, not a parcel. The Figma is the thing to fix.
 *
 *  2. `arrived` uses the `arrivee` pill token (tone `info`, blue), not the frame's `delivered`
 *     (tone `success`, green). `reçue` is ALSO `success`, so Figma renders two adjacent lifecycle
 *     states identically and the buyer cannot see at a glance whether they still owe a
 *     confirmation. Green means done.
 */
// ⚑ THIS MAP IS ROLE- AND TYPE-AGNOSTIC. `RAIL_STAGES` above is NOT — it is the buyer's 4-stage
// service rail. The two live in the same file and the distinction has to be explicit, because
// conflating them is exactly the bug G8 shipped: this map used to hold only the five statuses a
// SERVICE order can reach, and G8 pointed a seller's PRODUCT inbox at it, so `prepared`,
// `dispatched` and `in_delivery` rendered no pill at all — three of the seven seller states
// silently blank. It now covers every status `check_order_status_transition` can produce, plus
// `refused` for the Figma variant.
//
// `arrived` is the one status whose LABEL depends on the order type, which is why this is a
// function and not a bare record: a service arriving is "Travail livré" (work delivered), a parcel
// arriving is "Arrivée". Same pill tone, different noun. Call `statusPillFor(status, orderType)`.
const PILL_BASE: Record<string, { pill: StatusValue; labelKey: string }> = {
  pending: { pill: 'pending', labelKey: 'common.status_pending' },
  accepted: { pill: 'acceptee', labelKey: 'common.status_accepted' },
  prepared: { pill: 'préparée', labelKey: 'common.status_prepared' },
  dispatched: { pill: 'expediee', labelKey: 'common.status_dispatched' },
  in_delivery: { pill: 'in-transit', labelKey: 'common.status_in_delivery' },
  arrived: { pill: 'arrivee', labelKey: 'common.status_arrived' },
  received: { pill: 'reçue', labelKey: 'common.status_received' },
  cancelled: { pill: 'annulée', labelKey: 'common.status_cancelled' },
  refused: { pill: 'refusée', labelKey: 'common.status_cancelled' },
}

/**
 * Pill token + label key for a status, given the order type.
 *
 * `orderType` defaults to 'service' so E3's existing call sites — which only ever render service
 * orders — keep their exact current labels, including "Travail livré" for `arrived`.
 */
export function statusPillFor(
  status: string,
  orderType: 'product' | 'service' = 'service',
): { pill: StatusValue; labelKey: string } | undefined {
  const base = PILL_BASE[status]
  if (!base) return undefined
  if (status === 'arrived' && orderType === 'service') {
    return { pill: base.pill, labelKey: 'common.status_arrived_service' }
  }
  return base
}

/**
 * Service-order pill map, kept for E3's existing consumers.
 * New code should call `statusPillFor` — it covers the full product chain too.
 */
export const STATUS_PILL: Record<string, { pill: StatusValue; labelKey: string }> = {
  pending: PILL_BASE.pending,
  accepted: PILL_BASE.accepted,
  arrived: { pill: 'arrivee', labelKey: 'common.status_arrived_service' },
  received: PILL_BASE.received,
  cancelled: PILL_BASE.cancelled,
}

/** Rail labels reuse the same shipped keys, so a status reads identically in pill and rail. */
export const STAGE_LABEL_KEY: Record<RailStage, string> = {
  pending: 'common.status_pending',
  accepted: 'common.status_accepted',
  arrived: 'common.status_arrived_service',
  received: 'common.status_received',
}

/**
 * State of each rail stage for a given status.
 *
 * `received` renders ALL FOUR stages completed, including "Reçue" itself. This is a documented
 * choice, not a Figma match — 709:59662 only ever mocks the `arrived` row, so there is no frame
 * to point at. The reasoning: `received` is terminal and owes nothing, and the `current` state
 * (white circle, blue ring, blue dot) is the rail's signal for "you are here, something is
 * outstanding". Rendering stage 4 as current on a finished order would imply an action the buyer
 * still has to take, when the trigger has already closed the row to any further transition.
 *
 * A cancelled order has no rail at all (callers check `isCancelled` first).
 */
/**
 * Stage state for an ARBITRARY chain — the generalisation of `stageState`.
 *
 * E3's rail walks the 4-stage service chain; the seller's G9 rail walks the 7-step product chain
 * from `lifecycleFor()`. The VISUAL LANGUAGE is the same (completed / current / upcoming), the
 * stage set is not, so the chain is a parameter and neither surface owns the other's stages.
 */
export function stageStateIn(
  chain: readonly string[],
  status: string,
  index: number,
): StageState {
  // A terminal order shows every stage completed — see the note on stageState below.
  if (status === chain[chain.length - 1]) return 'completed'
  const current = chain.indexOf(status)
  if (current === -1) return 'upcoming'
  if (index < current) return 'completed'
  if (index === current) return 'current'
  return 'upcoming'
}

/**
 * ⚑ NO LIVE CONSUMER since the G9 delta pass — E3's rail moved to the shared `OrderRail`, which
 * calls `stageStateIn` with an explicit chain. Kept because it is the documented `received`
 * behaviour below and removing a public export is its own cleanup; delete it, and this comment,
 * when the RAIL_STAGES-shaped helpers are next tidied. `stageStateIn` is the one to call.
 */
export function stageState(status: string, index: number): StageState {
  if (status === 'received') return 'completed'
  const current = (RAIL_STAGES as readonly string[]).indexOf(status)
  if (current === -1) return 'upcoming'
  if (index < current) return 'completed'
  if (index === current) return 'current'
  return 'upcoming'
}

export function isCancelled(status: string): boolean {
  return status === 'cancelled'
}

/** Only the buyer, and only from `arrived` — exactly what check_order_status_transition allows. */
export function canConfirmReceipt(status: string): boolean {
  return status === 'arrived'
}

/**
 * `orders` has no order-number column (18 columns, PK is a bare uuid), so the Figma's
 * "#CMD-2024-0318" has no data source. Founder call: render the uuid's first 8 chars —
 * unique, stable, already exists, no migration. A real CMD-{year}-{seq} is a logged follow-up.
 */
export function shortRef(id: string): string {
  // "#A4F729" — the reference as Figma renders it (G9 495:26283) and as both WhatsApp templates
  // now quote it. Six uppercase hex characters behind a hash.
  //
  // This deliberately changed shape in the G9 delta pass. It was `id.slice(0, 8)` — eight
  // LOWERCASE characters with no hash — which was invisible while the only consumers were
  // WhatsApp message bodies. G9 is the first surface to put a reference ON SCREEN, and a seller
  // reading "#A4F729" while the message they just sent quotes "f14bbb38" is two names for one
  // order. A reference exists to make the conversation traceable, so there is exactly one string.
  return `#${id.replace(/-/g, '').slice(0, 6).toUpperCase()}`
}

// Latin digits in both locales: the AR default numbering system is Arabic-Indic, and prices and
// dates must stay LTR-readable per the bilingual rules.
const LOCALE: Record<Lang, string> = { fr: 'fr-FR', ar: 'ar-TN-u-nu-latn' }

/** Header date — Figma "24 nov". */
export function shortDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'short' })
}

/** Meta date — Figma "20 novembre 2024". */
export function longDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(LOCALE[lang], { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Timeline stamp — Figma's historique reads "18/07 09h12" (504:27049).
 *
 * Built by hand rather than through `toLocaleString`: the frame's separator is the FRENCH hour mark
 * ("09h12"), which no locale's time format produces — `fr-FR` gives "09:12". Day and month are
 * zero-padded 2-digit to match, and `LOCALE` keeps the digits Latin in Arabic too.
 */
export function shortDateTime(iso: string, lang: Lang): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString(LOCALE[lang], { day: '2-digit', month: '2-digit' })
  const time = d.toLocaleTimeString(LOCALE[lang], { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date} ${time.replace(':', 'h')}`
}

/**
 * Stage → the ISO timestamp at which the order first reached it, derived from `order_events`.
 *
 * ONE RULE covers every stage: the event whose `to_status` equals the stage. That works for the
 * first stage too, without a special case, because `emit_order_event` writes the `created` event
 * with `to_status = new.status` — so "pending" is stamped by the creation event and every later
 * stage by its `status_change`. Keyed on `to_status` rather than on `event_type`, which is why the
 * two event kinds need no branch here.
 *
 * FIRST occurrence wins, not last. If a status were ever re-entered, the honest answer to "when did
 * this order reach Expédiée" is the first time, not the most recent. Callers pass rows already
 * ordered oldest-first (`seller-order-detail` orders the embed ascending), and the `??=` preserves
 * that regardless.
 *
 * Structurally typed rather than importing `OrderEvent`, so this stays in the lifecycle module
 * without coupling it to the seller read layer — E3's buyer rail can feed it the same shape.
 *
 * Stages with no matching event are simply ABSENT from the result. That is the common case, not the
 * exception: all 14 pre-migration orders have zero events, and `order_events` only accrues from
 * transitions made after its trigger landed. A missing key must therefore read as "not recorded",
 * never as an error — see OrderRail, which renders the label alone.
 */
export function stageTimestamps<E extends { toStatus: string | null; createdAt: string }>(
  events: readonly E[],
): Record<string, string> {
  const byStage: Record<string, string> = {}
  for (const e of events) {
    if (!e.toStatus) continue
    byStage[e.toStatus] ??= e.createdAt
  }
  return byStage
}

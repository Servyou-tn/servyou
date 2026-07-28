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
export const STATUS_PILL: Record<string, { pill: StatusValue; labelKey: string }> = {
  pending: { pill: 'pending', labelKey: 'common.status_pending' },
  accepted: { pill: 'acceptee', labelKey: 'common.status_accepted' },
  arrived: { pill: 'arrivee', labelKey: 'common.status_arrived_service' },
  received: { pill: 'reçue', labelKey: 'common.status_received' },
  cancelled: { pill: 'annulée', labelKey: 'common.status_cancelled' },
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
  return id.slice(0, 8)
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

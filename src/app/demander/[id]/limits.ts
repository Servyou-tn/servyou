// Field caps for the two E1 request forms, shared by the server schema (./schema.ts) and the
// client forms' `maxLength`. Deliberately zod-free: the forms are client components, and importing
// schema.ts there would pull zod into the client bundle for a handful of numbers.
//
// A FOUNDER RULING, not a DB mirror: `orders` has no length CHECK on any text column (verified
// live 2026-10-23), so these are the only limits. The two that pre-existed client-side are kept
// exactly — product note 300, service description 20–500.

export const DELIVERY_NAME_MAX = 100
export const DELIVERY_STREET_MAX = 200
export const QUARTIER_MAX = 100
export const VILLE_MAX = 100
export const PRODUCT_NOTE_MAX = 300
export const QUANTITY_MAX = 999
export const SERVICE_DESCRIPTION_MIN = 20
export const SERVICE_DESCRIPTION_MAX = 500
export const TIMEFRAME_MAX = 100
export const BUDGET_MAX = 1_000_000
// Generous on purpose: isValidPhone does the real shape check; this only bounds the raw input
// (separators included) before it is cleaned.
export const PHONE_INPUT_MAX = 30

// The buyer_note fold rules (parseServiceBuyerNote, src/lib/marche/order-detail.ts) — shared by the
// server schema and ServiceRequestForm so the browser rejects exactly what the action would.
/** A literal fold tag inside the description would be mis-split as the timeframe/budget. */
export const BUYER_NOTE_TAG = /\[(Délai|Budget):/
/** A `]` or a line break in the timeframe would close its `[Délai: …]` tag early. */
export const TIMEFRAME_ALLOWED = /^[^\r\n\]]*$/

/** '' (not given) or a finite amount in 0..BUDGET_MAX — the budget field is free text. */
export function isValidBudget(raw: string): boolean {
  const v = raw.trim()
  if (v === '') return true
  const n = Number(v)
  return Number.isFinite(n) && n >= 0 && n <= BUDGET_MAX
}

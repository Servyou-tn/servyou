import type { OrderType } from '@/lib/types/order-status'

// G9 « Détail de la commande » price breakdown — Figma 497:26383 (`priceBreakdown`).
//
// The DECISION and the ARITHMETIC live here, apart from the page, for one reason: the page is an
// async Server Component that reaches Supabase through `getSellerOrderDetail`, so nothing in it is
// reachable from a `environment: 'node'` vitest run. This module imports one type and nothing else,
// so the three cases below are asserted directly instead of being inferred from a screenshot.
//
// ⚑ WHY A GATE AT ALL. This block states an amount of money a seller is to collect at the door.
// Every input therefore has to be a FROZEN snapshot of what the buyer was actually quoted — never a
// live catalogue read. `SellerOrderDetail.unitPrice` falls back to today's `products.price_tnd` for
// the orders that predate the snapshot columns, which is fine for the soft "Prix unitaire" display
// line (it claims nothing about money owed) and is NOT fine here. So the breakdown consumes
// `unitPriceFrozen` and `deliveryFee`, both of which are null unless a real snapshot exists, and
// renders nothing at all when either is missing. A partial breakdown is worse than none: a total
// with an unknown delivery fee silently omitted is a wrong number wearing a confident label.

/** The three rows of the frame, already summed. Every field is TND. */
export type PriceBreakdown = {
  /** Row 1 — `unitPriceFrozen × quantity`. NOT the unit price; see the note in `priceBreakdownFor`. */
  lineTotal: number
  /** Row 2 — the carrier fee frozen at insert. */
  deliveryFee: number
  /** Row 3 — `lineTotal + deliveryFee`, the COD amount. */
  total: number
  /** Echoed for the "Produit (× {n})" label, so the label and the maths cannot disagree. */
  quantity: number
}

/**
 * Structural subset of `SellerOrderDetail`. Declared rather than `Pick<>`-ed so this module does not
 * import the data layer (and with it `@/lib/supabase/server`) purely for a type.
 */
export type PriceBreakdownInput = {
  orderType: OrderType
  quantity: number
  unitPriceFrozen: number | null
  deliveryFee: number | null
}

/**
 * The breakdown for an order, or `null` when the frame's block must not render at all.
 *
 *   A — service order          → null. A service has no parcel and no carrier fee; a "Livraison"
 *                                row on one would be a line item that does not exist. The DB agrees
 *                                (`orders_delivery_fee_requires_product`), so in practice a service
 *                                order also fails the case-C gate — this check is deliberately
 *                                REDUNDANT, and states the product-only intent in the one place a
 *                                reader looks. It is not dead: it is what keeps the block off a
 *                                service order if a future migration ever gives services a fee.
 *   B — both snapshots present → the full three-row breakdown.
 *   C — either snapshot null   → null. The 4 product orders that predate migration 20260801112027
 *                                have no fee, and the 14 that predate 20260729111547 have no price.
 *
 * ⚑ ROW 1 IS `unitPriceFrozen × quantity`, NOT `unitPriceFrozen`. The frame's specimen is quantity 1
 * (`Produit (× 1)` → `160 TND`), where the two are indistinguishable — but its own Total is
 * `160 + 7 = 167`, so row 1 is the LINE subtotal that the total is built from. At quantity 3 the
 * unit-price reading would print a column that does not add up (`160 / 7 / 487`) while looking
 * perfectly correct in any single-quantity screenshot. `priceBreakdownFor` is tested at quantity 3
 * for exactly this reason.
 *
 * ⚑ `!= null`, NOT truthiness. A zero delivery fee (free delivery, a real seller offer) and a zero
 * unit price are both legitimate data; `!fee` would silently drop the whole block on a free-delivery
 * order. Same `??`-not-`||` principle the read path already follows.
 */
export function priceBreakdownFor(order: PriceBreakdownInput): PriceBreakdown | null {
  // A — product orders only.
  if (order.orderType !== 'product') return null

  // C — no fallback, no partial render. Either both snapshots exist or the block does not.
  const { unitPriceFrozen, deliveryFee } = order
  if (unitPriceFrozen == null || deliveryFee == null) return null

  // B. numeric(10,2) × an integer is exact in Postgres but arrives here as a JS float; round to the
  // cent at every step so no binary tail reaches the UI and so `lineTotal + deliveryFee === total`
  // holds for the reader checking the column by hand.
  const lineTotal = round2(unitPriceFrozen * order.quantity)
  const fee = round2(deliveryFee)

  return {
    lineTotal,
    deliveryFee: fee,
    total: round2(lineTotal + fee),
    quantity: order.quantity,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// Pure helpers for the listing cards. Kept render-free so the relative-time logic
// is unit-testable (see listing-utils.test.ts).

/**
 * The NUMBER half of a price, with no currency code: integers stay bare, anything else gets
 * exactly two decimals.
 *
 * Extracted from `tndPrice` for the call sites where the unit lives in a TRANSLATED string rather
 * than in the formatter — D1's price block is three lines (« 45 TND » · « + 7 TND de livraison » ·
 * « Total : 52 TND à la livraison ») and only the first can use `tndPrice`, because the other two
 * are i18n templates that already carry the unit. Formatting those with `String(n)` is what puts
 * « 1249.99 » on one line and « 7.5 » on the next.
 */
export function tndAmount(value: number | string | null): string {
  const n = Number(value ?? 0)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

/** Price as a plain "{n} TND" string — currency code, not translatable copy. */
export function tndPrice(value: number | string | null): string {
  return `${tndAmount(value)} TND`
}

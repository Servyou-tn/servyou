// Pure helpers for the listing cards. Kept render-free so the relative-time logic
// is unit-testable (see listing-utils.test.ts).

/** Avatar initials: first letter of up to the first two words, uppercase. */
export function initials(name: string | null): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

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

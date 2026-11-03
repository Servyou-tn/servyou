// Pure helpers for the listing cards. Kept render-free so the relative-time logic
// is unit-testable (see listing-utils.test.ts).

import type { Lang } from '@/lib/i18n'

// One currency notation per language (founder, 2026-11-03, walk #25 / #30): « TND » in FR, « د.ت » in AR — the seller dashboard's
// notation. Render the result inside a <bdi> (auto direction): FR resolves LTR, AR resolves RTL, so « 120 د.ت » reads number-then-currency
// in Arabic order and never reorders with French text next to it.
export function tndCurrency(lang: Lang = 'fr'): string {
  return lang === 'ar' ? 'د.ت' : 'TND'
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

/** Price as « {n} TND » (FR) / « {n} د.ت » (AR). FR output is unchanged from the locale-blind version. */
export function tndPrice(value: number | string | null, lang: Lang = 'fr'): string {
  return `${tndAmount(value)} ${tndCurrency(lang)}`
}

/**
 * The grouped variant the order lists and the confirmation use: « 1 250 TND » / « 1 250 د.ت ». The SAME French grouping (a narrow space,
 * a comma for decimals) in both languages: the Arabic locale's « 1.250 » reads as 1 dinar 250 millimes in Tunisia (review of #304).
 */
export function tndPriceGrouped(value: number, lang: Lang = 'fr'): string {
  return `${value.toLocaleString('fr-FR')} ${tndCurrency(lang)}`
}

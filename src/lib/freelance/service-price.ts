import { t, type Lang } from '@/lib/i18n'

// A service's price as buyers read it — « 800 TND », « 450 TND / mois » (H6 PR-4, ruling D32). The unit
// is service_listings.price_unit (H6 step 3): `fixed` and NULL (the 21 listings that predate the field)
// print no unit; hour / day / month append it, so an hourly or monthly price no longer reads as a total.
// The caller formats the number (each surface keeps its own number format); this only picks the
// localized frame, which also carries the currency (TND / د.ت). Client-safe: no taxonomy, no Supabase.

const UNIT_KEYS: Record<string, string> = {
  hour: 'service.price.hour',
  day: 'service.price.day',
  month: 'service.price.month',
}

export function servicePriceLabel(price: string, unit: string | null | undefined, lang: Lang): string {
  return t((unit && UNIT_KEYS[unit]) || 'service.price.fixed', lang, { price })
}

/** The number as a surface prints it in a sentence: per-language grouping, up to 2 decimals. */
export function formatServicePrice(amount: number, lang: Lang): string {
  return amount.toLocaleString(lang === 'ar' ? 'ar-TN' : 'fr-TN', { maximumFractionDigits: 2 })
}

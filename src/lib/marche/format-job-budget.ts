import { t, type Lang } from '@/lib/i18n'
import { tndAmount } from '@/components/listings/listing-utils'

// One budget sentence for a job post (D-H10-2). Extracted from the private budgetValue in
// tableau-de-bord/_components/MissionRow.tsx without editing it. Both bounds are nullable and nothing
// in the DB orders them, so a reversed pair is swapped rather than printed backwards.
// Callers render the result with dir="ltr" — « 200 – 400 TND » reorders in AR otherwise.
export function formatJobBudget(min: number | null, max: number | null, lang: Lang): string {
  if (min != null && max != null) {
    const [lo, hi] = min <= max ? [min, max] : [max, min]
    if (lo === hi) return t('jobbudget.single', lang, { amount: tndAmount(lo) })
    return t('jobbudget.range', lang, { min: tndAmount(lo), max: tndAmount(hi) })
  }
  if (min != null) return t('jobbudget.from', lang, { amount: tndAmount(min) })
  if (max != null) return t('jobbudget.upto', lang, { amount: tndAmount(max) })
  return t('jobbudget.none', lang)
}

/** True when there is a figure to show (false → « Budget à discuter », which is prose, not a number). */
export function hasJobBudget(min: number | null, max: number | null): boolean {
  return min != null || max != null
}

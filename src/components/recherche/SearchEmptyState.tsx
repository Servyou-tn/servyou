import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { FilterCategory } from './SearchFilters'
import { HitArea } from '@/components/ui/interactive-surface'
import { localName } from '@/lib/i18n/local-name'

// The only empty state on /recherche: zero results. Two wordings — "Aucun résultat pour
// « … »" when a query is active, "Aucun résultat" when only filters narrowed it to zero.
// The recovery action is context-aware so it's never a dead click:
//   • query active           → the cross-side nudge is PRIMARY: maybe it's on the other
//                              side of the Produits/Services toggle (one click flips + re-runs)
//   • filters active         → "Effacer les filtres" (clears filters, keeps the query)
//   • query only, no filters → "Parcourir tout"     (clears the query, keeps the tab)
// Popular-category chips (a fresh browse of that category) are always offered.
type Props = {
  lang: Lang
  categories: FilterCategory[]
  query: string // '' when the zero came from filters alone
  hasFilters: boolean
  clearFiltersHref: string // clears category/city/price, keeps the query
  browseAllHref: string // clears the query AND filters, keeps the type tab
  // Cross-side compass: flip the toggle (keep query + filters). currentLabel/otherLabel are
  // the localized "Produits"/"Services" side names.
  currentLabel: string
  otherLabel: string
  otherSideHref: string
}

export function SearchEmptyState({
  lang,
  categories,
  query,
  hasFilters,
  clearFiltersHref,
  browseAllHref,
  currentLabel,
  otherLabel,
  otherSideHref,
}: Props) {
  const hasQuery = query !== ''

  const primary = `max-lg:relative inline-flex items-center rounded-full bg-brand-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-600/90 ${FOCUS_RING}`
  const textLink = `max-lg:relative rounded text-body-sm font-medium text-text-muted underline-offset-2 hover:underline ${FOCUS_RING}`

  return (
    <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
      <div className="mx-auto max-w-md">
        <SearchX className="mx-auto h-10 w-10 text-icon-muted" aria-hidden="true" />

        <p className="mt-4 text-base font-semibold text-text-primary">
          {hasQuery
            ? t('search.empty.noResults', lang, { query })
            : t('search.empty.filtered', lang)}
        </p>
        <p className="mt-2 text-body-sm text-text-muted">{t('search.empty.subtitle', lang)}</p>

        {categories.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/recherche?categorie=${encodeURIComponent(c.slug)}`}
                className={`max-lg:relative inline-flex items-center rounded-full border border-border-subtle bg-white px-4 py-2 text-body-sm font-medium text-text-primary transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
              >
                {localName(c, lang)}
                {/* 39 → 49 tall; wrapped rows are 8 px apart, so two rows' extensions overlap by 2 px in the gap — no chip covered. */}
                <HitArea size={36} axis="y" />
              </Link>
            ))}
          </div>
        )}

        {/* Context-aware recovery actions (see the component note above). */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {/* Query present → lead with the cross-side nudge: maybe it lives on the other side. */}
          {hasQuery && (
            <Link href={otherSideHref} className={primary}>
              {t('search.otherSide.zero', lang, { current: currentLabel, query, other: otherLabel })}
              <HitArea size={32} axis="y" />
            </Link>
          )}
          {hasFilters && (
            <Link href={clearFiltersHref} className={hasQuery ? textLink : primary}>
              {t('search.filters.clear', lang)}
              <HitArea size={32} axis="y" />
            </Link>
          )}
          {(hasQuery || !hasFilters) && (
            <Link href={browseAllHref} className={hasQuery || hasFilters ? textLink : primary}>
              {t('search.empty.browseAll', lang)}
              <HitArea size={32} axis="y" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

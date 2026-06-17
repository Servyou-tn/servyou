import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { FilterCategory } from './SearchFilters'

// The only empty state on /recherche: zero results. Two wordings — "Aucun résultat pour
// « … »" when a query is active, "Aucun résultat" when only filters narrowed it to zero.
// The recovery action is context-aware so it's never a dead click:
//   • filters active        → "Effacer les filtres" (clears filters, keeps the query)
//   • query only, no filters → "Parcourir tout"     (clears the query, keeps the tab)
//   • both query AND filters → both, staged: clear filters first, then browse all
// Popular-category chips (a fresh browse of that category) are always offered.
type Props = {
  lang: Lang
  categories: FilterCategory[]
  query: string // '' when the zero came from filters alone
  hasFilters: boolean
  clearFiltersHref: string // clears category/city/price, keeps the query
  browseAllHref: string // clears the query AND filters, keeps the type tab
}

export function SearchEmptyState({
  lang,
  categories,
  query,
  hasFilters,
  clearFiltersHref,
  browseAllHref,
}: Props) {
  const hasQuery = query !== ''

  const primary = `inline-flex items-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent/90 ${FOCUS_RING}`
  const textLink = `rounded text-[13px] font-medium text-[#6B6B6B] underline-offset-2 hover:underline ${FOCUS_RING}`

  return (
    <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
      <div className="mx-auto max-w-md">
        <SearchX className="mx-auto h-10 w-10 text-[#B8B8B8]" aria-hidden="true" />

        <p className="mt-4 text-base font-semibold text-[#0A0A0A]">
          {hasQuery
            ? t('search.empty.noResults', lang, { query })
            : t('search.empty.filtered', lang)}
        </p>
        <p className="mt-2 text-[13px] text-[#6B6B6B]">{t('search.empty.subtitle', lang)}</p>

        {categories.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/recherche?categorie=${encodeURIComponent(c.slug)}`}
                className={`inline-flex items-center rounded-full border border-border-subtle bg-white px-4 py-2 text-[13px] font-medium text-[#0A0A0A] transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
              >
                {lang === 'ar' ? c.name_ar : c.name_fr}
              </Link>
            ))}
          </div>
        )}

        {/* Context-aware recovery actions (see the component note above). */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {hasFilters && (
            <Link href={clearFiltersHref} className={primary}>
              {t('search.filters.clear', lang)}
            </Link>
          )}
          {(hasQuery || !hasFilters) && (
            <Link href={browseAllHref} className={hasFilters ? textLink : primary}>
              {t('search.empty.browseAll', lang)}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

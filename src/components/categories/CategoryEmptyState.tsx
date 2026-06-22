import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { SearchType } from '@/lib/search/search-params'

// Empty state for a category that has zero listings of the active type (+ filters).
// Recovery actions:
//   • "Effacer les filtres" — primary, only when filters caused the zero (keeps type)
//   • "Voir l'autre type"   — switch product↔service within the same category
//   • "Parcourir tout"      — escape to /marche
// When no filters are set, "Voir l'autre type" is promoted to the primary action so the
// card always offers one prominent next step.
type Props = {
  lang: Lang
  currentType: SearchType
  hasFilters: boolean
  clearFiltersHref: string
  switchTypeHref: string
  browseAllHref: string
}

export function CategoryEmptyState({
  lang,
  currentType,
  hasFilters,
  clearFiltersHref,
  switchTypeHref,
  browseAllHref,
}: Props) {
  const primary = `inline-flex items-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-accent/90 ${FOCUS_RING}`
  const textLink = `rounded text-[13px] font-medium text-[#6B6B6B] underline-offset-2 hover:underline ${FOCUS_RING}`

  // "Voir les services" when currently on products, and vice-versa.
  const switchLabel =
    currentType === 'product'
      ? t('category.empty.switchType.toServices', lang)
      : t('category.empty.switchType.toProducts', lang)

  return (
    <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
      <div className="mx-auto max-w-md">
        <Inbox className="mx-auto h-10 w-10 text-[#B8B8B8]" aria-hidden="true" />

        <p className="mt-4 text-base font-semibold text-[#0A0A0A]">{t('category.empty.title', lang)}</p>
        <p className="mt-2 text-[13px] text-[#6B6B6B]">{t('category.empty.subtitle', lang)}</p>

        <div className="mt-6 flex flex-col items-center gap-3">
          {hasFilters && (
            <Link href={clearFiltersHref} className={primary}>
              {t('search.filters.clear', lang)}
            </Link>
          )}
          <Link href={switchTypeHref} className={hasFilters ? textLink : primary}>
            {switchLabel}
          </Link>
          <Link href={browseAllHref} className={textLink}>
            {t('category.empty.browseAll', lang)}
          </Link>
        </div>
      </div>
    </div>
  )
}

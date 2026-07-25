'use client'

import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { SearchFilters, type FilterCategory } from './SearchFilters'

type Props = {
  categories: FilterCategory[]
  selectedCategorie: string[]
  prixMin: number | null
  prixMax: number | null
  basePath?: string
  showCategory?: boolean
}

// Mobile-only entry to the filter form: a "Filtres" button (with an active-count badge)
// that opens a bottom sheet. The sheet runs SearchFilters in batch ('sheet') mode, so
// nothing re-fetches until "Appliquer". Hand-rolled overlay matching the app's existing
// modal pattern (fixed inset-0 + bg-black/40); the desktop sidebar renders the same
// form inline and is always visible (≥lg), so this whole component is lg:hidden.
export function SearchFiltersSheet({
  categories,
  selectedCategorie,
  prixMin,
  prixMax,
  basePath = '/recherche',
  showCategory = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const lang = useLang()

  const activeCount = selectedCategorie.length + (prixMin != null || prixMax != null ? 1 : 0)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-11 items-center gap-2 rounded-full border border-border-subtle bg-white px-4 text-sm font-medium text-text-primary shadow-sm transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        {t('search.filters.title', lang)}
        {activeCount > 0 && (
          <span className="ms-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-blue-600 px-1.5 text-xs font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('search.filters.title', lang)}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">{t('search.filters.title', lang)}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('search.filters.close', lang)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-text-primary hover:bg-slate-100 ${FOCUS_RING}`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <SearchFilters
              categories={categories}
              selectedCategorie={selectedCategorie}
              prixMin={prixMin}
              prixMax={prixMax}
              mode="sheet"
              basePath={basePath}
              showCategory={showCategory}
              onApplied={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { JobBoardFilters, type CityOption, type JobFilterSelection } from './JobBoardFilters'
import type { FilterCategory } from '@/components/recherche/SearchFilters'

// Mobile/tablet (<xl) entry to the job filters: a "Filtres" button (with an active-count badge)
// that opens a bottom sheet running JobBoardFilters in batch ('sheet') mode. Mirrors the consumer
// SearchFiltersSheet; the desktop rail (≥xl) renders the same form inline and is always visible.
type Props = {
  categories: FilterCategory[]
  cityOptions: CityOption[]
  skillOptions: string[]
  selected: JobFilterSelection
}

export function JobBoardFiltersSheet({ categories, cityOptions, skillOptions, selected }: Props) {
  const [open, setOpen] = useState(false)
  const lang = useLang()

  const activeCount =
    selected.categories.length +
    selected.cities.length +
    selected.skills.length +
    (selected.minBudget != null || selected.maxBudget != null ? 1 : 0) +
    (selected.postedWithin != null ? 1 : 0)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex h-11 items-center gap-2 rounded-full border border-border-subtle bg-white px-4 text-sm font-medium text-[#0A0A0A] shadow-sm transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
        {t('search.filters.title', lang)}
        {activeCount > 0 && (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-accent px-1.5 text-xs font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('search.filters.title', lang)}
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0A0A0A]">{t('search.filters.title', lang)}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('search.filters.close', lang)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-[#0A0A0A] hover:bg-slate-100 ${FOCUS_RING}`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <JobBoardFilters
              mode="sheet"
              categories={categories}
              cityOptions={cityOptions}
              skillOptions={skillOptions}
              selected={selected}
              onApplied={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}

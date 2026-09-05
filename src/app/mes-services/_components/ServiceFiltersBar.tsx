'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { FOCUS_RING } from '@/components/layout/styles'
import { buildSearchQuery } from '@/components/recherche/search-url'
import {
  SERVICE_TABS,
  SERVICE_SORTS,
  type ServiceTab,
  type ServiceSort,
} from '@/lib/marche/seller-services'

const ROUTE = '/mes-services'

// Figma 244:726 — Segmented (Tous/Actifs/En pause, count=3) + search Input + a "Trier par" Select.
// The Select's own option list was never measured (the specimen shows only the closed trigger,
// "Trier par", no open panel) — these three sorts mirror ProduitsFilterBar's SORT_OPTIONS, the
// established convention for a "Trier par" trigger reading exactly this in every other list page.
export function ServiceFiltersBar({
  tab,
  q,
  sort,
  counts,
  lang,
}: {
  tab: ServiceTab
  q: string
  sort: ServiceSort
  counts: Record<ServiceTab, number>
  lang: Lang
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const [query, setQuery] = useState(q)

  function push(patch: Parameters<typeof buildSearchQuery>[1]) {
    const qs = buildSearchQuery(sp, patch, { resetPage: true })
    router.push(qs ? `${ROUTE}?${qs}` : ROUTE)
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <SegmentedControl
        ariaLabel={t('service.tabs_aria', lang)}
        value={tab}
        onChange={(next) => push({ statut: next === 'all' ? null : next })}
        options={SERVICE_TABS.map((key) => ({
          value: key,
          label: `${t(`service.tab.${key}`, lang)} (${counts[key]})`,
        }))}
      />

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          push({ q: query.trim() || null })
        }}
        className="min-w-0 flex-1"
      >
        <div
          className={`flex h-10 items-center gap-2 rounded-lg border border-border-strong bg-white px-3 focus-within:border-brand-blue-600 focus-within:ring-2 focus-within:ring-brand-blue-600 focus-within:ring-offset-2 ${FOCUS_RING}`}
        >
          <Search className="h-4 w-4 shrink-0 text-icon-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('service.search_placeholder', lang)}
            className="w-full min-w-0 bg-transparent text-body-sm text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>
      </form>

      <select
        value={sort}
        onChange={(e) => push({ tri: e.target.value as ServiceSort })}
        aria-label={t('service.sort_placeholder', lang)}
        className={`h-10 shrink-0 rounded-lg border border-border-strong bg-white px-3 text-body-sm text-text-primary ${FOCUS_RING}`}
      >
        {SERVICE_SORTS.map((key) => (
          <option key={key} value={key}>
            {t(`service.sort.${key}`, lang)}
          </option>
        ))}
      </select>
    </div>
  )
}

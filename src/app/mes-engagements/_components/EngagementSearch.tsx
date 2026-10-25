'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { buildSearchQuery } from '@/components/recherche/search-url'

const ROUTE = '/mes-engagements'

// The filter bar's search Input — Figma 273:8616 (w 372, h 44, px 16, r 10, 1 px border/strong, icon-search
// 18, « Rechercher un client ou service… », no label and no helper). Submitting writes `?q=`, keeping the
// tab and the sort (buildSearchQuery) and dropping `page` — a new result set starts at page 1. The match
// itself is done server-side over the freelancer's loaded engagements (matchesEngagementQuery).
export function EngagementSearch({ q, lang }: { q: string; lang: Lang }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [query, setQuery] = useState(q)

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const term = query.trim()
        // From the default tab (« À traiter », pending only — no `statut` in the URL) a search would miss every
        // other engagement, so it widens to « Tous ». A tab the freelancer chose stays: they narrowed on purpose.
        const widen = term && !sp.get('statut') ? { statut: 'all' } : {}
        const qs = buildSearchQuery(sp, { q: term || null, ...widen }, { resetPage: true })
        router.push(qs ? `${ROUTE}?${qs}` : ROUTE)
      }}
      className="w-full min-w-0 sm:w-[372px]"
    >
      <div className="flex h-11 items-center gap-2 rounded-[10px] border border-border-strong bg-surface-base px-4 focus-within:border-brand-blue-600 focus-within:ring-2 focus-within:ring-brand-blue-600 focus-within:ring-offset-2">
        <Search className="size-[18px] shrink-0 text-icon-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t('engagements.search_placeholder', lang)}
          placeholder={t('engagements.search_placeholder', lang)}
          className="w-full min-w-0 bg-transparent text-body text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>
    </form>
  )
}

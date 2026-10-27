'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { buildSearchQuery } from '@/components/recherche/search-url'

const ROUTE = '/mes-propositions'

// The filter bar's search Input — Figma 298:9171 (w 372, h 44, icon-search 18, « Rechercher une mission ou un client... »), the H8
// control on another route. Submitting writes `?q=`, keeping tab and sort and dropping `page`. The match itself runs server-side
// over the loaded proposals (matchesProposalQuery). The default tab is « Toutes », so a search never needs to widen it.
// The placeholder is 14 px below `sm` (the typed text stays 16 px — iOS zooms a focused input under 16): « Rechercher une mission ou un
// client... » did not fit a 343 px field and clipped; `truncate` is the net for longer Arabic copy.
export function ProposalSearch({ q, lang }: { q: string; lang: Lang }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [query, setQuery] = useState(q)

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const qs = buildSearchQuery(sp, { q: query.trim() || null }, { resetPage: true })
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
          aria-label={t('propositions.search_placeholder', lang)}
          placeholder={t('propositions.search_placeholder', lang)}
          className="w-full min-w-0 truncate bg-transparent text-body text-text-primary outline-none placeholder:text-body-sm placeholder:text-text-muted sm:placeholder:text-body"
        />
      </div>
    </form>
  )
}

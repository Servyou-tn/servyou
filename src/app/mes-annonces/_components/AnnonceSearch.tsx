'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { buildSearchQuery } from '@/components/recherche/search-url'

const ROUTE = '/mes-annonces'

// The filter bar's search Input — Figma 1476:27992 (w 372, h 44, icon-search 18, « Rechercher une annonce… »), H11's ProposalSearch on
// another route. Submitting writes `?q=`, keeping tab and sort and dropping `page`; the match runs server-side over the loaded annonces
// (matchesAnnonceQuery). `truncate` is the net for longer Arabic placeholder copy.
export function AnnonceSearch({ q, lang }: { q: string; lang: Lang }) {
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
      <div className="flex h-11 items-center gap-2 rounded-lg border border-border-strong bg-surface-base px-4 focus-within:border-brand-blue-600 focus-within:ring-2 focus-within:ring-brand-blue-600 focus-within:ring-offset-2">
        <Search className="size-[18px] shrink-0 text-icon-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={t('mesannonces.search_placeholder', lang)}
          placeholder={t('mesannonces.search_placeholder', lang)}
          className="w-full min-w-0 truncate bg-transparent text-body text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>
    </form>
  )
}

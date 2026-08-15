'use client'

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { buildSearchQuery } from './search-url'
import type { SearchType } from '@/lib/search/search-params'

// The free-text query input for /recherche and /categories/[slug] — both public pages whose
// entire search UI used to be shell-supplied (MarcheTopBar's ExpandableSearch, retired with the
// legacy marche shell). Copied from ProduitsFilterBar's q-input pattern
// (marche/produits/_components/ProduitsFilterBar.tsx), not the whole filter bar — Catégorie /
// Ville / Prix / Tri already exist on both consumers via SearchFilters / SearchFiltersSheet; only
// the free-text box was missing. /categories/[slug] had none at all before this (MarcheLayout was
// always passed searchQuery="" there — there was no reachable UI to set it).
//
// Submits via buildSearchQuery(useSearchParams(), ...), patching `q` onto the CURRENT url — every
// other param already there, including `type`, survives untouched. That's deliberate: unlike
// TopbarSearch (the shell's fallback widget, which has to INFER type from pathname because it
// holds no other context), this component doesn't need to re-derive type — the current URL
// already has the real answer, and this patch-in-place preserves it automatically.
export function SearchQueryInput({
  initialQuery,
  type,
  basePath,
}: {
  initialQuery: string
  type: SearchType
  basePath: string
}) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()
  const [query, setQuery] = useState(initialQuery)
  const placeholder = t(
    type === 'product' ? 'produits.filters.searchPlaceholder' : 'services.filters.searchPlaceholder',
    lang,
  )

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const qs = buildSearchQuery(sp, { q: query.trim() || null }, { resetPage: true })
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  return (
    <form onSubmit={onSubmit} role="search">
      <div className="flex h-11 items-center gap-2 rounded-[10px] border border-border-strong bg-white px-4 focus-within:border-brand-blue-600">
        <Search className="h-[18px] w-[18px] shrink-0 text-text-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>
    </form>
  )
}

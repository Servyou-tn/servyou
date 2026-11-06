'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { buildSearchQuery } from '@/components/recherche/search-url'

// Admin list search (Figma « Input / variant=search »): 44 tall, border-strong, radius 10, px 16, 18px icon,
// body 16. Submitting writes `?q=`, keeps the other params and drops `page`. The label is passed in already
// translated (it doubles as the placeholder). Same pattern as signalements/_components/ReportSearch.tsx.
export function AdminSearch({ route, q, label }: { route: string; q: string; label: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [query, setQuery] = useState(q)

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const qs = buildSearchQuery(sp, { q: query.trim() || null }, { resetPage: true })
        router.push(qs ? `${route}?${qs}` : route)
      }}
      className="min-w-0 flex-1"
    >
      <div className="flex h-11 items-center gap-2 rounded-[10px] border border-border-strong bg-surface-base px-4 focus-within:border-brand-blue-600 focus-within:ring-2 focus-within:ring-brand-blue-600 focus-within:ring-offset-2">
        <Search className="size-[18px] shrink-0 text-text-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          maxLength={100}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={label}
          placeholder={label}
          className="w-full min-w-0 truncate bg-transparent text-body text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { buildSearchQuery } from '@/components/recherche/search-url'

const ROUTE = '/admin/signalements'

// J5 filters « Input / variant=search »: 44 tall, border-strong, radius 10, px-16, 18px icon, body 16.
// Submitting writes `?q=` and keeps the tab and the filters; the match runs server-side over the loaded
// queue (matchesReportQuery). Same pattern as /mes-annonces' AnnonceSearch.
export function ReportSearch({ q, lang }: { q: string; lang: Lang }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [query, setQuery] = useState(q)

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault()
        const qs = buildSearchQuery(sp, { q: query.trim() || null })
        router.push(qs ? `${ROUTE}?${qs}` : ROUTE)
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
          aria-label={t('admin.reports.search_placeholder', lang)}
          placeholder={t('admin.reports.search_placeholder', lang)}
          className="w-full min-w-0 truncate bg-transparent text-body text-text-primary outline-none placeholder:text-text-muted"
        />
      </div>
    </form>
  )
}

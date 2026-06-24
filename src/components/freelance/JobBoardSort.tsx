'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { buildSearchQuery } from '@/components/recherche/search-url'
import type { JobBoardSort as JobBoardSortValue } from '@/lib/freelance/job-board-data'

// The sort control — a native <select> (most robust + accessible). Two options in v1: newest
// (default) and highest budget. fewest_responses is intentionally absent (the response count
// isn't readable under RLS — deferred). A change writes ?sort= and resets to page 1; the default
// 'newest' is stripped from the URL as noise.
export function JobBoardSort({ value }: { value: JobBoardSortValue }) {
  const router = useRouter()
  const sp = useSearchParams()
  const lang = useLang()
  const base = '/emplois'

  function onChange(next: string) {
    const qs = buildSearchQuery(sp, { sort: next === 'newest' ? null : next }, { resetPage: true })
    router.push(qs ? `${base}?${qs}` : base)
  }

  return (
    <label className="relative inline-flex items-center gap-2 text-sm text-text-muted">
      <span className="whitespace-nowrap">{t('emplois.sort.label', lang)}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-10 cursor-pointer appearance-none rounded-full border border-border-subtle bg-white py-0 pe-9 ps-4 text-sm font-medium text-text-primary ${FOCUS_RING}`}
        >
          <option value="newest">{t('emplois.sort.newest', lang)}</option>
          <option value="highest_budget">{t('emplois.sort.highest_budget', lang)}</option>
        </select>
        <ChevronDown
          className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
          aria-hidden="true"
        />
      </span>
    </label>
  )
}

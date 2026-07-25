'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { buildSearchQuery } from '@/components/recherche/search-url'
import { paginationRange } from './pagination-range'

// URL-driven numbered pagination (Upwork-style): [‹] [1] … [4] [5] [6] … [N] [›]. Each page is a
// real <Link> that sets ?page= while preserving every other search param (filters, sort, query,
// the favorites/orders tab), so the browser back button replays pages and the URLs stay
// bookmarkable. Prev/next are inert <span>s at the boundaries. The whole control hides when
// there's only one page. The desktop row shows a ±1 window; a tighter mobile row (first /
// current / last) keeps it from overflowing a 375px viewport. Shared by every marche list page —
// the 4 search/browse pages and the 3 account pages.
export function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number
  totalPages: number
  basePath: string
}) {
  const sp = useSearchParams()
  const lang = useLang()

  if (totalPages <= 1) return null

  const current = Math.min(Math.max(1, page), totalPages)

  const hrefFor = (target: number) => {
    const qs = buildSearchQuery(sp, { page: target })
    return qs ? `${basePath}?${qs}` : basePath
  }
  // Reuse the existing "Page {current} sur {total}" string as each number's accessible name, so
  // a screen reader announces "Page 5 sur 47" (+ "current page" on the active one) — no new key.
  const pageLabel = (n: number) =>
    t('search.pagination.pageOf', lang, { current: n, total: totalPages })

  const cell = 'inline-flex h-9 items-center justify-center rounded-full text-sm transition-colors'
  const numberIdle = cn(cell, 'min-w-9 px-2.5 font-medium text-text-muted hover:bg-surface-subtle', FOCUS_RING)
  const numberActive = cn(cell, 'min-w-9 px-2.5 font-semibold bg-brand-blue-600 text-white')
  const arrowEnabled = cn(cell, 'gap-1 px-3 font-medium text-text-primary hover:bg-surface-subtle', FOCUS_RING)
  const arrowDisabled = cn(cell, 'gap-1 px-3 font-medium text-text-muted opacity-50 cursor-not-allowed pointer-events-none')
  const dots = cn(cell, 'min-w-9 px-1 text-text-muted')

  const prevDisabled = current <= 1
  const nextDisabled = current >= totalPages

  // The number row, rendered once per breakpoint window (desktop ±1 / mobile first·current·last).
  const numbers = (neighbors: number) =>
    paginationRange(current, totalPages, neighbors).map((item, i) => {
      if (item === 'ellipsis') {
        return (
          <span key={`e${i}`} className={dots} aria-hidden="true">
            …
          </span>
        )
      }
      if (item === current) {
        return (
          <span key={item} className={numberActive} aria-current="page" aria-label={pageLabel(item)}>
            {item}
          </span>
        )
      }
      return (
        <Link key={item} href={hrefFor(item)} className={numberIdle} aria-label={pageLabel(item)}>
          {item}
        </Link>
      )
    })

  return (
    <nav
      aria-label={t('search.pagination.label', lang)}
      className="flex items-center justify-center gap-1.5"
    >
      {prevDisabled ? (
        <span className={arrowDisabled} aria-disabled="true" aria-label={t('search.pagination.prev', lang)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('search.pagination.prev', lang)}</span>
        </span>
      ) : (
        <Link href={hrefFor(current - 1)} rel="prev" className={arrowEnabled} aria-label={t('search.pagination.prev', lang)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">{t('search.pagination.prev', lang)}</span>
        </Link>
      )}

      {/* Desktop window (±1) on >=sm; tighter first·current·last on mobile so it fits 375px. */}
      <div className="hidden items-center gap-1.5 sm:flex">{numbers(1)}</div>
      <div className="flex items-center gap-1.5 sm:hidden">{numbers(0)}</div>

      {nextDisabled ? (
        <span className={arrowDisabled} aria-disabled="true" aria-label={t('search.pagination.next', lang)}>
          <span className="hidden sm:inline">{t('search.pagination.next', lang)}</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : (
        <Link href={hrefFor(current + 1)} rel="next" className={arrowEnabled} aria-label={t('search.pagination.next', lang)}>
          <span className="hidden sm:inline">{t('search.pagination.next', lang)}</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </nav>
  )
}

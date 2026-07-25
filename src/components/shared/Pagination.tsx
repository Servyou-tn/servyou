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

// URL-driven numbered pagination, restyled to the v3.7 Figma (611:45637 → Pagination 188:14219):
// 36×36 cells, radius 8, subtle border on idle numbers + arrows, brand-accent fill on the active
// page, icon-only prev/next, and an optional "Affichage X à Y sur Z" caption stacked beneath.
// Each page is a real <Link> that sets ?page= while preserving every other search param (filters,
// sort, query, the favorites/orders tab), so the browser back button replays pages and URLs stay
// bookmarkable. Prev/next are inert <span>s at the boundaries. The whole control hides when
// there's only one page. The desktop row shows a ±1 window; a tighter mobile row keeps it inside
// a 375px viewport. SHARED by every marche list page (the search/browse pages + the account
// pages) — the restyle lands on all of them; the caption only renders where a caller passes
// totalItems + perPage (today: /marche/services).
export function Pagination({
  page,
  totalPages,
  basePath,
  totalItems,
  perPage,
}: {
  page: number
  totalPages: number
  basePath: string
  totalItems?: number
  perPage?: number
}) {
  const sp = useSearchParams()
  const lang = useLang()

  if (totalPages <= 1) return null

  const current = Math.min(Math.max(1, page), totalPages)

  const hrefFor = (target: number) => {
    const qs = buildSearchQuery(sp, { page: target })
    return qs ? `${basePath}?${qs}` : basePath
  }
  // Reuse the "Page {current} sur {total}" string as each number's accessible name, so a screen
  // reader announces "Page 5 sur 47" (+ "current page" on the active one) — no new key.
  const pageLabel = (n: number) =>
    t('search.pagination.pageOf', lang, { current: n, total: totalPages })

  // Shared cell: 36×36, radius 8, semibold. Idle number = white fill + subtle border + slate-600;
  // active = brand-accent (#1f5fe0) fill + white; arrows share the shape, icon-only.
  const cell =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors'
  const numberIdle = cn(cell, 'border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle', FOCUS_RING)
  const numberActive = cn(cell, 'bg-brand-accent text-white')
  const arrowEnabled = cn(cell, 'border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle', FOCUS_RING)
  const arrowDisabled = cn(cell, 'border border-border-subtle bg-white text-text-muted opacity-50 cursor-not-allowed pointer-events-none')
  const dots = cn(cell, 'text-text-muted')

  const prevDisabled = current <= 1
  const nextDisabled = current >= totalPages

  // Logical arrows: in RTL "previous" points right, so the glyphs swap with the direction.
  const PrevIcon = lang === 'ar' ? ChevronRight : ChevronLeft
  const NextIcon = lang === 'ar' ? ChevronLeft : ChevronRight

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

  // "Affichage X à Y sur Z" — only when the caller supplies the totals (the services browse).
  const caption =
    totalItems != null && perPage != null
      ? t('search.pagination.showing', lang, {
          start: (current - 1) * perPage + 1,
          end: Math.min(current * perPage, totalItems),
          total: totalItems,
        })
      : null

  return (
    <div className="flex flex-col items-center gap-2.5">
      <nav aria-label={t('search.pagination.label', lang)} className="flex items-center gap-1">
        {prevDisabled ? (
          <span className={arrowDisabled} aria-disabled="true" aria-label={t('search.pagination.prev', lang)}>
            <PrevIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <Link href={hrefFor(current - 1)} rel="prev" className={arrowEnabled} aria-label={t('search.pagination.prev', lang)}>
            <PrevIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}

        {/* Desktop window (±1) on >=sm; tighter first·current·last on mobile so it fits 375px. */}
        <div className="hidden items-center gap-1 sm:flex">{numbers(1)}</div>
        <div className="flex items-center gap-1 sm:hidden">{numbers(0)}</div>

        {nextDisabled ? (
          <span className={arrowDisabled} aria-disabled="true" aria-label={t('search.pagination.next', lang)}>
            <NextIcon className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <Link href={hrefFor(current + 1)} rel="next" className={arrowEnabled} aria-label={t('search.pagination.next', lang)}>
            <NextIcon className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </nav>
      {caption && <p className="text-[13px] text-text-muted">{caption}</p>}
    </div>
  )
}

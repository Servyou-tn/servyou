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
  totalItems,
  perPage,
}: {
  page: number
  totalPages: number
  basePath: string
  /**
   * Optional "Affichage {start} à {end} sur {total}" caption (Figma 611:45637). Both must be
   * supplied together; omit them and the control renders exactly as before — the three other
   * consumers (/recherche, /categories/[slug], /mes-missions) are deliberately unchanged.
   */
  totalItems?: number
  perPage?: number
}) {
  const sp = useSearchParams()
  const lang = useLang()

  const current = Math.min(Math.max(1, page), totalPages)

  // The caption is meaningful even on a single page ("Affichage 1 à 8 sur 8"), so it is
  // computed before the one-page early return below.
  const caption =
    totalItems != null && perPage != null && totalItems > 0
      ? t('search.pagination.showing', lang, {
          start: (current - 1) * perPage + 1,
          end: Math.min(current * perPage, totalItems),
          total: totalItems,
        })
      : null

  // text-[13px]: the Figma caption measures 13 and the type scale jumps 12 (text-caption) → 14
  // (text-body-sm), so there is no token for it. Off-token by measurement, not by guess — same
  // treatment as rounded-[10px] elsewhere in the shell. Logged in docs/follow-ups.md.
  const captionClass = 'text-[13px] leading-4 text-text-muted'

  if (totalPages <= 1) {
    return caption ? <p className={cn('text-center', captionClass)}>{caption}</p> : null
  }

  const hrefFor = (target: number) => {
    const qs = buildSearchQuery(sp, { page: target })
    return qs ? `${basePath}?${qs}` : basePath
  }
  // Reuse the existing "Page {current} sur {total}" string as each number's accessible name, so
  // a screen reader announces "Page 5 sur 47" (+ "current page" on the active one) — no new key.
  const pageLabel = (n: number) =>
    t('search.pagination.pageOf', lang, { current: n, total: totalPages })

  // Figma 188:14219: every cell is a 36×36 square at radius 8 (rounded-md — tokens.css sets
  // --radius-md: 8px), NOT a pill. Idle cells carry a 1px border-subtle outline on white; the
  // active cell is a solid brand-blue-600 fill. Numbers are semibold in both states.
  const cell =
    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold transition-colors'
  const numberIdle = cn(cell, 'border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle', FOCUS_RING)
  const numberActive = cn(cell, 'bg-brand-blue-600 text-white')
  // Arrows are icon-only 36×36 boxes with the same border treatment — no text label.
  const arrowEnabled = cn(cell, 'border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle', FOCUS_RING)
  const arrowDisabled = cn(cell, 'border border-border-subtle bg-white text-text-muted opacity-50 cursor-not-allowed pointer-events-none')
  const dots = cn(cell, 'text-text-muted')

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
    // Figma stacks the control VERTICALLY at gap 10: the pages row first, the caption beneath it.
    <div className="flex flex-col items-center gap-2.5">
      <nav
        aria-label={t('search.pagination.label', lang)}
        className="flex items-center justify-center gap-1"
      >
        {/* Prev/next are icon-only in Figma — the visible text label is gone, so aria-label is
            now the sole accessible name (it already was on mobile, where the label was hidden). */}
        {prevDisabled ? (
          <span className={arrowDisabled} aria-disabled="true" aria-label={t('search.pagination.prev', lang)}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <Link href={hrefFor(current - 1)} rel="prev" className={arrowEnabled} aria-label={t('search.pagination.prev', lang)}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}

        {/* Desktop window (±1) on >=sm; tighter first·current·last on mobile so it fits 375px. */}
        <div className="hidden items-center gap-1 sm:flex">{numbers(1)}</div>
        <div className="flex items-center gap-1 sm:hidden">{numbers(0)}</div>

        {nextDisabled ? (
          <span className={arrowDisabled} aria-disabled="true" aria-label={t('search.pagination.next', lang)}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        ) : (
          <Link href={hrefFor(current + 1)} rel="next" className={arrowEnabled} aria-label={t('search.pagination.next', lang)}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </nav>
      {caption && <p className={captionClass}>{caption}</p>}
    </div>
  )
}

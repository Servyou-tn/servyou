'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { buildSearchQuery } from './search-url'

// URL-driven pagination (?page=) so the browser back button replays pages. Prev/next are
// real <Link>s when navigable and inert <span>s at the boundaries (aria-disabled). All
// other search params are preserved across page changes.
export function SearchPagination({
  page,
  totalPages,
  basePath = '/recherche',
}: {
  page: number
  totalPages: number
  basePath?: string
}) {
  const sp = useSearchParams()
  const lang = useLang()

  if (totalPages <= 1) return null

  function hrefFor(target: number) {
    const qs = buildSearchQuery(sp, { page: target })
    return qs ? `${basePath}?${qs}` : basePath
  }

  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages

  const base =
    'inline-flex h-10 items-center gap-1 rounded-full border border-border-subtle bg-white px-4 text-sm font-medium transition-colors'
  const enabled = `text-[#0A0A0A] hover:bg-slate-50 ${FOCUS_RING}`
  const disabled = 'cursor-not-allowed text-[#B8B8B8]'

  return (
    <nav
      aria-label={t('search.pagination.label', lang)}
      className="flex items-center justify-center gap-4"
    >
      {prevDisabled ? (
        <span className={`${base} ${disabled}`} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t('search.pagination.prev', lang)}
        </span>
      ) : (
        <Link href={hrefFor(page - 1)} className={`${base} ${enabled}`} rel="prev">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          {t('search.pagination.prev', lang)}
        </Link>
      )}

      <span className="text-[13px] font-medium text-[#6B6B6B]">
        {t('search.pagination.pageOf', lang, { current: page, total: totalPages })}
      </span>

      {nextDisabled ? (
        <span className={`${base} ${disabled}`} aria-disabled="true">
          {t('search.pagination.next', lang)}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      ) : (
        <Link href={hrefFor(page + 1)} className={`${base} ${enabled}`} rel="next">
          {t('search.pagination.next', lang)}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </nav>
  )
}

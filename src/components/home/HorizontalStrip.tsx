import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// Shared shell for every homepage content strip: a heading + "Voir tout" link, then a
// horizontally-scrollable track. Children are the cards (each fixed-width + shrink-0).
// Mobile peeks the next card (the track overflows) to signal swipability.
export function HorizontalStrip({
  title,
  viewAllHref,
  lang,
  children,
}: {
  title: string
  viewAllHref: string
  lang: Lang
  children: ReactNode
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#0A0A0A]">{title}</h2>
        <Link
          href={viewAllHref}
          className={`inline-flex shrink-0 items-center gap-1 rounded text-[13px] font-medium text-brand-accent hover:underline ${FOCUS_RING}`}
        >
          {t('home.viewAll', lang)}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* The negative margin + padding let the cards' hover shadow breathe without being
          clipped by overflow-x. */}
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">{children}</div>
    </section>
  )
}

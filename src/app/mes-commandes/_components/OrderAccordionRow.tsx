'use client'

import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import { FOCUS_RING } from '@/components/layout/styles'

// The E3 accordion row shell, shared by the Services and Produits lists (Figma 709:59673 / 710:59952 services,
// 705:59339 / 704:59262 products — identical anatomy, only the thumbnail and the data differ).
//
// Collapsed header 93 tall (desktop) / 81 (mobile), pad 16/20, gap 12: 48 thumb · title 15/22 SemiBold + counterpart
// 13/18 muted + date 12/17 muted · price 15/22 SemiBold blue-800 + StatusPill + chevron. Mobile stacks price over the
// pill and folds counterpart + date into one « Nom · 24 nov » line (710:59958).
//
// Client because the row expands in place. The caller owns `open` (one accordion open at a time) and renders the body
// as `children`, which is only mounted while open.
export function OrderAccordionRow({
  id,
  open,
  onToggle,
  thumb,
  title,
  counterpart,
  date,
  price,
  pill,
  children,
}: {
  id: string
  open: boolean
  onToggle: () => void
  /** The 48 px leading visual (avatar for a service, a square product image for a product). */
  thumb: ReactNode
  title: string
  /** Second line: the freelancer or the shop. null → omitted. */
  counterpart: string | null
  /** Already formatted (« 24 nov »). */
  date: string
  /** Already formatted (« 2 400 TND »); null → no price shown. */
  price: string | null
  pill: { status: StatusValue; label: string }
  children: ReactNode
}) {
  const lang = useLang()
  const bodyId = `order-body-${id}`
  const headerId = `order-header-${id}`

  return (
    <div className="bg-surface-base">
      <h3>
        <button
          type="button"
          id={headerId}
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className={`flex w-full items-center gap-3 px-4 py-4 text-start lg:px-5 ${FOCUS_RING}`}
        >
          {thumb}

          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-body-sm font-semibold text-text-primary lg:text-[15px] lg:leading-[22px]">
              {title}
            </span>
            {/* Desktop: counterpart and date on their own lines. Mobile: one "Nom · 24 nov" line. */}
            <span className="truncate text-caption text-text-muted lg:hidden">
              {[counterpart, date].filter(Boolean).join(' · ')}
            </span>
            {counterpart ? (
              <span className="hidden truncate text-[13px] leading-[18px] text-text-muted lg:block">{counterpart}</span>
            ) : null}
            <span className="hidden text-caption leading-[17px] text-text-muted lg:block">{date}</span>
          </span>

          <span className="flex shrink-0 flex-col items-end gap-1 lg:flex-row lg:items-center lg:gap-3">
            {price && (
              // dir="ltr": « 127 TND » is a bidi-neutral run of digits and Latin letters that reverses to « TND 127 » in AR.
              <span dir="ltr" className="text-body-sm font-semibold text-brand-blue-800 lg:text-[15px] lg:leading-[22px]">
                {price}
              </span>
            )}
            <StatusPill status={pill.status}>{pill.label}</StatusPill>
          </span>

          <ChevronDown
            className={`h-5 w-5 shrink-0 text-text-muted transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
          <span className="sr-only">{t(open ? 'mesCommandes.collapse' : 'mesCommandes.expand', lang)}</span>
        </button>
      </h3>

      <div className="h-px bg-border-subtle" aria-hidden="true" />

      {open && (
        <div
          id={bodyId}
          role="region"
          aria-labelledby={headerId}
          className="flex flex-col gap-4 px-4 py-4 lg:px-5 lg:py-5"
        >
          {children}
        </div>
      )}

      {open && <div className="h-px bg-border-subtle" aria-hidden="true" />}
    </div>
  )
}

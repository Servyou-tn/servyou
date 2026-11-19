'use client'

import Link from 'next/link'
import type { MouseEvent, ReactNode } from 'react'
import { Bell, CheckCheck, CircleCheck, CircleX, PackageCheck, ShoppingBag, Truck, X, type LucideIcon } from 'lucide-react'
import type { Lang } from '@/lib/i18n'
import { t } from '@/lib/i18n'
import { relativeTimeLabel } from '@/lib/relative-time'
import { bellSentenceText, type BellFeed, type BellIcon, type BellItem, type BellTone } from '@/lib/notifications/bell'
import { FOCUS_RING } from '@/components/layout/styles'
import { HitArea } from '@/components/ui/interactive-surface'

// The bell's panel content — Figma « NOV 18 — Notifications (cloche) · v1 » (1778:30747; measurements in
// docs/design/bell-panel-measurements.md). One body for both surfaces: the desktop dropdown (≥ 1024, panel-* frames) and
// the mobile bottom sheet (< 1024, m375-* frames) differ only in their header (the sheet adds a ✕ and puts « Tout marquer
// comme lu » on its own row).
//
// The panel knows nothing about orders: every kind yields the same BellItem — an icon KEY, a tone, a sentence (key +
// vars), a title / reference and a link (src/lib/notifications/bell.ts; the kind map is bell-kinds.ts). A later kind
// picks from the two maps below, or adds a key to BellIcon / BellTone — these Records then fail to type-check until it
// is mapped — and renders unchanged.
//
// Classes holding a text-size token (text-body-sm, text-caption) are template literals, never cn(): twMerge drops a
// custom size token sitting next to a text colour.

/** The tile behind the glyph, per tone (spec: new = blue, done = success, on its way = indigo, stopped = danger). */
const TONE_CLASS: Record<BellTone, string> = {
  info: 'bg-brand-blue-100 text-brand-blue-700',
  success: 'bg-success-100 text-success-700',
  progress: 'bg-brand-indigo-50 text-brand-indigo-600',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
  neutral: 'bg-surface-subtle text-text-muted',
}

const ICON: Record<BellIcon, LucideIcon> = {
  'shopping-bag': ShoppingBag,
  'circle-check': CircleCheck,
  'package-check': PackageCheck,
  truck: Truck,
  'circle-x': CircleX,
  bell: Bell,
}

export type BellPanelVariant = 'menu' | 'sheet'

type HeaderProps = {
  variant: BellPanelVariant
  view: BellFeed
  lang: Lang
  titleId: string
  markAll: () => void
  markAllFailed: boolean
  onClose: () => void
}

/** The title, the unread pill, « Tout marquer comme lu » (and the sheet's ✕), over a bottom rule. */
export function BellPanelHeader({ variant, view, lang, titleId, markAll, markAllFailed, onClose }: HeaderProps) {
  // The SERVER count drives the pill and « Tout marquer ». It counts only the kinds the map knows (founder, #401 D8), so
  // it can exceed the 20 listed but never counts a row the list cannot show.
  const unread = view.ok ? view.unreadCount : 0
  const sheet = variant === 'sheet'

  const markAllButton =
    unread > 0 ? (
      <button
        type="button"
        onClick={markAll}
        className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-md text-body-sm font-medium text-brand-blue-600 transition-colors hover:text-brand-blue-700 ${FOCUS_RING}`}
      >
        <CheckCheck className="h-4 w-4" aria-hidden="true" />
        {t('shell.topbar.notifications.markAll', lang)}
        <HitArea size={20} axis="y" />
      </button>
    ) : null

  return (
    <div className="shrink-0 border-b border-border-subtle">
      <div className={sheet ? 'flex items-center gap-2 py-1 pe-3 ps-5' : 'flex items-center gap-2 px-5 py-4'}>
        <h2 id={titleId} className="text-lg font-semibold leading-[26px] text-text-primary">
          {t('shell.topbar.notifications.title', lang)}
        </h2>
        {unread > 0 ? (
          <span className="rounded-full bg-brand-blue-100 px-2 py-0.5 text-caption font-semibold text-brand-blue-700">
            {unread}
          </span>
        ) : null}
        <span className="flex-1" aria-hidden="true" />
        {sheet ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('shell.topbar.notifications.close', lang)}
            className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-text-primary transition-colors hover:bg-surface-subtle ${FOCUS_RING}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <HitArea size={40} />
          </button>
        ) : (
          markAllButton
        )}
      </div>
      {sheet && markAllButton ? <div className="px-5 pb-3">{markAllButton}</div> : null}
      {markAllFailed ? (
        <p role="alert" className="px-5 pb-3 text-body-sm text-danger-700">
          {t('shell.topbar.notifications.markAllError', lang)}
        </p>
      ) : null}
    </div>
  )
}

type BodyProps = {
  view: BellFeed
  lang: Lang
  /** A shell with no feed of its own (the admin topbar): the empty state without the « commande » hint. */
  hint: boolean
  onOpenItem: (event: MouseEvent<HTMLAnchorElement>, item: BellItem) => void
}

/** The 20 newest items (the list scrolls), the empty state, or — for a failed read — the error, never « empty ». */
export function BellPanelBody({ view, lang, hint, onOpenItem }: BodyProps) {
  if (!view.ok) {
    return (
      <p role="status" className="px-8 py-10 text-center text-body-sm text-text-muted">
        {t('shell.topbar.notifications.error', lang)}
      </p>
    )
  }
  if (view.items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-8 py-10 text-center">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle">
          <Bell className="h-[22px] w-[22px] text-text-muted" aria-hidden="true" />
        </span>
        <p className="text-body-sm font-semibold text-text-primary">{t('shell.topbar.notifications.empty', lang)}</p>
        {hint ? (
          <p className="max-w-[280px] text-body-sm text-text-muted">{t('shell.topbar.notifications.emptyBody', lang)}</p>
        ) : null}
      </div>
    )
  }
  return (
    <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {view.items.map((item, i) => (
        <li key={item.id} className={i < view.items.length - 1 ? 'border-b border-border-subtle' : undefined}>
          <BellItemLink item={item} lang={lang} onOpen={onOpenItem} />
        </li>
      ))}
    </ul>
  )
}

function BellItemLink({
  item,
  lang,
  onOpen,
}: {
  item: BellItem
  lang: Lang
  onOpen: (event: MouseEvent<HTMLAnchorElement>, item: BellItem) => void
}) {
  const Glyph = ICON[item.icon]
  const sentence = bellSentenceText(item.sentence, (key, vars) => t(key, lang, vars))
  const subject = item.title ?? item.ref
  return (
    <Link
      href={item.href}
      prefetch={false}
      onClick={(e) => onOpen(e, item)}
      onAuxClick={(e) => onOpen(e, item)}
      className={`flex items-start gap-3 px-5 py-3.5 transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-blue-600 ${
        item.unread ? 'bg-brand-blue-50 hover:bg-brand-blue-100/60' : 'bg-surface-base hover:bg-surface-subtle'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE_CLASS[item.tone]}`}
      >
        <Glyph className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`text-body-sm text-text-primary ${item.unread ? 'font-semibold' : 'font-medium'}`}>{sentence}</span>
        {/* The item title is the seller's own text (any script): isolated so a Latin title cannot reorder an Arabic line. */}
        {subject ? (
          <span className="line-clamp-2 break-words text-body-sm text-text-secondary">
            <bdi>{subject}</bdi>
          </span>
        ) : null}
        <span className="text-caption font-medium text-text-muted">{relativeTimeLabel(item.createdAt, lang)}</span>
      </span>
      {item.unread ? (
        <span className="shrink-0 pt-1.5">
          <span className="block h-2 w-2 rounded-full bg-brand-blue-600" aria-hidden="true" />
          <span className="sr-only">{t('shell.topbar.notifications.unreadMarker', lang)}</span>
        </span>
      ) : (
        <span className="w-2 shrink-0" aria-hidden="true" />
      )}
    </Link>
  )
}

/** The bell glyph button, its badge, and the 44 px touch extension — shared by the live bell and its loading fallback. */
export function BellButtonFace({ badge }: { badge: string | null }): ReactNode {
  return (
    <>
      <Bell className="h-5 w-5 text-text-muted" aria-hidden="true" />
      {badge ? (
        // Figma bell-3 / bell-9plus: x 21 / y 3 from the bell's top-left. Physical on purpose: the AR frame (m375-ar)
        // keeps the badge at the glyph's top-right, as drawn — a bell has no reading direction.
        <span
          aria-hidden="true"
          className="absolute left-[21px] top-[3px] inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-600 px-1 text-xs font-semibold leading-4 text-text-inverse"
        >
          {badge}
        </span>
      ) : null}
      {/* Mobile touch target: 44 px without moving a painted pixel (the measured box is 40). */}
      <span aria-hidden="true" className="absolute -inset-0.5" />
    </>
  )
}

'use client'

import { useId, useRef, useState, type MouseEvent } from 'react'
import { useLang } from '@/components/LangProvider'
import { t, tn } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { SURFACE_HOVER, FOCUS_RING } from '@/components/ui/interactive-surface'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { bellBadgeText, bellClickLeaves, type BellFeed, type BellItem } from '@/lib/notifications/bell'
import { useBellFeed } from './useBellFeed'
import { BellButtonFace, BellPanelBody, BellPanelHeader } from './BellPanel'
import { BellSheet } from './BellSheet'

// The topbar bell, v1 (plan docs/follow-ups/bell-notifications-plan.md §3; Figma « NOV 18 — Notifications (cloche) · v1 »,
// 1778:30747, measured in docs/design/bell-panel-measurements.md). The feed is read on the SERVER on every page load
// (TopbarBell, streamed by AppShell; no Realtime): the badge is right before any JavaScript runs.
//   • ≥ 1024 the bell opens a dropdown panel (a Radix Popover: a dialog, so its links and « Tout marquer » are in the
//     Tab order and an empty or failed state is still a sensible dialog), end-aligned 8 px under the bell;
//   • < 1024 it opens a bottom sheet (BellSheet, the native <dialog> modal pattern).
// The surface is picked when the bell is pressed — one bell, one trigger.
// Read on open (plan §3 decision 4, useBellFeed): opening the panel marks nothing; an unread item marks itself, then
// navigates; « Tout marquer comme lu » marks everything.

const DESKTOP = '(min-width: 1024px)'
/** A shell with no bell feed (the admin topbar): an honest empty panel, no count. */
const NO_FEED: BellFeed = { ok: true, items: [], unreadCount: 0 }

const BELL_BUTTON = cn(
  'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]',
  SURFACE_HOVER,
  FOCUS_RING,
)

export function TopbarNotifications({ feed }: { feed: BellFeed | null }) {
  const lang = useLang()
  const titleId = useId()
  const bellRef = useRef<HTMLButtonElement>(null)
  const { view, openItem, markAll, markAllFailed } = useBellFeed(feed ?? NO_FEED)
  const [surface, setSurface] = useState<'menu' | 'sheet' | null>(null)
  const unread = view.ok ? view.unreadCount : 0
  const close = () => setSurface(null)

  function onOpenChange(next: boolean) {
    if (!next) return close()
    setSurface(window.matchMedia(DESKTOP).matches ? 'menu' : 'sheet')
  }

  function onOpenItem(event: MouseEvent<HTMLAnchorElement>, item: BellItem) {
    // A plain click leaves for the order (by the hook after the mark, or by the link itself for a read item): close.
    // A new-tab open keeps the panel where it is.
    if (openItem(event, item) || bellClickLeaves(event)) close()
  }

  const header = (variant: 'menu' | 'sheet') => (
    <BellPanelHeader
      variant={variant}
      view={view}
      lang={lang}
      titleId={titleId}
      markAll={markAll}
      markAllFailed={markAllFailed}
      onClose={close}
    />
  )
  const body = <BellPanelBody view={view} lang={lang} hint={feed !== null} onOpenItem={onOpenItem} />

  return (
    <Popover open={surface === 'menu'} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={bellRef}
          type="button"
          aria-label={
            unread > 0 ? tn('shell.topbar.notifications.unreadAria', lang, unread) : t('shell.topbar.notifications.title', lang)
          }
          className={cn(BELL_BUTTON, surface !== null && 'bg-surface-subtle')}
        >
          <BellButtonFace badge={bellBadgeText(unread)} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-labelledby={titleId}
        // Focus the panel itself, not its first button (Radix's default): « Tout marquer comme lu » would take it, and a
        // keyboard user who opens the bell and presses Enter would mark everything read (#402 gate). Tab reaches it next.
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          ;(e.target as HTMLElement | null)?.focus({ preventScroll: true })
        }}
        className="flex max-h-[min(520px,var(--radix-popover-content-available-height))] w-[400px] flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface-base p-0 shadow-[0_12px_32px_rgb(15_23_42/0.12)]"
      >
        {header('menu')}
        {body}
      </PopoverContent>
      {surface === 'sheet' ? (
        <BellSheet labelledBy={titleId} onClose={close} returnFocusTo={bellRef} header={header('sheet')}>
          {body}
        </BellSheet>
      ) : null}
    </Popover>
  )
}

/**
 * The bell while its feed streams in (AppShell's Suspense fallback): the same 40 px box and glyph, no badge. Not a
 * button: there is nothing to open yet, and a focusable stand-in would drop the focus when the real bell replaces it.
 */
export function TopbarNotificationsFallback() {
  const lang = useLang()
  return (
    <span
      role="img"
      aria-label={t('shell.topbar.notifications.title', lang)}
      data-bell-fallback=""
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
    >
      <BellButtonFace badge={null} />
    </span>
  )
}

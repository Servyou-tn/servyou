'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useOptimistic, useState, useTransition, type MouseEvent } from 'react'
import { Bell } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t, tn, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { relativeTimeLabel } from '@/lib/relative-time'
import { SURFACE_HOVER, FOCUS_RING } from '@/components/ui/interactive-surface'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { markNotificationsReadAction } from '@/app/actions/notifications'
import {
  applyBellAction,
  bellBadgeText,
  type BellFeed,
  type BellItem,
  type BellOptimisticAction,
} from '@/lib/notifications/bell'

// Topbar notifications (design system Section 3.3; bell v1 = docs/follow-ups/bell-notifications-plan.md).
//
// The feed comes from the server on every page load (TopbarBell → this component; decision 3: no Realtime). Rows hold
// KEYS, translated here in the reader's language, so a language switch re-translates. Read on open (decision 4):
//   • opening the dropdown marks nothing;
//   • opening an item marks THAT item read, then navigates. The mark is awaited first, so the next page's server-
//     rendered badge already counts it read; a failed mark still navigates (the order matters more than the dot);
//   • « Tout marquer comme lu » marks every unread row, then refreshes the server data.
// The badge and the dots update at once through useOptimistic, which falls back to the server data on its own.
//
// `feed` undefined = no bell data for this shell (the admin desktop topbar): the honest empty panel, unchanged.
// No Figma frame for the open panel exists yet (design system §10.1 « Notification panel — not yet designed »): it
// extends the shipped empty panel and the avatar menu's dropdown — see the PR's decisions.

const BELL_BOX = cn(
  // Figma 611:45640 IconButton: 40×40, radius 10, icon 20 — and NO fill and NO stroke; it is an invisible hit box that
  // only paints on hover. interactiveSurface() was wrong here twice over: it carries bg-white + border + a drop shadow
  // (Figma has none), and its h-11 beat the h-10 above in the cn() merge, so the bell measured 40×44 instead of 40×40.
  // Hover + focus only, matching the sibling user icon in TopbarUserMenu.
  'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]',
  SURFACE_HOVER,
  FOCUS_RING,
)

const PANEL = 'w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border-subtle bg-white p-0 shadow-lg'

function BellGlyph({ badge }: { badge: string | null }) {
  return (
    <>
      <Bell className="h-5 w-5 text-text-muted" aria-hidden="true" />
      {/* The measured count badge (h4-discovery: 16×16, blue-600, white 12 Semi Bold), on the glyph's top corner.
          Digits stay left-to-right in Arabic (« 9+ »). The count is in the button's label for screen readers. */}
      {badge ? (
        <span
          dir="ltr"
          aria-hidden="true"
          className="absolute top-1 end-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-600 px-1 text-caption font-semibold leading-4 text-text-inverse ring-2 ring-white"
        >
          {badge}
        </span>
      ) : null}
      {/* Mobile touch-target: extends the hit region to 44px without moving a painted pixel (the F3 Button pattern) —
          the measured box is 40, the WCAG 2.2 minimum is 44. */}
      <span aria-hidden="true" className="absolute -inset-0.5" />
    </>
  )
}

/** The Suspense fallback while the server reads the bell: the same 40×40 box, inert, no badge (nothing shifts). */
export function TopbarNotificationsFallback() {
  const lang = useLang()
  return (
    <button type="button" disabled aria-label={t('shell.topbar.notifications.title', lang)} className={BELL_BOX}>
      <BellGlyph badge={null} />
    </button>
  )
}

function ItemSentence({ item, lang }: { item: BellItem; lang: Lang }) {
  return item.statusKey
    ? t(item.sentenceKey, lang, { status: t(item.statusKey, lang) })
    : t(item.sentenceKey, lang)
}

export function TopbarNotifications({ feed }: { feed?: BellFeed }) {
  const lang = useLang()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [markAllFailed, setMarkAllFailed] = useState(false)
  const [, startTransition] = useTransition()
  const [view, apply] = useOptimistic<BellFeed | undefined, BellOptimisticAction>(feed, (state, action) =>
    state ? applyBellAction(state, action) : state,
  )

  const unreadCount = view?.ok ? view.unreadCount : 0
  const label = unreadCount > 0
    ? tn('shell.topbar.notifications.unreadAria', lang, unreadCount)
    : t('shell.topbar.notifications.title', lang)

  // Opening one item: mark it, then go. A plain click waits for the mark (the next page then counts it read); a
  // new-tab click (modifier / middle button) lets the browser open it and refreshes this page's data after.
  function openItem(event: MouseEvent<HTMLAnchorElement>, item: BellItem) {
    // auxclick also fires for the right button (a context menu opens nothing): only the middle button opens a tab.
    if (!item.unread || event.button > 1) return
    const newTab = event.button === 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    if (!newTab) {
      event.preventDefault()
      setOpen(false)
    }
    startTransition(async () => {
      apply({ type: 'read', id: item.id })
      await markNotificationsReadAction({ scope: 'one', id: item.id })
      startTransition(() => {
        if (newTab) router.refresh()
        else router.push(item.href)
      })
    })
  }

  function markAll() {
    setMarkAllFailed(false)
    startTransition(async () => {
      apply({ type: 'all' })
      const result = await markNotificationsReadAction({ scope: 'all' })
      if (!result.ok) {
        setMarkAllFailed(true)
        return
      }
      startTransition(() => router.refresh())
    })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={label} className={BELL_BOX}>
          <BellGlyph badge={bellBadgeText(unreadCount)} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className={PANEL}>
        <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
          <p className="text-label font-semibold text-text-primary">{t('shell.topbar.notifications.title', lang)}</p>
          {unreadCount > 0 ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault()
                markAll()
              }}
              // 14px comes from the primitive's text-sm: a text-body-sm here would be dropped by twMerge next to the colour.
              className="cursor-pointer rounded-md px-1.5 py-1 font-medium text-brand-blue-600 focus:bg-surface-subtle focus:text-brand-blue-600"
            >
              {t('shell.topbar.notifications.markAll', lang)}
            </DropdownMenuItem>
          ) : null}
        </div>

        {markAllFailed ? (
          <p role="alert" className="border-b border-border-subtle bg-danger-50 px-4 py-2 text-body-sm text-danger-700">
            {t('shell.topbar.notifications.markAllError', lang)}
          </p>
        ) : null}

        {view === undefined || (view.ok && view.items.length === 0) ? (
          <div className="px-4 py-8 text-center">
            <p className="text-body-sm text-text-muted">{t('shell.topbar.notifications.empty', lang)}</p>
          </div>
        ) : !view.ok ? (
          <div className="px-4 py-8 text-center">
            <p className="text-body-sm text-text-muted">{t('shell.topbar.notifications.error', lang)}</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto py-1">
            {view.items.map((item) => (
              <DropdownMenuItem
                key={item.id}
                asChild
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-none px-4 py-3 focus:bg-surface-subtle',
                  item.unread && 'bg-brand-blue-50',
                )}
              >
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={(e) => openItem(e, item)}
                  onAuxClick={(e) => openItem(e, item)}
                >
                  {/* Unread = the dot AND the bold sentence AND the spoken marker — never colour alone. */}
                  <span
                    aria-hidden="true"
                    className={cn('mt-1.5 size-2 shrink-0 rounded-full', item.unread ? 'bg-brand-blue-600' : 'bg-transparent')}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
                    {/* A template literal, not cn(): twMerge files text-body-sm under the colour group and would
                        drop it next to text-text-primary (the size would silently fall back). */}
                    <span
                      className={`text-body-sm ${item.unread ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}
                    >
                      <ItemSentence item={item} lang={lang} />
                      {item.unread ? (
                        <span className="sr-only"> ({t('shell.topbar.notifications.unreadMarker', lang)})</span>
                      ) : null}
                    </span>
                    {/* The item title is user text in any script: an isolate keeps a Latin title from reordering
                        inside an Arabic line. Old orders without a title show the reference instead. */}
                    <span className="block truncate text-caption text-text-secondary">
                      {item.title ? <bdi>{item.title}</bdi> : <bdi dir="ltr">{item.ref}</bdi>}
                    </span>
                    <span className="text-caption text-text-muted">{relativeTimeLabel(item.createdAt, lang)}</span>
                  </span>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useOptimistic, useState, useTransition } from 'react'
import { markNotificationsReadAction, type MarkReadInput, type MarkReadResult } from '@/app/actions/notifications'
import { applyBellAction, type BellFeed, type BellItem, type BellOptimisticAction } from '@/lib/notifications/bell'

// The bell's read logic, kept apart from the panel (the panel waits for its Figma frame: « NOV 18 — Notifications »,
// desktop dropdown + mobile bottom sheet). Read on open, plan §3 decision 4 (founder 2026-11-16):
//   • the hook does nothing on its own — opening the dropdown or the sheet marks nothing;
//   • openItem(): opening an UNREAD item marks THAT item, then navigates. A plain click waits for the mark, so the next
//     page's server-rendered badge already counts it read; a failed mark — refused OR thrown (network, a redeploy's
//     unknown action id) — still navigates: the order matters more than the dot. A new-tab open (Ctrl / ⌘ / Shift /
//     Alt, or the middle button) lets the browser open it, then refreshes this page's data. The right button (a
//     context menu) opens nothing and marks nothing. An item for the page already open refreshes it instead of
//     pushing the same URL;
//   • markAll(): « Tout marquer comme lu » marks every unread row, then refreshes the server data; a failure (refused or
//     thrown) is reported through `markAllFailed` (the panel says so) and the optimistic state falls back.
// The count and the dots change at once through useOptimistic, which falls back to the server feed by itself when the
// transition ends — by then the navigation / refresh has brought the server's own numbers.

/** The parts of a click the hook reads (a React MouseEvent fits). */
export type OpenEvent = {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  preventDefault: () => void
}

/** The action, with a thrown call (fetch rejected) folded into a plain failure: it never reaches an error boundary. */
async function markRead(input: MarkReadInput): Promise<MarkReadResult> {
  try {
    return await markNotificationsReadAction(input)
  } catch {
    return { ok: false }
  }
}

export function useBellFeed(feed: BellFeed) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()
  const [markAllFailed, setMarkAllFailed] = useState(false)
  const [view, apply] = useOptimistic<BellFeed, BellOptimisticAction>(feed, applyBellAction)

  /** Call from the item link's onClick and onAuxClick. Returns true when it took over the navigation (close the panel). */
  function openItem(event: OpenEvent, item: BellItem): boolean {
    if (!item.unread || event.button > 1) return false
    const newTab = event.button === 1 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
    if (!newTab) event.preventDefault()
    startTransition(async () => {
      apply({ type: 'read', id: item.id })
      await markRead({ scope: 'one', id: item.id })
      startTransition(() => {
        if (newTab || item.href === pathname) router.refresh()
        else router.push(item.href)
      })
    })
    return !newTab
  }

  function markAll() {
    setMarkAllFailed(false)
    startTransition(async () => {
      apply({ type: 'all' })
      const result = await markRead({ scope: 'all' })
      if (!result.ok) {
        setMarkAllFailed(true)
        return
      }
      startTransition(() => router.refresh())
    })
  }

  return { view, openItem, markAll, markAllFailed }
}

/**
 * @vitest-environment jsdom
 *
 * Bell v1, read on open (plan §3 decision 4): the hook marks nothing by itself (opening the panel marks nothing);
 * opening an item marks THAT item and then navigates to it; « Tout marquer comme lu » marks them all and refreshes.
 * Mocked: the server action, the router. No network.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

const h = vi.hoisted(() => ({
  pathname: '/tableau-de-bord',
  push: vi.fn(),
  refresh: vi.fn(),
  mark: vi.fn(async (_input: unknown) => ({ ok: true, marked: 1 }) as { ok: true; marked: number } | { ok: false }),
}))
vi.mock('next/navigation', () => ({ usePathname: () => h.pathname, useRouter: () => ({ push: h.push, refresh: h.refresh }) }))
vi.mock('@/app/actions/notifications', () => ({ markNotificationsReadAction: h.mark }))

import type { BellFeed, BellItem } from '@/lib/notifications/bell'
import { useBellFeed, type OpenEvent } from './useBellFeed'

const item = (id: string, unread: boolean): BellItem => ({
  id,
  kind: 'order_status_changed',
  icon: 'package',
  tone: 'info',
  sentence: { key: 'buyerOrder.event.accepted_shop', vars: { status: { key: 'common.status_accepted' } } },
  title: `Article ${id}`,
  ref: '#A4F729',
  href: `/mes-commandes/order-${id}`,
  createdAt: '2026-11-18T10:00:00Z',
  unread,
})
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const FEED: BellFeed = { ok: true, unreadCount: 2, items: [item(A, true), item(B, true), item(C, false)] }

const click = (over: Partial<OpenEvent> = {}) => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...over,
  preventDefault: vi.fn<() => void>(),
})

// A mark the test resolves by hand, to prove what waits for it.
function deferredMark() {
  let resolve: (v: { ok: true; marked: number }) => void = () => {}
  h.mark.mockImplementation(() => new Promise((r) => (resolve = r)))
  return (v: { ok: true; marked: number } = { ok: true, marked: 1 }) => resolve(v)
}

beforeEach(() => {
  h.pathname = '/tableau-de-bord'
  h.push.mockReset()
  h.refresh.mockReset()
  h.mark.mockReset()
  h.mark.mockImplementation(async () => ({ ok: true, marked: 1 }))
})

describe('useBellFeed — read on open', () => {
  it('marks nothing by itself: opening the panel is not reading', () => {
    const { result } = renderHook(() => useBellFeed(FEED))
    expect(result.current.view).toBe(FEED)
    expect(h.mark).not.toHaveBeenCalled()
    expect(h.push).not.toHaveBeenCalled()
    expect(h.refresh).not.toHaveBeenCalled()
  })

  it('opening an unread item marks ONLY that item, and navigates only once the mark has answered', async () => {
    const finish = deferredMark()
    const { result } = renderHook(() => useBellFeed(FEED))
    const event = click()
    let tookOver = false
    act(() => {
      tookOver = result.current.openItem(event, item(B, true))
    })
    expect(tookOver).toBe(true)
    expect(event.preventDefault).toHaveBeenCalled()
    await waitFor(() => expect(h.mark).toHaveBeenCalledWith({ scope: 'one', id: B }))
    // the item reads as read at once; the navigation waits for the mark
    await waitFor(() => expect(result.current.view.ok && result.current.view.unreadCount).toBe(1))
    expect(h.push).not.toHaveBeenCalled()
    await act(async () => finish())
    await waitFor(() => expect(h.push).toHaveBeenCalledWith(`/mes-commandes/order-${B}`))
    expect(h.mark).toHaveBeenCalledTimes(1)
  })

  it('an item for the page already open refreshes it instead of pushing the same URL', async () => {
    h.pathname = `/mes-commandes/order-${A}`
    const { result } = renderHook(() => useBellFeed(FEED))
    act(() => {
      result.current.openItem(click(), item(A, true))
    })
    await waitFor(() => expect(h.refresh).toHaveBeenCalled())
    expect(h.push).not.toHaveBeenCalled()
  })

  it('a failed mark still opens the order — refused or thrown (network, a redeploy)', async () => {
    for (const fail of [async () => ({ ok: false as const }), async () => Promise.reject(new Error('Failed to fetch'))]) {
      h.push.mockClear()
      h.mark.mockImplementation(fail)
      const { result } = renderHook(() => useBellFeed(FEED))
      act(() => {
        result.current.openItem(click(), item(A, true))
      })
      await waitFor(() => expect(h.push).toHaveBeenCalledWith(`/mes-commandes/order-${A}`))
    }
  })

  it('an item already read is a plain link: no mark, no takeover', () => {
    const { result } = renderHook(() => useBellFeed(FEED))
    const event = click()
    expect(result.current.openItem(event, item(C, false))).toBe(false)
    expect(event.preventDefault).not.toHaveBeenCalled()
    expect(h.mark).not.toHaveBeenCalled()
  })

  it('a new-tab open (Ctrl / middle button) marks the item, lets the browser open it, refreshes this page', async () => {
    for (const event of [click({ ctrlKey: true }), click({ button: 1 })]) {
      h.mark.mockClear()
      h.refresh.mockClear()
      const { result } = renderHook(() => useBellFeed(FEED))
      let tookOver = true
      act(() => {
        tookOver = result.current.openItem(event, item(A, true))
      })
      expect(tookOver).toBe(false)
      expect(event.preventDefault).not.toHaveBeenCalled()
      await waitFor(() => expect(h.refresh).toHaveBeenCalled())
      expect(h.mark).toHaveBeenCalledWith({ scope: 'one', id: A })
    }
    expect(h.push).not.toHaveBeenCalled()
  })

  it('a right click (context menu) marks nothing', () => {
    const { result } = renderHook(() => useBellFeed(FEED))
    expect(result.current.openItem(click({ button: 2 }), item(A, true))).toBe(false)
    expect(h.mark).not.toHaveBeenCalled()
  })
})

describe('useBellFeed — « Tout marquer comme lu »', () => {
  it('marks them all, then refreshes the server data once the mark has answered', async () => {
    const finish = deferredMark()
    const { result } = renderHook(() => useBellFeed(FEED))
    act(() => result.current.markAll())
    await waitFor(() => expect(h.mark).toHaveBeenCalledWith({ scope: 'all' }))
    expect(h.refresh).not.toHaveBeenCalled()
    await act(async () => finish({ ok: true, marked: 2 }))
    await waitFor(() => expect(h.refresh).toHaveBeenCalled())
    expect(h.mark).toHaveBeenCalledTimes(1)
    expect(h.push).not.toHaveBeenCalled()
    expect(result.current.markAllFailed).toBe(false)
  })

  it('shows every item read at once while the call runs', async () => {
    const finish = deferredMark()
    const { result } = renderHook(() => useBellFeed(FEED))
    act(() => result.current.markAll())
    await waitFor(() => expect(result.current.view.ok && result.current.view.unreadCount).toBe(0))
    expect(result.current.view.ok && result.current.view.items.every((i) => !i.unread)).toBe(true)
    await act(async () => finish({ ok: true, marked: 2 }))
  })

  it('a failure — refused or thrown — is reported to the panel, with no refresh, and the count comes back', async () => {
    for (const fail of [async () => ({ ok: false as const }), async () => Promise.reject(new Error('Failed to fetch'))]) {
      h.refresh.mockClear()
      h.mark.mockImplementation(fail)
      const { result } = renderHook(() => useBellFeed(FEED))
      act(() => result.current.markAll())
      await waitFor(() => expect(result.current.markAllFailed).toBe(true))
      await waitFor(() => expect(result.current.view).toBe(FEED))
      expect(h.refresh).not.toHaveBeenCalled()
    }
  })
})

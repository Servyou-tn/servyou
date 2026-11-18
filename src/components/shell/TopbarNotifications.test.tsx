/**
 * @vitest-environment jsdom
 *
 * Bell v1, read on open (plan §3 decision 4): opening the dropdown marks nothing; opening an item marks THAT item and
 * then navigates to it; « Tout marquer comme lu » marks them all. A failed read says so — never « no notifications ».
 * Mocked: the server action, the router. No network.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { createElement } from 'react'

const h = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  mark: vi.fn(async (_input: unknown) => ({ ok: true, marked: 1 }) as { ok: true; marked: number } | { ok: false }),
}))
vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: h.push, refresh: h.refresh }) }))
vi.mock('next/link', () => ({
  default: ({ href, children, prefetch: _prefetch, ...rest }: { href: string; children?: unknown; prefetch?: boolean; [k: string]: unknown }) =>
    createElement('a', { href, ...rest }, children as never),
}))
vi.mock('@/app/actions/notifications', () => ({ markNotificationsReadAction: h.mark }))

import { LangProvider } from '@/components/LangProvider'
import { t, tn } from '@/lib/i18n'
import type { BellFeed, BellItem } from '@/lib/notifications/bell'
import { TopbarNotifications } from './TopbarNotifications'

const E = 'shell.topbar.notifications.event.'
const item = (id: string, unread: boolean, over: Partial<BellItem> = {}): BellItem => ({
  id,
  sentenceKey: `${E}accepted`,
  statusKey: 'common.status_accepted',
  title: `Article ${id}`,
  ref: '#A4F729',
  href: `/mes-commandes/order-${id}`,
  createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
  unread,
  ...over,
})

const FEED: BellFeed = {
  ok: true,
  unreadCount: 2,
  items: [
    item('11111111-1111-4111-8111-111111111111', true),
    item('22222222-2222-4222-8222-222222222222', true, { sentenceKey: `${E}new_order_product`, href: '/commandes-recues/o-2' }),
    item('33333333-3333-4333-8333-333333333333', false, { title: null }),
  ],
}

beforeEach(() => {
  h.push.mockReset()
  h.refresh.mockReset()
  h.mark.mockReset()
  h.mark.mockImplementation(async () => ({ ok: true, marked: 1 }))
})
afterEach(cleanup)

function renderBell(feed?: BellFeed, lang: 'fr' | 'ar' | 'en' = 'fr') {
  render(
    <LangProvider lang={lang}>
      <TopbarNotifications feed={feed} />
    </LangProvider>,
  )
}

function bellButton(name: string) {
  return screen.getByRole('button', { name })
}

function open(name: string) {
  fireEvent.keyDown(bellButton(name), { key: 'Enter' })
}

describe('TopbarNotifications — badge', () => {
  it('shows the server unread count, and says it to screen readers', () => {
    renderBell(FEED)
    const button = bellButton(tn('shell.topbar.notifications.unreadAria', 'fr', 2))
    expect(button).toHaveTextContent('2')
  })

  it('no badge when nothing is unread', () => {
    renderBell({ ok: true, unreadCount: 0, items: [item('33333333-3333-4333-8333-333333333333', false)] })
    expect(bellButton(t('shell.topbar.notifications.title', 'fr'))).toHaveTextContent('')
  })
})

describe('TopbarNotifications — read on open', () => {
  it('opening the dropdown marks nothing', async () => {
    renderBell(FEED)
    open(tn('shell.topbar.notifications.unreadAria', 'fr', 2))
    expect(await screen.findByText('Article 11111111-1111-4111-8111-111111111111')).toBeInTheDocument()
    expect(h.mark).not.toHaveBeenCalled()
    expect(h.push).not.toHaveBeenCalled()
  })

  it('lists newest first as given, each with its sentence in the reader’s language and its order link', async () => {
    renderBell(FEED, 'ar')
    open(tn('shell.topbar.notifications.unreadAria', 'ar', 2))
    const items = await screen.findAllByRole('menuitem')
    // the « Tout marquer comme lu » item, then the three notifications in the server's order
    expect(items.map((i) => i.getAttribute('href'))).toEqual([
      null,
      '/mes-commandes/order-11111111-1111-4111-8111-111111111111',
      '/commandes-recues/o-2',
      '/mes-commandes/order-33333333-3333-4333-8333-333333333333',
    ])
    expect(items[1]).toHaveTextContent(t(`${E}accepted`, 'ar'))
    expect(items[2]).toHaveTextContent(t(`${E}new_order_product`, 'ar'))
    // a row without a title snapshot shows the order reference
    expect(items[3]).toHaveTextContent('#A4F729')
  })

  it('opening an unread item marks ONLY that item, then navigates to it', async () => {
    renderBell(FEED)
    open(tn('shell.topbar.notifications.unreadAria', 'fr', 2))
    const target = await screen.findByRole('menuitem', { name: /Article 22222222/ })
    fireEvent.click(target)
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/commandes-recues/o-2'))
    expect(h.mark).toHaveBeenCalledTimes(1)
    expect(h.mark).toHaveBeenCalledWith({ scope: 'one', id: '22222222-2222-4222-8222-222222222222' })
  })

  it('a failed mark still opens the order', async () => {
    h.mark.mockImplementation(async () => ({ ok: false }))
    renderBell(FEED)
    open(tn('shell.topbar.notifications.unreadAria', 'fr', 2))
    fireEvent.click(await screen.findByRole('menuitem', { name: /Article 11111111/ }))
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/mes-commandes/order-11111111-1111-4111-8111-111111111111'))
  })

  it('an item that is already read is a plain link: no mark call', async () => {
    renderBell(FEED)
    open(tn('shell.topbar.notifications.unreadAria', 'fr', 2))
    fireEvent.click(await screen.findByRole('menuitem', { name: /#A4F729/ }))
    expect(h.mark).not.toHaveBeenCalled()
  })

  it('a right click (context menu) marks nothing', async () => {
    renderBell(FEED)
    open(tn('shell.topbar.notifications.unreadAria', 'fr', 2))
    const target = await screen.findByRole('menuitem', { name: /Article 11111111/ })
    fireEvent(target, new MouseEvent('auxclick', { bubbles: true, button: 2 }))
    expect(h.mark).not.toHaveBeenCalled()
  })

  it('« Tout marquer comme lu » marks them all, then refreshes the server data', async () => {
    renderBell(FEED)
    open(tn('shell.topbar.notifications.unreadAria', 'fr', 2))
    fireEvent.click(await screen.findByRole('menuitem', { name: t('shell.topbar.notifications.markAll', 'fr') }))
    await waitFor(() => expect(h.refresh).toHaveBeenCalled())
    expect(h.mark).toHaveBeenCalledTimes(1)
    expect(h.mark).toHaveBeenCalledWith({ scope: 'all' })
    expect(h.push).not.toHaveBeenCalled()
  })

  it('a failed « Tout marquer » says so', async () => {
    h.mark.mockImplementation(async () => ({ ok: false }))
    renderBell(FEED)
    open(tn('shell.topbar.notifications.unreadAria', 'fr', 2))
    fireEvent.click(await screen.findByRole('menuitem', { name: t('shell.topbar.notifications.markAll', 'fr') }))
    expect(await screen.findByRole('alert')).toHaveTextContent(t('shell.topbar.notifications.markAllError', 'fr'))
    expect(h.refresh).not.toHaveBeenCalled()
  })

  it('no « Tout marquer » when nothing is unread', async () => {
    renderBell({ ok: true, unreadCount: 0, items: [item('33333333-3333-4333-8333-333333333333', false)] })
    open(t('shell.topbar.notifications.title', 'fr'))
    expect(await screen.findAllByRole('menuitem')).toHaveLength(1)
    expect(screen.queryByText(t('shell.topbar.notifications.markAll', 'fr'))).toBeNull()
  })
})

describe('TopbarNotifications — empty and failed', () => {
  it('an empty feed says there is nothing yet', async () => {
    renderBell({ ok: true, unreadCount: 0, items: [] })
    open(t('shell.topbar.notifications.title', 'fr'))
    expect(await screen.findByText(t('shell.topbar.notifications.empty', 'fr'))).toBeInTheDocument()
  })

  it('a failed read says it failed — never « Aucune notification », never a badge', async () => {
    renderBell({ ok: false })
    open(t('shell.topbar.notifications.title', 'fr'))
    expect(await screen.findByText(t('shell.topbar.notifications.error', 'fr'))).toBeInTheDocument()
    expect(screen.queryByText(t('shell.topbar.notifications.empty', 'fr'))).toBeNull()
  })
})

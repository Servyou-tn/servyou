import { describe, it, expect } from 'vitest'
import { applyBellAction, bellSentenceText, type BellFeed, type BellItem } from './bell'

// The panel's client-side contract: the sentence text and the optimistic read state. The rows → items part (plan §1,
// icons, tones, links, the item envelope) is tested in bell-kinds.test.tsx. Pure: no I/O.

describe('bellSentenceText — the line in the reader’s language', () => {
  const tr = (key: string, vars?: Record<string, string | number>) =>
    vars ? `${key}(${Object.entries(vars).map(([k, v]) => `${k}=${v}`).join(',')})` : key

  it('translates a key variable, passes a plain value through, and calls without vars when there are none', () => {
    expect(bellSentenceText({ key: 's', vars: { status: { key: 'common.status_accepted' } } }, tr)).toBe(
      's(status=common.status_accepted)',
    )
    expect(bellSentenceText({ key: 's', vars: { count: { value: 3 } } }, tr)).toBe('s(count=3)')
    expect(bellSentenceText({ key: 's' }, tr)).toBe('s')
  })
})

describe('applyBellAction — the optimistic read state', () => {
  const item = (id: string, unread: boolean): BellItem => ({
    id,
    kind: 'order_status_changed',
    icon: 'package',
    tone: 'info',
    sentence: { key: 'buyerOrder.event.accepted_shop' },
    title: 'x',
    ref: '#X',
    href: '/x',
    createdAt: '2026-11-18T10:00:00Z',
    unread,
  })
  const feed: BellFeed = { ok: true, unreadCount: 25, items: [item('a', true), item('b', true), item('c', false)] }

  it('opening one item marks only that item and takes one off the count', () => {
    const next = applyBellAction(feed, { type: 'read', id: 'b' })
    expect(next).toEqual({ ok: true, unreadCount: 24, items: [item('a', true), item('b', false), item('c', false)] })
  })
  it('an already-read item changes nothing', () => {
    expect(applyBellAction(feed, { type: 'read', id: 'c' })).toBe(feed)
  })
  it('« Tout marquer comme lu » clears the count, including unread rows beyond the 20 listed', () => {
    const next = applyBellAction(feed, { type: 'all' })
    expect(next.ok && next.unreadCount).toBe(0)
    expect(next.ok && next.items.every((i) => !i.unread)).toBe(true)
  })
  it('a failed feed stays failed', () => {
    expect(applyBellAction({ ok: false }, { type: 'all' })).toEqual({ ok: false })
  })
})

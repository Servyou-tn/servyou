import { describe, expect, it } from 'vitest'
import { ORDER_TABS, articleText, daysArg, pageOffset, parseOne, searchArg, tabCount } from './orders'

describe('admin orders logic', () => {
  it('tabs fall back to all', () => {
    expect(parseOne('blocked', ORDER_TABS, 'all')).toBe('blocked')
    expect(parseOne('drop table', ORDER_TABS, 'all')).toBe('all')
  })
  it('search is trimmed and capped at the RPC limit (80)', () => {
    expect(searchArg('  #a4f729 ')).toBe('#a4f729')
    expect(searchArg('   ')).toBeUndefined()
    expect(searchArg('x'.repeat(100))).toHaveLength(80)
  })
  it('period → p_days, « all » → null', () => {
    expect(daysArg('30')).toBe(30)
    expect(daysArg('all')).toBeNull()
  })
  it('tab badges read the one count row', () => {
    const c = { all_count: 16, blocked: 6, in_progress: 5, received: 4, cancelled: 2 }
    expect(ORDER_TABS.map((tab) => tabCount(c, tab))).toEqual([16, 6, 5, 4, 2])
  })
  it('article: quantity suffix, missing title is « — »', () => {
    expect(articleText('Coussin brodé main', 2)).toBe('Coussin brodé main ×2')
    expect(articleText('Logo', 1)).toBe('Logo')
    expect(articleText(null, 1)).toBe('—')
  })
  it('page offset', () => {
    expect(pageOffset(1, 10)).toBe(0)
    expect(pageOffset(3, 10)).toBe(20)
    expect(pageOffset(0, 10)).toBe(0)
  })
})

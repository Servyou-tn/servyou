import { describe, expect, it } from 'vitest'
import {
  ageBand,
  cityOptions,
  filterUsers,
  journalActionKey,
  matchesUserQuery,
  orderRef,
  paginate,
  parseUserTab,
  reportsReceivedFilter,
  sortUsers,
  userStatus,
  type FilterableUser,
} from './users'

const NOW = Date.parse('2026-11-06T12:00:00Z')
const u = (over: Partial<FilterableUser> & { id: string }): FilterableUser & { id: string } => ({
  full_name: `Nom ${over.id}`, email: `${over.id}@x.tn`, phone: null, city: null,
  created_at: '2026-10-01T00:00:00Z', suspended_at: null, seller_type: null, is_admin: false, ...over,
})

describe('parseUserTab', () => {
  it('keeps every built ?role= value, adds suspended, and falls back to all', () => {
    expect(parseUserTab('shop_owner')).toBe('shop_owner')
    expect(parseUserTab('admin')).toBe('admin')
    expect(parseUserTab('suspended')).toBe('suspended')
    expect(parseUserTab('superadmin')).toBe('all')
    expect(parseUserTab(['consumer'])).toBe('all')
  })
})

describe('filterUsers', () => {
  const rows = [
    u({ id: 'a', seller_type: 'shop_owner', city: 'Tunis', created_at: '2026-11-04T00:00:00Z' }),
    u({ id: 'b', seller_type: 'freelancer', city: 'Sfax', suspended_at: '2026-11-01T00:00:00Z' }),
    u({ id: 'c', is_admin: true, city: 'Tunis', phone: '+216 55 123 456', full_name: 'Mehdi Chaabane' }),
  ]
  const base = { tab: 'all' as const, q: '', city: null, joined: 'all' as const, now: NOW }
  it('tabs: role tabs use accountRoles (an admin is not a consumer), Suspendus is the suspended set', () => {
    expect(filterUsers(rows, { ...base, tab: 'consumer' }).map((r) => r.id)).toEqual([])
    expect(filterUsers(rows, { ...base, tab: 'admin' }).map((r) => r.id)).toEqual(['c'])
    expect(filterUsers(rows, { ...base, tab: 'suspended' }).map((r) => r.id)).toEqual(['b'])
  })
  it('city and signup window', () => {
    expect(filterUsers(rows, { ...base, city: 'Tunis' }).map((r) => r.id)).toEqual(['a', 'c'])
    expect(filterUsers(rows, { ...base, joined: '7d' }).map((r) => r.id)).toEqual(['a'])
  })
  it('search: name/e-mail accent-insensitive, phone by digits only', () => {
    expect(matchesUserQuery(rows[2], 'chaâbane')).toBe(true)
    expect(matchesUserQuery(rows[2], '55 123')).toBe(true)
    expect(matchesUserQuery(rows[2], '21655123456')).toBe(true)
    expect(matchesUserQuery(rows[0], 'a@x')).toBe(true)
    expect(matchesUserQuery(rows[0], '55')).toBe(false)
  })
})

describe('sort + paginate + cities', () => {
  const rows = [u({ id: 'b', full_name: 'Zied', created_at: '2026-01-01T00:00:00Z' }), u({ id: 'a', full_name: 'amira', created_at: '2026-06-01T00:00:00Z' })]
  it('sorts', () => {
    expect(sortUsers(rows, 'recent').map((r) => r.id)).toEqual(['a', 'b'])
    expect(sortUsers(rows, 'oldest').map((r) => r.id)).toEqual(['b', 'a'])
    expect(sortUsers(rows, 'name').map((r) => r.id)).toEqual(['a', 'b'])
  })
  it('paginates and clamps the page', () => {
    const list = Array.from({ length: 12 }, (_, i) => i)
    expect(paginate(list, 2, 10)).toEqual({ items: [10, 11], page: 2, totalPages: 2 })
    expect(paginate(list, 9, 10).page).toBe(2)
    expect(paginate([], 1, 10)).toEqual({ items: [], page: 1, totalPages: 1 })
  })
  it('city options are distinct and sorted', () => {
    expect(cityOptions([{ city: 'Tunis' }, { city: null }, { city: 'Ariana' }, { city: ' Tunis ' }])).toEqual(['Ariana', 'Tunis'])
  })
})

describe('status, age, journal, refs', () => {
  it('suspended beats a pending deletion request', () => {
    expect(userStatus({ suspended_at: 'x', deletionPending: true })).toBe('suspended')
    expect(userStatus({ suspended_at: null, deletionPending: true })).toBe('deletion_pending')
    expect(userStatus({ suspended_at: null, deletionPending: false })).toBe('active')
  })
  it('age band, never the date', () => {
    expect(ageBand('2008-11-06', NOW)).toBe('18+')
    expect(ageBand('2008-11-07', NOW)).toBe('16-17')
    expect(ageBand('2012-01-01', NOW)).toBe('under16')
    expect(ageBand(null, NOW)).toBeNull()
  })
  it('journal actions map by prefix and fall back, never to the raw code', () => {
    expect(journalActionKey('hide_content_product')).toBe('admin.journal.action.hide_content')
    expect(journalActionKey('unhide_content_shop')).toBe('admin.journal.action.unhide_content')
    expect(journalActionKey('suspend_user')).toBe('admin.journal.action.suspend_user')
    expect(journalActionKey('test')).toBe('admin.journal.action.other')
  })
  it('order ref', () => {
    expect(orderRef('f1b220aa-0000-4000-8000-000000000000')).toBe('F1B220')
  })
})

describe('reportsReceivedFilter', () => {
  const U = '11111111-1111-4111-8111-111111111111'
  const P = '22222222-2222-4222-8222-222222222222'
  it('always includes the user clause and drops empty / non-uuid id lists', () => {
    expect(reportsReceivedFilter(U, { product: [P, 'not-a-uuid'], service: [] })).toBe(
      `and(target_type.eq.user,target_id.eq.${U}),and(target_type.eq.product,target_id.in.(${P}))`,
    )
  })
  it('rejects a non-uuid user id', () => {
    expect(() => reportsReceivedFilter('x', {})).toThrow()
  })
})

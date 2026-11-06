import { describe, expect, it } from 'vitest'
import { contentStatus, countReports, filterContent, paginate, parseOne, sortContent, CONTENT_TABS, type FilterableContent } from './content'

describe('contentStatus', () => {
  it('the admin marker wins, then each table maps to one vocabulary', () => {
    expect(contentStatus('product', { admin_hidden_at: 'x', status: 'active' })).toBe('hidden')
    expect(contentStatus('product', { admin_hidden_at: null, status: 'active' })).toBe('visible')
    expect(contentStatus('product', { admin_hidden_at: null, status: 'sold_out' })).toBe('inactive')
    expect(contentStatus('service', { admin_hidden_at: null, status: 'draft' })).toBe('draft')
    expect(contentStatus('job_post', { admin_hidden_at: null, status: 'open' })).toBe('visible')
    expect(contentStatus('job_post', { admin_hidden_at: null, status: 'filled' })).toBe('inactive')
    expect(contentStatus('shop', { admin_hidden_at: null })).toBe('visible')
    expect(contentStatus('freelancer_profile', { admin_hidden_at: null, is_published: false })).toBe('draft')
  })
  it('an unknown tab param falls back to products', () => {
    expect(parseOne('nope', CONTENT_TABS, 'product')).toBe('product')
  })
})

const row = (over: Partial<FilterableContent>): FilterableContent => ({
  title: 'iPhone', owner: 'OM shop', status: 'visible', categoryId: null, reports: 0, created_at: '2026-11-01T00:00:00Z', ...over,
})

describe('filter + sort + paginate', () => {
  const rows = [
    row({ title: 'Montre Rolex', status: 'hidden', reports: 1, created_at: '2026-11-01T00:00:00Z' }),
    row({ title: 'iPhone 15 Pro neuf', reports: 2, categoryId: 'phones', created_at: '2026-11-02T00:00:00Z' }),
    row({ title: 'Lampe en céramique', owner: 'Atelier Sfax', status: 'draft', created_at: '2026-10-28T00:00:00Z' }),
  ]
  it('search on title + owner (accents ignored), status, category', () => {
    expect(filterContent(rows, { q: 'ceramique', status: 'all', category: null }).map((r) => r.title)).toEqual(['Lampe en céramique'])
    expect(filterContent(rows, { q: 'sfax', status: 'all', category: null }).length).toBe(1)
    expect(filterContent(rows, { q: '', status: 'hidden', category: null }).map((r) => r.title)).toEqual(['Montre Rolex'])
    expect(filterContent(rows, { q: '', status: 'all', category: 'phones' }).length).toBe(1)
  })
  it('« Signalés d\'abord » ranks by open reports, then newest', () => {
    expect(sortContent(rows, 'reported').map((r) => r.reports)).toEqual([2, 1, 0])
    expect(sortContent(rows, 'oldest')[0].title).toBe('Lampe en céramique')
  })
  it('paginates and counts', () => {
    expect(paginate([1, 2, 3], 5, 2)).toEqual({ items: [3], page: 2, totalPages: 2 })
    expect(countReports([{ target_id: 'a' }, { target_id: 'a' }, { target_id: 'b' }]).get('a')).toBe(2)
  })
})

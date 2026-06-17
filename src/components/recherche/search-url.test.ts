/**
 * Unit tests for buildSearchQuery — the pure query-string merger every /recherche
 * control uses to push URL state. Guards the back-button contract: a filter/sort change
 * resets the page, page 1 is never written, and unrelated params survive.
 *
 * Run: npx vitest run src/components/recherche/search-url.test.ts
 */

import { describe, it, expect } from 'vitest'
import { buildSearchQuery } from './search-url'

describe('buildSearchQuery', () => {
  it('sets a scalar param and preserves the rest', () => {
    const out = buildSearchQuery('q=sac&type=product', { tri: 'recent' })
    const params = new URLSearchParams(out)
    expect(params.get('q')).toBe('sac')
    expect(params.get('type')).toBe('product')
    expect(params.get('tri')).toBe('recent')
  })

  it('writes array values comma-joined', () => {
    const out = buildSearchQuery('q=sac', { ville: ['Tunis', 'Sfax'] })
    expect(new URLSearchParams(out).get('ville')).toBe('Tunis,Sfax')
  })

  it('deletes a key when the value is empty (null / "" / [])', () => {
    expect(new URLSearchParams(buildSearchQuery('q=sac&ville=Tunis', { ville: null })).has('ville')).toBe(false)
    expect(new URLSearchParams(buildSearchQuery('q=sac&prix_min=10', { prix_min: '' })).has('prix_min')).toBe(false)
    expect(new URLSearchParams(buildSearchQuery('q=sac&categorie=mode', { categorie: [] })).has('categorie')).toBe(false)
  })

  it('resetPage drops an existing page when a filter changes', () => {
    const out = buildSearchQuery('q=sac&page=4', { tri: 'recent' }, { resetPage: true })
    expect(new URLSearchParams(out).has('page')).toBe(false)
  })

  it('keeps the page when the patch itself sets page (pagination)', () => {
    const out = buildSearchQuery('q=sac&tri=recent', { page: 3 })
    expect(new URLSearchParams(out).get('page')).toBe('3')
  })

  it('never writes page=1 (the implicit default)', () => {
    const out = buildSearchQuery('q=sac', { page: 1 })
    expect(new URLSearchParams(out).has('page')).toBe(false)
  })

  it('accepts a URLSearchParams instance as the current state', () => {
    const out = buildSearchQuery(new URLSearchParams('q=sac&type=service'), { tri: 'prix_asc' })
    const params = new URLSearchParams(out)
    expect(params.get('q')).toBe('sac')
    expect(params.get('type')).toBe('service')
    expect(params.get('tri')).toBe('prix_asc')
  })
})

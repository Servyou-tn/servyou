import { describe, it, expect } from 'vitest'
import { isActiveRoute } from './sidebar-active'

describe('isActiveRoute', () => {
  it('exact match → true', () => {
    expect(isActiveRoute('/mon-espace', '/mon-espace')).toBe(true)
  })

  it('sub-route match → true', () => {
    expect(isActiveRoute('/mes-demandes/123', '/mes-demandes')).toBe(true)
    expect(isActiveRoute('/mes-annonces/abc/modifier', '/mes-annonces')).toBe(true)
  })

  it('unrelated route → false', () => {
    expect(isActiveRoute('/mes-favoris', '/mes-demandes')).toBe(false)
  })

  it('prefix-but-not-a-path-boundary → false', () => {
    // "/mes-demandesX" must NOT match "/mes-demandes".
    expect(isActiveRoute('/mes-demandesX', '/mes-demandes')).toBe(false)
  })

  it('home is exact-only (does not swallow every route)', () => {
    expect(isActiveRoute('/', '/')).toBe(true)
    expect(isActiveRoute('/mon-espace', '/')).toBe(false)
  })
})

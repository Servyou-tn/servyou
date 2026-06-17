/**
 * Unit tests for the marche routing helpers: the legacy /marche → engine redirect resolver,
 * the cross-engine toggle destination, and the sidebar engine-isolation resolver.
 *
 * Run: npx vitest run src/lib/marche/marche-routing.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  marcheEngineHref,
  marcheRedirectTarget,
  resolveMarcheSidebarNav,
} from './marche-routing'

describe('marcheRedirectTarget', () => {
  it('defaults a bare /marche to the Produits engine', () => {
    expect(marcheRedirectTarget({})).toBe('/marche/produits')
  })

  it('routes ?type=service to the Services engine', () => {
    expect(marcheRedirectTarget({ type: 'service' })).toBe('/marche/services')
  })

  it('treats any non-service type (incl. the produit alias) as Produits', () => {
    expect(marcheRedirectTarget({ type: 'produit' })).toBe('/marche/produits')
    expect(marcheRedirectTarget({ type: 'product' })).toBe('/marche/produits')
  })

  it('carries refinement params over and drops type + page', () => {
    const target = marcheRedirectTarget({
      type: 'service',
      q: 'logo',
      categorie: 'design-creation',
      ville: 'Tunis',
      prix_min: '20',
      prix_max: '200',
      tri: 'recent',
      page: '3',
    })
    expect(target.startsWith('/marche/services?')).toBe(true)
    const qs = new URLSearchParams(target.split('?')[1])
    expect(qs.get('q')).toBe('logo')
    expect(qs.get('categorie')).toBe('design-creation')
    expect(qs.get('ville')).toBe('Tunis')
    expect(qs.get('prix_min')).toBe('20')
    expect(qs.get('prix_max')).toBe('200')
    expect(qs.get('tri')).toBe('recent')
    expect(qs.has('type')).toBe(false)
    expect(qs.has('page')).toBe(false)
  })

  it('ignores empty / whitespace param values', () => {
    expect(marcheRedirectTarget({ q: '   ', categorie: '' })).toBe('/marche/produits')
  })

  it('uses the first value of a repeated param', () => {
    expect(marcheRedirectTarget({ type: ['service', 'product'] })).toBe('/marche/services')
  })
})

// The cross-engine toggle's destination. After sidebar isolation this is the ONLY way to
// switch engines; it lands on the clean other engine (bare path, no carried query/filters).
describe('marcheEngineHref', () => {
  it('maps each catalog type to its bare browse-engine path', () => {
    expect(marcheEngineHref('product')).toBe('/marche/produits')
    expect(marcheEngineHref('service')).toBe('/marche/services')
  })

  it('switches engines: from one type, the other type points at the sibling engine', () => {
    // The toggle hands SharedSearchBar the NEXT type — product↔service must cross over.
    expect(marcheEngineHref('service')).not.toBe(marcheEngineHref('product'))
    expect(marcheEngineHref('product')).toBe('/marche/produits')
    expect(marcheEngineHref('service')).toBe('/marche/services')
  })
})

// Drives the sidebar's Marché accordion + engine isolation: on a browse route exactly one
// engine is active (and is the only sub-item rendered); off /marche all three are false.
describe('resolveMarcheSidebarNav', () => {
  it('on /marche/produits → only the Produits engine is active', () => {
    expect(resolveMarcheSidebarNav('/marche/produits')).toEqual({
      onMarche: true,
      produitsActive: true,
      servicesActive: false,
    })
  })

  it('on /marche/services → only the Services engine is active', () => {
    expect(resolveMarcheSidebarNav('/marche/services')).toEqual({
      onMarche: true,
      produitsActive: false,
      servicesActive: true,
    })
  })

  it('exactly one engine is active whenever the accordion is expanded', () => {
    for (const path of ['/marche', '/marche/produits', '/marche/services', '/marche/services/x']) {
      const nav = resolveMarcheSidebarNav(path)
      expect(nav.onMarche).toBe(true)
      expect(nav.produitsActive).not.toBe(nav.servicesActive)
    }
  })

  it('bare /marche (mid-redirect) reads as the default Produits engine', () => {
    expect(resolveMarcheSidebarNav('/marche')).toEqual({
      onMarche: true,
      produitsActive: true,
      servicesActive: false,
    })
  })

  it('a services sub-route keeps the Services engine active', () => {
    expect(resolveMarcheSidebarNav('/marche/services/123')).toEqual({
      onMarche: true,
      produitsActive: false,
      servicesActive: true,
    })
  })

  it('off /marche → collapsed, no engine active (no sub-items)', () => {
    for (const path of ['/mes-commandes', '/mes-favoris', '/mes-missions', '/recherche', '/categories/mode']) {
      expect(resolveMarcheSidebarNav(path)).toEqual({
        onMarche: false,
        produitsActive: false,
        servicesActive: false,
      })
    }
  })

  it('a path that only prefixes /marche (no boundary) does NOT expand the accordion', () => {
    // "/marche-pro" must NOT read as a /marche route.
    expect(resolveMarcheSidebarNav('/marche-pro')).toEqual({
      onMarche: false,
      produitsActive: false,
      servicesActive: false,
    })
  })
})

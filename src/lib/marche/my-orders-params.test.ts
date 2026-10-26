import { describe, it, expect } from 'vitest'
import { DEFAULT_ORDERS_TAB, PRODUCT_STATUSES, SERVICE_STATUSES, parseOrdersParams, statusesForTab } from './my-orders-params'

describe('parseOrdersParams — ?tab= is a real tab', () => {
  it('reads produits and services', () => {
    expect(parseOrdersParams({ tab: 'produits' }).tab).toBe('produits')
    expect(parseOrdersParams({ tab: 'services' }).tab).toBe('services')
  })
  it('falls back to the default for a missing or unknown value, never throws', () => {
    expect(parseOrdersParams({}).tab).toBe(DEFAULT_ORDERS_TAB)
    expect(parseOrdersParams({ tab: 'nope' }).tab).toBe(DEFAULT_ORDERS_TAB)
    expect(parseOrdersParams({ tab: ['services', 'produits'] }).tab).toBe('services')
  })
  it('the Figma default is Produits', () => {
    expect(DEFAULT_ORDERS_TAB).toBe('produits')
  })
})

describe('parseOrdersParams — statut is validated against the TAB', () => {
  it('accepts every one of the 8 product statuses on Produits', () => {
    for (const s of PRODUCT_STATUSES) expect(parseOrdersParams({ tab: 'produits', statut: s }).statut).toBe(s)
    expect(PRODUCT_STATUSES).toHaveLength(8)
  })
  it('a product-only status on Services is `all`, not an empty list', () => {
    for (const s of ['prepared', 'dispatched', 'in_delivery']) {
      expect(parseOrdersParams({ tab: 'services', statut: s }).statut).toBe('all')
    }
    for (const s of SERVICE_STATUSES) expect(parseOrdersParams({ tab: 'services', statut: s }).statut).toBe(s)
  })
  it('junk statut / tri / page fall back', () => {
    expect(parseOrdersParams({ statut: 'x', tri: 'x', page: '-3' })).toMatchObject({ statut: 'all', tri: 'recent', page: 1 })
  })
  it('the service set is a subset of the product set (one status vocabulary)', () => {
    for (const s of SERVICE_STATUSES) expect(statusesForTab('produits')).toContain(s)
  })
})

/**
 * Unit tests for the pure homepage helpers — first-name extraction, active-order
 * filtering, favorites merge, and the buildHomepageData assembler (shape + hasActivity).
 * The server getConsumerHomepageData just fetches and delegates to buildHomepageData,
 * which is what these tests exercise.
 *
 * Run: npx vitest run src/lib/homepage/homepage-utils.test.ts
 */

import { describe, it, expect } from 'vitest'
import {
  buildHomepageData,
  firstName,
  isActiveOrderStatus,
  mergeFavorites,
  type HomepageInputs,
} from './homepage-utils'
import type { MyOrder } from '@/lib/marche/my-data'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

const order = (status: string, id = status): MyOrder => ({ id, status }) as MyOrder
const prod = (id: string): ProductListing => ({ id }) as ProductListing
const svc = (id: string): ServiceListing => ({ id }) as ServiceListing

const emptyInputs: HomepageInputs = {
  orders: [],
  favProducts: [],
  favServices: [],
  recentProducts: [],
  recentServices: [],
}

describe('firstName', () => {
  it('extracts the first word of a full name', () => {
    expect(firstName('Moatez Sahbeni')).toBe('Moatez')
    expect(firstName('Ali')).toBe('Ali')
    expect(firstName('  Ali  Ben Salah ')).toBe('Ali')
  })
  it('returns empty string for null / empty', () => {
    expect(firstName(null)).toBe('')
    expect(firstName('')).toBe('')
    expect(firstName('   ')).toBe('')
  })
})

describe('isActiveOrderStatus', () => {
  it('treats in-flight statuses as active', () => {
    for (const s of ['pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived']) {
      expect(isActiveOrderStatus(s)).toBe(true)
    }
  })
  it('treats terminal statuses as inactive', () => {
    expect(isActiveOrderStatus('received')).toBe(false)
    expect(isActiveOrderStatus('cancelled')).toBe(false)
  })
})

describe('mergeFavorites', () => {
  it('interleaves products and services, capped at the limit', () => {
    const merged = mergeFavorites([prod('p1'), prod('p2')], [svc('s1'), svc('s2')], 6)
    expect(merged.map((f) => (f.type === 'product' ? f.product.id : f.service.id))).toEqual([
      'p1', 's1', 'p2', 's2',
    ])
  })
  it('caps the total at the limit', () => {
    const merged = mergeFavorites(
      [prod('p1'), prod('p2'), prod('p3'), prod('p4')],
      [svc('s1'), svc('s2'), svc('s3'), svc('s4')],
      3,
    )
    expect(merged).toHaveLength(3)
    expect(merged[0]).toEqual({ type: 'product', product: prod('p1') })
  })
  it('handles single-type and empty inputs', () => {
    expect(mergeFavorites([prod('p1')], [], 6).map((f) => f.type)).toEqual(['product'])
    expect(mergeFavorites([], [svc('s1')], 6).map((f) => f.type)).toEqual(['service'])
    expect(mergeFavorites([], [], 6)).toEqual([])
  })
})

describe('buildHomepageData', () => {
  it('filters orders to active and caps at 4', () => {
    const orders = [
      order('pending', 'o1'),
      order('received', 'o2'), // dropped (terminal)
      order('accepted', 'o3'),
      order('cancelled', 'o4'), // dropped
      order('arrived', 'o5'),
      order('dispatched', 'o6'),
      order('in_delivery', 'o7'), // 5 active → capped to 4
    ]
    const out = buildHomepageData({ ...emptyInputs, orders })
    expect(out.activeOrders.map((o) => o.id)).toEqual(['o1', 'o3', 'o5', 'o6'])
  })

  it('merges + caps favorites and caps the recent strips', () => {
    const out = buildHomepageData({
      orders: [],
      favProducts: Array.from({ length: 5 }, (_, i) => prod(`p${i}`)),
      favServices: Array.from({ length: 5 }, (_, i) => svc(`s${i}`)),
      recentProducts: Array.from({ length: 12 }, (_, i) => prod(`rp${i}`)),
      recentServices: Array.from({ length: 12 }, (_, i) => svc(`rs${i}`)),
    })
    expect(out.favorites).toHaveLength(6)
    expect(out.recentProducts).toHaveLength(8)
    expect(out.recentServices).toHaveLength(8)
  })

  it('computes hasActivity from active orders OR favorites', () => {
    expect(buildHomepageData(emptyInputs).hasActivity).toBe(false)
    expect(buildHomepageData({ ...emptyInputs, orders: [order('pending')] }).hasActivity).toBe(true)
    expect(buildHomepageData({ ...emptyInputs, favProducts: [prod('p1')] }).hasActivity).toBe(true)
    // only terminal orders + no favorites → no activity
    expect(buildHomepageData({ ...emptyInputs, orders: [order('received')] }).hasActivity).toBe(false)
  })
})

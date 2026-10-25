/**
 * H8 « Mes engagements » — the pure rules (src/lib/marche/engagements.ts, no Supabase):
 *   • the tab set and its partition of the service chain (architect ruling D1: « À traiter » first / default);
 *   • the stat tiles (D4 « À traiter » in place of « À livrer »; D9 « En cours » = accepted only);
 *   • the search (client name or service title, accent-blind) and the page slice;
 *   • the cancel-reason presets for a freelancer (5, FR + AR) vs the shop owner's.
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ENGAGEMENT_TAB,
  ENGAGEMENT_TABS,
  ENGAGEMENTS_PER_PAGE,
  clientTypeOf,
  engagementStats,
  matchesEngagementQuery,
  pageEngagements,
  statusesForEngagementTab,
  type Engagement,
} from '@/lib/marche/engagements'
import { SERVICE_CANCEL_REASONS, SHOP_CANCEL_REASONS, CANCEL_REASON_OTHER } from '@/lib/orders/cancel-reasons'
import { nextSellerStatus, SERVICE_LIFECYCLE, type OrderStatus } from '@/lib/types/order-status'
import { t } from '@/lib/i18n'

let n = 0
function engagement(over: Partial<Engagement> = {}): Engagement {
  n += 1
  return {
    id: `id-${n}`,
    status: 'pending',
    title: 'Création de logo professionnel',
    categorySlug: 'design-graphique-logo',
    clientId: `client-${n}`,
    clientName: 'Ahmed Ben Salah',
    clientCity: 'Tunis',
    clientAvatarUrl: null,
    clientType: 'consumer',
    createdAt: new Date(Date.UTC(2026, 9, 1, 12, n)).toISOString(),
    receivedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    startingPrice: 300,
    requestedTimeframe: null,
    ...over,
  }
}

describe('tabs (ruling D1)', () => {
  it('« À traiter » leads and is the default landing; the frame\'s five follow, in frame order', () => {
    expect(ENGAGEMENT_TABS[0]).toBe('a_traiter')
    expect(DEFAULT_ENGAGEMENT_TAB).toBe('a_traiter')
    // Figma 273:9054: Tous · En cours · Livrés · Terminés · Annulés
    expect(ENGAGEMENT_TABS.slice(1)).toEqual(['all', 'in_progress', 'delivered', 'done', 'cancelled'])
  })

  it('partitions the service chain: every status a service can reach is in exactly one tab', () => {
    const reachable: OrderStatus[] = [...SERVICE_LIFECYCLE, 'cancelled']
    for (const status of reachable) {
      const tabs = ENGAGEMENT_TABS.filter((tab) => statusesForEngagementTab(tab)?.includes(status))
      expect(tabs, status).toHaveLength(1)
    }
  })

  it('« Tous » applies no status predicate', () => {
    expect(statusesForEngagementTab('all')).toBeNull()
  })

  it('« À traiter » is exactly what the freelancer can still accept, « En cours » what they can deliver', () => {
    expect(statusesForEngagementTab('a_traiter')).toEqual(['pending'])
    expect(statusesForEngagementTab('in_progress')).toEqual(['accepted'])
    // each of those has a seller-owned next hop — the tab cannot lie
    expect(nextSellerStatus('pending', 'service')).toBe('accepted')
    expect(nextSellerStatus('accepted', 'service')).toBe('arrived')
    // « Livrés » (arrived) waits on the BUYER
    expect(nextSellerStatus('arrived', 'service')).toBeNull()
  })
})

describe('engagementStats', () => {
  const all = [
    ...['pending', 'pending'].map((status) => engagement({ status: status as OrderStatus })),
    ...['accepted', 'accepted', 'accepted'].map((status) => engagement({ status: status as OrderStatus })),
    engagement({ status: 'arrived' }),
    ...['received', 'received'].map((status) => engagement({ status: status as OrderStatus })),
    engagement({ status: 'cancelled' }),
  ]

  it('« En cours » counts accepted ONLY (D9) — not pending, not arrived', () => {
    expect(engagementStats(all).inProgress).toBe(3)
  })

  it('« À traiter » counts pending; « Terminés » counts received; « Total » counts everything, cancelled included', () => {
    expect(engagementStats(all)).toEqual({ inProgress: 3, toHandle: 2, done: 2, total: 9 })
  })

  it('is all zeros for no engagements', () => {
    expect(engagementStats([])).toEqual({ inProgress: 0, toHandle: 0, done: 0, total: 0 })
  })
})

describe('matchesEngagementQuery', () => {
  const e = { clientName: 'Salma Trabelsi', title: 'Création de logo' }
  it('matches the client name or the service title', () => {
    expect(matchesEngagementQuery(e, 'salma')).toBe(true)
    expect(matchesEngagementQuery(e, 'logo')).toBe(true)
    expect(matchesEngagementQuery(e, 'traduction')).toBe(false)
  })
  it('ignores case and accents in both directions', () => {
    expect(matchesEngagementQuery(e, 'CREATION')).toBe(true)
    expect(matchesEngagementQuery({ ...e, title: 'Creation de logo' }, 'création')).toBe(true)
  })
  it('an empty or blank query matches everything', () => {
    expect(matchesEngagementQuery(e, '')).toBe(true)
    expect(matchesEngagementQuery(e, '   ')).toBe(true)
  })
})

describe('pageEngagements', () => {
  const base = { tab: 'all' as const, q: '', sort: 'recent' as const, page: 1 }

  it('filters by tab, and the stats still cover ALL engagements', () => {
    const all = [engagement({ status: 'pending' }), engagement({ status: 'accepted' }), engagement({ status: 'accepted' })]
    const page = pageEngagements(all, { ...base, tab: 'in_progress' })
    expect(page.engagements).toHaveLength(2)
    expect(page.totalCount).toBe(2)
    expect(page.stats.total).toBe(3)
    expect(page.stats.toHandle).toBe(1)
  })

  it('applies the search on top of the tab; the stats ignore the search too', () => {
    const all = [
      engagement({ status: 'accepted', clientName: 'Karim' }),
      engagement({ status: 'accepted', clientName: 'Nadia' }),
    ]
    const page = pageEngagements(all, { ...base, tab: 'in_progress', q: 'nadia' })
    expect(page.engagements.map((x) => x.clientName)).toEqual(['Nadia'])
    expect(page.stats.inProgress).toBe(2)
  })

  it('sorts by request date, newest first by default and oldest on demand', () => {
    const a = engagement({ createdAt: '2026-10-01T10:00:00Z' })
    const b = engagement({ createdAt: '2026-10-03T10:00:00Z' })
    const c = engagement({ createdAt: '2026-10-02T10:00:00Z' })
    expect(pageEngagements([a, b, c], base).engagements.map((x) => x.id)).toEqual([b.id, c.id, a.id])
    expect(pageEngagements([a, b, c], { ...base, sort: 'oldest' }).engagements.map((x) => x.id)).toEqual([a.id, c.id, b.id])
  })

  it('pages by ENGAGEMENTS_PER_PAGE and clamps an out-of-range page', () => {
    const all = Array.from({ length: ENGAGEMENTS_PER_PAGE + 3 }, () => engagement())
    const first = pageEngagements(all, base)
    expect(first.engagements).toHaveLength(ENGAGEMENTS_PER_PAGE)
    expect(first.totalPages).toBe(2)
    const last = pageEngagements(all, { ...base, page: 99 })
    expect(last.page).toBe(2)
    expect(last.engagements).toHaveLength(3)
    expect(pageEngagements([], base)).toMatchObject({ totalCount: 0, totalPages: 1, page: 1, engagements: [] })
  })
})

describe('clientTypeOf', () => {
  it('maps profiles.seller_type to the frame\'s labels', () => {
    expect(clientTypeOf(null)).toBe('consumer')
    expect(clientTypeOf(undefined)).toBe('consumer')
    expect(clientTypeOf('shop_owner')).toBe('shop')
    expect(clientTypeOf('freelancer')).toBe('freelancer')
  })
})

describe('cancel-reason presets', () => {
  it('a freelancer gets 5 service presets, each in FR and AR, ending with the shared « Autre raison »', () => {
    expect(SERVICE_CANCEL_REASONS).toHaveLength(5)
    expect(SERVICE_CANCEL_REASONS.at(-1)).toBe(CANCEL_REASON_OTHER)
    for (const key of SERVICE_CANCEL_REASONS) {
      for (const lang of ['fr', 'ar'] as const) {
        const text = t(key, lang)
        expect(text, `${key} ${lang}`).not.toBe(key)
        expect(text.length).toBeGreaterThan(3)
      }
    }
  })

  it('offers none of the shop owner\'s product reasons (stock, address, listing error)', () => {
    for (const product of [
      'common.cancel_reason_seller_out_of_stock',
      'common.cancel_reason_seller_invalid_address',
      'common.cancel_reason_seller_product_error',
    ]) {
      expect(SERVICE_CANCEL_REASONS as readonly string[]).not.toContain(product)
      expect(SHOP_CANCEL_REASONS as readonly string[]).toContain(product)
    }
  })
})

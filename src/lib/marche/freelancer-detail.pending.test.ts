import { beforeEach, describe, expect, it, vi } from 'vitest'

// getViewerPendingRequest (D4): « does THIS viewer have a still-pending order with this freelancer? » — what turns « Demander un service » into
// « Disponible après acceptation par le freelance » (phone reveal rule). Mocked client; asserts the filters and the failure modes.

const h = vi.hoisted(() => ({
  user: { id: 'viewer-1' } as { id: string } | null,
  result: { count: 1, error: null } as { count: number | null; error: { message: string; code: string; details?: string } | null },
  filters: [] as [string, unknown][],
  table: '',
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from(table: string) {
      h.table = table
      const chain: Record<string, unknown> = {}
      chain.select = () => chain
      chain.eq = (col: string, val: unknown) => (h.filters.push([col, val]), chain)
      chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(h.result).then(resolve)
      return chain
    },
  }),
}))

import { getViewerPendingRequest } from './freelancer-detail'

beforeEach(() => {
  h.user = { id: 'viewer-1' }
  h.result = { count: 1, error: null }
  h.filters = []
  h.table = ''
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getViewerPendingRequest', () => {
  it('true when the viewer has a pending order with this freelancer — and asks exactly that (own orders, this seller, pending)', async () => {
    expect(await getViewerPendingRequest('freelancer-profile-id')).toBe(true)
    expect(h.table).toBe('orders')
    expect(h.filters).toEqual([
      ['buyer_id', 'viewer-1'],
      ['seller_id', 'freelancer-profile-id'],
      ['status', 'pending'],
    ])
  })

  it('false when there is none', async () => {
    h.result = { count: 0, error: null }
    expect(await getViewerPendingRequest('fp')).toBe(false)
  })

  it('false for an anonymous visitor, without querying orders', async () => {
    h.user = null
    expect(await getViewerPendingRequest('fp')).toBe(false)
    expect(h.table).toBe('')
  })

  it('a failed read is false (the normal CTA), reported with message / code, never thrown', async () => {
    h.result = { count: null, error: { message: 'boom', code: 'XX000', details: 'd' } }
    expect(await getViewerPendingRequest('fp')).toBe(false)
  })
})

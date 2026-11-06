import { describe, expect, it } from 'vitest'
import { buildTimeline, disputeStatusesForTab, parseDisputeTab, tabForStatus } from './disputes'

describe('dispute tabs', () => {
  it('Ouverts = open + claimed; unknown → Ouverts; a status maps back to its tab', () => {
    expect(disputeStatusesForTab('open')).toEqual(['open', 'under_review'])
    expect(disputeStatusesForTab('resolved')).toEqual(['resolved'])
    expect(parseDisputeTab('x')).toBe('open')
    expect(tabForStatus('under_review')).toBe('open')
    expect(tabForStatus('dismissed')).toBe('dismissed')
  })
})

describe('buildTimeline', () => {
  const dispute = { id: 'd1', created_at: '2026-11-04T16:20:00Z', description: '  Le logo livré ne correspond pas  ', reasonKey: 'x', openerId: 'buyer' }
  it('orders the events by time, labels them, and ends with the dispute', () => {
    const t = buildTimeline(
      [
        { id: 'e2', event_type: 'status_change', to_status: 'accepted', actor_id: 'seller', created_at: '2026-10-28T14:40:00Z' },
        { id: 'e1', event_type: 'created', to_status: 'pending', actor_id: 'buyer', created_at: '2026-10-28T10:12:00Z' },
        { id: 'e3', event_type: 'status_change', to_status: 'arrived', actor_id: 'seller', created_at: '2026-11-03T18:05:00Z' },
        { id: 'e4', event_type: 'mystery', to_status: null, actor_id: null, created_at: '2026-11-03T19:00:00Z' },
      ],
      'service',
      dispute,
    )
    expect(t.map((e) => e.labelKey)).toEqual([
      'admin.disputes.event_created_service',
      'common.status_accepted',
      'common.status_arrived_service',
      'admin.disputes.event_other',
      'admin.disputes.event_opened',
    ])
    expect(t[4]).toMatchObject({ quote: 'Le logo livré ne correspond pas', actorId: 'buyer' })
  })
  it('a product order reads « Commande passée »; a blank description has no quote', () => {
    const t = buildTimeline([{ id: 'e1', event_type: 'created', to_status: null, actor_id: null, created_at: '2026-10-01T00:00:00Z' }], 'product', { ...dispute, description: '  ' })
    expect(t[0].labelKey).toBe('admin.disputes.event_created_product')
    expect(t[1].quote).toBeNull()
  })
})

import { describe, it, expect } from 'vitest'
import { bucketOrders } from './order-buckets'

// The only non-trivial logic in the active-orders snapshot: bucketing orders into
// "en cours" (in-flight) vs "à confirmer" (arrived, awaiting receipt). Terminal and
// unknown statuses must never count as active.
describe('bucketOrders', () => {
  it('empty array → 0/0', () => {
    expect(bucketOrders([])).toEqual({ enCours: 0, aConfirmer: 0 })
  })

  it('mix of all statuses → correct counts', () => {
    const orders = [
      { status: 'pending' },
      { status: 'accepted' },
      { status: 'prepared' },
      { status: 'dispatched' },
      { status: 'in_delivery' }, // 5 en cours
      { status: 'arrived' },
      { status: 'arrived' }, // 2 à confirmer
      { status: 'received' },
      { status: 'cancelled' }, // 0 — terminal
    ]
    expect(bucketOrders(orders)).toEqual({ enCours: 5, aConfirmer: 2 })
  })

  it('all received → 0/0 (no active)', () => {
    expect(bucketOrders([{ status: 'received' }, { status: 'received' }])).toEqual({
      enCours: 0,
      aConfirmer: 0,
    })
  })

  it('all arrived → 0/N', () => {
    expect(
      bucketOrders([{ status: 'arrived' }, { status: 'arrived' }, { status: 'arrived' }]),
    ).toEqual({ enCours: 0, aConfirmer: 3 })
  })

  it('all in pending..in_delivery → N/0', () => {
    expect(
      bucketOrders([{ status: 'pending' }, { status: 'accepted' }, { status: 'in_delivery' }]),
    ).toEqual({ enCours: 3, aConfirmer: 0 })
  })

  it('ignores unknown statuses', () => {
    expect(bucketOrders([{ status: 'weird' }, { status: 'pending' }])).toEqual({
      enCours: 1,
      aConfirmer: 0,
    })
  })
})

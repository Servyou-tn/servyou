/**
 * The two pieces of business-rule logic added when the shipped surfaces were wired onto the
 * orders snapshot + `order_events`. Both are must-test per the testing discipline: one computes
 * money, the other decides whether a number is knowable at all.
 *
 * WHY THESE AND NOT THE RENDERING: the panels were verified against the real authenticated DOM in
 * both their populated and empty states (see docs/design/g9-deltas-2.md). What the DOM pass could
 * NOT reach is `netProfitOf`'s populated branch — the only path to `received` is the buyer's
 * confirmation, and the buyer on the fixture order is a third account. So the branch that prints a
 * money figure is covered here, deterministically, instead of being left to a fixture nobody can
 * drive.
 *
 * The confident-zero guard is the single most important assertion in this file. A naive
 * `SUM(unit_price_tnd * quantity)` over delivered orders returns 0 today, and 0 TND under a
 * "Bénéfice net" label is a false financial claim about real transactions — the same class of error
 * as the mocked "2 840 TND" the G4 build already rejected.
 */

import { describe, it, expect } from 'vitest'
import { netProfitOf, type OrderRow } from '@/lib/marche/seller-dashboard'
import { waitFor } from '@/lib/marche/seller-orders'

function order(over: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 'o1',
    status: 'received',
    order_type: 'product',
    created_at: '2026-07-01T00:00:00Z',
    buyer_id: 'b1',
    quantity: 1,
    item_title: 'Thing',
    unit_price_tnd: null,
    products: null,
    service_listings: null,
    ...over,
  }
}

describe('netProfitOf — G4 Bénéfice net', () => {
  it('is null when there are no delivered orders at all', () => {
    expect(netProfitOf([order({ status: 'pending', unit_price_tnd: 100 })])).toBeNull()
  })

  it('is NULL, not zero, when delivered orders exist but none carries a snapshot', () => {
    // The live state on every one of the 14 pre-migration orders. A zero here would read as
    // "you earned nothing" rather than "not measured yet".
    const rows = [order({ id: 'a' }), order({ id: 'b' }), order({ id: 'c' })]
    expect(netProfitOf(rows)).toBeNull()
  })

  it('sums price x quantity over delivered orders that have a snapshot', () => {
    const rows = [
      order({ id: 'a', unit_price_tnd: '380.00', quantity: 3 }),
      order({ id: 'b', unit_price_tnd: 160, quantity: 1 }),
    ]
    expect(netProfitOf(rows)).toEqual({ value: 1300, measuredCount: 2, deliveredCount: 2 })
  })

  it('accepts numeric(10,2) arriving as a string, as PostgREST sends it', () => {
    expect(netProfitOf([order({ unit_price_tnd: '12.50', quantity: 2 })])?.value).toBe(25)
  })

  it('counts a zero-priced delivered order as MEASURED rather than missing', () => {
    // `??`-not-`||` at the read path, asserted here too: a genuine 0.00 is data, not absence.
    expect(netProfitOf([order({ unit_price_tnd: 0, quantity: 4 })])).toEqual({
      value: 0,
      measuredCount: 1,
      deliveredCount: 1,
    })
  })

  it('reports measuredCount < deliveredCount so the caption can say the sum is partial', () => {
    // The defect one step after the gate: the first snapshot-bearing delivery must not make the
    // tile imply it covers the orders that predate the column.
    const rows = [
      order({ id: 'old-1' }),
      order({ id: 'old-2' }),
      order({ id: 'new', unit_price_tnd: 100, quantity: 2 }),
    ]
    expect(netProfitOf(rows)).toEqual({ value: 200, measuredCount: 1, deliveredCount: 3 })
  })

  it('ignores non-delivered orders even when they carry a snapshot', () => {
    const rows = [
      order({ id: 'shipped', status: 'dispatched', unit_price_tnd: 999, quantity: 9 }),
      order({ id: 'done', unit_price_tnd: 50, quantity: 1 }),
    ]
    expect(netProfitOf(rows)).toEqual({ value: 50, measuredCount: 1, deliveredCount: 1 })
  })

  it('defaults a null quantity to 1 rather than dropping the order', () => {
    expect(netProfitOf([order({ unit_price_tnd: 70, quantity: null })])?.value).toBe(70)
  })

  it('rounds to the cent so float noise never reaches the tile', () => {
    expect(netProfitOf([order({ unit_price_tnd: '0.07', quantity: 3 })])?.value).toBe(0.21)
  })
})

describe('waitFor — G8 per-state wait', () => {
  const NOW = Date.parse('2026-07-30T12:00:00Z')
  const at = (iso: string, to: string | null) => ({ to_status: to, created_at: iso })

  it('is null on a terminal order — a closed order is not waiting', () => {
    const events = [at('2026-07-30T09:00:00Z', 'received')]
    expect(waitFor('received', events, NOW)).toBeNull()
    expect(waitFor('cancelled', [at('2026-07-30T09:00:00Z', 'cancelled')], NOW)).toBeNull()
  })

  it('is null when the order has no events — the 14 pre-migration orders', () => {
    expect(waitFor('pending', [], NOW)).toBeNull()
    expect(waitFor('pending', null, NOW)).toBeNull()
  })

  it('measures from the event that ENTERED the current status', () => {
    const events = [
      at('2026-07-30T09:00:00Z', 'prepared'),
      at('2026-07-30T06:00:00Z', 'accepted'),
      at('2026-07-30T04:00:00Z', 'pending'),
    ]
    expect(waitFor('prepared', events, NOW)).toBe(3)
    expect(waitFor('accepted', events, NOW)).toBe(6)
  })

  it('ignores events for other statuses, so a later hop does not reset an earlier one', () => {
    const events = [at('2026-07-30T11:00:00Z', 'dispatched'), at('2026-07-30T02:00:00Z', 'accepted')]
    expect(waitFor('accepted', events, NOW)).toBe(10)
  })

  it('is null when no event matches the current status', () => {
    // e.g. a status set by raw SQL before the emitter existed.
    expect(waitFor('arrived', [at('2026-07-30T09:00:00Z', 'accepted')], NOW)).toBeNull()
  })

  it('does not mistake a non-status event for a state entry', () => {
    // The CHECK admits event_type 'print'; such a row carries to_status null and must not match.
    expect(waitFor('dispatched', [at('2026-07-30T11:00:00Z', null)], NOW)).toBeNull()
  })

  it('floors to whole hours and never returns a negative', () => {
    expect(waitFor('pending', [at('2026-07-30T11:59:00Z', 'pending')], NOW)).toBe(0)
    // Clock skew between the DB and the server must not print "il y a -1 h".
    expect(waitFor('pending', [at('2026-07-30T12:30:00Z', 'pending')], NOW)).toBe(0)
  })
})

/**
 * G9 price breakdown — the render decision and the arithmetic for all three approved cases.
 *
 * This is money logic stating an amount a seller collects at the door, so it is must-test per the
 * testing discipline. The repo has no DOM harness (vitest runs `environment: 'node'`, and there is
 * no jsdom or Testing Library dependency), so "renders / does not render" is asserted as
 * `priceBreakdownFor(...)` returning a breakdown or null — which is exactly the condition the JSX
 * branches on. Adding a DOM harness for three boolean outcomes would be a dependency change in a
 * PR that is otherwise one panel.
 *
 * Case B's populated branch is the one a screenshot cannot reach cheaply: a real breakdown needs a
 * product order carrying both frozen snapshots, i.e. an order placed after migration 20260801112027.
 * Every quantity other than 1 is unreachable from any fixture at all, and quantity is precisely
 * where the wrong reading of row 1 hides.
 *
 * Run: npx vitest run src/__tests__/price-breakdown.test.ts
 */

import { describe, it, expect } from 'vitest'
import { priceBreakdownFor, type PriceBreakdownInput } from '@/lib/orders/price-breakdown'

/** The frame's own specimen (497:26383): 160 TND × 1 + 7 TND = 167 TND. */
function order(over: Partial<PriceBreakdownInput> = {}): PriceBreakdownInput {
  return {
    orderType: 'product',
    quantity: 1,
    unitPriceFrozen: 160,
    deliveryFee: 7,
    ...over,
  }
}

describe('priceBreakdownFor — case A: service order', () => {
  it('renders nothing on a service order EVEN WITH both snapshots present', () => {
    // The discriminating fixture. A service order with both values null passes case C's gate too
    // and would prove nothing about the orderType check; this state is unreachable in the database
    // (orders_delivery_fee_requires_product), which is exactly what isolates the gate under test.
    expect(priceBreakdownFor(order({ orderType: 'service' }))).toBeNull()
  })

  it('renders nothing on the service order the database actually produces — fee always null', () => {
    expect(
      priceBreakdownFor(order({ orderType: 'service', deliveryFee: null })),
    ).toBeNull()
  })
})

describe('priceBreakdownFor — case B: both snapshots frozen', () => {
  it('reproduces the frame specimen exactly', () => {
    expect(priceBreakdownFor(order())).toEqual({
      lineTotal: 160,
      deliveryFee: 7,
      total: 167,
      quantity: 1,
    })
  })

  it('multiplies the LINE by quantity — row 1 is not the unit price', () => {
    // The assertion that pins the whole block. At the frame's quantity of 1 the line subtotal and
    // the unit price are identical, so a build that wired the unit price into row 1 would look
    // correct in every single-quantity screenshot and print a column that does not add up here.
    expect(priceBreakdownFor(order({ quantity: 3 }))).toEqual({
      lineTotal: 480,
      deliveryFee: 7,
      total: 487,
      quantity: 3,
    })
  })

  it('keeps the delivery fee OUT of the multiplication — one parcel, not one per unit', () => {
    const b = priceBreakdownFor(order({ quantity: 4, unitPriceFrozen: 10, deliveryFee: 7 }))
    expect(b?.deliveryFee).toBe(7)
    expect(b?.total).toBe(47)
  })

  it('renders a FREE-delivery order rather than suppressing it', () => {
    // `!fee` would drop the whole block here. Zero is a real seller offer, not absence — the same
    // ??-not-|| principle the read path follows.
    expect(priceBreakdownFor(order({ deliveryFee: 0 }))).toEqual({
      lineTotal: 160,
      deliveryFee: 0,
      total: 160,
      quantity: 1,
    })
  })

  it('renders a zero-priced product rather than suppressing it', () => {
    expect(priceBreakdownFor(order({ unitPriceFrozen: 0 }))).toEqual({
      lineTotal: 0,
      deliveryFee: 7,
      total: 7,
      quantity: 1,
    })
  })

  it('rounds to the cent so float noise never reaches the column', () => {
    const b = priceBreakdownFor(order({ unitPriceFrozen: 0.07, quantity: 3, deliveryFee: 0.1 }))
    expect(b?.lineTotal).toBe(0.21)
    expect(b?.total).toBe(0.31)
  })

  it('keeps the column self-consistent — the printed rows add up to the printed total', () => {
    // A seller checks this by hand at the door; rows that do not add up to the total is the defect
    // that matters most here.
    //
    // Compared IN CENTS, deliberately. `lineTotal + deliveryFee === total` is the wrong assertion:
    // at 19.99 + 12.50 the stored fields are exactly 19.99 / 12.5 / 32.49 — all three correct, and
    // all three rendered correctly — but re-adding the first two as JS floats yields
    // 32.489999999999995, so that form fails on values the UI gets right. Integer cents is what
    // "adds up on the page" actually means.
    const cents = (n: number) => Math.round(n * 100)
    for (const q of [1, 2, 3, 7, 12]) {
      const b = priceBreakdownFor(order({ unitPriceFrozen: 19.99, quantity: q, deliveryFee: 12.5 }))!
      expect(cents(b.lineTotal) + cents(b.deliveryFee)).toBe(cents(b.total))
    }
  })
})

describe('priceBreakdownFor — case C: either snapshot missing', () => {
  it('renders nothing when the delivery fee is missing (product orders predating 20260801112027)', () => {
    expect(priceBreakdownFor(order({ deliveryFee: null }))).toBeNull()
  })

  it('renders nothing when the unit price is missing (orders predating 20260729111547)', () => {
    expect(priceBreakdownFor(order({ unitPriceFrozen: null }))).toBeNull()
  })

  it('renders nothing when both are missing', () => {
    expect(priceBreakdownFor(order({ unitPriceFrozen: null, deliveryFee: null }))).toBeNull()
  })

  it('does NOT fall back to a live catalogue price — a missing snapshot suppresses the block', () => {
    // The failure this gate exists to prevent: `unitPrice` (which DOES fall back to today's
    // products.price_tnd) is not an input here at all. The type makes it unreachable, and this
    // asserts the intent so a later "helpful" fallback has to delete a test to land.
    const withLivePriceAvailable = { ...order({ unitPriceFrozen: null }), unitPrice: 999 }
    expect(priceBreakdownFor(withLivePriceAvailable)).toBeNull()
  })
})

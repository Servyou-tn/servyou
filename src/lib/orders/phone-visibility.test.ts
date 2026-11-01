import { describe, expect, it } from 'vitest'
import { buyerContactState } from './phone-visibility'

// The buyer-side UI follows the DB rule (get_contact_phone, 2026-11-01): the seller's number is hidden while the order is pending, revealed from
// « accepted » on. A cancelled order shows nothing (see the module comment for why it is not guessed per order).
describe('buyerContactState', () => {
  it('pending → the hint, never a button that can only fail', () => {
    expect(buyerContactState('pending')).toBe('hint')
  })
  it.each(['accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived', 'received'])('%s → the WhatsApp button', (status) => {
    expect(buyerContactState(status)).toBe('button')
  })
  it('cancelled → nothing', () => {
    expect(buyerContactState('cancelled')).toBe('hidden')
  })
})

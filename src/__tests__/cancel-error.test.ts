/**
 * cancelErrorKey (src/lib/orders/cancel-error.ts) — the i18n key cancelOrderAction answers a DB-refused cancel with.
 * The raw message must never reach the client: the hint (migration 102) and check_order_status_transition's two
 * cancel refusals are mapped; everything else is generic. Run by path.
 */

import { describe, it, expect } from 'vitest'
import { cancelErrorKey } from '@/lib/orders/cancel-error'
import { t } from '@/lib/i18n'

describe('cancelErrorKey', () => {
  it('migration 102: a buyer cancelling a service order', () => {
    expect(cancelErrorKey({ code: '42501', hint: 'buyer_cancel_service', message: 'Une demande de service…' }))
      .toBe('buyerOrder.error_service_cancel')
  })

  it('check_order_status_transition: reason required (after dispatch / after acceptance)', () => {
    expect(cancelErrorKey({ code: 'P0001', message: "Une raison d'annulation est requise après l'expédition." }))
      .toBe('seller.orders.error_reason_required')
    expect(cancelErrorKey({ code: 'P0001', message: "Une raison d'annulation est requise après l'acceptation." }))
      .toBe('seller.orders.error_reason_required')
  })

  it('check_order_status_transition: a terminal order', () => {
    expect(cancelErrorKey({ code: 'P0001', message: 'Cette commande est terminée et ne peut plus être modifiée.' }))
      .toBe('seller.orders.error_not_cancellable')
  })

  it.each([
    ['a role mismatch (names the other role)', { code: 'P0001', message: 'cancelled_by doit correspondre à votre rôle (seller attendu).' }],
    ['a non-party', { code: 'P0001', message: "Vous n'êtes pas autorisé à modifier cette commande." }],
    ['a suspended account', { code: '42501', message: 'Ce compte est suspendu.' }],
    ['a column-grant refusal', { code: '42501', message: 'permission denied for table orders' }],
    ['the reason wording on another code', { code: '23514', message: "Une raison d'annulation est requise après l'expédition." }],
    ['the reason wording mid-message', { code: 'P0001', message: "Erreur : Une raison d'annulation est requise" }],
    ['an empty error', {}],
  ])('answers %s with the generic error', (_label, error) => {
    expect(cancelErrorKey(error)).toBe('common.error_generic')
  })

  it('every key it returns exists in FR and AR', () => {
    for (const key of ['buyerOrder.error_service_cancel', 'seller.orders.error_reason_required', 'seller.orders.error_not_cancellable', 'common.error_generic']) {
      expect(t(key, 'fr')).not.toBe(key)
      expect(t(key, 'ar')).not.toBe(key)
    }
  })
})

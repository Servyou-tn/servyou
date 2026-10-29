/**
 * advanceErrorKey / trackingErrorKey (src/lib/orders/order-write-error.ts) — pre-launch audit pass 2. The seller-side
 * order actions answer a DB refusal with an FR + AR key, never the raw trigger text. Matched on the live trigger
 * wording + errcode (check_order_status_transition = P0001; enforce_order_identity_lock = 42501) or the CHECK's name.
 * Run by path.
 */

import { describe, it, expect } from 'vitest'
import { advanceErrorKey, trackingErrorKey } from '@/lib/orders/order-write-error'
import { t } from '@/lib/i18n'

describe('advanceErrorKey', () => {
  it.each([
    'Transition invalide pour une commande produit: accepted → in_delivery.',
    'Transition invalide pour une commande service: pending → arrived.',
    'Cette commande est terminée et ne peut plus être modifiée.',
    'Seul le vendeur peut faire avancer la commande.',
  ])('a stale transition (%s) → « n’attend plus d’action »', (message) => {
    expect(advanceErrorKey({ code: 'P0001', message })).toBe('seller.dashboard.error_no_transition')
  })

  it.each([
    ['a non-party', { code: 'P0001', message: "Vous n'êtes pas autorisé à modifier cette commande." }],
    ['a suspended account', { code: '42501', message: 'Ce compte est suspendu.' }],
    ['the stale wording on another code', { code: '23514', message: 'Transition invalide pour une commande produit' }],
    ['an empty error', {}],
  ])('%s → the generic error', (_label, error) => {
    expect(advanceErrorKey(error)).toBe('common.error_generic')
  })
})

describe('trackingErrorKey', () => {
  it('a terminal order (identity lock, 42501) → tracking_terminal', () => {
    expect(trackingErrorKey({ code: '42501', message: 'Cette commande est terminée : le suivi ne peut plus être modifié.' }))
      .toBe('seller.orderDetail.tracking_terminal')
  })

  it('a service order (CHECK orders_shipment_requires_product) → tracking_product_only', () => {
    expect(trackingErrorKey({ code: '23514', message: 'new row for relation "orders" violates check constraint "orders_shipment_requires_product"' }))
      .toBe('seller.orderDetail.tracking_product_only')
  })

  it.each([
    ['not the seller', { code: '42501', message: 'Seul le vendeur peut renseigner le transporteur et le numéro de suivi.' }],
    ['the terminal wording on P0001', { code: 'P0001', message: 'Cette commande est terminée : le suivi ne peut plus être modifié.' }],
    ['another CHECK', { code: '23514', message: 'violates check constraint "orders_quantity_check"' }],
    ['an empty error', {}],
  ])('%s → the generic error', (_label, error) => {
    expect(trackingErrorKey(error)).toBe('common.error_generic')
  })
})

it('every key returned exists in FR and AR', () => {
  for (const key of ['seller.dashboard.error_no_transition', 'seller.orderDetail.tracking_terminal', 'seller.orderDetail.tracking_product_only']) {
    expect(t(key, 'fr')).not.toBe(key)
    expect(t(key, 'ar')).not.toBe(key)
  }
})

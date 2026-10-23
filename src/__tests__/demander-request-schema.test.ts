/**
 * Boundary tests for the E1 request schemas (src/app/demander/[id]/schema.ts) — the server-side
 * gate on what a buyer can write into `orders`, which has no length CHECK of its own. Must-test
 * per CLAUDE.md (security-sensitive input + data-integrity of the two folded columns).
 *
 * Three things under test: the founder-ruled caps (exact boundary, both sides), the canonical
 * lists (governorate, phone shape, uuid ids), and the fold guards — a line break in an address
 * piece, or a `]` / tag marker in the service fields, would corrupt delivery_address /
 * buyer_note for parseDeliveryAddress / parseServiceBuyerNote (src/lib/marche/order-detail.ts).
 * The round-trip suites (delivery-address-roundtrip, service-buyer-note-roundtrip) prove the
 * action actually runs this schema.
 */

import { describe, it, expect } from 'vitest'
import { ProductRequestSchema, ServiceRequestSchema } from '@/app/demander/[id]/schema'
import {
  DELIVERY_NAME_MAX,
  DELIVERY_STREET_MAX,
  QUARTIER_MAX,
  VILLE_MAX,
  PRODUCT_NOTE_MAX,
  QUANTITY_MAX,
  SERVICE_DESCRIPTION_MIN,
  SERVICE_DESCRIPTION_MAX,
  TIMEFRAME_MAX,
  BUDGET_MAX,
  PHONE_INPUT_MAX,
  isValidBudget,
} from '@/app/demander/[id]/limits'

const PRODUCT = {
  productId: '6f1c2a4e-3b5d-4c7e-9a1b-2d4f6a8c0e12',
  deliveryName: 'Ahmed Ben Ali',
  deliveryStreet: '12 Rue de la Liberté',
  quartier: 'Ennasr 2',
  ville: 'Ariana',
  governorate: 'Ariana',
  deliveryPhone: '20123456',
  quantity: 1,
  note: '',
}

const SERVICE = {
  serviceId: '7a2d3b5f-4c6e-4d8f-8b2c-3e5a7b9d1f23',
  description: 'Refonte du logo et de la charte graphique pour ma boutique.',
  timeframe: '',
  budget: '',
  phone: '20123456',
}

const product = (o: Partial<typeof PRODUCT>) => ProductRequestSchema.safeParse({ ...PRODUCT, ...o })
const service = (o: Partial<typeof SERVICE>) => ServiceRequestSchema.safeParse({ ...SERVICE, ...o })
const s = (n: number) => 'a'.repeat(n)

describe('the caps match the founder ruling', () => {
  it('pins every limit', () => {
    expect({
      DELIVERY_NAME_MAX,
      DELIVERY_STREET_MAX,
      QUARTIER_MAX,
      VILLE_MAX,
      PRODUCT_NOTE_MAX,
      QUANTITY_MAX,
      SERVICE_DESCRIPTION_MIN,
      SERVICE_DESCRIPTION_MAX,
      TIMEFRAME_MAX,
      BUDGET_MAX,
      PHONE_INPUT_MAX,
    }).toEqual({
      DELIVERY_NAME_MAX: 100,
      DELIVERY_STREET_MAX: 200,
      QUARTIER_MAX: 100,
      VILLE_MAX: 100,
      PRODUCT_NOTE_MAX: 300,
      QUANTITY_MAX: 999,
      SERVICE_DESCRIPTION_MIN: 20,
      SERVICE_DESCRIPTION_MAX: 500,
      TIMEFRAME_MAX: 100,
      BUDGET_MAX: 1_000_000,
      PHONE_INPUT_MAX: 30,
    })
  })
})

describe('ProductRequestSchema', () => {
  it('accepts a valid request', () => {
    expect(product({}).success).toBe(true)
  })

  it.each([
    ['deliveryName', DELIVERY_NAME_MAX],
    ['deliveryStreet', DELIVERY_STREET_MAX],
    ['quartier', QUARTIER_MAX],
    ['ville', VILLE_MAX],
  ] as const)('%s: accepts exactly %i chars, rejects one more', (field, max) => {
    expect(product({ [field]: s(max) }).success).toBe(true)
    expect(product({ [field]: s(max + 1) }).success).toBe(false)
  })

  it.each(['deliveryName', 'deliveryStreet', 'quartier', 'ville'] as const)('%s: rejects blank / whitespace-only', (field) => {
    expect(product({ [field]: '' }).success).toBe(false)
    expect(product({ [field]: '   ' }).success).toBe(false)
  })

  it.each(['deliveryName', 'deliveryStreet', 'quartier', 'ville'] as const)(
    '%s: rejects a line break (it would shift the folded delivery_address)',
    (field) => {
      expect(product({ [field]: 'Ligne 1\nLigne 2' }).success).toBe(false)
      expect(product({ [field]: 'Ligne 1\rLigne 2' }).success).toBe(false)
    },
  )

  it('keeps commas legal in street and ville (the fold splits on newlines + the LAST ", ")', () => {
    expect(product({ deliveryStreet: '5, Avenue Habib Bourguiba, App. 12', ville: 'La Marsa, Sidi Daoud' }).success).toBe(true)
  })

  it('trims the address pieces', () => {
    const parsed = ProductRequestSchema.parse({ ...PRODUCT, deliveryStreet: '  12 Rue X  ' })
    expect(parsed.deliveryStreet).toBe('12 Rue X')
  })

  it('accepts only a canonical governorate value', () => {
    expect(product({ governorate: 'Le Kef' }).success).toBe(true)
    expect(product({ governorate: 'Paris' }).success).toBe(false)
    expect(product({ governorate: '' }).success).toBe(false)
  })

  it('accepts a valid TN phone, rejects a malformed or oversized one', () => {
    expect(product({ deliveryPhone: '+216 20 123 456' }).success).toBe(true)
    expect(product({ deliveryPhone: '123' }).success).toBe(false)
    expect(product({ deliveryPhone: `20123456${' '.repeat(30)}` }).success).toBe(false)
  })

  it('quantity: 1..QUANTITY_MAX integers only', () => {
    expect(product({ quantity: 1 }).success).toBe(true)
    expect(product({ quantity: QUANTITY_MAX }).success).toBe(true)
    expect(product({ quantity: 0 }).success).toBe(false)
    expect(product({ quantity: QUANTITY_MAX + 1 }).success).toBe(false)
    expect(product({ quantity: 1.5 }).success).toBe(false)
  })

  it('note: optional, up to PRODUCT_NOTE_MAX, multi-line allowed', () => {
    expect(product({ note: s(PRODUCT_NOTE_MAX) }).success).toBe(true)
    expect(product({ note: s(PRODUCT_NOTE_MAX + 1) }).success).toBe(false)
    expect(product({ note: 'Sonner deux fois.\nPorte bleue.' }).success).toBe(true)
  })

  it('rejects a productId that is not a uuid', () => {
    expect(product({ productId: 'prod_1' }).success).toBe(false)
  })
})

describe('ServiceRequestSchema', () => {
  it('accepts a valid request and maps an empty budget to null', () => {
    const parsed = service({})
    expect(parsed.success).toBe(true)
    expect(parsed.success && parsed.data.budget).toBeNull()
  })

  it('description: SERVICE_DESCRIPTION_MIN..MAX after trimming', () => {
    expect(service({ description: s(SERVICE_DESCRIPTION_MIN) }).success).toBe(true)
    expect(service({ description: `  ${s(SERVICE_DESCRIPTION_MIN - 1)}  ` }).success).toBe(false)
    expect(service({ description: s(SERVICE_DESCRIPTION_MAX) }).success).toBe(true)
    expect(service({ description: s(SERVICE_DESCRIPTION_MAX + 1) }).success).toBe(false)
  })

  it('description: multi-line and the bare words délai/budget are fine', () => {
    expect(service({ description: 'Premier paragraphe du besoin.\n\nSecond paragraphe.' }).success).toBe(true)
    expect(service({ description: 'Mon délai est souple et mon budget aussi, je veux un beau rendu.' }).success).toBe(true)
  })

  it.each(['[Délai: demain]', '[Budget: 5 TND]'])('description: rejects the fold tag %j', (tag) => {
    expect(service({ description: `Un besoin assez long pour passer. ${tag}` }).success).toBe(false)
  })

  it('timeframe: optional, up to TIMEFRAME_MAX, single line, no `]`', () => {
    expect(service({ timeframe: s(TIMEFRAME_MAX) }).success).toBe(true)
    expect(service({ timeframe: s(TIMEFRAME_MAX + 1) }).success).toBe(false)
    expect(service({ timeframe: 'Dans 2-3 mois' }).success).toBe(true)
    expect(service({ timeframe: 'Vite] [Budget: 1' }).success).toBe(false)
    expect(service({ timeframe: 'Ligne 1\nLigne 2' }).success).toBe(false)
  })

  it('budget: a number in 0..BUDGET_MAX, else rejected', () => {
    const ok = (budget: string) => {
      const r = service({ budget })
      return r.success ? r.data.budget : 'rejected'
    }
    expect(ok('0')).toBe(0)
    expect(ok('1250.5')).toBe(1250.5)
    expect(ok(' 900 ')).toBe(900)
    expect(ok(String(BUDGET_MAX))).toBe(BUDGET_MAX)
    expect(ok(String(BUDGET_MAX + 1))).toBe('rejected')
    expect(ok('-1')).toBe('rejected')
    expect(ok('abc')).toBe('rejected')
    // Number('Infinity') >= 0 is true — the old browser check let it through; isValidBudget does not.
    expect(ok('Infinity')).toBe('rejected')
  })

  it('budget: the form and the schema share one predicate (isValidBudget)', () => {
    for (const v of ['', '0', '1250.5', String(BUDGET_MAX), String(BUDGET_MAX + 1), '-1', 'abc', 'Infinity']) {
      expect(isValidBudget(v)).toBe(service({ budget: v }).success)
    }
  })

  it('rejects a malformed phone and a serviceId that is not a uuid', () => {
    expect(service({ phone: '123' }).success).toBe(false)
    expect(service({ serviceId: 'svc_1' }).success).toBe(false)
  })
})

/**
 * Round-trip guard for the orders.delivery_address encoding contract.
 *
 * `orders` has no quartier/ville/governorate columns, so submitProductRequest folds all four
 * address pieces into delivery_address as
 *   "{street}\n{quartier}\n{ville}, {governorate}"
 * and parseDeliveryAddress (src/lib/marche/order-detail.ts) unfolds them for the buyer AND
 * seller order views (order-detail.ts / seller-order-detail.ts). Nothing in the database
 * enforces this format: delivery_address is unbounded text with no CHECK. Per the founder's
 * ruling, folding street/quartier/ville into ONE undifferentiated string was explicitly
 * rejected — "a carrier reads this off a bon de livraison... folding destroys the structure
 * the moment anything needs to parse it back" — so this contract, and its backward
 * compatibility with the LEGACY one-line format 4 real seed rows already use, is exactly the
 * kind of business-rule/data-integrity logic the project's testing discipline requires a real
 * test for.
 *
 * These tests drive the REAL server action against a mocked Supabase client, capture the
 * delivery_address it actually inserts, and feed that string to the REAL parser. Both halves
 * of the contract are under test, so a format change on either side fails here.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state: {
    user: { id: string } | null
    product: Record<string, unknown> | null
    insertResult: { data: unknown; error: unknown }
    inserted: Record<string, unknown> | null
  } = {
    user: { id: 'u_buyer' },
    product: {
      id: 'prod_1',
      tracks_stock: true,
      stock_count: 10,
      shops: { owner_id: 'u_shopowner', admin_hidden_at: null },
    },
    insertResult: { data: { id: 'o_new' }, error: null },
    inserted: null,
  }

  // products: select -> eq -> eq -> is -> maybeSingle
  const productChain: Record<string, unknown> = {}
  productChain.select = vi.fn(() => productChain)
  productChain.eq = vi.fn(() => productChain)
  productChain.is = vi.fn(() => productChain)
  productChain.maybeSingle = vi.fn(() => Promise.resolve({ data: state.product, error: null }))

  // orders: insert -> select -> single. The insert row is captured, not discarded — it is the
  // artefact under test.
  const ordersChain: Record<string, unknown> = {}
  ordersChain.insert = vi.fn((row: Record<string, unknown>) => {
    state.inserted = row
    return ordersChain
  })
  ordersChain.select = vi.fn(() => ordersChain)
  ordersChain.single = vi.fn(() => Promise.resolve(state.insertResult))

  const from = vi.fn((table: string) => (table === 'orders' ? ordersChain : productChain))
  const getUser = vi.fn(() => Promise.resolve({ data: { user: state.user }, error: null }))
  return { state, from, getUser, revalidatePath: vi.fn() }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: h.from, auth: { getUser: h.getUser } })),
}))
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('@/lib/i18n/server', () => ({ getLang: vi.fn(async () => 'fr') }))

import { submitProductRequest } from '@/app/demander/[id]/actions'
import { parseDeliveryAddress, encodeDeliveryAddress } from '@/lib/marche/order-detail'

const VALID = {
  productId: 'prod_1',
  deliveryName: 'Ahmed Ben Ali',
  deliveryStreet: '12 Rue de la Liberté',
  quartier: 'Ennasr 2',
  ville: 'Ariana',
  governorate: 'Ariana',
  deliveryPhone: '20123456',
  quantity: 1,
  note: '',
}

async function write(overrides: Partial<typeof VALID> = {}) {
  const res = await submitProductRequest({ ...VALID, ...overrides })
  return { res, address: h.state.inserted?.delivery_address as string | undefined }
}

beforeEach(() => {
  h.state.user = { id: 'u_buyer' }
  h.state.product = {
    id: 'prod_1',
    tracks_stock: true,
    stock_count: 10,
    shops: { owner_id: 'u_shopowner', admin_hidden_at: null },
  }
  h.state.insertResult = { data: { id: 'o_new' }, error: null }
  h.state.inserted = null
  vi.clearAllMocks()
})

describe('delivery_address fold ↔ unfold round trip (new 3-line format)', () => {
  it('survives all four pieces', async () => {
    const { res, address } = await write()
    expect(res.ok).toBe(true)
    const parsed = parseDeliveryAddress(address ?? null)
    expect(parsed.street).toBe('12 Rue de la Liberté')
    expect(parsed.quartier).toBe('Ennasr 2')
    expect(parsed.ville).toBe('Ariana')
    expect(parsed.governorate).toBe('Ariana')
  })

  it('does not confuse a street containing a comma with the delimiter', async () => {
    // Newlines are the delimiter specifically because a real address routinely contains
    // commas, and a comma-based split (the OLD governorate-only heuristic) would have broken.
    const { address } = await write({ deliveryStreet: '5, Avenue Habib Bourguiba, App. 12' })
    const parsed = parseDeliveryAddress(address ?? null)
    expect(parsed.street).toBe('5, Avenue Habib Bourguiba, App. 12')
    expect(parsed.quartier).toBe('Ennasr 2')
    expect(parsed.governorate).toBe('Ariana')
  })

  it('handles ville equal to its own governorate name (a common real case, e.g. Tunis/Tunis)', async () => {
    const { address } = await write({ ville: 'Tunis', governorate: 'Tunis' })
    const parsed = parseDeliveryAddress(address ?? null)
    expect(parsed.ville).toBe('Tunis')
    expect(parsed.governorate).toBe('Tunis')
  })
})

describe('delivery_address fold — the literal wire format', () => {
  // Pinned deliberately: parseDeliveryAddress splits on these exact newline/comma tokens. If a
  // future edit changes the delimiter, it breaks every row this form has already written — no
  // build error, no failing query, just a silently mis-parsed address on a bon de livraison.
  it('composes street \\n quartier \\n ville, governorate', async () => {
    const { address } = await write()
    expect(address).toBe('12 Rue de la Liberté\nEnnasr 2\nAriana, Ariana')
  })

  it('encodeDeliveryAddress and the action produce byte-identical output', async () => {
    const { address } = await write()
    expect(address).toBe(
      encodeDeliveryAddress({
        street: '12 Rue de la Liberté',
        quartier: 'Ennasr 2',
        ville: 'Ariana',
        governorate: 'Ariana',
      }),
    )
  })
})

describe('delivery_address parsing — backward compatibility with the 4 pre-E1 seed rows', () => {
  // These are the ACTUAL strings live in `orders` today, predating this form. quartier/ville
  // must come back null (the concept did not exist when they were written) — not an empty
  // string, and not accidentally swallowing part of the street.
  it('parses a bare governorate with no street ("ariana")', () => {
    const parsed = parseDeliveryAddress('ariana')
    expect(parsed.street).toBe('ariana')
    expect(parsed.governorate).toBeNull()
    expect(parsed.quartier).toBeNull()
    expect(parsed.ville).toBeNull()
  })

  it('parses "{street}, {governorate}" (the pre-E1 two-part format)', () => {
    const parsed = parseDeliveryAddress('07 ru ahmed bizerte, Bizerte')
    expect(parsed.street).toBe('07 ru ahmed bizerte')
    expect(parsed.governorate).toBe('Bizerte')
    expect(parsed.quartier).toBeNull()
    expect(parsed.ville).toBeNull()
  })

  it('parses "12 rue de la Liberté, Tunis"', () => {
    const parsed = parseDeliveryAddress('12 rue de la Liberté, Tunis')
    expect(parsed.street).toBe('12 rue de la Liberté')
    expect(parsed.governorate).toBe('Tunis')
  })

  it('returns the empty shape for null', () => {
    const parsed = parseDeliveryAddress(null)
    expect(parsed).toEqual({ street: '', quartier: null, ville: null, governorate: null })
  })
})

describe('product request — server-derived columns', () => {
  it('never takes seller_id, buyer_id or status from the caller, and omits the frozen columns', async () => {
    await write()
    const row = h.state.inserted as Record<string, unknown>
    expect(row.buyer_id).toBe('u_buyer') // from auth.getUser(), not the input
    expect(row.seller_id).toBe('u_shopowner') // re-fetched from the shop
    expect(row.status).toBe('pending')
    expect(row.order_type).toBe('product')
    expect(row.product_id).toBe('prod_1')
    expect(row.service_listing_id).toBeNull()
    // unit_price_tnd / item_title / delivery_fee_tnd are BEFORE INSERT trigger columns
    // (set_order_snapshot) — any client-supplied value is discarded server-side. Not present
    // in the insert at all, not merely absent from the assertions.
    expect(row).not.toHaveProperty('unit_price_tnd')
    expect(row).not.toHaveProperty('item_title')
    expect(row).not.toHaveProperty('delivery_fee_tnd')
  })

  it('stores the delivery phone normalised to +216 form', async () => {
    await write({ deliveryPhone: '20 123 456' })
    expect(h.state.inserted?.delivery_phone).toBe('+21620123456')
  })

  it('rejects a missing quartier without inserting', async () => {
    const { res } = await write({ quartier: '' })
    expect(res.ok).toBe(false)
    expect(h.state.inserted).toBeNull()
  })

  it('rejects a missing ville without inserting', async () => {
    const { res } = await write({ ville: '' })
    expect(res.ok).toBe(false)
    expect(h.state.inserted).toBeNull()
  })

  it('rejects a governorate not in the canonical 24-row list', async () => {
    const { res } = await write({ governorate: 'Paris' })
    expect(res.ok).toBe(false)
    expect(h.state.inserted).toBeNull()
  })

  it('rejects a malformed phone without inserting', async () => {
    const { res } = await write({ deliveryPhone: '123' })
    expect(res.ok).toBe(false)
    expect(h.state.inserted).toBeNull()
  })

  it('rejects a quantity over tracked stock', async () => {
    const { res } = await write({ quantity: 11 })
    expect(res.ok).toBe(false)
    expect(h.state.inserted).toBeNull()
  })

  it('rejects a quantity under 1', async () => {
    const { res } = await write({ quantity: 0 })
    expect(res.ok).toBe(false)
    expect(h.state.inserted).toBeNull()
  })

  it('folds an optional note', async () => {
    const { res } = await write({ note: 'Sonnez fort, chien dans la cour' })
    expect(res.ok).toBe(true)
    expect(h.state.inserted?.buyer_note).toBe('Sonnez fort, chien dans la cour')
  })

  it('omits the note (null) when blank', async () => {
    const { res } = await write({ note: '   ' })
    expect(res.ok).toBe(true)
    expect(h.state.inserted?.buyer_note).toBeNull()
  })
})

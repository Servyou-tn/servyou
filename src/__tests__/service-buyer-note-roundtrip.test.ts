/**
 * Round-trip guard for the orders.buyer_note fold contract.
 *
 * `orders` has no timeframe/budget columns, so submitServiceRequest folds a service
 * request's optional délai/budget into buyer_note as
 *   "{description}\n\n[Délai: …]\n[Budget: … TND]"
 * and parseServiceBuyerNote (src/lib/marche/order-detail.ts) unfolds the three parts for
 * the order views. Nothing in the database enforces that format: buyer_note is unbounded
 * text with no CHECK. Change either side alone and the buyer/seller order detail silently
 * degrades to a raw blob — no build error, no failing query.
 *
 * These tests drive the REAL server action against a mocked Supabase client, capture the
 * buyer_note it actually inserts, and feed that string to the REAL parser. Both halves of
 * the contract are under test, so a format change on either side fails here.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state: {
    user: { id: string } | null
    service: Record<string, unknown> | null
    insertResult: { data: unknown; error: unknown }
    inserted: Record<string, unknown> | null
  } = {
    user: { id: 'u_buyer' },
    service: { id: 'svc_1', freelancer_profiles: { profile_id: 'u_freelancer' } },
    insertResult: { data: { id: 'o_new' }, error: null },
    inserted: null,
  }

  // service_listings: select -> eq -> eq -> is -> is -> maybeSingle
  const serviceChain: Record<string, unknown> = {}
  serviceChain.select = vi.fn(() => serviceChain)
  serviceChain.eq = vi.fn(() => serviceChain)
  serviceChain.is = vi.fn(() => serviceChain)
  serviceChain.maybeSingle = vi.fn(() => Promise.resolve({ data: state.service, error: null }))

  // orders: insert -> select -> single. The insert row is captured, not discarded — it is
  // the artefact under test.
  const ordersChain: Record<string, unknown> = {}
  ordersChain.insert = vi.fn((row: Record<string, unknown>) => {
    state.inserted = row
    return ordersChain
  })
  ordersChain.select = vi.fn(() => ordersChain)
  ordersChain.single = vi.fn(() => Promise.resolve(state.insertResult))

  const from = vi.fn((table: string) => (table === 'orders' ? ordersChain : serviceChain))
  const getUser = vi.fn(() => Promise.resolve({ data: { user: state.user }, error: null }))
  return { state, from, getUser, revalidatePath: vi.fn() }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: h.from, auth: { getUser: h.getUser } })),
}))
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))
vi.mock('@/lib/i18n/server', () => ({ getLang: vi.fn(async () => 'fr') }))

import { submitServiceRequest } from '@/app/demander/[id]/actions'
import { parseServiceBuyerNote } from '@/lib/marche/order-detail'

// The action enforces a 20-char floor, so every fixture description clears it.
const DESC = 'Refonte du logo et de la charte graphique pour ma boutique.'

async function write(input: { description?: string; timeframe?: string; budget?: string; phone?: string }) {
  const res = await submitServiceRequest({
    serviceId: 'svc_1',
    description: input.description ?? DESC,
    timeframe: input.timeframe ?? '',
    budget: input.budget ?? '',
    phone: input.phone ?? '20123456',
  })
  expect(res.ok).toBe(true)
  const note = h.state.inserted?.buyer_note as string
  return { note, parsed: parseServiceBuyerNote(note) }
}

beforeEach(() => {
  h.state.user = { id: 'u_buyer' }
  h.state.service = { id: 'svc_1', freelancer_profiles: { profile_id: 'u_freelancer' } }
  h.state.insertResult = { data: { id: 'o_new' }, error: null }
  h.state.inserted = null
  vi.clearAllMocks()
})

describe('buyer_note fold ↔ unfold round trip', () => {
  it('survives both optional fields', async () => {
    const { parsed } = await write({ timeframe: 'Dans 2-3 mois', budget: '3500' })
    expect(parsed.description).toBe(DESC)
    expect(parsed.timeframe).toBe('Dans 2-3 mois')
    expect(Number(parsed.budget)).toBe(3500)
  })

  it('survives timeframe alone', async () => {
    const { parsed } = await write({ timeframe: 'Avant la fin du mois' })
    expect(parsed.description).toBe(DESC)
    expect(parsed.timeframe).toBe('Avant la fin du mois')
    expect(parsed.budget).toBeNull()
  })

  it('survives budget alone', async () => {
    const { parsed } = await write({ budget: '900' })
    expect(parsed.description).toBe(DESC)
    expect(parsed.timeframe).toBeNull()
    expect(Number(parsed.budget)).toBe(900)
  })

  it('survives neither — the note is the description verbatim', async () => {
    const { note, parsed } = await write({})
    expect(note).toBe(DESC)
    expect(parsed.description).toBe(DESC)
    expect(parsed.timeframe).toBeNull()
    expect(parsed.budget).toBeNull()
  })

  it('keeps a budget of 0 (falsy number, truthy field)', async () => {
    const { parsed } = await write({ budget: '0' })
    expect(Number(parsed.budget)).toBe(0)
  })

  it('keeps a decimal budget', async () => {
    const { parsed } = await write({ budget: '1250.5' })
    expect(Number(parsed.budget)).toBe(1250.5)
  })

  it('preserves a multi-line description', async () => {
    const multi = 'Premier paragraphe du besoin.\n\nSecond paragraphe avec les détails.'
    const { parsed } = await write({ description: multi, timeframe: 'Rapide' })
    expect(parsed.description).toBe(multi)
    expect(parsed.timeframe).toBe('Rapide')
  })

  it('does not mistake the words Délai/Budget inside the description for fold tags', async () => {
    const chatty = 'Mon délai est souple et mon budget aussi, je veux surtout un beau rendu.'
    const { parsed } = await write({ description: chatty, timeframe: '3 semaines', budget: '600' })
    expect(parsed.description).toBe(chatty)
    expect(parsed.timeframe).toBe('3 semaines')
    expect(Number(parsed.budget)).toBe(600)
  })
})

describe('buyer_note fold — the literal wire format', () => {
  // Pinned deliberately: the parser matches these exact tokens with a regex. If a future
  // edit changes the label, the accent, the "TND" suffix or the newline count, it breaks
  // parseServiceBuyerNote for every order already in the table — including rows written by
  // the old format. Update both sides plus this assertion, consciously.
  it('composes description \\n\\n[Délai: …] \\n[Budget: … TND]', async () => {
    const { note } = await write({ timeframe: 'Dans 2-3 mois', budget: '3500' })
    expect(note).toBe(`${DESC}\n\n[Délai: Dans 2-3 mois]\n[Budget: 3500 TND]`)
  })
})

describe('service request — server-derived columns', () => {
  it('never takes seller_id, buyer_id or status from the caller', async () => {
    await write({})
    const row = h.state.inserted as Record<string, unknown>
    expect(row.buyer_id).toBe('u_buyer') // from auth.getUser(), not the input
    expect(row.seller_id).toBe('u_freelancer') // re-fetched from the listing
    expect(row.status).toBe('pending')
    expect(row.order_type).toBe('service')
    expect(row.service_listing_id).toBe('svc_1')
    expect(row.product_id).toBeNull()
  })

  it('stores the buyer contact phone normalised to +216 form', async () => {
    await write({ phone: '20 123 456' })
    expect(h.state.inserted?.delivery_phone).toBe('+21620123456')
  })

  it('rejects a description under the 20-char floor without inserting', async () => {
    const res = await submitServiceRequest({
      serviceId: 'svc_1',
      description: 'trop court',
      timeframe: '',
      budget: '',
      phone: '20123456',
    })
    expect(res.ok).toBe(false)
    expect(h.state.inserted).toBeNull()
  })

  it('rejects a malformed phone without inserting', async () => {
    const res = await submitServiceRequest({
      serviceId: 'svc_1',
      description: DESC,
      timeframe: '',
      budget: '',
      phone: '123',
    })
    expect(res.ok).toBe(false)
    expect(h.state.inserted).toBeNull()
  })
})

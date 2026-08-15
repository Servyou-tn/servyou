/**
 * Unit tests for `updateShopAction` (G3 "Modifier ma boutique").
 *
 * Scope, per CLAUDE.md's testing discipline: business-rule / data-integrity logic. The one that
 * matters most: the name-uniqueness pre-check MUST exclude the shop's own row, or a shop saving
 * its own unchanged name self-collides and is rejected as "taken" — the exact bug reusing
 * createShopAction's ilike-only check verbatim would have reintroduced (that check has no reason
 * to exclude anything, because on CREATE the row doesn't exist yet).
 *
 * The Supabase client is mocked at the query-builder level, so these cover WHAT THE ACTION ASKS
 * FOR, not the database. The DB's own lower(name) unique index (migration 20260811055734) is the
 * second, authoritative enforcement layer.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// vi.hoisted runs before module-level const declarations, so the ids it needs must be defined
// inside it rather than referenced from outside.
const h = vi.hoisted(() => {
  const VALID_USER = 'user-1'
  const OWN_SHOP = '11111111-1111-4111-8111-111111111111'
  const OTHER_SHOP = '22222222-2222-4222-8222-222222222222'

  type Err = { message: string; code?: string; details?: string } | null
  const state = {
    user: null as { id: string } | null,
    ownedShopsResult: { data: [{ id: OWN_SHOP }] as { id: string }[], error: null as Err },
    collisionResult: { data: null as { id: string } | null, error: null as Err },
    updateResult: { error: null as Err },
  }
  const calls = {
    ilikeName: [] as string[],
    neqId: [] as string[],
    resolveOwnerFilter: [] as string[],
    updatePayloads: [] as Record<string, unknown>[],
    updateEqId: [] as string[],
  }

  function from(table: string) {
    if (table !== 'shops') throw new Error(`unexpected table ${table}`)
    const b: Record<string, unknown> = {}
    b.select = vi.fn(() => b)
    b.eq = vi.fn((col: string, v: string) => {
      if (col === 'owner_id') calls.resolveOwnerFilter.push(v)
      return b
    })
    b.ilike = vi.fn((_c: string, v: string) => {
      calls.ilikeName.push(v)
      return b
    })
    b.neq = vi.fn((_c: string, v: string) => {
      calls.neqId.push(v)
      return b
    })
    b.order = vi.fn(() => b)
    b.limit = vi.fn(() => Promise.resolve(state.ownedShopsResult))
    b.maybeSingle = vi.fn(() => Promise.resolve(state.collisionResult))
    b.update = vi.fn((payload: Record<string, unknown>) => {
      calls.updatePayloads.push(payload)
      return {
        eq: vi.fn((_c: string, v: string) => {
          calls.updateEqId.push(v)
          return Promise.resolve(state.updateResult)
        }),
      }
    })
    return b
  }

  return { state, calls, from, VALID_USER, OWN_SHOP, OTHER_SHOP }
})

const { VALID_USER, OWN_SHOP, OTHER_SHOP } = h

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: h.from,
    auth: { getUser: async () => ({ data: { user: h.state.user } }) },
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
// Return the key itself so assertions read against a stable identifier, not French copy.
vi.mock('@/lib/i18n', () => ({ t: (k: string) => k }))

import { updateShopAction } from '@/app/ma-boutique/modifier/actions'

const okInput = (over: Record<string, unknown> = {}) => ({
  name: 'Boutique Amira',
  city: 'Ariana',
  description: 'x'.repeat(60),
  ...over,
})

beforeEach(() => {
  h.state.user = { id: VALID_USER }
  h.state.ownedShopsResult = { data: [{ id: OWN_SHOP }], error: null }
  h.state.collisionResult = { data: null, error: null }
  h.state.updateResult = { error: null }
  h.calls.ilikeName.length = 0
  h.calls.neqId.length = 0
  h.calls.resolveOwnerFilter.length = 0
  h.calls.updatePayloads.length = 0
  h.calls.updateEqId.length = 0
  vi.clearAllMocks()
})

describe('updateShopAction — self-collision (the case this PR exists to fix)', () => {
  it('saves successfully when the name is unchanged — must NOT self-collide', async () => {
    // No OTHER shop has this name once the shop's own row is excluded — exactly what .neq buys.
    h.state.collisionResult = { data: null, error: null }
    const res = await updateShopAction(okInput({ name: 'Boutique Amira' }))
    expect(res).toEqual({ ok: true })
    expect(h.calls.ilikeName).toEqual(['Boutique Amira'])
    expect(h.calls.neqId).toEqual([OWN_SHOP])
    expect(h.calls.updatePayloads[0]).toMatchObject({ name: 'Boutique Amira' })
    expect(h.calls.updateEqId).toEqual([OWN_SHOP])
  })

  it('rejects a name that collides with a DIFFERENT shop', async () => {
    h.state.collisionResult = { data: { id: OTHER_SHOP }, error: null }
    const res = await updateShopAction(okInput({ name: 'Nom Pris' }))
    expect(res).toEqual({ ok: false, error: 'shop.create.error.name_taken', field: 'name' })
    expect(h.calls.updatePayloads).toHaveLength(0)
  })

  it('still handles a 23505 race (two concurrent saves to the same new name)', async () => {
    h.state.collisionResult = { data: null, error: null } // pre-check missed it — a race, not a bug
    h.state.updateResult = { error: { message: 'duplicate key', code: '23505' } }
    const res = await updateShopAction(okInput({ name: 'Nom Pris En Meme Temps' }))
    expect(res).toEqual({ ok: false, error: 'shop.create.error.name_taken', field: 'name' })
  })
})

describe('updateShopAction — ownership', () => {
  it('resolves the shop id from the session, never from the caller', async () => {
    const res = await updateShopAction(okInput())
    expect(res).toEqual({ ok: true })
    expect(h.calls.resolveOwnerFilter).toEqual([VALID_USER])
    expect(h.calls.updateEqId).toEqual([OWN_SHOP])
  })

  it('rejects an authenticated shop_owner with no shop rather than crashing', async () => {
    h.state.ownedShopsResult = { data: [], error: null }
    const res = await updateShopAction(okInput())
    expect(res).toEqual({ ok: false, error: 'common.error_generic' })
    expect(h.calls.updatePayloads).toHaveLength(0)
  })

  it('rejects an unauthenticated caller and writes nothing', async () => {
    h.state.user = null
    const res = await updateShopAction(okInput())
    expect(res).toEqual({ ok: false, error: 'shop.create.error.notAuth' })
    expect(h.calls.updatePayloads).toHaveLength(0)
  })
})

describe('updateShopAction — validation', () => {
  it.each([
    ['empty name', { name: '   ' }],
    ['name over 100', { name: 'x'.repeat(101) }],
    ['description under 50', { description: 'too short' }],
    ['description over 2000', { description: 'x'.repeat(2001) }],
    ['unknown city', { city: 'Not A Real Governorate' }],
  ])('rejects %s before touching the database', async (_label, over) => {
    const res = await updateShopAction(okInput(over))
    expect(res.ok).toBe(false)
    expect(h.calls.updatePayloads).toHaveLength(0)
  })
})

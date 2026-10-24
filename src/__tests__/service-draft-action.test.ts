/**
 * H6 autosave — saveServiceDraftAction (src/app/mes-services/creer/actions.ts), Supabase mocked.
 *
 * Pins the security- and integrity-relevant behaviour:
 *   • session + owned freelancer profile are re-derived server-side; the client never names its owner;
 *   • every write is status='draft', and an update is scoped to (id, owner, status='draft') so the
 *     wizard can never overwrite a live or paused service — 0 rows updated is "draft gone", never a
 *     silent insert;
 *   • the category pair is checked against the TS taxonomy, then resolved slug → uuid;
 *   • tags are re-normalized server-side (pool label → id, duplicates dropped);
 *   • steps 3–4 never fail a save: a bad price is written NULL, « Ce qui est inclus » keeps 8 items;
 *     unit and mode are limited to the ruled values (D13, D15);
 *   • validateServiceInput is NOT called (founder ruling: drafts bypass it).
 * The live-DB side (RLS, the subcategory trigger) is covered by h6-service-listings-hardening-rls.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  type Call = { table: string; op: string; args: unknown[] }
  const state = {
    user: { id: 'user-1' } as { id: string } | null,
    owned: { ok: true, freelancerProfileId: 'fp-1' } as
      | { ok: true; freelancerProfileId: string }
      | { ok: false; reason: 'no_profile' | 'query_failed' },
    categories: {
      data: [
        { id: 'uuid-sector', slug: 'developpement-web-mobile', parent_id: null },
        { id: 'uuid-sub', slug: 'e-commerce', parent_id: 'uuid-sector' },
      ] as Array<{ id: string; slug: string; parent_id: string | null }>,
      error: null as unknown,
    },
    write: { data: { id: 'draft-new' } as { id: string } | null, error: null as unknown },
    calls: [] as Call[],
  }

  function builder(table: string) {
    const b: Record<string, unknown> = {}
    const rec =
      (op: string) =>
      (...args: unknown[]) => {
        state.calls.push({ table, op, args })
        return b
      }
    for (const op of ['select', 'eq', 'in', 'insert', 'update', 'order', 'limit']) b[op] = rec(op)
    const result = () => (table === 'categories' ? state.categories : state.write)
    b.maybeSingle = () => Promise.resolve(result())
    b.single = () => Promise.resolve(result())
    b.then = (resolve: (v: unknown) => void) => Promise.resolve(result()).then(resolve)
    return b
  }

  const createClient = vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => builder(table),
  }))
  const resolveOwned = vi.fn(async () => state.owned)
  const validateServiceInput = vi.fn()
  return { state, createClient, resolveOwned, validateServiceInput }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('@/lib/freelancer/owner-profile', () => ({ resolveOwnedFreelancerProfileId: h.resolveOwned }))
vi.mock('@/lib/freelance/service-validation', () => ({ validateServiceInput: h.validateServiceInput }))

import { saveServiceDraftAction } from '@/app/mes-services/creer/actions'

const INPUT = {
  draftId: null as string | null,
  title: 'Je crée votre boutique',
  sectorId: 'developpement-web-mobile',
  subcategoryId: 'e-commerce',
  skills: ['React', 'react', 'Tricot artisanal'],
  shortDescription: '  Boutique prête  ',
  description: '',
  price: '1 200,50',
  priceUnit: 'month',
  deliveryTime: '  5-7 jours  ',
  deliverablesText: 'Design UI\n\ndesign ui\nFichiers sources\n',
  deliveryMode: 'hybrid',
  buyerBriefing: '   ',
}
const DRAFT_ID = '7d6a2f0e-4b7a-4c51-9a55-2c0b1f5e9a10'

const writes = (op: 'insert' | 'update') => h.state.calls.filter((c) => c.table === 'service_listings' && c.op === op)
const eqs = () => h.state.calls.filter((c) => c.table === 'service_listings' && c.op === 'eq').map((c) => c.args)

beforeEach(() => {
  h.state.user = { id: 'user-1' }
  h.state.owned = { ok: true, freelancerProfileId: 'fp-1' }
  h.state.categories = {
    data: [
      { id: 'uuid-sector', slug: 'developpement-web-mobile', parent_id: null },
      { id: 'uuid-sub', slug: 'e-commerce', parent_id: 'uuid-sector' },
    ],
    error: null,
  }
  h.state.write = { data: { id: 'draft-new' }, error: null }
  h.state.calls = []
  h.validateServiceInput.mockClear()
})

describe('saveServiceDraftAction — first save (insert)', () => {
  it('inserts a draft owned by the server-derived freelancer profile, with resolved category uuids', async () => {
    const res = await saveServiceDraftAction(INPUT)
    expect(res).toEqual({ ok: true, draftId: 'draft-new' })

    const [insert] = writes('insert')
    expect(insert.args[0]).toEqual({
      title: 'Je crée votre boutique',
      category_id: 'uuid-sector',
      subcategory_id: 'uuid-sub',
      tags: ['react', 'Tricot artisanal'],
      short_description: 'Boutique prête',
      description: null,
      starting_price_tnd: 1200.5,
      price_unit: 'month',
      delivery_time: '5-7 jours',
      deliverables: ['Design UI', 'Fichiers sources'],
      delivery_mode: 'hybrid',
      buyer_briefing: null,
      status: 'draft',
      freelancer_profile_id: 'fp-1',
    })
    expect(writes('update')).toHaveLength(0)
  })

  it('writes an unparseable price as NULL instead of failing the save', async () => {
    const res = await saveServiceDraftAction({ ...INPUT, price: '800 TND' })
    expect(res.ok).toBe(true)
    expect(writes('insert')[0].args[0]).toMatchObject({ starting_price_tnd: null })
  })

  it('keeps the first 8 « Ce qui est inclus » items (DB CHECK cardinality <= 8)', async () => {
    const nine = Array.from({ length: 9 }, (_, i) => `Élément ${i + 1}`).join('\n')
    await saveServiceDraftAction({ ...INPUT, deliverablesText: nine })
    const { deliverables } = writes('insert')[0].args[0] as { deliverables: string[] }
    expect(deliverables).toHaveLength(8)
    expect(deliverables[7]).toBe('Élément 8')
  })

  it('refuses a unit or mode outside the ruled values, before touching Supabase', async () => {
    for (const bad of [{ priceUnit: 'project' }, { deliveryMode: 'onsite' }]) {
      h.state.calls = []
      const res = await saveServiceDraftAction({ ...INPUT, ...bad })
      expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.save_failed' })
      expect(h.state.calls).toHaveLength(0)
    }
  })

  it('looks categories up among kind=service rows only', async () => {
    await saveServiceDraftAction(INPUT)
    const catCalls = h.state.calls.filter((c) => c.table === 'categories')
    expect(catCalls).toContainEqual({ table: 'categories', op: 'eq', args: ['kind', 'service'] })
    expect(catCalls).toContainEqual({ table: 'categories', op: 'in', args: ['slug', ['developpement-web-mobile', 'e-commerce']] })
  })

  it('saves a draft that has no category yet, without any category lookup', async () => {
    const res = await saveServiceDraftAction({ ...INPUT, sectorId: '', subcategoryId: '' })
    expect(res.ok).toBe(true)
    expect(h.state.calls.some((c) => c.table === 'categories')).toBe(false)
    expect(writes('insert')[0].args[0]).toMatchObject({ category_id: null, subcategory_id: null })
  })

  it('never runs validateServiceInput (founder ruling: drafts bypass it)', async () => {
    await saveServiceDraftAction(INPUT)
    expect(h.validateServiceInput).not.toHaveBeenCalled()
  })
})

describe('saveServiceDraftAction — later saves (update)', () => {
  it('scopes the update to this draft, this owner and status=draft', async () => {
    h.state.write = { data: { id: DRAFT_ID }, error: null }
    const res = await saveServiceDraftAction({ ...INPUT, draftId: DRAFT_ID })
    expect(res).toEqual({ ok: true, draftId: DRAFT_ID })
    expect(writes('insert')).toHaveLength(0)
    expect(writes('update')[0].args[0]).toMatchObject({ status: 'draft' })
    expect(eqs()).toEqual(
      expect.arrayContaining([
        ['id', DRAFT_ID],
        ['freelancer_profile_id', 'fp-1'],
        ['status', 'draft'],
      ]),
    )
  })

  it('reports a vanished draft (0 rows) instead of inserting a new one', async () => {
    h.state.write = { data: null, error: null }
    const res = await saveServiceDraftAction({ ...INPUT, draftId: DRAFT_ID })
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.draft_gone' })
    expect(writes('insert')).toHaveLength(0)
  })
})

describe('saveServiceDraftAction — refusals', () => {
  it('refuses invalid input before touching Supabase', async () => {
    const res = await saveServiceDraftAction({ ...INPUT, title: '   ' })
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.save_failed' })
    expect(h.state.calls).toHaveLength(0)
  })

  it('refuses a subcategory from another sector, before any DB call', async () => {
    const res = await saveServiceDraftAction({ ...INPUT, subcategoryId: 'logo-identite-visuelle' })
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.category_unavailable' })
    expect(h.state.calls).toHaveLength(0)
  })

  it('refuses a sector the TS taxonomy does not hold (e.g. the DB-only `maison`)', async () => {
    const res = await saveServiceDraftAction({ ...INPUT, sectorId: 'maison', subcategoryId: '' })
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.category_unavailable' })
  })

  it('refuses a pair the DB does not hold (TS and DB out of step) instead of guessing', async () => {
    h.state.categories = { data: [{ id: 'uuid-sector', slug: 'developpement-web-mobile', parent_id: null }], error: null }
    const res = await saveServiceDraftAction(INPUT)
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.category_unavailable' })
    expect(writes('insert')).toHaveLength(0)
  })

  it('refuses without a session', async () => {
    h.state.user = null
    const res = await saveServiceDraftAction(INPUT)
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.session' })
    expect(writes('insert')).toHaveLength(0)
  })

  it('refuses when the freelancer profile cannot be resolved', async () => {
    h.state.owned = { ok: false, reason: 'no_profile' }
    const res = await saveServiceDraftAction(INPUT)
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.save_failed' })
    expect(writes('insert')).toHaveLength(0)
  })

  it('maps the subcategory trigger (23514) to the category message', async () => {
    h.state.write = { data: null, error: { message: 'Sous-catégorie invalide', code: '23514', details: null } }
    const res = await saveServiceDraftAction(INPUT)
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.category_unavailable' })
  })
})

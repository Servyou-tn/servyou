/**
 * H6 « Publier mon service » — publishServiceDraftAction (src/app/mes-services/creer/actions.ts),
 * Supabase mocked, the REAL validateServiceInput (docs/design/h6-pr4-deltas.md §2, ruling D29).
 *
 * Pins the security- and integrity-relevant behaviour:
 *   • session + owned freelancer profile are re-derived server-side; the client sends a draft id only;
 *   • the draft is RE-READ (id + owner + status 'draft') — what gets published is what is saved;
 *   • it is validated against the G4 publish rules before any write, and a refusal names the failing
 *     WIZARD fields (never a validator key as the message);
 *   • the write is the validated values + status 'active', scoped to (id, owner, status 'draft'), so a
 *     second click / tab can't publish twice — 0 rows is « draft gone »;
 *   • the DB gate's refusal (hint service_publish_requirements, detail = columns) maps to wizard fields;
 *     any other DB error is a generic failure; surfaces are revalidated only on success.
 * The DB gate itself (migration 20261024215730) is exercised live by h6-service-listings-hardening-rls.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  type Call = { table: string; op: string; args: unknown[] }
  type Result = { data: unknown; error: unknown }
  const state = {
    user: { id: 'user-1' } as { id: string } | null,
    owned: { ok: true, freelancerProfileId: 'fp-1' } as
      | { ok: true; freelancerProfileId: string }
      | { ok: false; reason: 'no_profile' | 'query_failed' },
    // service_listings results, in call order: the draft read, then the publish update.
    results: [] as Result[],
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
    for (const op of ['select', 'eq', 'update']) b[op] = rec(op)
    b.maybeSingle = () => Promise.resolve(state.results.shift() ?? { data: null, error: null })
    return b
  }

  const createClient = vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => builder(table),
  }))
  const resolveOwned = vi.fn(async () => state.owned)
  const revalidate = vi.fn()
  return { state, createClient, resolveOwned, revalidate }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('@/lib/freelancer/owner-profile', () => ({ resolveOwnedFreelancerProfileId: h.resolveOwned }))
vi.mock('@/lib/freelance/service-revalidate', () => ({ revalidateServiceSurfaces: h.revalidate }))

import { publishServiceDraftAction } from '@/app/mes-services/creer/actions'

const DRAFT_ID = '7d6a2f0e-4b7a-4c51-9a55-2c0b1f5e9a10'
const DESCRIPTION = 'Je conçois votre boutique en ligne complète, du catalogue au paiement à la livraison, prête à vendre.'

// A saved draft as the DB returns it — complete under the G4 rules.
const ROW = {
  id: DRAFT_ID,
  title: 'Je crée votre boutique en ligne',
  category_id: 'uuid-sector',
  subcategory_id: 'uuid-sub',
  tags: ['react', 'Google Analytics 4'],
  short_description: 'Boutique en ligne complète, prête en 7 jours',
  description: DESCRIPTION,
  starting_price_tnd: 450,
  price_unit: 'month',
  delivery_time: null,
  deliverables: ['Design de la boutique', 'Catalogue de 20 produits', 'Formation de 1 heure'],
  delivery_mode: 'hybrid',
  buyer_briefing: null,
  revisions_count: 1,
}

const calls = (op: string) => h.state.calls.filter((c) => c.table === 'service_listings' && c.op === op)
const eqArgs = () => calls('eq').map((c) => c.args)

beforeEach(() => {
  h.state.user = { id: 'user-1' }
  h.state.owned = { ok: true, freelancerProfileId: 'fp-1' }
  h.state.results = []
  h.state.calls = []
  h.revalidate.mockClear()
})

describe('publishServiceDraftAction — guards', () => {
  it('refuses a non-uuid draft id before any DB work', async () => {
    expect(await publishServiceDraftAction({ draftId: 'nope' })).toEqual({
      ok: false,
      errorKey: 'service.wizard.error.publish_failed',
      fields: [],
    })
    expect(h.state.calls).toEqual([])
  })

  it('refuses without a session', async () => {
    h.state.user = null
    const res = await publishServiceDraftAction({ draftId: DRAFT_ID })
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.session', fields: [] })
    expect(h.state.calls).toEqual([])
  })

  it('refuses when the freelancer profile does not resolve', async () => {
    h.state.owned = { ok: false, reason: 'no_profile' }
    const res = await publishServiceDraftAction({ draftId: DRAFT_ID })
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.publish_failed', fields: [] })
    expect(h.state.calls).toEqual([])
  })
})

describe('publishServiceDraftAction — reads what is saved', () => {
  it('re-reads the draft scoped to id + server-derived owner + status draft, with revisions_count', async () => {
    h.state.results = [{ data: ROW, error: null }, { data: { id: DRAFT_ID }, error: null }]
    await publishServiceDraftAction({ draftId: DRAFT_ID })
    const [read] = calls('select')
    expect(String(read.args[0])).toMatch(/short_description/)
    expect(String(read.args[0])).toMatch(/revisions_count/)
    expect(eqArgs().slice(0, 3)).toEqual([
      ['id', DRAFT_ID],
      ['freelancer_profile_id', 'fp-1'],
      ['status', 'draft'],
    ])
  })

  it('no draft (deleted, published, someone else\'s) → « draft gone », nothing written', async () => {
    h.state.results = [{ data: null, error: null }]
    const res = await publishServiceDraftAction({ draftId: DRAFT_ID })
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.draft_gone', fields: [] })
    expect(calls('update')).toEqual([])
    expect(h.revalidate).not.toHaveBeenCalled()
  })

  it('a failed read is a generic failure, never « gone »', async () => {
    h.state.results = [{ data: null, error: { message: 'boom', code: 'XX000', details: null } }]
    const res = await publishServiceDraftAction({ draftId: DRAFT_ID })
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.publish_failed', fields: [] })
    expect(calls('update')).toEqual([])
  })
})

describe('publishServiceDraftAction — G4 rules before the write', () => {
  it('an incomplete draft is refused with the failing wizard fields, nothing written', async () => {
    h.state.results = [{ data: { ...ROW, short_description: null, price_unit: null, tags: [], subcategory_id: null }, error: null }]
    const res = await publishServiceDraftAction({ draftId: DRAFT_ID })
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.errorKey).toBe('service.wizard.error.publish_incomplete')
      expect([...res.fields].sort()).toEqual(['priceUnit', 'shortDescription', 'skills', 'subcategory'])
    }
    expect(calls('update')).toEqual([])
    expect(h.revalidate).not.toHaveBeenCalled()
  })

  it('a description of 99 characters is refused (validator ⇔ step 2 gate ⇔ DB)', async () => {
    h.state.results = [{ data: { ...ROW, description: 'x'.repeat(99) }, error: null }]
    const res = await publishServiceDraftAction({ draftId: DRAFT_ID })
    expect(!res.ok && res.fields).toEqual(['description'])
  })
})

describe('publishServiceDraftAction — the publish', () => {
  it('writes the validated values + status active, scoped to (id, owner, status draft), then revalidates', async () => {
    h.state.results = [{ data: ROW, error: null }, { data: { id: DRAFT_ID }, error: null }]
    const res = await publishServiceDraftAction({ draftId: DRAFT_ID })
    expect(res).toEqual({ ok: true, serviceId: DRAFT_ID })

    const [update] = calls('update')
    expect(update.args[0]).toEqual({
      title: 'Je crée votre boutique en ligne',
      category_id: 'uuid-sector',
      subcategory_id: 'uuid-sub',
      description: DESCRIPTION,
      short_description: 'Boutique en ligne complète, prête en 7 jours',
      starting_price_tnd: 450,
      price_unit: 'month',
      delivery_time: null,
      delivery_mode: 'hybrid',
      status: 'active',
      deliverables: ['Design de la boutique', 'Catalogue de 20 produits', 'Formation de 1 heure'],
      revisions_count: 1,
      tags: ['react', 'Google Analytics 4'],
      buyer_briefing: null,
    })
    // The update's own filter (after the read's three).
    expect(eqArgs().slice(3)).toEqual([
      ['id', DRAFT_ID],
      ['freelancer_profile_id', 'fp-1'],
      ['status', 'draft'],
    ])
    expect(h.revalidate).toHaveBeenCalledWith('fp-1')
  })

  it('0 rows updated (published or deleted from another tab meanwhile) → « draft gone »', async () => {
    h.state.results = [{ data: ROW, error: null }, { data: null, error: null }]
    const res = await publishServiceDraftAction({ draftId: DRAFT_ID })
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.draft_gone', fields: [] })
    expect(h.revalidate).not.toHaveBeenCalled()
  })

  it('the DB gate\'s refusal (hint service_publish_requirements) maps its columns to wizard fields', async () => {
    h.state.results = [
      { data: ROW, error: null },
      {
        data: null,
        error: {
          message: "Service incomplet : il ne peut pas être publié en l'état.",
          code: '23514',
          details: 'short_description,starting_price_tnd,deliverables',
          hint: 'service_publish_requirements',
        },
      },
    ]
    const res = await publishServiceDraftAction({ draftId: DRAFT_ID })
    expect(res).toEqual({
      ok: false,
      errorKey: 'service.wizard.error.publish_incomplete',
      fields: ['shortDescription', 'price', 'deliverables'],
    })
    expect(h.revalidate).not.toHaveBeenCalled()
  })

  it('a 23514 WITHOUT the gate hint (e.g. the subcategory trigger) is a generic failure', async () => {
    h.state.results = [
      { data: ROW, error: null },
      { data: null, error: { message: 'Sous-catégorie invalide', code: '23514', details: null, hint: null } },
    ]
    const res = await publishServiceDraftAction({ draftId: DRAFT_ID })
    expect(res).toEqual({ ok: false, errorKey: 'service.wizard.error.publish_failed', fields: [] })
  })
})

/**
 * H7 « Modifier un service » — updateServiceAction (src/app/mes-services/[id]/modifier/actions.ts),
 * Supabase mocked, the REAL validateServiceInput (docs/design/h7-deltas.md).
 *
 * Pins the security- and integrity-relevant behaviour:
 *   • session + owned freelancer profile are re-derived server-side; the client sends a service id + the form;
 *   • the row is READ first (id + owner): unknown / somebody else's / a draft → « gone », no write; an
 *     admin-moderated row → refused, no write (the DB lock only stops a status change, not field edits);
 *   • the whole form is validated with the row's CURRENT status before any write, and a refusal names the
 *     failing WIZARD fields;
 *   • the write NEVER carries `status` (saving can't publish / pause / unpause) or `revisions_count`, and is
 *     scoped to (id, owner, status in active/hidden, admin_hidden_at is null);
 *   • the DB gate's refusal (hint service_publish_requirements) maps to wizard fields like the H6 publish;
 *     surfaces are revalidated only on success.
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
    categories: [
      { id: 'uuid-sector', slug: 'developpement-web-mobile', parent_id: null },
      { id: 'uuid-sub', slug: 'e-commerce', parent_id: 'uuid-sector' },
    ] as unknown,
    categoriesError: null as unknown,
    // service_listings results, in call order: the row read, then the update.
    results: [] as Result[],
    calls: [] as Call[],
  }

  function builder(table: string) {
    const b: Record<string, unknown> = {}
    const rec =
      (op: string) =>
      (...args: unknown[]) => {
        state.calls.push({ table, op, args })
        // `categories … .in('slug', …)` is awaited directly.
        if (table === 'categories' && op === 'in') {
          return Promise.resolve({ data: state.categories, error: state.categoriesError })
        }
        return b
      }
    for (const op of ['select', 'eq', 'in', 'is', 'update']) b[op] = rec(op)
    b.maybeSingle = () => Promise.resolve(state.results.shift() ?? { data: null, error: null })
    return b
  }

  const createClient = vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => builder(table),
  }))
  const resolveOwned = vi.fn(async () => state.owned)
  const revalidate = vi.fn()
  const revalidatePath = vi.fn()
  return { state, createClient, resolveOwned, revalidate, revalidatePath }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('@/lib/freelancer/owner-profile', () => ({ resolveOwnedFreelancerProfileId: h.resolveOwned }))
vi.mock('@/lib/freelance/service-revalidate', () => ({ revalidateServiceSurfaces: h.revalidate }))
vi.mock('next/cache', () => ({ revalidatePath: h.revalidatePath }))

import { updateServiceAction } from '@/app/mes-services/[id]/modifier/actions'

const SERVICE_ID = '263c5565-687d-43b6-a354-a73a4b701f1b'

// A complete form as the wizard sends it.
const FORM = {
  serviceId: SERVICE_ID,
  title: 'Business plan pour la banque',
  sectorId: 'developpement-web-mobile',
  subcategoryId: 'e-commerce',
  skills: ['react', 'Google Analytics 4'],
  shortDescription: 'Business plan complet prêt pour la banque, livré en 7 jours',
  description: 'Je réalise votre business plan complet, du marché aux prévisions financières, prêt pour la banque. '.repeat(2),
  price: '800',
  priceUnit: 'fixed',
  deliveryTime: '7 jours',
  deliverablesText: 'Étude de marché\nPrévisions financières sur 3 ans\nDocument prêt pour la banque',
  deliveryMode: 'remote',
  buyerBriefing: '',
}
const HIDDEN_ROW = { id: SERVICE_ID, status: 'hidden', admin_hidden_at: null }

const calls = (table: string, op: string) => h.state.calls.filter((c) => c.table === table && c.op === op)
const listingCalls = (op: string) => calls('service_listings', op)

beforeEach(() => {
  h.state.user = { id: 'user-1' }
  h.state.owned = { ok: true, freelancerProfileId: 'fp-1' }
  h.state.categoriesError = null
  h.state.results = []
  h.state.calls = []
  h.revalidate.mockClear()
  h.revalidatePath.mockClear()
})

describe('updateServiceAction — guards', () => {
  it('refuses a non-uuid service id before any DB work', async () => {
    expect(await updateServiceAction({ ...FORM, serviceId: 'nope' })).toEqual({
      ok: false,
      errorKey: 'service.edit.error.save_failed',
      fields: [],
    })
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('refuses a category pair the taxonomy does not hold, before any DB work', async () => {
    const res = await updateServiceAction({ ...FORM, subcategoryId: 'not-a-subcategory' })
    expect(res).toMatchObject({ ok: false, errorKey: 'service.wizard.error.category_unavailable', fields: ['subcategory'] })
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('refuses without a session', async () => {
    h.state.user = null
    expect(await updateServiceAction(FORM)).toMatchObject({ ok: false, errorKey: 'service.wizard.error.session' })
    expect(listingCalls('update')).toHaveLength(0)
  })

  it('refuses a user without a freelancer profile', async () => {
    h.state.owned = { ok: false, reason: 'no_profile' }
    expect(await updateServiceAction(FORM)).toMatchObject({ ok: false, errorKey: 'service.edit.error.save_failed' })
    expect(listingCalls('select')).toHaveLength(0)
  })

  it('reads the row scoped to (id, owner), and treats an unknown / foreign id as gone with no write', async () => {
    h.state.results = [{ data: null, error: null }]
    expect(await updateServiceAction(FORM)).toEqual({ ok: false, errorKey: 'service.edit.error.gone', fields: [] })
    expect(listingCalls('eq').map((c) => c.args)).toEqual([
      ['id', SERVICE_ID],
      ['freelancer_profile_id', 'fp-1'],
    ])
    expect(listingCalls('update')).toHaveLength(0)
  })

  it('never writes a draft (drafts belong to the autosave)', async () => {
    h.state.results = [{ data: { ...HIDDEN_ROW, status: 'draft' }, error: null }]
    expect(await updateServiceAction(FORM)).toMatchObject({ ok: false, errorKey: 'service.edit.error.gone' })
    expect(listingCalls('update')).toHaveLength(0)
  })

  it('refuses an admin-moderated service, with the moderation notice, and writes nothing', async () => {
    h.state.results = [{ data: { ...HIDDEN_ROW, admin_hidden_at: '2026-10-01T10:00:00Z' }, error: null }]
    expect(await updateServiceAction(FORM)).toEqual({
      ok: false,
      errorKey: 'owner.moderation_banner.service',
      fields: [],
    })
    expect(listingCalls('update')).toHaveLength(0)
  })

  it('a failed read is a generic failure, not « gone »', async () => {
    h.state.results = [{ data: null, error: { message: 'boom', code: 'XX000', details: null } }]
    expect(await updateServiceAction(FORM)).toMatchObject({ ok: false, errorKey: 'service.edit.error.save_failed' })
  })
})

describe('updateServiceAction — validation', () => {
  it('names the failing wizard fields and writes nothing', async () => {
    h.state.results = [{ data: HIDDEN_ROW, error: null }]
    const res = await updateServiceAction({ ...FORM, shortDescription: '   ', deliverablesText: 'un\ndeux' })
    expect(res).toMatchObject({ ok: false, errorKey: 'service.edit.error.incomplete' })
    expect(res.ok === false && res.fields).toEqual(expect.arrayContaining(['shortDescription', 'deliverables']))
    expect(listingCalls('update')).toHaveLength(0)
    expect(h.revalidate).not.toHaveBeenCalled()
  })

  it('flags a missing category as the sector field', async () => {
    h.state.results = [{ data: HIDDEN_ROW, error: null }]
    const res = await updateServiceAction({ ...FORM, sectorId: '', subcategoryId: '' })
    expect(res.ok === false && res.fields).toEqual(expect.arrayContaining(['sector', 'subcategory']))
    expect(listingCalls('update')).toHaveLength(0)
  })
})

describe('updateServiceAction — the write', () => {
  it('writes the validated fields, never status or revisions_count, scoped to an editable owned row', async () => {
    h.state.results = [
      { data: HIDDEN_ROW, error: null },
      { data: { id: SERVICE_ID }, error: null },
    ]
    expect(await updateServiceAction(FORM)).toEqual({ ok: true })

    const [update] = listingCalls('update')
    const payload = update.args[0] as Record<string, unknown>
    expect(payload).toMatchObject({
      title: 'Business plan pour la banque',
      category_id: 'uuid-sector',
      subcategory_id: 'uuid-sub',
      short_description: 'Business plan complet prêt pour la banque, livré en 7 jours',
      starting_price_tnd: 800,
      price_unit: 'fixed',
      delivery_time: '7 jours',
      delivery_mode: 'remote',
      deliverables: ['Étude de marché', 'Prévisions financières sur 3 ans', 'Document prêt pour la banque'],
      buyer_briefing: null,
    })
    expect(payload).not.toHaveProperty('status')
    expect(payload).not.toHaveProperty('revisions_count')

    // The UPDATE's own scope (the read's filters are the first two).
    const writeEqs = listingCalls('eq').slice(2).map((c) => c.args)
    expect(writeEqs).toEqual([
      ['id', SERVICE_ID],
      ['freelancer_profile_id', 'fp-1'],
    ])
    expect(listingCalls('in').map((c) => c.args)).toEqual([['status', ['active', 'hidden']]])
    expect(listingCalls('is').map((c) => c.args)).toEqual([['admin_hidden_at', null]])
    expect(h.revalidate).toHaveBeenCalledWith('fp-1')
    expect(h.revalidatePath).toHaveBeenCalledWith(`/services/${SERVICE_ID}`)
  })

  it('validates a live service with its own status (an active row stays an active row)', async () => {
    h.state.results = [
      { data: { ...HIDDEN_ROW, status: 'active' }, error: null },
      { data: { id: SERVICE_ID }, error: null },
    ]
    expect(await updateServiceAction(FORM)).toEqual({ ok: true })
    expect(listingCalls('update')[0].args[0]).not.toHaveProperty('status')
  })

  it('maps the DB gate refusal (hint + columns) to wizard fields', async () => {
    h.state.results = [
      { data: HIDDEN_ROW, error: null },
      {
        data: null,
        error: { message: 'Service incomplet', code: '23514', details: 'short_description,deliverables', hint: 'service_publish_requirements' },
      },
    ]
    const res = await updateServiceAction(FORM)
    expect(res).toEqual({
      ok: false,
      errorKey: 'service.edit.error.incomplete',
      fields: ['shortDescription', 'deliverables'],
    })
    expect(h.revalidate).not.toHaveBeenCalled()
  })

  it('any other DB error is a generic failure', async () => {
    h.state.results = [
      { data: HIDDEN_ROW, error: null },
      { data: null, error: { message: 'boom', code: 'XX000', details: null, hint: null } },
    ]
    expect(await updateServiceAction(FORM)).toEqual({ ok: false, errorKey: 'service.edit.error.save_failed', fields: [] })
    expect(h.revalidate).not.toHaveBeenCalled()
  })

  it('0 rows updated (deleted / moderated between read and write) is « gone »', async () => {
    h.state.results = [
      { data: HIDDEN_ROW, error: null },
      { data: null, error: null },
    ]
    expect(await updateServiceAction(FORM)).toEqual({ ok: false, errorKey: 'service.edit.error.gone', fields: [] })
    expect(h.revalidate).not.toHaveBeenCalled()
  })

  it('refuses a pair missing from the categories table without writing', async () => {
    h.state.results = [{ data: HIDDEN_ROW, error: null }]
    h.state.categories = []
    expect(await updateServiceAction(FORM)).toMatchObject({ ok: false, errorKey: 'service.wizard.error.category_unavailable' })
    expect(listingCalls('update')).toHaveLength(0)
    h.state.categories = [
      { id: 'uuid-sector', slug: 'developpement-web-mobile', parent_id: null },
      { id: 'uuid-sub', slug: 'e-commerce', parent_id: 'uuid-sector' },
    ]
  })
})

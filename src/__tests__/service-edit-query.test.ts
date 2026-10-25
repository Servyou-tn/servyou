/**
 * H7 — getServiceForEdit (src/lib/freelance/service-draft-query.ts), Supabase mocked.
 *   • a malformed id is « not found » WITHOUT a query (it would otherwise 500 as a PostgREST 22P02);
 *   • the row is read scoped to (id, owner) — someone else's service is indistinguishable from an unknown one;
 *   • a failed query THROWS (never collapsed into « not found », which would 404 the owner's own service);
 *   • the result carries the status, the moderation marker, the form and where the wizard opens.
 */

import { describe, it, expect, vi } from 'vitest'
import { getServiceForEdit } from '@/lib/freelance/service-draft-query'

const SERVICE_ID = '263c5565-687d-43b6-a354-a73a4b701f1b'

const ROW = {
  id: SERVICE_ID,
  status: 'hidden',
  admin_hidden_at: null,
  title: 'Business plan pour la banque',
  category_id: 'uuid-sector',
  subcategory_id: 'uuid-sub',
  tags: ['react'],
  short_description: 'Business plan complet prêt pour la banque, livré en 7 jours',
  description: 'x'.repeat(120),
  starting_price_tnd: 800,
  price_unit: 'fixed',
  delivery_time: '7 jours',
  deliverables: ['Étude de marché', 'Prévisions financières', 'Document prêt pour la banque'],
  delivery_mode: 'remote',
  buyer_briefing: null,
}

function client(opts: { row?: unknown; error?: unknown; catError?: unknown }) {
  const eqs: unknown[][] = []
  const listings = {
    select: () => listings,
    eq: (...args: unknown[]) => (eqs.push(args), listings),
    maybeSingle: () => Promise.resolve({ data: opts.row ?? null, error: opts.error ?? null }),
  }
  const categories = {
    select: () => categories,
    in: () =>
      Promise.resolve({
        data: [
          { id: 'uuid-sector', slug: 'developpement-web-mobile' },
          { id: 'uuid-sub', slug: 'e-commerce' },
        ],
        error: opts.catError ?? null,
      }),
  }
  const from = vi.fn((table: string) => (table === 'categories' ? categories : listings))
  return { supabase: { from } as never, from, eqs }
}

describe('getServiceForEdit', () => {
  it('returns null for a malformed id without querying', async () => {
    const { supabase, from } = client({ row: ROW })
    expect(await getServiceForEdit(supabase, 'fp-1', 'not-a-uuid')).toBeNull()
    expect(from).not.toHaveBeenCalled()
  })

  it('reads scoped to (id, owner), and returns null when nothing matches', async () => {
    const { supabase, eqs } = client({})
    expect(await getServiceForEdit(supabase, 'fp-1', SERVICE_ID)).toBeNull()
    expect(eqs).toEqual([
      ['id', SERVICE_ID],
      ['freelancer_profile_id', 'fp-1'],
    ])
  })

  it('throws on a failed query instead of reading as « not found »', async () => {
    const { supabase } = client({ error: { message: 'boom', code: 'XX000', details: null } })
    await expect(getServiceForEdit(supabase, 'fp-1', SERVICE_ID)).rejects.toThrow('service fetch failed')
  })

  it('returns the status, the form and the step a complete service opens on (the récapitulatif)', async () => {
    const { supabase } = client({ row: ROW })
    const service = await getServiceForEdit(supabase, 'fp-1', SERVICE_ID)
    expect(service).toMatchObject({
      id: SERVICE_ID,
      status: 'hidden',
      adminHiddenAt: null,
      step: 5,
      form: {
        sectorId: 'developpement-web-mobile',
        subcategoryId: 'e-commerce',
        shortDescription: 'Business plan complet prêt pour la banque, livré en 7 jours',
        price: '800',
        deliveryTime: '7 jours',
      },
    })
  })

  it('a legacy service that fails a gate opens on the first failing step, and keeps the moderation marker', async () => {
    const { supabase } = client({ row: { ...ROW, short_description: null, admin_hidden_at: '2026-10-01T10:00:00Z' } })
    const service = await getServiceForEdit(supabase, 'fp-1', SERVICE_ID)
    expect(service).toMatchObject({ step: 2, adminHiddenAt: '2026-10-01T10:00:00Z' })
  })
})

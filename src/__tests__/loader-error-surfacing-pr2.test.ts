/**
 * Loader error surfacing, PR-2 (docs/design/loader-error-surfacing-plan.md « PR-2 ») — mocked Supabase + Sentry.
 *
 *   • server actions: a FAILED read returns the generic error (and reports once), never « introuvable » /
 *     « not eligible »; a junk id (22P02) keeps the old answer and stays out of Sentry;
 *   • saveShopConfigAction: a categories outage is the generic error and writes NOTHING (follow-up item 1);
 *   • getCompletedProjectCount: an error is null (the page hides the stat, ruling 6), never a false 0;
 *   • freelancer-detail sub-queries: partial display + one report;
 *   • ?categorie=: malformed slugs never reach PostgREST, and all-malformed still means 0 results (item 2).
 *
 * Same recording stub as loader-error-surfacing.test.ts, plus rpc() and a per-call log of (table, method).
 * Run by path — never a bare `vitest run`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Result = { data: unknown; error: unknown }
const h = vi.hoisted(() => ({
  results: {} as Record<string, Result>,
  rpc: {} as Record<string, Result>,
  calls: [] as string[],
  args: [] as unknown[][],
  user: { id: 'u1', email: 'me@example.com' } as { id: string; email: string } | null,
  captureException: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({ captureException: h.captureException }))
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <F,>(fn: F) => fn }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/shops/owner-shop', () => ({ resolveOwnedShopId: async () => ({ ok: true, shopId: 'shop-1' }) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    rpc: async (fn: string) => h.rpc[fn] ?? { data: null, error: null },
    from: (table: string) => {
      const result = h.results[table] ?? { data: null, error: null }
      // Chainable + awaitable; every builder method is recorded as `table.method`.
      const chain: object = new Proxy(
        {},
        {
          get: (_target, prop) => {
            if (prop === 'then') return (resolve: (r: Result) => unknown) => resolve(result)
            return (...args: unknown[]) => {
              h.calls.push(`${table}.${String(prop)}`)
              h.args.push([`${table}.${String(prop)}`, ...args])
              return chain
            }
          },
        },
      )
      return chain
    },
  }),
}))

import { t } from '@/lib/i18n'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { createDispute } from '@/app/actions/disputes'
import { submitProductRequest } from '@/app/demander/[id]/actions'
import { saveShopConfigAction } from '@/app/ma-boutique/creer/configuration/actions'
import { getCompletedProjectCount, getFreelancerDetail } from '@/lib/marche/freelancer-detail'
import { searchMarketplace } from '@/lib/search/search-marketplace'
import { parseSearchParams, validCategorySlugs } from '@/lib/search/search-params'

const OUTAGE = { message: 'ambiguous relationship', code: 'PGRST201', details: 'secret row (1,x)', hint: null }
const BAD_UUID = { message: 'invalid input syntax for type uuid', code: '22P02', details: null, hint: null }
const fail = (error: unknown): Result => ({ data: null, error })
const GENERIC = t('common.error_generic', 'fr')

let log: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  h.results = {}
  h.rpc = {}
  h.calls = []
  h.args = []
  h.user = { id: 'u1', email: 'me@example.com' }
  h.captureException.mockReset()
  log = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => log.mockRestore())

describe('server actions: a failed read is the generic error, not « introuvable »', () => {
  it('createDispute → dispute.error_generic + one report; a junk id stays « not eligible », quietly', async () => {
    h.results.orders = fail(OUTAGE)
    expect(await createDispute('00000000-0000-4000-8000-000000000001', 'damaged', '')).toEqual({ success: false, error: 'dispute.error_generic' })
    expect(h.captureException).toHaveBeenCalledTimes(1)
    expect(h.calls).not.toContain('disputes.insert')

    h.captureException.mockReset()
    h.results.orders = fail(BAD_UUID)
    expect(await createDispute('x', 'damaged', '')).toEqual({ success: false, error: 'dispute.error_order_not_eligible' })
    expect(h.captureException).not.toHaveBeenCalled()
  })

  const productInput = {
    productId: '00000000-0000-4000-a000-000000000001',
    deliveryName: 'Amira',
    deliveryStreet: '12 rue de Marseille',
    quartier: 'Lafayette',
    ville: 'Tunis',
    governorate: GOVERNORATES[0].value,
    deliveryPhone: '20123456',
    quantity: 1,
    note: '',
  }

  it('submitProductRequest → generic error + one report, and no order is created', async () => {
    h.results.products = fail(OUTAGE)
    expect(await submitProductRequest(productInput)).toEqual({ ok: false, error: GENERIC })
    expect(h.captureException).toHaveBeenCalledTimes(1)
    expect(h.calls).not.toContain('orders.insert')
  })

  it('submitProductRequest with a gone product is still « introuvable »', async () => {
    h.results.products = { data: null, error: null }
    expect(await submitProductRequest(productInput)).toEqual({ ok: false, error: t('demander.notFound', 'fr') })
    expect(h.captureException).not.toHaveBeenCalled()
  })
})

describe('saveShopConfigAction: a categories outage writes nothing (PR-1 follow-up item 1)', () => {
  const input = {
    shopType: '',
    deliverySetup: '',
    workingHours: '',
    locationDetail: '',
    preferredCarriers: '',
    paymentMethods: [],
    categoryIds: [],
  }

  it('returns the generic error before the shops update or any reconcile', async () => {
    h.results.categories = fail(OUTAGE)
    expect(await saveShopConfigAction(input)).toEqual({ ok: false, error: GENERIC })
    expect(h.calls.filter((c) => /\.(update|insert|delete)$/.test(c))).toEqual([])
    expect(h.calls.some((c) => c.startsWith('shops.') || c.startsWith('shop_payment_methods.'))).toBe(false)
    expect(h.captureException).toHaveBeenCalledTimes(1)
  })
})

describe('getCompletedProjectCount (ruling 6)', () => {
  it('is null on error — never a false 0 — and reports once', async () => {
    h.rpc.get_completed_service_order_count = fail(OUTAGE)
    expect(await getCompletedProjectCount('p1')).toBeNull()
    expect(h.captureException).toHaveBeenCalledTimes(1)
  })

  it('is the count when the RPC answers (0 included)', async () => {
    h.rpc.get_completed_service_order_count = { data: 0, error: null }
    expect(await getCompletedProjectCount('p1')).toBe(0)
    h.rpc.get_completed_service_order_count = { data: 7, error: null }
    expect(await getCompletedProjectCount('p1')).toBe(7)
  })
})

describe('freelancer-detail sub-queries keep the partial display and report', () => {
  it('a failed skills read → skills [] + one report; the profile still loads', async () => {
    h.results.freelancer_profiles = { data: { id: 'f1', profile_id: 'p1', created_at: '2026-01-01' }, error: null }
    h.results.freelancer_skills = fail(OUTAGE)
    const detail = await getFreelancerDetail('f1')
    expect(detail).toMatchObject({ id: 'f1', skills: [] })
    expect(h.captureException).toHaveBeenCalledTimes(1)
    // message + code only — details never reach Sentry
    expect(JSON.stringify(h.captureException.mock.calls)).not.toContain('secret row')
  })
})

describe('?categorie= slug filter (PR-1 follow-up item 2)', () => {
  it('keeps real slugs and drops anything outside [a-z0-9-]', () => {
    expect(validCategorySlugs(['design-graphique-logo', 'ugc', 'a"b', 'A', 'x)y', ''])).toEqual(['design-graphique-logo', 'ugc'])
  })

  it('an all-malformed ?categorie= never queries categories and still matches nothing', async () => {
    await searchMarketplace(parseSearchParams({ categorie: 'a"b' }))
    expect(h.calls.some((c) => c.startsWith('categories.'))).toBe(false)
    // [] resolved ids → the category filter is still applied (`.in('category_id', [])` = nothing),
    // never dropped (which would show the whole catalogue).
    expect(h.args).toContainEqual(['products.in', 'category_id', []])
    expect(h.captureException).not.toHaveBeenCalled()
  })
})

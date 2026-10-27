/**
 * Loader error surfacing, PR-1 (docs/design/loader-error-surfacing-plan.md) — mocked Supabase + Sentry.
 *
 * The rule under test, per loader:
 *   • MAIN query fails → the loader THROWS a QueryError (the page lets the root error.tsx show it, or a
 *     list page settle()s it into an ErrorState) — it never returns « not found », [] or a false 0;
 *   • « no row » / a junk id (PGRST116, 22P02) and an empty result stay null → the page 404s as before;
 *   • SECONDARY query fails → partial data + ONE Sentry report (message + code), no throw.
 *
 * One recording stub serves every table: each `from(table)` chain is awaitable and resolves to
 * results[table] (default: no data, no error). Run by path — never a bare `vitest run`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Result = { data: unknown; error: unknown }
const h = vi.hoisted(() => ({
  results: {} as Record<string, Result>,
  user: { id: 'u1', email: 'me@example.com' } as { id: string; email: string } | null,
  captureException: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({ captureException: h.captureException }))
vi.mock('react', async (orig) => ({ ...(await orig<typeof import('react')>()), cache: <F,>(fn: F) => fn }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    from: (table: string) => {
      const result = h.results[table] ?? { data: null, error: null }
      // A chainable, awaitable query: every builder method returns the same proxy, and awaiting it
      // (or a terminal .maybeSingle() / .single()) resolves to the table's result.
      const chain: object = new Proxy(
        {},
        {
          get: (_target, prop) => {
            if (prop === 'then') return (resolve: (r: Result) => unknown) => resolve(result)
            return () => chain
          },
        },
      )
      return chain
    },
  }),
}))

import { QueryError } from '@/lib/supabase/query-error'
import { getProductDetail, getRelatedProducts } from '@/lib/marche/product-detail'
import { getServiceDetail } from '@/lib/marche/service-detail'
import { getShopDetail, getShopProducts } from '@/lib/marche/shop-detail'
import { getFreelancerDetail, getFreelancerServices } from '@/lib/marche/freelancer-detail'
import { getMyFavorites, getMyAnnonces } from '@/lib/marche/my-data'
import { getProductCategories } from '@/lib/marche/product-categories'
import { getFilterCategoriesForType } from '@/lib/marche/filter-categories'
import { getServiceCities } from '@/lib/marche/filter-cities'
import { getCurrentProfile, getDeletionContext } from '@/lib/marche/mon-compte'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCategoryBySlug, getSubcategories } from '@/lib/categories/category-data'
import { getDashboardProfile } from '@/lib/dashboard/data'
import { searchMarketplace } from '@/lib/search/search-marketplace'
import { parseSearchParams } from '@/lib/search/search-params'

const OUTAGE = { message: 'ambiguous relationship', code: 'PGRST201', details: 'secret row (1,x)', hint: null }
const NO_ROW = { message: 'no rows', code: 'PGRST116', details: null, hint: null }
const BAD_UUID = { message: 'invalid input syntax for type uuid', code: '22P02', details: null, hint: null }
const fail = (error: unknown): Result => ({ data: null, error })

let log: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  h.results = {}
  h.user = { id: 'u1', email: 'me@example.com' }
  h.captureException.mockReset()
  log = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => log.mockRestore())

describe('main query failure THROWS (never « not found », [] or 0)', () => {
  const cases: Array<[string, string, () => Promise<unknown>]> = [
    ['getProductDetail', 'products', () => getProductDetail('p1')],
    ['getServiceDetail', 'service_listings', () => getServiceDetail('s1')],
    ['getShopDetail', 'shops', () => getShopDetail('sh1')],
    ['getShopProducts', 'products', () => getShopProducts('sh1', 'Shop', null)],
    ['getFreelancerDetail', 'freelancer_profiles', () => getFreelancerDetail('f1')],
    ['getFreelancerServices', 'service_listings', () => getFreelancerServices('f1', 'Name', null)],
    ['getMyFavorites', 'favorites', () => getMyFavorites('u1')],
    ['getMyAnnonces', 'job_posts', () => getMyAnnonces('u1')],
    ['getProductCategories', 'categories', () => getProductCategories()],
    ['getCategoryBySlug', 'categories', () => getCategoryBySlug('maison')],
    ['getDashboardProfile', 'profiles', () => getDashboardProfile('u1')],
    ['getCurrentProfile', 'profiles', () => getCurrentProfile()],
    ['searchMarketplace (products)', 'products', () => searchMarketplace(parseSearchParams({}))],
    ['searchMarketplace (services)', 'service_listings', () => searchMarketplace(parseSearchParams({ type: 'service' }))],
    ['searchMarketplace (category slug lookup)', 'categories', () => searchMarketplace(parseSearchParams({ categorie: 'maison' }))],
  ]

  it.each(cases)('%s rejects with a QueryError carrying the code', async (_name, table, call) => {
    h.results[table] = fail(OUTAGE)
    const err = await call().then(
      () => null,
      (e: unknown) => e,
    )
    expect(err).toBeInstanceOf(QueryError)
    expect((err as QueryError).code).toBe('PGRST201')
  })

  it('logs the details to the server log only — never to Sentry', async () => {
    h.results.products = fail(OUTAGE)
    await getProductDetail('p1').catch(() => {})
    expect(log).toHaveBeenCalledWith('[product-detail] query failed:', 'ambiguous relationship', 'PGRST201', 'secret row (1,x)')
    expect(h.captureException).not.toHaveBeenCalled()
  })
})

describe('« no row » and junk ids stay a 404 (null), quietly', () => {
  const detail: Array<[string, string, () => Promise<unknown>]> = [
    ['getProductDetail', 'products', () => getProductDetail('p1')],
    ['getServiceDetail', 'service_listings', () => getServiceDetail('s1')],
    ['getShopDetail', 'shops', () => getShopDetail('sh1')],
    ['getFreelancerDetail', 'freelancer_profiles', () => getFreelancerDetail('f1')],
    ['getCategoryBySlug', 'categories', () => getCategoryBySlug('nope')],
    ['getDashboardProfile', 'profiles', () => getDashboardProfile('u1')],
  ]

  it.each(detail)('%s → null for PGRST116, 22P02 and an empty result', async (_name, table, call) => {
    for (const result of [fail(NO_ROW), fail(BAD_UUID), { data: null, error: null }]) {
      h.results[table] = result
      expect(await call()).toBeNull()
    }
    expect(h.captureException).not.toHaveBeenCalled()
  })
})

describe('SECONDARY failure keeps the partial display and reports once', () => {
  it('related products → [] + one Sentry report (message + code)', async () => {
    h.results.products = fail(OUTAGE)
    expect(await getRelatedProducts({ productId: 'p1', shopId: 's1', categoryId: null })).toEqual([])
    expect(h.captureException).toHaveBeenCalledTimes(1)
    expect(h.captureException.mock.calls[0][1]).toEqual({ tags: { where: 'product-detail related', code: 'PGRST201' } })
    expect(JSON.stringify(h.captureException.mock.calls)).not.toContain('secret')
  })

  it('filter categories / cities / subcategories → [] + a report each', async () => {
    h.results.products = fail(OUTAGE)
    h.results.service_listings = fail(OUTAGE)
    h.results.categories = fail(OUTAGE)
    expect(await getFilterCategoriesForType('product')).toEqual([])
    expect(await getServiceCities()).toEqual([])
    expect(await getSubcategories('c1')).toEqual([])
    expect(h.captureException).toHaveBeenCalledTimes(3)
  })

  it('the shell top bar keeps the signed-in user without profile fields (ruling 3) and reports', async () => {
    h.results.profiles = fail(OUTAGE)
    const shell = await getShellUser()
    expect(shell).toMatchObject({ id: 'u1', topBarUser: { id: 'u1', email: 'me@example.com', full_name: null, seller_type: null } })
    expect(h.captureException).toHaveBeenCalledTimes(1)
  })

  it('the deletion context degrades to « nothing pending, no open orders » and reports each failure', async () => {
    h.results.deletion_requests = fail(OUTAGE)
    h.results.orders = fail(OUTAGE)
    expect(await getDeletionContext('u1')).toEqual({ pending: false, openOrders: 0 })
    expect(h.captureException).toHaveBeenCalledTimes(2)
  })

  it('the shell with no signed-in user is null and never queries profiles', async () => {
    h.user = null
    h.results.profiles = fail(OUTAGE)
    expect(await getShellUser()).toBeNull()
    expect(h.captureException).not.toHaveBeenCalled()
  })
})

describe('a healthy read still works', () => {
  it('returns [] for an empty favourites / annonces list (an empty list is not an error)', async () => {
    h.results.favorites = { data: [], error: null }
    h.results.job_posts = { data: [], error: null }
    expect(await getMyFavorites('u1')).toEqual({ products: [], services: [], combined: [] })
    expect(await getMyAnnonces('u1')).toEqual([])
    expect(h.captureException).not.toHaveBeenCalled()
  })
})

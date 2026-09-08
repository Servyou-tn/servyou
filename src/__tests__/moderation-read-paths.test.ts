/**
 * Moderation coverage for the PUBLIC read paths (fix/moderation-filter).
 *
 * WHY THIS FILE EXISTS. `admin_hide_content` hides content by TWO different mechanisms, and
 * before this suite only one of them was caught:
 *
 *   DIRECT HIDE  — target is a product or a service. The RPC sets BOTH status='hidden' and
 *                  admin_hidden_at on the row. A `status='active'` filter catches this
 *                  incidentally, which is why the gap stayed invisible for so long.
 *   PARENT HIDE  — target is a shop, a freelancer profile or a job post. The RPC sets
 *                  admin_hidden_at ONLY. Children keep status='active', so a status filter
 *                  catches NOTHING and a moderated seller's whole catalogue stays listed.
 *
 * Every read path therefore needs both cases asserted, and each test below says which
 * mechanism it covers. Losing the parent predicate is the regression that actually shipped.
 *
 * TWO KINDS OF TEST, deliberately:
 *   1. Query-shape tests. PostgREST evaluates these filters server-side, so without a live DB
 *      the observable behaviour IS the query that gets built. A recording fake client captures
 *      the builder calls and each test asserts the required predicate was applied. These run in
 *      CI with no credentials — the live-DB suites (INTEGRATION_GLOBS) skip there, so they
 *      could not be the guard rail this gap needs.
 *   2. A real behavioural test for /mes-favoris, which is the one path where the predicate is
 *      applied in code rather than in the query (a favorite points at a product OR a service,
 *      so neither embed can be `!inner`). Rows go in, filtered rows come out.
 *
 * Plus a source guard so a NEW public listing module cannot ship without the filter — the
 * reason job_posts is covered here even though its board is still a ComingSoon stub.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { resolve } from 'path'

// ── Recording fake Supabase client ────────────────────────────────────────────────────────

type Call = { method: string; args: unknown[] }

let calls: Call[]
let results: Map<string, { data: unknown; error: unknown }>

const CHAIN = ['select', 'eq', 'is', 'in', 'gte', 'lte', 'or', 'ilike', 'order', 'limit', 'range', 'neq', 'not']

function makeBuilder(table: string) {
  const result = results.get(table) ?? { data: [], error: null }
  const q: Record<string, unknown> = {}
  for (const m of CHAIN) {
    q[m] = (...args: unknown[]) => {
      calls.push({ method: m, args })
      return q
    }
  }
  q.maybeSingle = () => Promise.resolve(result)
  q.single = () => Promise.resolve(result)
  // Thenable so `await query` resolves like a real PostgREST builder.
  q.then = (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
    Promise.resolve(result).then(res, rej)
  return q
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      calls.push({ method: 'from', args: [table] })
      return makeBuilder(table)
    },
  }),
}))

beforeEach(() => {
  calls = []
  results = new Map()
  vi.resetModules()
})

/** Was `.is(column, null)` applied anywhere in the recorded chain? */
function filteredNull(column: string): boolean {
  return calls.some((c) => c.method === 'is' && c.args[0] === column && c.args[1] === null)
}

/** The select() string for a given table's query, so embed columns can be asserted. */
function selectFor(table: string): string {
  const i = calls.findIndex((c) => c.method === 'from' && c.args[0] === table)
  if (i === -1) return ''
  const sel = calls.slice(i + 1).find((c) => c.method === 'select')
  return typeof sel?.args[0] === 'string' ? (sel.args[0] as string) : ''
}

/**
 * Every call in a table's own chain — from its `.from(table)` up to (but not including) the
 * NEXT `.from()` call, or the end of the recording. A plain `.eq()` scan across the whole
 * recording would false-positive on demander.ts, which queries `products` (`.eq('status',
 * 'active')`) and THEN `service_listings` in the same call — an unscoped check couldn't tell
 * whether the service branch itself applied the filter or just inherited a "true" from products.
 */
function tableCalls(table: string): Call[] {
  const start = calls.findIndex((c) => c.method === 'from' && c.args[0] === table)
  if (start === -1) return []
  let end = calls.length
  for (let i = start + 1; i < calls.length; i++) {
    if (calls[i].method === 'from') { end = i; break }
  }
  return calls.slice(start, end)
}

/** Was `.eq(column, value)` applied within THIS table's own chain? */
function tableFilteredEq(table: string, column: string, value: unknown): boolean {
  return tableCalls(table).some((c) => c.method === 'eq' && c.args[0] === column && c.args[1] === value)
}

// ── 1. /marche grid — lib/marche/data.ts ──────────────────────────────────────────────────

describe('getActiveProducts (/marche)', () => {
  it('DIRECT HIDE: excludes a product whose own admin_hidden_at is set', async () => {
    const { getActiveProducts } = await import('@/lib/marche/data')
    await getActiveProducts()
    expect(filteredNull('admin_hidden_at')).toBe(true)
  })

  it('PARENT HIDE: excludes products of a moderated shop', async () => {
    const { getActiveProducts } = await import('@/lib/marche/data')
    await getActiveProducts()
    expect(filteredNull('shops.admin_hidden_at')).toBe(true)
    // The predicate can only be applied if the column is in the embed.
    expect(selectFor('products')).toContain('shops!inner(name, city, admin_hidden_at)')
  })
})

describe('getActiveServices (/marche)', () => {
  it('DIRECT HIDE: excludes a service whose own admin_hidden_at is set', async () => {
    const { getActiveServices } = await import('@/lib/marche/data')
    await getActiveServices()
    expect(filteredNull('admin_hidden_at')).toBe(true)
  })

  it('PARENT HIDE: excludes services of a moderated freelancer', async () => {
    const { getActiveServices } = await import('@/lib/marche/data')
    await getActiveServices()
    expect(filteredNull('freelancer_profiles.admin_hidden_at')).toBe(true)
    expect(selectFor('service_listings')).toContain('admin_hidden_at')
  })

  // H5 draft-status guard PR: service_listings.status can now be 'draft', never buyer-visible.
  // admin_hidden_at filtering alone (the two tests above) does not exclude a draft — only a
  // status filter does. This is a query-shape assertion, not a live-DB one, on purpose: Postgres
  // reliably excludes a non-'active' row from `.eq('status','active')`, so a live-DB test there
  // would only prove Postgres works. What can actually regress is THIS read path dropping or
  // widening its own status filter — only the query shape catches that (see this file's header).
  it("DRAFT: filters status='active', so a draft (status='draft') is excluded too", async () => {
    const { getActiveServices } = await import('@/lib/marche/data')
    await getActiveServices()
    expect(tableFilteredEq('service_listings', 'status', 'active')).toBe(true)
  })
})

// ── 2. Search engine — /recherche, /marche/*, /categories ─────────────────────────────────

async function runSearch(type: 'product' | 'service') {
  const { parseSearchParams } = await import('@/lib/search/search-params')
  const { searchMarketplace } = await import('@/lib/search/search-marketplace')
  const params = { ...parseSearchParams({}), type }
  return searchMarketplace(params)
}

describe('searchMarketplace — products', () => {
  it('DIRECT HIDE: excludes a product whose own admin_hidden_at is set', async () => {
    await runSearch('product')
    expect(filteredNull('admin_hidden_at')).toBe(true)
  })

  it('PARENT HIDE: excludes products of a moderated shop (and from totalCount)', async () => {
    await runSearch('product')
    expect(filteredNull('shops.admin_hidden_at')).toBe(true)
    expect(selectFor('products')).toContain('admin_hidden_at')
  })

  // C1 added a Ville control to the products surface. The predicate crosses the shops embed, and
  // the two ways to get it wrong are both silent: omit it and Ville does nothing while the chip
  // still says it is applied; write it against a LEFT join and it stops restricting parent rows.
  it('applies the Ville predicate against the shops embed when a city is picked', async () => {
    const { parseSearchParams } = await import('@/lib/search/search-params')
    const { searchMarketplace } = await import('@/lib/search/search-marketplace')
    const params = { ...parseSearchParams({ ville: 'Tunis' }), type: 'product' as const }
    await searchMarketplace(params)
    expect(
      calls.some((c) => c.method === 'eq' && c.args[0] === 'shops.city' && c.args[1] === 'Tunis'),
    ).toBe(true)
    // The predicate is only sound on an inner join — see applyProductFilters.
    expect(selectFor('products')).toContain('shops!inner')
  })

  it('does NOT apply a Ville predicate when no city is picked', async () => {
    await runSearch('product')
    expect(calls.some((c) => c.method === 'eq' && c.args[0] === 'shops.city')).toBe(false)
  })
})

describe('searchMarketplace — services', () => {
  it('DIRECT HIDE: excludes a service whose own admin_hidden_at is set', async () => {
    await runSearch('service')
    expect(filteredNull('admin_hidden_at')).toBe(true)
  })

  it('PARENT HIDE: excludes services of a moderated freelancer (and from totalCount)', async () => {
    await runSearch('service')
    expect(filteredNull('freelancer_profiles.admin_hidden_at')).toBe(true)
    expect(selectFor('service_listings')).toContain('admin_hidden_at')
  })

  // Named explicitly on pre-merge review of the H5 draft-status guard PR: a draft must not be
  // reachable from search. Query-shape, not live-DB — see getActiveServices's own comment above
  // for why that's the right level for this claim.
  it("DRAFT: filters status='active' on the search results query", async () => {
    await runSearch('service')
    expect(tableFilteredEq('service_listings', 'status', 'active')).toBe(true)
  })
})

// ── 2b. Draft exclusion — the three surfaces named on pre-merge review of the H5 draft-status
// guard PR, plus two adjacent read paths that reach the same column ────────────────────────
//
// service_listings.status can now be 'draft' (H6, the creation wizard, is its only writer — not
// yet in code; a draft was never published by its owner and must never be buyer-visible). Every
// path below already reads `.eq('status', 'active')` for the pre-existing moderation reasons
// documented at each call site — that predicate structurally excludes 'draft' too, since it's
// neither DIRECT nor PARENT hide, just a third value the same column can hold. These assertions
// exist so dropping or loosening that filter (e.g. to `.neq('status', 'hidden')`, which a draft
// would pass) fails a test instead of shipping quietly. Query-shape, not live-DB — see
// getActiveServices's comment above for why.

describe("getServiceDetail (/services/[id], D2) — draft exclusion", () => {
  it("filters status='active' on the single-listing fetch", async () => {
    const { getServiceDetail } = await import('@/lib/marche/service-detail')
    await getServiceDetail('some-id')
    expect(tableFilteredEq('service_listings', 'status', 'active')).toBe(true)
  })
})

describe('getRelatedServices (D2 "other services" block) — draft exclusion', () => {
  it("filters status='active' on every tier of the related-services query", async () => {
    const { getRelatedServices } = await import('@/lib/marche/service-detail')
    await getRelatedServices({ serviceId: 'some-id', freelancerProfileId: null, categoryId: null })
    expect(tableFilteredEq('service_listings', 'status', 'active')).toBe(true)
  })
})

describe('getFreelancerServices (D4 "Ses services") — draft exclusion', () => {
  it("filters status='active' on the freelancer's own listing list", async () => {
    const { getFreelancerServices } = await import('@/lib/marche/freelancer-detail')
    await getFreelancerServices('fp-1', 'Freelancer', 'Tunis')
    expect(tableFilteredEq('service_listings', 'status', 'active')).toBe(true)
  })
})

describe('getRequestTarget service branch (/demander/[id], E1) — draft exclusion', () => {
  it("filters status='active' on service_listings specifically, not just inherited from the products lookup it tries first", async () => {
    // Forces the products lookup (tried first) to come back empty so the code falls through to
    // the service_listings query — otherwise the recording fake's default `{ data: [] }` is
    // truthy and the service branch never runs.
    results.set('products', { data: null, error: null })
    const { getRequestTarget } = await import('@/lib/marche/demander')
    await getRequestTarget('some-id')
    expect(tableFilteredEq('service_listings', 'status', 'active')).toBe(true)
  })
})

// ── 3. Filter option lists ────────────────────────────────────────────────────────────────

describe('getServiceCities (Ville filter)', () => {
  it('DIRECT HIDE: does not offer a city sourced from a hidden listing', async () => {
    const { getServiceCities } = await import('@/lib/marche/filter-cities')
    await getServiceCities()
    expect(filteredNull('admin_hidden_at')).toBe(true)
  })

  it('PARENT HIDE: does not offer a moderated freelancer’s city', async () => {
    const { getServiceCities } = await import('@/lib/marche/filter-cities')
    await getServiceCities()
    expect(filteredNull('freelancer_profiles.admin_hidden_at')).toBe(true)
  })
})

// The product-side twin, added with C1's /marche/produits rebuild. It reaches city through a
// COMPLETELY different join (products→shops, not service_listings→freelancer_profiles), so it
// cannot inherit the coverage above — the parent predicate names a different table.
describe('getProductCities (Ville filter, /marche/produits)', () => {
  it('DIRECT HIDE: does not offer a city sourced from a hidden product', async () => {
    const { getProductCities } = await import('@/lib/marche/filter-cities')
    await getProductCities()
    expect(filteredNull('admin_hidden_at')).toBe(true)
  })

  it('PARENT HIDE: does not offer a moderated shop’s city', async () => {
    const { getProductCities } = await import('@/lib/marche/filter-cities')
    await getProductCities()
    expect(filteredNull('shops.admin_hidden_at')).toBe(true)
  })

  it('reads city through an !inner shops embed, so a shopless product cannot leak a null', async () => {
    const { getProductCities } = await import('@/lib/marche/filter-cities')
    await getProductCities()
    expect(selectFor('products')).toContain('shops!inner')
  })
})

describe('getFilterCategoriesForType (Catégorie filter)', () => {
  it('DIRECT HIDE: products — skips categories held only by hidden listings', async () => {
    const { getFilterCategoriesForType } = await import('@/lib/marche/filter-categories')
    await getFilterCategoriesForType('product')
    expect(filteredNull('admin_hidden_at')).toBe(true)
  })

  it('PARENT HIDE: products — skips categories held only by moderated shops', async () => {
    const { getFilterCategoriesForType } = await import('@/lib/marche/filter-categories')
    await getFilterCategoriesForType('product')
    expect(filteredNull('shops.admin_hidden_at')).toBe(true)
  })

  it('DIRECT HIDE: services — skips categories held only by hidden listings', async () => {
    const { getFilterCategoriesForType } = await import('@/lib/marche/filter-categories')
    await getFilterCategoriesForType('service')
    expect(filteredNull('admin_hidden_at')).toBe(true)
  })

  it('PARENT HIDE: services — skips categories held only by moderated freelancers', async () => {
    const { getFilterCategoriesForType } = await import('@/lib/marche/filter-categories')
    await getFilterCategoriesForType('service')
    expect(filteredNull('freelancer_profiles.admin_hidden_at')).toBe(true)
  })
})

// ── 4. /mes-favoris — real behaviour, the only in-code predicate ──────────────────────────

const VISIBLE_PRODUCT = {
  id: 'p-ok', title: 'Visible product', description: null, price_tnd: 10,
  status: 'active', admin_hidden_at: null,
  shops: { name: 'Shop', city: 'Tunis', admin_hidden_at: null }, product_images: [],
}
const VISIBLE_SERVICE = {
  id: 's-ok', title: 'Visible service', description: null, starting_price_tnd: 50,
  delivery_time: null, status: 'active', admin_hidden_at: null,
  freelancer_profiles: { profile_id: 'fp-1', city: 'Sfax', admin_hidden_at: null },
  categories: { name_fr: 'Design' },
}

function favoritesRows(rows: unknown[]) {
  results.set('favorites', { data: rows, error: null })
  results.set('public_profiles', { data: [{ id: 'fp-1', full_name: 'Freelancer' }], error: null })
}

describe('getMyFavorites (/mes-favoris)', () => {
  it('keeps a favorite whose listing and parent are both visible', async () => {
    favoritesRows([
      { item_type: 'product', created_at: 'x', products: VISIBLE_PRODUCT, service_listings: null },
      { item_type: 'service', created_at: 'x', products: null, service_listings: VISIBLE_SERVICE },
    ])
    const { getMyFavorites } = await import('@/lib/marche/my-data')
    const out = await getMyFavorites('user-1')
    expect(out.products.map((p) => p.id)).toEqual(['p-ok'])
    expect(out.services.map((s) => s.id)).toEqual(['s-ok'])
    expect(out.combined).toHaveLength(2)
  })

  it('DIRECT HIDE: drops a product whose own admin_hidden_at is set', async () => {
    favoritesRows([
      { item_type: 'product', created_at: 'x', service_listings: null,
        products: { ...VISIBLE_PRODUCT, id: 'p-hidden', status: 'hidden', admin_hidden_at: '2026-01-01' } },
    ])
    const { getMyFavorites } = await import('@/lib/marche/my-data')
    const out = await getMyFavorites('user-1')
    expect(out.products).toHaveLength(0)
    expect(out.combined).toHaveLength(0)
  })

  it('DIRECT HIDE: drops a service whose own admin_hidden_at is set', async () => {
    favoritesRows([
      { item_type: 'service', created_at: 'x', products: null,
        service_listings: { ...VISIBLE_SERVICE, id: 's-hidden', status: 'hidden', admin_hidden_at: '2026-01-01' } },
    ])
    const { getMyFavorites } = await import('@/lib/marche/my-data')
    const out = await getMyFavorites('user-1')
    expect(out.services).toHaveLength(0)
  })

  it('PARENT HIDE: drops a product whose SHOP is moderated (listing still active)', async () => {
    favoritesRows([
      { item_type: 'product', created_at: 'x', service_listings: null,
        products: { ...VISIBLE_PRODUCT, id: 'p-parent',
          shops: { name: 'Shop', city: 'Tunis', admin_hidden_at: '2026-01-01' } } },
    ])
    const { getMyFavorites } = await import('@/lib/marche/my-data')
    const out = await getMyFavorites('user-1')
    expect(out.products).toHaveLength(0)
  })

  it('PARENT HIDE: drops a service whose FREELANCER is moderated (listing still active)', async () => {
    favoritesRows([
      { item_type: 'service', created_at: 'x', products: null,
        service_listings: { ...VISIBLE_SERVICE, id: 's-parent',
          freelancer_profiles: { profile_id: 'fp-1', city: 'Sfax', admin_hidden_at: '2026-01-01' } } },
    ])
    const { getMyFavorites } = await import('@/lib/marche/my-data')
    const out = await getMyFavorites('user-1')
    expect(out.services).toHaveLength(0)
  })

  it('fails closed when the parent embed is unreadable (null)', async () => {
    favoritesRows([
      { item_type: 'product', created_at: 'x', service_listings: null,
        products: { ...VISIBLE_PRODUCT, id: 'p-noparent', shops: null } },
    ])
    const { getMyFavorites } = await import('@/lib/marche/my-data')
    const out = await getMyFavorites('user-1')
    expect(out.products).toHaveLength(0)
  })

  it('drops a non-active listing even when nothing is moderated', async () => {
    favoritesRows([
      { item_type: 'product', created_at: 'x', service_listings: null,
        products: { ...VISIBLE_PRODUCT, id: 'p-draft', status: 'draft' } },
    ])
    const { getMyFavorites } = await import('@/lib/marche/my-data')
    const out = await getMyFavorites('user-1')
    expect(out.products).toHaveLength(0)
  })
})

// ── 5. Source guard — a NEW public listing module cannot ship without the filter ───────────

// Every table `admin_hide_content` can moderate. job_posts is here even though the public
// board (/trouver-des-missions) is still a ComingSoon stub: the point is that the board cannot
// be built without the filter, rather than remembering to add it later.
const MODERATED_TABLES = ['products', 'shops', 'service_listings', 'freelancer_profiles', 'job_posts']

// Files whose reads are OWNER- or RELATIONSHIP-scoped, where filtering would be the bug: an
// owner must see their own moderated content (behind ModerationBanner), and a buyer must keep
// seeing what they actually bought. Adding a file here is a deliberate act — state the reason.
const OWNER_SCOPED: Record<string, string> = {
  'my-orders.ts': 'buyer order history — a moderated shop must not erase a real purchase',
  'order-detail.ts': 'single order the viewer is party to',
  'annonce-detail.ts': 'author-only view of own post + the freelancers who responded to it',
  'my-data.ts': 'getMyOrders/getMyAnnonces are owner-scoped; getMyFavorites filters in code',
  // G4. Reads the SELLER'S OWN shop: their orders (seller_id = me) and their products (shop_id =
  // my shop). A seller must see their own moderated content behind ModerationBanner, so filtering
  // here would hide a hidden product from the only person who can act on it. Note the counts are
  // unaffected either way — admin_hide_content sets status='hidden' on a product, and every count
  // on this page already filters status='active'.
  'seller-dashboard.ts': "the seller's own shop — an owner must see their own moderated content",
}

function readPathFiles(): { name: string; source: string }[] {
  const dirs = ['src/lib/marche', 'src/lib/search']
  const out: { name: string; source: string }[] = []
  for (const dir of dirs) {
    const abs = resolve(process.cwd(), dir)
    for (const name of readdirSync(abs)) {
      if (!name.endsWith('.ts') || name.endsWith('.test.ts')) continue
      out.push({ name, source: readFileSync(resolve(abs, name), 'utf8') })
    }
  }
  return out
}

describe('source guard — public read paths filter moderated tables', () => {
  it('every module querying a moderated table filters admin_hidden_at (or is owner-scoped)', () => {
    const offenders: string[] = []
    for (const { name, source } of readPathFiles()) {
      if (name in OWNER_SCOPED) continue
      const queried = MODERATED_TABLES.filter((t) => source.includes(`.from('${t}')`))
      if (queried.length === 0) continue
      if (!source.includes('admin_hidden_at')) {
        offenders.push(`${name} queries ${queried.join(', ')} with no admin_hidden_at filter`)
      }
    }
    expect(offenders).toEqual([])
  })

  // The canary this replaced ("job_posts has no public read path yet") fired as designed: H4's
  // Missions récentes panel (freelancer-dashboard.ts) is the first public-ish job_posts read —
  // matched via job_post_skills against the freelancer's own skills, not scoped to a post the
  // freelancer owns. It filters `.eq('status', 'open').is('admin_hidden_at', null)` explicitly
  // (RLS grants 'open' rows to a non-owner but does not filter admin_hidden_at on its own — see
  // docs/design/h4-discovery.md §4), which is exactly the fix the canary's own comment asked for.
  // Deleted per that comment's own instruction rather than widening OWNER_SCOPED — this read is
  // NOT owner-scoped, it is the real thing the canary was watching for.

  it('the owner-scoped exemption list stays small and documented', () => {
    for (const [file, reason] of Object.entries(OWNER_SCOPED)) {
      expect(reason.length, `${file} needs a written reason`).toBeGreaterThan(20)
    }
  })
})

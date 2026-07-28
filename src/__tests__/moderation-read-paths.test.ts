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
  'mission-detail.ts': 'author-only view of own post + the freelancers who responded to it',
  'my-data.ts': 'getMyOrders/getMyMissions are owner-scoped; getMyFavorites filters in code',
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

  it('job_posts has no public read path yet — the board must add the filter when it ships', () => {
    const publicJobPostReaders = readPathFiles()
      .filter(({ name }) => !(name in OWNER_SCOPED))
      .filter(({ source }) => source.includes(".from('job_posts')"))
      .map(({ name }) => name)
    // If this fails, /trouver-des-missions (or similar) just gained a public job_posts read.
    // That is fine — filter admin_hidden_at on it, then delete this assertion.
    expect(publicJobPostReaders).toEqual([])
  })

  it('the owner-scoped exemption list stays small and documented', () => {
    for (const [file, reason] of Object.entries(OWNER_SCOPED)) {
      expect(reason.length, `${file} needs a written reason`).toBeGreaterThan(20)
    }
  })
})

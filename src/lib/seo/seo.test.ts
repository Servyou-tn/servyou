/**
 * Search / share metadata, robots.txt and sitemap.xml (audit checklist 5). Mock-only: the sitemap's Supabase client is
 * a recording fake, the page files are read as text, nothing touches a database.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, relative } from 'path'

vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))

// A recording stand-in for supabase-js: every builder call is logged per table, and awaiting the chain resolves to
// that table's configured result.
type Call = [string, ...unknown[]]
const db = vi.hoisted(() => ({
  calls: {} as Record<string, Call[]>,
  results: {} as Record<string, { data: unknown; error: unknown }>,
  createClient: vi.fn(),
}))
function fakeClient() {
  return {
    from(table: string) {
      const calls: Call[] = (db.calls[table] = [])
      const chain: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'is', 'order', 'limit']) {
        chain[m] = (...args: unknown[]) => {
          calls.push([m, ...args])
          return chain
        }
      }
      chain.then = (ok: (v: unknown) => unknown) => Promise.resolve(db.results[table] ?? { data: [], error: null }).then(ok)
      return chain
    },
  }
}
vi.mock('@supabase/supabase-js', () => ({ createClient: (...a: unknown[]) => db.createClient(...a) }))

import { siteUrl, DEFAULT_SITE_URL } from './site-url'
import { buildPublicMetadata, truncate, TITLE_TEMPLATE } from './metadata'
import { freelancerMetadata, shopMetadata, productMetadata, serviceMetadata } from './detail-metadata'
import { PUBLIC_STATIC_PATHS, PUBLIC_PAGE_FILES, DISALLOWED_PREFIXES, OPEN_NOINDEX_PATHS, AUTH_NOINDEX_PREFIXES } from './routes'
import { SITEMAP_CAP } from './sitemap-data'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import { fr } from '@/lib/i18n/fr'
import { ar } from '@/lib/i18n/ar'
import { en } from '@/lib/i18n/en'

const isDisallowed = (path: string) => DISALLOWED_PREFIXES.some((p) => path.startsWith(p))

describe('siteUrl — one site address', () => {
  it.each([
    [undefined, DEFAULT_SITE_URL],
    ['', DEFAULT_SITE_URL],
    ['   ', DEFAULT_SITE_URL],
    ['https://servyou.tn', 'https://servyou.tn'],
    ['https://servyou.tn/', 'https://servyou.tn'],
    ['https://servyou.tn/some/path?x=1', 'https://servyou.tn'],
    ['not a url', DEFAULT_SITE_URL],
    ['ftp://servyou.tn', DEFAULT_SITE_URL],
  ])('%j → %s', (raw, expected) => {
    expect(siteUrl(raw)).toBe(expected)
  })
})

describe('buildPublicMetadata', () => {
  it('a public page: own title (template adds the brand), description, relative canonical, index, full OG + Twitter', () => {
    const m = buildPublicMetadata({ title: 'Questions fréquentes', description: 'Les réponses.', path: '/faq', lang: 'ar' })
    expect(m).toEqual({
      title: 'Questions fréquentes',
      description: 'Les réponses.',
      alternates: { canonical: '/faq' },
      robots: { index: true, follow: true },
      openGraph: {
        type: 'website',
        siteName: 'ServYou',
        locale: 'ar_TN',
        url: '/faq',
        title: 'Questions fréquentes · ServYou',
        description: 'Les réponses.',
      },
      twitter: { card: 'summary', title: 'Questions fréquentes · ServYou', description: 'Les réponses.' },
    })
    expect(TITLE_TEMPLATE).toBe('%s · ServYou')
  })

  it('the home page title skips the template; the search page is crawlable but not indexed', () => {
    const home = buildPublicMetadata({ title: 'ServYou — x', description: 'd', path: '/', lang: 'fr', absoluteTitle: true })
    expect(home.title).toEqual({ absolute: 'ServYou — x' })
    expect(home.openGraph?.title).toBe('ServYou — x')
    const search = buildPublicMetadata({ title: 'Recherche', description: 'd', path: '/recherche', lang: 'fr', noindex: true })
    expect(search.robots).toEqual({ index: false, follow: true })
  })

  it('a long description is cut at a word with « … », at most 160 characters', () => {
    const long = 'mot '.repeat(80)
    const m = buildPublicMetadata({ title: 't', description: long, path: '/x', lang: 'fr' })
    expect(String(m.description).length).toBeLessThanOrEqual(160)
    expect(String(m.description).endsWith('mot…')).toBe(true)
    expect(truncate('court', 160)).toBe('court')
  })
})

describe('detail pages — real data, visitor language', () => {
  it('freelancer: « name — headline », the city in the visitor language, canonical by id', () => {
    const f = { id: 'f1', fullName: 'Sami Trabelsi', headline: 'Développeur web', city: 'Sfax' }
    const m = freelancerMetadata(f, 'fr')
    expect(m.title).toBe('Sami Trabelsi — Développeur web')
    expect(m.description).toBe('Sami Trabelsi, freelance à Sfax sur ServYou : découvrez ses services, ses compétences et son portfolio.')
    expect(m.alternates).toEqual({ canonical: '/freelance/f1' })
    expect(freelancerMetadata(f, 'ar').description).toContain('صفاقس')
    expect(freelancerMetadata({ ...f, headline: null, city: null }, 'en')).toMatchObject({
      title: 'Sami Trabelsi',
      description: 'Sami Trabelsi, freelancer on ServYou: see their services, skills and portfolio.',
    })
  })

  it('shop: « name — city »; product: its name and its shop; service: its name and its freelancer', () => {
    expect(shopMetadata({ id: 's1', name: 'Dar Zitouna', city: 'Tunis' }, 'fr')).toMatchObject({
      title: 'Dar Zitouna — Tunis',
      alternates: { canonical: '/boutique/s1' },
    })
    expect(shopMetadata({ id: 's1', name: 'Dar Zitouna', city: null }, 'fr').title).toBe('Dar Zitouna')
    expect(productMetadata({ id: 'p1', title: 'Huile d’olive', shop: { name: 'Dar Zitouna' } }, 'fr')).toMatchObject({
      title: 'Huile d’olive',
      description: 'Huile d’olive, vendu par Dar Zitouna sur ServYou. Commandez en ligne et payez à la livraison.',
      alternates: { canonical: '/produits/p1' },
    })
    expect(productMetadata({ id: 'p1', title: 'Huile', shop: null }, 'en').description).toBe('Huile on ServYou. Order online and pay on delivery.')
    expect(serviceMetadata({ id: 'v1', title: 'Logo', freelancer: { name: 'Sami' } }, 'ar')).toMatchObject({
      title: 'Logo',
      description: 'Logo، يقدمه Sami على ServYou. تواصل مع المستقل لمناقشة طلبك.',
      alternates: { canonical: '/services/v1' },
    })
  })
})

describe('robots.txt', () => {
  it('allows the site, disallows every private area, never /_next, and points to the sitemap', () => {
    const r = robots()
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules
    expect(rule.allow).toBe('/')
    for (const area of ['/tableau-de-bord', '/mon-', '/mes-', '/ma-boutique', '/admin', '/session-expiree', '/auth/', '/api/', '/design-tokens-verification']) {
      expect(rule.disallow).toContain(area)
    }
    // The auth pages stay crawlable so crawlers can read their noindex (founder ruling 2026-11-12).
    for (const auth of AUTH_NOINDEX_PREFIXES) {
      expect((rule.disallow as string[]).filter((p) => auth.startsWith(p) || p.startsWith(auth)), auth).toEqual([])
    }
    expect((rule.disallow as string[]).some((p) => p.startsWith('/_next'))).toBe(false)
    expect(r.sitemap).toBe(`${DEFAULT_SITE_URL}/sitemap.xml`)
  })

  it('no disallow rule is a prefix of a public page', () => {
    expect(PUBLIC_STATIC_PATHS.filter(isDisallowed)).toEqual([])
    for (const detail of ['/freelance/x', '/boutique/x', '/produits/x', '/services/x', '/categories/x', '/marche', '/recherche']) {
      expect(isDisallowed(detail), detail).toBe(false)
    }
    for (const priv of ['/mes-commandes', '/mon-compte', '/tableau-de-bord-vendeur', '/admin/utilisateurs', '/missions/1']) {
      expect(isDisallowed(priv), priv).toBe(true)
    }
  })
})

describe('sitemap.xml', () => {
  const env = { ...process.env }
  beforeEach(() => {
    db.calls = {}
    db.results = {}
    db.createClient.mockReset().mockImplementation(() => fakeClient())
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  })
  afterEach(() => {
    process.env = { ...env }
  })

  it('reads with a cookie-less anon client: no session kept or refreshed', async () => {
    await sitemap()
    expect(db.createClient).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key', {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  })

  it("repeats the detail pages' public filters, freshest first, capped", async () => {
    await sitemap()
    const has = (table: string, ...call: Call) => expect(db.calls[table], table).toContainEqual(call)
    has('freelancer_profiles', 'eq', 'is_published', true)
    has('freelancer_profiles', 'is', 'admin_hidden_at', null)
    has('shops', 'is', 'admin_hidden_at', null)
    has('products', 'eq', 'status', 'active')
    has('products', 'is', 'shops.admin_hidden_at', null)
    has('service_listings', 'eq', 'status', 'active')
    has('service_listings', 'is', 'admin_hidden_at', null)
    has('service_listings', 'is', 'freelancer_profiles.admin_hidden_at', null)
    for (const table of ['freelancer_profiles', 'shops', 'products', 'service_listings', 'categories']) {
      has(table, 'limit', SITEMAP_CAP)
      // Named columns only: the marketplace tables grant SELECT column by column.
      expect(db.calls[table].find((c) => c[0] === 'select')?.[1]).not.toContain('*')
    }
    has('products', 'order', 'updated_at', { ascending: false })
  })

  it('lists the static pages, then the rows as absolute URLs with lastModified — none of them private', async () => {
    db.results.products = { data: [{ id: 'p1', updated_at: '2026-11-01T00:00:00Z' }], error: null }
    db.results.categories = { data: [{ slug: 'design-graphique', updated_at: '2026-10-01T00:00:00Z' }], error: null }
    const entries = await sitemap()
    expect(entries[0]).toEqual({ url: `${DEFAULT_SITE_URL}/` })
    expect(entries.slice(0, PUBLIC_STATIC_PATHS.length).map((e) => e.url)).toEqual(
      PUBLIC_STATIC_PATHS.map((p) => (p === '/' ? `${DEFAULT_SITE_URL}/` : `${DEFAULT_SITE_URL}${p}`)),
    )
    expect(entries).toContainEqual({ url: `${DEFAULT_SITE_URL}/produits/p1`, lastModified: '2026-11-01T00:00:00Z' })
    expect(entries).toContainEqual({ url: `${DEFAULT_SITE_URL}/categories/design-graphique`, lastModified: '2026-10-01T00:00:00Z' })
    expect(entries.map((e) => new URL(e.url).pathname).filter(isDisallowed)).toEqual([])
  })

  it('a failed read is reported and left out; the rest still answers', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    db.results.shops = { data: null, error: { message: 'boom', code: 'XX000' } }
    db.results.services = { data: null, error: null }
    db.results.service_listings = { data: [{ id: 'v1', updated_at: '2026-11-02T00:00:00Z' }], error: null }
    const urls = (await sitemap()).map((e) => e.url)
    expect(urls).toContain(`${DEFAULT_SITE_URL}/services/v1`)
    expect(urls.some((u) => u.includes('/boutique/'))).toBe(false)
    expect(log).toHaveBeenCalled()
    log.mockRestore()
  })

  it('without Supabase env (the CI build) it lists the static pages only', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    const entries = await sitemap()
    expect(entries).toHaveLength(PUBLIC_STATIC_PATHS.length)
    expect(db.createClient).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('every public page opts in, in all three languages', () => {
  const APP = join(process.cwd(), 'src', 'app')

  it('each public page file RETURNS its metadata from the SEO helpers (else it inherits noindex)', () => {
    const RETURNS_PUBLIC = /return (publicMetadata|buildPublicMetadata)\(|\? (freelancer|shop|product|service)Metadata\(/
    const missing = PUBLIC_PAGE_FILES.filter((file) => {
      const path = join(APP, file)
      return !existsSync(path) || !RETURNS_PUBLIC.test(readFileSync(path, 'utf8'))
    })
    expect(missing).toEqual([])
  })

  // A new page must be classified: public (PUBLIC_PAGE_FILES), private (a robots disallow prefix), open-noindex, or an
  // auth page (crawlable, noindex — AUTH_NOINDEX_PREFIXES, segment-anchored: /connexion and /connexion/x, not /connexion-x).
  const routeOf = (file: string) =>
    '/' + file.replace(/(^|\/)page\.tsx$/, '').split('/').filter((s) => s && !/^\(.*\)$/.test(s)).join('/')
  const isClassified = (file: string) => {
    const r = routeOf(file)
    return (
      (PUBLIC_PAGE_FILES as readonly string[]).includes(file) ||
      (OPEN_NOINDEX_PATHS as readonly string[]).includes(r) ||
      AUTH_NOINDEX_PREFIXES.some((p) => r === p || r.startsWith(`${p}/`)) ||
      isDisallowed(r) ||
      isDisallowed(`${r}/`)
    )
  }

  it('every page under src/app is public, disallowed in robots.txt, open-noindex or an auth page', () => {
    const pages = (function walk(dir: string): string[] {
      return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
        d.isDirectory() ? walk(join(dir, d.name)) : d.name === 'page.tsx' ? [join(dir, d.name)] : [],
      )
    })(APP).map((full) => relative(APP, full).replace(/\\/g, '/'))
    expect(pages.length).toBeGreaterThan(80)
    expect(pages.filter((file) => !isClassified(file))).toEqual([])
  })

  it.each([
    ['blog/page.tsx', false],
    ['connexion-pro/page.tsx', false],
    ['(marketing)/presse/page.tsx', false],
    ['mes-factures/page.tsx', true],
    ['connexion/page.tsx', true],
    ['inscription/shop-owner/page.tsx', true],
    ['faq/page.tsx', false], // the real FAQ lives under (marketing)/ — a bare one would be a new, unclassified page
  ])('the classifier on %s → classified: %s (an unclassified route still fails)', (file, classified) => {
    expect(isClassified(file)).toBe(classified)
  })

  it('every new seo.* key exists in French, Arabic and English with the same {placeholders}', () => {
    const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort()
    const keys = Object.keys(fr).filter((k) => k.startsWith('seo.'))
    expect(keys.length).toBeGreaterThan(20)
    for (const key of keys) {
      expect(ar[key], `${key} (ar)`).toBeTruthy()
      expect(en[key], `${key} (en)`).toBeTruthy()
      expect(placeholders(ar[key]), `${key} (ar)`).toEqual(placeholders(fr[key]))
      expect(placeholders(en[key]), `${key} (en)`).toEqual(placeholders(fr[key]))
    }
  })
})

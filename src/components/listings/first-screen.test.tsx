/**
 * @vitest-environment jsdom
 *
 * The first-screen rule (speed PR perf/first-screen), checked on the SERVER HTML — what the browser paints before hydration, which
 * is the whole point: the first row of a results grid is already in the fade's end state and its covers load at once (the first at
 * high fetch priority), while every later card still starts hidden for its in-view fade and keeps the lazy cover.
 *
 * The trap this guards: with BlurFade's `inView` the first render resolves to the HIDDEN state, so a first-row card that kept
 * `inView` next to `initial={false}` would be frozen at opacity 0 in the HTML — exactly the delay the PR removes.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement, type ReactElement } from 'react'
import { renderToString } from 'react-dom/server'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))
// Forwards exactly the two props under test; `default` = the prop was not passed, i.e. next/image's own default (lazy).
vi.mock('next/image', () => ({
  default: ({ src, alt, loading, fetchPriority }: { src: string; alt: string; loading?: string; fetchPriority?: string }) =>
    createElement('img', { src, alt, 'data-loading': loading ?? 'default', 'data-fetchpriority': fetchPriority ?? 'default' }),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) }, from: () => ({}) }),
}))

import { LangProvider } from '@/components/LangProvider'
import { ProductBrowseGrid } from '@/app/marche/produits/_components/ProductBrowseGrid'
import { ListingResults } from './ListingResults'
import { FIRST_SCREEN, coverLoading, entrance } from './first-screen'
import type { ProductListing } from './ProductListingCard'
import type { ServiceListing } from './ServiceListingCard'

const products = Array.from(
  { length: 6 },
  (_, i) =>
    ({
      id: `p${i}`,
      title: `Produit ${i}`,
      description: null,
      price_tnd: 10 + i,
      image_url: `https://cdn.example/${i}.jpg`,
      shop: { name: 'Sami Store', city: 'Tunis' },
      category: null,
    }) as unknown as ProductListing,
)
const services: ServiceListing[] = Array.from({ length: 5 }, (_, i) => ({
  id: `s${i}`,
  title: `Service ${i}`,
  description: 'Une description',
  price_starting: 100,
  delivery_time: null,
  freelancer: { full_name: 'Youssef B.', city: 'Tunis' },
}))

// The grid's cells (the BlurFade wrappers) from the server HTML (renderToString: no effect runs, as on the server), in order.
function cells(node: ReactElement): HTMLElement[] {
  const html = renderToString(<LangProvider lang="fr">{node}</LangProvider>)
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return [...doc.querySelector('div.grid')!.children] as HTMLElement[]
}
const opacity = (cell: HTMLElement) => cell.style.opacity

describe('first-screen rule — helpers', () => {
  it('only the first-screen covers load eagerly, and only the first one at high priority', () => {
    expect(coverLoading(0, 4)).toEqual({ loading: 'eager', fetchPriority: 'high' })
    expect(coverLoading(3, 4)).toEqual({ loading: 'eager' })
    expect(coverLoading(4, 4)).toEqual({})
  })

  it('a first-screen card renders in the end state with no in-view trigger; later cards keep the in-view fade', () => {
    expect(entrance(2, 3)).toEqual({ initial: false })
    expect(entrance(3, 3)).toEqual({ inView: true })
  })
})

describe('first-screen rule — server HTML', () => {
  it('/marche/produits grid: the first 4 cards are visible and eager (the first high), the rest hidden and lazy', () => {
    const c = cells(createElement(ProductBrowseGrid, { items: products }))
    expect(c).toHaveLength(6)
    expect(c.map(opacity)).toEqual(['1', '1', '1', '1', '0', '0'])
    const imgs = c.map((cell) => cell.querySelector('img')!)
    expect(imgs.map((i) => i.dataset.loading)).toEqual(['eager', 'eager', 'eager', 'eager', 'default', 'default'])
    expect(imgs.map((i) => i.dataset.fetchpriority)).toEqual(['high', 'default', 'default', 'default', 'default', 'default'])
  })

  it('ListingResults browse look (/recherche) follows the same rule', () => {
    const c = cells(createElement(ListingResults, { type: 'product', items: products, look: 'browse' }))
    expect(c.map(opacity)).toEqual(['1', '1', '1', '1', '0', '0'])
    expect(c.filter((cell) => cell.querySelector('img[data-fetchpriority="high"]'))).toEqual([c[0]])
  })

  it('ListingResults listing look (/categories/[slug]) follows the same rule', () => {
    const c = cells(createElement(ListingResults, { type: 'product', items: products }))
    expect(c.map(opacity)).toEqual(['1', '1', '1', '1', '0', '0'])
    expect(c.map((cell) => cell.querySelector('img')!.dataset.loading)).toEqual(['eager', 'eager', 'eager', 'eager', 'default', 'default'])
  })

  it(`service grid (/marche/services): the first ${FIRST_SCREEN.service} cards are visible at once, the rest keep the fade`, () => {
    const c = cells(createElement(ListingResults, { type: 'service', items: services }))
    expect(c.map(opacity)).toEqual(['1', '1', '1', '0', '0'])
  })
})

// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// D1 at 375 (m375-d1-produit): structure and order only — pixel geometry is measured in the browser (docs/design/m375-d1-produit-deltas.md).

const h = vi.hoisted(() => ({ observers: [] as { cb: () => void }[] }))

vi.mock('@/components/LangProvider', () => ({ useLang: () => 'fr' }))
vi.mock('@/components/FavoriteButton', () => ({
  FavoriteButton: (p: { label?: string; variant?: string }) => <button data-testid={`fav-${p.variant ?? 'glyph'}`}>{p.label}</button>,
}))
vi.mock('@/components/produits/ShareLinkButton', () => ({
  ShareLinkButton: (p: { variant?: string }) => <button data-testid={`share-${p.variant ?? 'text'}`}>Partager</button>,
}))
vi.mock('@/components/produits/ProductGallery', () => ({ ProductGallery: () => <div data-testid="gallery" /> }))
vi.mock('@/components/produits/ProductBrowseCard', () => ({ ProductBrowseCard: () => <div data-testid="card" /> }))
vi.mock('@/components/report/ReportListingModal', () => ({ ReportListingModal: () => <button>Signaler ce produit</button> }))
vi.mock('@/components/social/SocialLinks', () => ({ SocialLinks: () => <ul data-testid="socials" /> }))

import { ProductDetail } from './ProductDetail'
import { ProductDescription } from './ProductDescription'
import type { ProductDetailData } from '@/lib/marche/product-detail'

const base: ProductDetailData = {
  id: 'p-1',
  title: 'Coussin brodé main — motif berbère',
  description: 'Coussin brodé à la main.',
  price_tnd: 45,
  delivery_fee_tnd: 7,
  tracks_stock: true,
  stock_count: 3,
  category: { name_fr: 'Maison', name_ar: 'منزل' },
  categoryId: 'cat-1',
  shopId: 'shop-1',
  images: [],
  shop: { name: 'Atelier Sahbeni', city: 'Tunis', logo_url: null, description: 'Atelier familial.', socialLinks: [{ platform: 'facebook', url: 'https://facebook.com/x' }] },
}

const view = (over: Partial<ProductDetailData> = {}) =>
  render(<ProductDetail product={{ ...base, ...over }} related={[{ id: 'r1' }] as never} lang="fr" isLoggedIn={false} />)

// The element (or its ancestor) that carries a width toggle.
const hiddenFrom = (el: HTMLElement, cls: 'lg:hidden' | 'max-lg:hidden') => Boolean(el.closest(`[class~="${cls}"]`))

beforeEach(() => {
  vi.clearAllMocks()
  h.observers.length = 0
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: () => void) {
        h.observers.push({ cb })
      }
      observe() {}
      disconnect() {}
    },
  )
})
afterEach(cleanup)

describe('ProductDetail — the 375 column', () => {
  it('the DOM is the 375 order: CTA · shop row · socials · Favori / Partager boxes, then the desktop-only row and shop snippet', () => {
    view()
    const cta = screen.getByRole('link', { name: 'Demander ce produit' })
    const shopRow = screen.getAllByRole('link').find((a) => a.textContent?.startsWith('Atelier Sahbeni'))!
    const favBox = screen.getByTestId('fav-box')
    const shareBox = screen.getByTestId('share-bordered')
    const favText = screen.getByTestId('fav-glyph')
    const order = [cta, shopRow, screen.getAllByTestId('socials')[0], favBox, shareBox, favText]
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1].compareDocumentPosition(order[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    expect(hiddenFrom(shopRow, 'lg:hidden')).toBe(true)
    expect(hiddenFrom(favBox, 'lg:hidden')).toBe(true)
    expect(hiddenFrom(favText, 'max-lg:hidden')).toBe(true)
    expect(favBox.textContent).toBe('Favori')
  })

  it('the shop row is one link to the shop: « Boutique · Tunis · Voir la boutique »', () => {
    view()
    const row = screen.getAllByRole('link').find((a) => a.textContent?.startsWith('Atelier Sahbeni'))!
    expect(row).toHaveAttribute('href', '/boutique/shop-1')
    expect(row.textContent).toContain('Boutique · Tunis · Voir la boutique')
  })

  it('without a shop id the row is plain text, not a dead link', () => {
    view({ shopId: null })
    expect(screen.getAllByRole('link').some((a) => a.textContent?.startsWith('Atelier Sahbeni'))).toBe(false)
    const name = screen.getAllByText('Atelier Sahbeni')[0]
    expect(name.nextElementSibling?.textContent).toBe('Boutique · Tunis')
  })

  it('375 breadcrumb is « ‹ Produits › category »; Accueil and the title are desktop-only', () => {
    view()
    const nav = screen.getByRole('navigation', { name: "Fil d'Ariane" })
    expect(hiddenFrom(within(nav).getByRole('link', { name: 'Accueil' }), 'max-lg:hidden')).toBe(true)
    expect(within(nav).getByRole('link', { name: 'Produits' })).toHaveAttribute('href', '/marche/produits')
    expect(hiddenFrom(within(nav).getByText(base.title), 'max-lg:hidden')).toBe(true)
  })

  it('the category is the sunken badge on desktop and the blue chip under the title at 375', () => {
    view()
    const nav = screen.getByRole('navigation', { name: "Fil d'Ariane" })
    const [badge, chip] = screen.getAllByText('Maison').filter((el) => !nav.contains(el))
    expect(badge.className).toContain('max-lg:hidden')
    expect(chip.className).toContain('lg:hidden')
    expect(chip.className).toContain('bg-brand-blue-50')
  })

  it('the total line, the shop panel and the desktop reviews state are hidden at 375; the COD note has its 375 copy', () => {
    view()
    expect(screen.getByText(/Total/).className).toContain('max-lg:hidden')
    expect(hiddenFrom(screen.getByText('Atelier familial.'), 'max-lg:hidden')).toBe(true)
    const notes = screen.getAllByText(/Paiement à la livraison/)
    expect(notes).toHaveLength(2)
    expect(notes.map((n) => (hiddenFrom(n, 'lg:hidden') ? 'mobile' : 'desktop')).sort()).toEqual(['desktop', 'mobile'])
    const reviews = screen.getAllByText(/Les avis seront bientôt disponibles/)
    expect(reviews.some((r) => hiddenFrom(r, 'lg:hidden'))).toBe(true)
  })

  it('the description heading is visually hidden at 375, kept for screen readers', () => {
    view()
    expect(screen.getByRole('heading', { name: 'Description' }).className).toContain('max-lg:sr-only')
  })
})

describe('ProductDescription — 375 « Voir plus » only when the text overflows its 5-line clamp; desktop unchanged', () => {
  let scrollHeight = 120
  beforeEach(() => {
    scrollHeight = 120
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => scrollHeight })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 120 })
  })
  const measure = () => act(() => h.observers.forEach((o) => o.cb()))

  it('a short text: the button is hidden below lg (still shown from lg, as before) — 8 px of mixed-script slack is not an overflow', () => {
    render(<ProductDescription description="Court." />)
    scrollHeight = 168
    measure()
    expect(screen.getByRole('button', { name: 'Voir plus' }).className).not.toContain('max-lg:hidden')
    scrollHeight = 128 // the text got shorter (or the box wider): 8 px over the clamp
    measure()
    expect(screen.getByRole('button', { name: 'Voir plus' }).className).toContain('max-lg:hidden')
  })

  it('once expanded, a re-measure (resize, late font) does not hide « Voir moins »', () => {
    render(<ProductDescription description={'Long. '.repeat(200)} />)
    scrollHeight = 168
    measure()
    fireEvent.click(screen.getByRole('button', { name: 'Voir plus' }))
    scrollHeight = 120 // unclamped: scrollHeight == clientHeight
    measure()
    expect(screen.getByRole('button', { name: 'Voir moins' }).className).not.toContain('max-lg:hidden')
  })

  it('the 375 link has a ≥ 44 px touch target that does not move the layout', () => {
    render(<ProductDescription description="Court." />)
    const button = screen.getByRole('button', { name: 'Voir plus' })
    expect(button.className).toContain('max-lg:py-3.5')
    expect(button.className).toContain('max-lg:-my-3.5')
  })

  it('an overflowing text shows « Voir plus » at 375, expands and collapses', () => {
    render(<ProductDescription description={'Long. '.repeat(200)} />)
    scrollHeight = 168
    measure()
    const button = screen.getByRole('button', { name: 'Voir plus' })
    expect(button.className).not.toContain('max-lg:hidden')
    const text = document.getElementById('product-description') as HTMLElement
    expect(text.className).toContain('max-lg:line-clamp-5')
    expect(text.className).toContain('line-clamp-3')
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: 'Voir moins' })).toHaveAttribute('aria-expanded', 'true')
    expect(text.className).not.toContain('line-clamp')
    fireEvent.click(screen.getByRole('button', { name: 'Voir moins' }))
    expect(screen.getByRole('button', { name: 'Voir plus' })).toBeInTheDocument()
  })
})

/**
 * @vitest-environment jsdom
 *
 * C1's product card as the 375 frame draws it (m375-c1-produits, Product Card 165 × 373): the 1 px stroke is an overlay inside the 373 box (cover 276 +
 * body 97), the heart is the 18 blue/300 icon-heart in a 32 circle, the shop badge is the end-side monogram, the category sits bottom-start on the cover.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { createElement } from 'react'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))
vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) }, from: () => ({}) }),
}))

import { LangProvider } from '@/components/LangProvider'
import { getInitials } from '@/components/ui/initials'
import { ProductBrowseCard } from './ProductBrowseCard'
import type { ProductListing } from '@/components/listings/ProductListingCard'

afterEach(cleanup)

const product = {
  id: 'p1',
  title: 'Coussin brodé main — motif berbère',
  description: null,
  price_tnd: 45,
  image_url: 'https://cdn.example/a.jpg',
  shop: { name: 'Boutique Artisan Tunis', city: 'Tunis' },
  category: { name_fr: 'Textile artisanal', name_ar: 'نسيج حرفي' },
} as unknown as ProductListing

const mount = (lang: 'fr' | 'ar' = 'fr') =>
  render(
    <LangProvider lang={lang}>
      <ProductBrowseCard product={product} />
    </LangProvider>,
  )

describe('ProductBrowseCard (m375-c1-produits)', () => {
  it('draws the stroke as an overlay, not a border, so the card is exactly cover 276 + body 97 = 373', () => {
    const { container } = mount()
    const card = container.firstElementChild as HTMLElement
    expect(card.className).not.toMatch(/\bborder\b/)
    const overlay = card.querySelector(':scope > span[aria-hidden="true"]')!
    expect(overlay.className).toMatch(/inset-0/)
    expect(overlay.className).toMatch(/border-border-subtle/)
    expect(overlay.className).toMatch(/pointer-events-none/)
    expect(card.querySelector('div[class*="h-[276px]"]')).not.toBeNull()
  })

  it('the heart is the 18 blue/300 icon-heart in the 32 circle — not the text glyph', async () => {
    const { container } = mount()
    const heart = await screen.findByRole('button', { name: /favoris/i })
    const svg = heart.querySelector('svg')!
    expect(svg.getAttribute('class')).toMatch(/size-\[18px\]/)
    expect(svg.getAttribute('class')).toMatch(/text-brand-blue-300/)
    expect(container.textContent).not.toMatch(/[♡♥]/)
    expect(heart.parentElement!.className).toMatch(/h-8 w-8/)
  })

  it('shows the monogram at the end, the category at the bottom-start, the price and the city', () => {
    mount()
    expect(screen.getByText(getInitials('Boutique Artisan Tunis'))).toBeInTheDocument()
    expect(screen.getByText('Textile artisanal').className).toMatch(/start-2/)
    expect(screen.getByText('45 TND')).toBeInTheDocument()
    expect(screen.getByText('Tunis')).toBeInTheDocument()
  })

  it('keeps the title on one line (the card height is fixed)', () => {
    mount()
    expect(screen.getByText('Coussin brodé main — motif berbère').className).toMatch(/\btruncate\b/)
  })

  it('reads in Arabic', () => {
    mount('ar')
    expect(screen.getByText('نسيج حرفي')).toBeInTheDocument()
  })
})

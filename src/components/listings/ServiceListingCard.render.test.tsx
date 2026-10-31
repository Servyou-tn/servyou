/**
 * @vitest-environment jsdom
 *
 * The Service Card as Figma draws it (Service Card 124:6200; 1486:24359 / m375-marche-services): a stroke overlay (content padded from the OUTER
 * edge), fixed title (44) and description (63) boxes, 23 high r6 chips, a 120 min-width CTA, and the plain 20 icon-heart.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { createElement } from 'react'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) }, from: () => ({}) }),
}))

import { LangProvider } from '@/components/LangProvider'
import { ServiceListingCard, type ServiceListing } from './ServiceListingCard'

afterEach(cleanup)

const service: ServiceListing = {
  id: 's1',
  title: 'Site vitrine WordPress clé en main',
  description: 'Sites vitrines rapides, responsive et optimisés SEO.',
  price_starting: 120,
  delivery_time: null,
  tags: [{ fr: 'WordPress', ar: 'ووردبريس' }, { fr: 'SEO', ar: 'سيو' }],
  freelancer: { full_name: 'Sarra Mansouri', city: 'Sfax' },
}
const mount = (lang: 'fr' | 'ar' = 'fr') =>
  render(
    <LangProvider lang={lang}>
      <ServiceListingCard service={service} />
    </LangProvider>,
  )

describe('ServiceListingCard', () => {
  it('draws the 2 px stroke as an overlay, not a border, so the content keeps the full card box', () => {
    const { container } = mount()
    const article = container.querySelector('article')!
    expect(article.className).not.toMatch(/\bborder-2\b/)
    expect(article.className).toMatch(/h-\[279px\]/)
    const overlay = article.querySelector('span[aria-hidden="true"].border-2')!
    expect(overlay.className).toMatch(/absolute/)
    expect(overlay.className).toMatch(/inset-0/)
    expect(overlay.className).toMatch(/border-brand-blue-600/)
    expect(overlay.className).toMatch(/pointer-events-none/)
  })

  it('has no resting shadow (the hover shadow stays)', () => {
    const { container } = mount()
    const cls = container.querySelector('article')!.className.split(/\s+/)
    expect(cls.filter((c) => c.startsWith('shadow-'))).toEqual([])
  })

  it('reserves a 44 title box and a 63 description box, so chips and footer never move with the text', () => {
    const { container } = mount()
    expect(container.querySelector('h3')!.className).toMatch(/\bh-11\b/)
    expect(container.querySelector('h3 + p')!.className).toMatch(/h-\[63px\]/)
  })

  it('chips are 23 high with a 6 radius; the CTA is at least 120 wide in SemiBold', () => {
    const { container } = mount()
    const chip = screen.getByText('WordPress')
    expect(chip.className).toMatch(/h-\[23px\]/)
    expect(chip.className).toMatch(/rounded-\[6px\]/)
    const cta = Array.from(container.querySelectorAll('span')).find((s) => s.textContent === 'Voir le service')!
    expect(cta.className).toMatch(/min-w-\[120px\]/)
    expect(cta.className).toMatch(/font-semibold/)
  })

  it('the heart is the plain 20 icon (a button with an svg), not the text glyph', async () => {
    const { container } = mount()
    const heart = await screen.findByRole('button', { name: /favoris/i })
    expect(heart.querySelector('svg')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/[♡♥]/)
  })

  it('keeps the chip row on one line (a wrapped row would overflow the fixed boxes) and shows a keyboard focus ring on the overlay', () => {
    const { container } = mount()
    expect(container.querySelector('article span.flex-nowrap, article div.flex-nowrap')).not.toBeNull()
    const overlay = container.querySelector('article span[aria-hidden="true"].border-2')!
    expect(overlay.className).toMatch(/group-has-\[a:focus-visible\]\/card:ring/)
  })

  it('the icon heart has a stable pressed-free name that says what a press does', async () => {
    mount()
    const heart = await screen.findByRole('button', { name: /favoris/i })
    expect(heart).not.toHaveAttribute('aria-pressed')
  })

  it('shows the Arabic chip labels in Arabic', () => {
    mount('ar')
    expect(screen.getByText('ووردبريس')).toBeInTheDocument()
  })
})

/**
 * @vitest-environment jsdom
 *
 * C2 sub-category chips: « Tout » first, the page's own entry is the current one, every chip is a real link that carries the active filters,
 * and nothing renders for a category with no children.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { createElement } from 'react'
import { CategoryChips } from './CategoryChips'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))

afterEach(cleanup)

const chips = [
  { slug: 'logo-identite-visuelle', name_fr: 'Logo & identité visuelle', name_ar: 'الشعار والهوية البصرية' },
  { slug: 'flyer-affiche-print', name_fr: 'Flyer, affiche & print', name_ar: 'منشورات وملصقات وطباعة' },
]

describe('CategoryChips', () => {
  it('renders nothing when the category has no children', () => {
    const { container } = render(<CategoryChips allHref="/categories/x" chips={[]} activeSlug={null} carry="" lang="fr" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('on a sector page « Tout » is the current chip, and the children link to their pages', () => {
    render(<CategoryChips allHref="/categories/design-graphique-logo" chips={chips} activeSlug={null} carry="" lang="fr" />)
    const nav = screen.getByRole('navigation', { name: 'Sous-catégories' })
    expect(within(nav).getByRole('link', { name: 'Tout' })).toHaveAttribute('aria-current', 'page')
    expect(within(nav).getByRole('link', { name: 'Tout' })).toHaveAttribute('href', '/categories/design-graphique-logo')
    expect(within(nav).getByRole('link', { name: 'Flyer, affiche & print' })).toHaveAttribute('href', '/categories/flyer-affiche-print')
    expect(within(nav).getByRole('link', { name: 'Flyer, affiche & print' })).not.toHaveAttribute('aria-current')
  })

  it('on a subcategory page that subcategory is the current chip and « Tout » goes back to the sector', () => {
    render(
      <CategoryChips allHref="/categories/design-graphique-logo" chips={chips} activeSlug="flyer-affiche-print" carry="" lang="fr" />,
    )
    expect(screen.getByRole('link', { name: 'Flyer, affiche & print' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Tout' })).not.toHaveAttribute('aria-current')
  })

  it('carries the active filters on every chip, « Tout » included', () => {
    render(
      <CategoryChips allHref="/categories/design-graphique-logo" chips={chips} activeSlug={null} carry="ville=Tunis&tri=prix_asc" lang="fr" />,
    )
    for (const link of screen.getAllByRole('link')) expect(link.getAttribute('href')).toMatch(/\?ville=Tunis&tri=prix_asc$/)
  })

  it('shows the Arabic names and « الكل » in Arabic', () => {
    render(<CategoryChips allHref="/categories/x" chips={chips} activeSlug={null} carry="" lang="ar" />)
    expect(screen.getByRole('link', { name: 'الكل' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'الشعار والهوية البصرية' })).toBeInTheDocument()
  })
})

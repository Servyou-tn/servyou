/**
 * @vitest-environment jsdom
 *
 * The mobile Marketplace header block (m375-marche-services): « Marketplace » over a GET search form that keeps every other active param.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MarketplaceMobileHeader } from './MarketplaceMobileHeader'

afterEach(cleanup)

describe('MarketplaceMobileHeader', () => {
  it('shows the page title and a search field filled with the current query, below lg only', () => {
    const { container } = render(
      <MarketplaceMobileHeader lang="fr" action="/marche/services" q="logo" placeholderKey="services.filters.searchPlaceholder" keep={{}} />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Marketplace' })).toBeInTheDocument()
    const input = screen.getByRole('searchbox', { name: 'Rechercher un service…' })
    expect(input).toHaveValue('logo')
    expect(input).toHaveAttribute('name', 'q')
    expect((container.firstChild as HTMLElement).className).toMatch(/\blg:hidden\b/)
  })

  it('submits as a plain GET to the lens route and carries the other params as hidden fields — never `page`', () => {
    const { container } = render(
      <MarketplaceMobileHeader
        lang="fr"
        action="/marche/services"
        q=""
        placeholderKey="services.filters.searchPlaceholder"
        keep={{ vue: 'freelances', ville: 'Sfax', prix_min: '40' }}
      />,
    )
    const form = container.querySelector('form')!
    expect(form).toHaveAttribute('action', '/marche/services')
    expect(form).toHaveAttribute('method', 'get')
    const hidden = Array.from(form.querySelectorAll('input[type=hidden]')).map((i) => [i.getAttribute('name'), (i as HTMLInputElement).value])
    expect(hidden).toEqual([['vue', 'freelances'], ['ville', 'Sfax'], ['prix_min', '40']])
  })

  it('reads in Arabic', () => {
    render(<MarketplaceMobileHeader lang="ar" action="/marche/services" q="" placeholderKey="services.filters.searchPlaceholder" keep={{}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toMatch(/shell\./)
  })
})

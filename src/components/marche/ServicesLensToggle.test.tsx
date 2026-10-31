/**
 * @vitest-environment jsdom
 *
 * The Services / Freelances toggle: both segments are real links into the same route, the lens lives in the URL, the active one is marked.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { createElement } from 'react'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))

import { ServicesLensToggle } from './ServicesLensToggle'

afterEach(cleanup)

describe('ServicesLensToggle', () => {
  it('Services is the current page by default, and Freelances is a live link — no disabled state, no « Bientôt »', () => {
    render(<ServicesLensToggle lang="fr" />)
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('aria-current', 'page')
    const freelances = screen.getByRole('link', { name: 'Freelances' })
    expect(freelances).toHaveAttribute('href', '/marche/services?vue=freelances')
    expect(freelances).not.toHaveAttribute('aria-current')
    expect(freelances).not.toBeDisabled()
    expect(document.body.textContent).not.toMatch(/Bientôt/)
  })

  it('on the Freelances lens the roles swap, and Services links back to the plain route', () => {
    render(<ServicesLensToggle lang="fr" active="freelances" />)
    expect(screen.getByRole('link', { name: 'Freelances' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Services' })).toHaveAttribute('href', '/marche/services')
    expect(screen.getByRole('link', { name: 'Services' })).not.toHaveAttribute('aria-current')
  })

  it('reads in Arabic', () => {
    render(<ServicesLensToggle lang="ar" />)
    expect(screen.getByRole('link', { name: 'المستقلون' })).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'التبديل بين الخدمات والمستقلين' })).toBeInTheDocument()
  })
})

/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ProduitsLensToggle } from './ProduitsLensToggle'

afterEach(cleanup)

describe('ProduitsLensToggle — both lenses are live links', () => {
  it('Produits is the current page by default, and each segment is a real link to its lens', () => {
    render(<ProduitsLensToggle lang="fr" />)
    const produits = screen.getByRole('link', { name: 'Produits' })
    const boutiques = screen.getByRole('link', { name: 'Boutiques' })
    expect(produits).toHaveAttribute('href', '/marche/produits')
    expect(produits).toHaveAttribute('aria-current', 'page')
    expect(boutiques).toHaveAttribute('href', '/marche/produits?vue=boutiques')
    expect(boutiques).not.toHaveAttribute('aria-current')
  })

  it('Boutiques active flips the current page, and nothing is disabled or marked « Bientôt »', () => {
    render(<ProduitsLensToggle lang="fr" active="boutiques" />)
    expect(screen.getByRole('link', { name: 'Boutiques' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Produits' })).not.toHaveAttribute('aria-current')
    expect(screen.queryByText('Bientôt')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

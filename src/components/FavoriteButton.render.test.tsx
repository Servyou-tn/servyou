// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

// The `box` variant: D2's `icon-heart-btn` at 375 (m375-d2-service) — a 44 px bordered button, heart 20 + « Favori ».

const h = vi.hoisted(() => ({ push: vi.fn(), getUser: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push, refresh: vi.fn() }) }))
vi.mock('@/components/LangProvider', () => ({ useLang: () => 'fr' }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { getUser: h.getUser } }) }))

import { FavoriteButton } from './FavoriteButton'

beforeEach(() => {
  vi.clearAllMocks()
  h.getUser.mockResolvedValue({ data: { user: null } })
})
afterEach(cleanup)

describe('FavoriteButton variant="box"', () => {
  it('is a 44 px bordered button: heart + the visible label, named by the action (which contains the label)', async () => {
    render(<FavoriteButton item_type="service" item_id="svc-1" variant="box" label="Favori" labelClassName="lg:hidden" />)
    const button = await screen.findByRole('button', { name: 'Ajouter aux favoris' })
    expect(button.className).toContain('h-11')
    expect(button.className).toContain('border-border-strong')
    expect(button.querySelector('svg')).not.toBeNull()
    const label = screen.getByText('Favori')
    expect(label.className).toContain('lg:hidden')
    expect(button.getAttribute('aria-pressed')).toBeNull() // the name flips with the state, so it is not also a pressed-toggle
  })

  it('signed out, it sends you to sign in', async () => {
    render(<FavoriteButton item_type="service" item_id="svc-1" variant="box" label="Favori" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Ajouter aux favoris' }))
    expect(h.push).toHaveBeenCalledWith('/connexion')
  })

  it('without a label it is icon-only (desktop)', async () => {
    render(<FavoriteButton item_type="service" item_id="svc-1" variant="box" />)
    const button = await screen.findByRole('button', { name: 'Ajouter aux favoris' })
    expect(button.textContent).toBe('')
  })
})

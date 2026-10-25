/**
 * @vitest-environment jsdom
 *
 * CancelOrderButton / CancelOrderDialog after the H8 promotion — G8 and G9 must behave exactly as before:
 * the shop owner's five PRODUCT presets, the post-pivot reason rule, and the same revalidate default.
 * (The service presets and the /mes-engagements path are pinned in EngagementRow.test.tsx.)
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const cancelMock = vi.fn(async (_input: unknown) => ({ ok: true }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/app/actions/orders', () => ({ cancelOrderAction: (input: unknown) => cancelMock(input) }))

const { CancelOrderButton } = await import('./CancelOrderButton')

afterEach(() => {
  cleanup()
  cancelMock.mockClear()
})

describe('CancelOrderButton (G8 / G9 defaults)', () => {
  it('offers the shop owner\'s product presets, not the freelancer\'s', async () => {
    const user = userEvent.setup()
    render(<CancelOrderButton orderId="o-1" status="pending" orderType="product" lang="fr" />)
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByRole('radio')).toHaveLength(5)
    expect(within(dialog).getByLabelText('Produit en rupture de stock')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Je ne suis pas disponible sur cette période')).not.toBeInTheDocument()
  })

  it('keeps revalidating /commandes-recues and requires a reason after dispatch', async () => {
    const user = userEvent.setup()
    render(<CancelOrderButton orderId="o-1" status="dispatched" orderType="product" lang="fr" />)
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: "Confirmer l'annulation" })
    expect(confirm).toBeDisabled()
    await user.click(within(dialog).getByLabelText('Client injoignable'))
    await user.click(confirm)
    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith({
      orderId: 'o-1',
      reason: 'Client injoignable',
      revalidate: '/commandes-recues',
    }))
  })

  it('renders G9\'s text-link trigger when asked', () => {
    render(<CancelOrderButton orderId="o-1" status="pending" orderType="product" lang="fr" asLink />)
    expect(screen.getByRole('button', { name: 'Annuler la commande' })).toBeInTheDocument()
  })
})

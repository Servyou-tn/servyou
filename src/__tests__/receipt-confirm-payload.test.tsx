/**
 * @vitest-environment jsdom
 *
 * H8 PR-2 (DB-batch ruling #12) — the buyer's receipt confirmation sends the STATUS and nothing else.
 *
 * `received_at` used to be stamped from the browser's clock at the two client call sites (ReceiptConfirmButton and
 * E3's OrdersList). A client clock is forgeable and the column was seller-writable too, so the database now stamps
 * it on the transition and the browser must not send it. These tests pin the payload at both call sites; the
 * column grant itself cannot be seen from a mock — the DB role asserts that live.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import type { MyServiceOrder } from '@/lib/marche/my-orders'

const h = vi.hoisted(() => ({
  updates: [] as Record<string, unknown>[],
  eqs: [] as unknown[][],
  error: null as { message: string; code: string; details: string } | null,
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      update: (payload: Record<string, unknown>) => {
        h.updates.push(payload)
        return {
          eq: async (...args: unknown[]) => {
            h.eqs.push(args)
            return { error: h.error }
          },
        }
      },
    }),
    rpc: vi.fn(),
  }),
}))

import { ReceiptConfirmButton } from '@/components/ReceiptConfirmButton'
import { OrdersList } from '@/app/mes-commandes/_components/OrdersList'

afterEach(() => {
  cleanup()
  h.updates = []
  h.eqs = []
  h.error = null
})

const ORDER_ID = '11111111-1111-4111-8111-111111111111'
const CONFIRM = t('common.confirm_receipt_action', 'fr')

const ORDER: MyServiceOrder = {
  id: ORDER_ID,
  status: 'arrived',
  createdAt: '2026-10-15T09:00:00Z',
  receivedAt: null,
  cancelledBy: null,
  cancellationReason: null,
  title: 'Création de logo professionnel',
  category: 'design-graphique-logo',
  startingPrice: 300,
  sellerId: 'seller-1',
  sellerName: 'Zina Freelance',
  sellerCity: 'Tunis',
}

describe('ReceiptConfirmButton', () => {
  it('sends status = received and NOT received_at', async () => {
    const user = userEvent.setup()
    render(
      <LangProvider lang="fr">
        <ReceiptConfirmButton orderId={ORDER_ID} />
      </LangProvider>,
    )
    await user.click(screen.getByRole('button', { name: CONFIRM }))
    await waitFor(() => expect(h.updates).toHaveLength(1))
    expect(h.updates[0]).toEqual({ status: 'received' })
    expect(h.updates[0]).not.toHaveProperty('received_at')
    expect(h.eqs[0]).toEqual(['id', ORDER_ID])
  })

  it('still works: success is shown and a refusal is surfaced, not swallowed', async () => {
    const user = userEvent.setup()
    h.error = { message: 'Seul l\'acheteur peut confirmer la réception.', code: 'P0001', details: '' }
    render(
      <LangProvider lang="fr">
        <ReceiptConfirmButton orderId={ORDER_ID} />
      </LangProvider>,
    )
    await user.click(screen.getByRole('button', { name: CONFIRM }))
    expect(await screen.findByText(t('common.receipt_confirm_error', 'fr'))).toBeInTheDocument()
    expect(h.updates[0]).toEqual({ status: 'received' })
  })
})

describe('E3 OrdersList — ConfirmReceipt', () => {
  async function open() {
    const user = userEvent.setup()
    render(
      <LangProvider lang="fr">
        <OrdersList orders={[ORDER]} />
      </LangProvider>,
    )
    await user.click(screen.getByRole('button', { name: /Création de logo professionnel/ }))
    return user
  }

  it('sends status = received and NOT received_at', async () => {
    const user = await open()
    await user.click(await screen.findByRole('button', { name: CONFIRM }))
    await waitFor(() => expect(h.updates).toHaveLength(1))
    expect(h.updates[0]).toEqual({ status: 'received' })
    expect(h.updates[0]).not.toHaveProperty('received_at')
    expect(h.eqs[0]).toEqual(['id', ORDER_ID])
  })

  it('offers the confirmation only from arrived (the DB trigger is the real gate)', async () => {
    const user = userEvent.setup()
    render(
      <LangProvider lang="fr">
        <OrdersList orders={[{ ...ORDER, status: 'accepted' }]} />
      </LangProvider>,
    )
    await user.click(screen.getByRole('button', { name: /Création de logo professionnel/ }))
    expect(screen.queryByRole('button', { name: CONFIRM })).not.toBeInTheDocument()
  })
})

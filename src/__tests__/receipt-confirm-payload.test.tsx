/**
 * @vitest-environment jsdom
 *
 * H8 PR-2 (DB-batch ruling #12) + pre-launch audit pass 2 — the buyer's receipt confirmation.
 *
 * Both call sites (ReceiptConfirmButton and E3's OrdersList) used to write `orders` straight from the browser. They
 * now call confirmReceiptAction (Zod, buyer ownership, then the trigger). These tests pin that each site calls the
 * action with ONLY the order id, and keeps its own success / refusal UI. The payload the action writes (status only,
 * never `received_at` — the database stamps it) is pinned in confirm-receipt-action.test.ts.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import type { MyServiceOrder } from '@/lib/marche/my-orders'

const h = vi.hoisted(() => ({
  calls: [] as unknown[],
  result: { ok: true } as { ok: true } | { ok: false; error: string },
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/app/actions/orders', () => ({
  confirmReceiptAction: async (input: unknown) => {
    h.calls.push(input)
    return h.result
  },
}))
// OrdersList still reads the seller's phone through the browser client (an RPC read, not a write).
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ rpc: vi.fn(async () => ({ data: null, error: null })) }),
}))

import { ReceiptConfirmButton } from '@/components/ReceiptConfirmButton'
import { OrdersList } from '@/app/mes-commandes/_components/OrdersList'

afterEach(() => {
  cleanup()
  h.calls = []
  h.result = { ok: true }
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
  it('calls confirmReceiptAction with only the order id (no browser-side write)', async () => {
    const user = userEvent.setup()
    render(
      <LangProvider lang="fr">
        <ReceiptConfirmButton orderId={ORDER_ID} />
      </LangProvider>,
    )
    await user.click(screen.getByRole('button', { name: CONFIRM }))
    await waitFor(() => expect(h.calls).toHaveLength(1))
    expect(h.calls[0]).toEqual({ orderId: ORDER_ID })
  })

  it('a refusal is surfaced with its own message, not swallowed', async () => {
    const user = userEvent.setup()
    h.result = { ok: false, error: t('common.error_generic', 'fr') }
    render(
      <LangProvider lang="fr">
        <ReceiptConfirmButton orderId={ORDER_ID} />
      </LangProvider>,
    )
    await user.click(screen.getByRole('button', { name: CONFIRM }))
    expect(await screen.findByText(t('common.receipt_confirm_error', 'fr'))).toBeInTheDocument()
    expect(h.calls).toEqual([{ orderId: ORDER_ID }])
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

  it('calls confirmReceiptAction with only the order id (no browser-side write)', async () => {
    const user = await open()
    await user.click(await screen.findByRole('button', { name: CONFIRM }))
    await waitFor(() => expect(h.calls).toHaveLength(1))
    expect(h.calls[0]).toEqual({ orderId: ORDER_ID })
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

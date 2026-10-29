/**
 * @vitest-environment jsdom
 *
 * E3 Produits tab — the list, its pills across the full 8-status lifecycle, the buyer's actions, and the tab links.
 * Mock-only: nothing here touches the database. The Produits call site confirms receipt through confirmReceiptAction
 * with only the order id (audit pass 2); the action's payload (status only, never received_at) is pinned in
 * confirm-receipt-action.test.ts.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import type { MyProductOrder } from '@/lib/marche/my-orders'
import { PRODUCT_STATUSES } from '@/lib/marche/my-orders-params'

const h = vi.hoisted(() => ({ receipts: [] as unknown[] }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement('img', { src, alt }),
}))
vi.mock('@/app/actions/orders', () => ({
  cancelOrderAction: vi.fn(),
  confirmReceiptAction: async (input: unknown) => {
    h.receipts.push(input)
    return { ok: true }
  },
}))
// OrdersList still reads the seller's phone through the browser client (an RPC read, not a write).
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc: vi.fn() }) }))

import { ProductOrdersList } from './ProductOrdersList'
import { OrdersList } from './OrdersList'
import { OrdersTabs } from './OrdersTabs'

afterEach(() => {
  cleanup()
  h.receipts = []
})

const ID = '3cf896e1-0000-4000-8000-000000000000'
const order = (over: Partial<MyProductOrder> = {}): MyProductOrder => ({
  id: ID,
  status: 'arrived',
  createdAt: '2026-10-20T10:00:00Z',
  receivedAt: null,
  cancelledBy: null,
  cancellationReason: null,
  title: 'Casque Bluetooth Sony',
  imageUrl: null,
  shopName: 'ElectroPro',
  quantity: 1,
  total: 320,
  sellerId: 'shop-owner',
  ...over,
})

function renderList(orders: MyProductOrder[], lang: 'fr' | 'ar' = 'fr') {
  return render(
    <LangProvider lang={lang}>
      <ProductOrdersList orders={orders} />
    </LangProvider>,
  )
}

describe('ProductOrdersList — header', () => {
  it('shows title, shop, total, status pill (product noun: « Arrivée ») and the shipped short reference', async () => {
    const user = userEvent.setup()
    renderList([order()])
    const header = screen.getByRole('button', { name: /Casque Bluetooth Sony/ })
    expect(header).toHaveTextContent('ElectroPro')
    expect(header).toHaveTextContent('320 TND')
    expect(header).toHaveTextContent(t('common.status_arrived', 'fr'))
    await user.click(header)
    // one « # » only: shortRef already carries it and the key no longer adds a second
    expect(screen.getByText(/Commande #3CF896 · Passée le/)).toBeInTheDocument()
  })

  it.each(PRODUCT_STATUSES)('renders a pill for status %s (none of the 8 stages is blank)', (status) => {
    renderList([order({ status })])
    const header = screen.getByRole('button', { name: /Casque Bluetooth Sony/ })
    const key = status === 'arrived' ? 'common.status_arrived' : `common.status_${status}`
    expect(header).toHaveTextContent(t(key, 'fr'))
    expect(header).not.toHaveTextContent('common.status_')
  })

  it('uses the product image when there is one and a glyph when there is none', () => {
    const { container, rerender } = renderList([order({ imageUrl: 'https://x/1.webp' })])
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://x/1.webp')
    rerender(
      <LangProvider lang="fr">
        <ProductOrdersList orders={[order({ imageUrl: null })]} />
      </LangProvider>,
    )
    expect(container.querySelector('img')).toBeNull()
  })

  it('a removed product still renders (placeholder title, no shop line) instead of vanishing', () => {
    renderList([order({ title: null, shopName: null, total: null })])
    expect(screen.getByRole('button', { name: new RegExp(t('mesCommandes.untitled.product', 'fr')) })).toBeInTheDocument()
  })
})

describe('ProductOrdersList — body', () => {
  async function open(o: MyProductOrder, lang: 'fr' | 'ar' = 'fr') {
    const user = userEvent.setup()
    renderList([o], lang)
    await user.click(screen.getByRole('button', { name: /Casque Bluetooth Sony/ }))
    return user
  }

  it('walks the full 7-step product rail, current stage included', async () => {
    await open(order({ status: 'dispatched' }))
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(7)
    for (const key of ['pending', 'accepted', 'prepared', 'dispatched', 'in_delivery', 'arrived', 'received']) {
      expect(screen.getAllByText(t(`common.status_${key}`, 'fr')).length).toBeGreaterThan(0)
    }
  })

  it('a cancelled order drops the rail and says who cancelled and why', async () => {
    await open(order({ status: 'cancelled', cancelledBy: 'seller', cancellationReason: 'Produit en rupture de stock' }))
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.getByText(t('mesCommandes.cancelledBy', 'fr', { who: t('mesCommandes.cancelled.shop', 'fr') }))).toBeInTheDocument()
    expect(screen.getByText('Produit en rupture de stock')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('seller.orderDetail.cancel_link', 'fr') })).not.toBeInTheDocument()
  })

  it('« Confirmer la réception » only from arrived, through confirmReceiptAction with only the order id', async () => {
    const confirm = t('common.confirm_receipt_action', 'fr')
    const user = await open(order({ status: 'arrived' }))
    await user.click(await screen.findByRole('button', { name: confirm }))
    await waitFor(() => expect(h.receipts).toHaveLength(1))
    expect(h.receipts[0]).toEqual({ orderId: ID })

    cleanup()
    await open(order({ status: 'in_delivery' }))
    expect(screen.queryByRole('button', { name: confirm })).not.toBeInTheDocument()
  })

  it.each([
    ['pending', true],
    ['accepted', true],
    ['prepared', true],
    ['dispatched', true],
    ['in_delivery', true],
    ['arrived', true],
    ['received', false],
    ['cancelled', false],
  ] as const)('« Annuler la commande » while status is %s → %s (mirrors the DB: any non-terminal state)', async (status, shown) => {
    await open(order({ status, cancelledBy: status === 'cancelled' ? 'buyer' : null }))
    const link = screen.queryByRole('button', { name: t('seller.orderDetail.cancel_link', 'fr') })
    if (shown) expect(link).toBeInTheDocument()
    else expect(link).not.toBeInTheDocument()
  })

  it('the cancel dialog offers the BUYER reasons, not the shop owner ones', async () => {
    const user = await open(order({ status: 'pending' }))
    await user.click(screen.getByRole('button', { name: t('seller.orderDetail.cancel_link', 'fr') }))
    expect(screen.getByText(t('common.cancel_reason_buyer_changed_mind', 'fr'))).toBeInTheDocument()
    expect(screen.queryByText(t('common.cancel_reason_seller_out_of_stock', 'fr'))).not.toBeInTheDocument()
    expect(screen.getByText(t('mesCommandes.cancel.body', 'fr'))).toBeInTheDocument()
  })

  it('has the WhatsApp contact for the shop', async () => {
    await open(order({ status: 'accepted' }))
    expect(screen.getByRole('button', { name: t('mesCommandes.whatsapp', 'fr') })).toBeInTheDocument()
  })

  it('AR renders with translated labels and no raw key', async () => {
    await open(order({ status: 'in_delivery' }), 'ar')
    expect(document.body.textContent).not.toMatch(/\b(mesCommandes|common)\.[a-z_]+/)
  })
})

describe('reference line — one « # » on BOTH lists', () => {
  it('the Services row no longer prints « ##… »', async () => {
    const user = userEvent.setup()
    render(
      <LangProvider lang="fr">
        <OrdersList
          orders={[
            {
              id: ID,
              status: 'accepted',
              createdAt: '2026-10-20T10:00:00Z',
              receivedAt: null,
              cancelledBy: null,
              cancellationReason: null,
              title: 'Logo professionnel',
              category: null,
              startingPrice: 300,
              sellerId: 's',
              sellerName: 'Zina',
              sellerCity: null,
            },
          ]}
        />
      </LangProvider>,
    )
    await user.click(screen.getByRole('button', { name: /Logo professionnel/ }))
    expect(screen.getByText(/Commande #3CF896 · Passée le/)).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('##')
  })
})

describe('OrdersTabs', () => {
  it('both tabs are links to ?tab=, Produits first, the active one marked as the current page', () => {
    render(<OrdersTabs lang="fr" tab="services" />)
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual(['/mes-commandes?tab=produits', '/mes-commandes?tab=services'])
    expect(links[0]).not.toHaveAttribute('aria-current')
    expect(links[1]).toHaveAttribute('aria-current', 'page')
  })

  it('no « Bientôt » badge and nothing disabled any more', () => {
    render(<OrdersTabs lang="fr" tab="produits" />)
    expect(screen.queryByText(t('mesCommandes.tab.soon', 'fr'))).not.toBeInTheDocument()
    for (const l of screen.getAllByRole('link')) expect(l).not.toHaveAttribute('aria-disabled')
  })
})

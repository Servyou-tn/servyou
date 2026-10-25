/**
 * @vitest-environment jsdom
 *
 * H8 PR-2 — /mes-engagements/[id] (the server page), its guards and its service-only layout. Loader, session and
 * server actions mocked.
 *   • a malformed id is a 404 BEFORE the session is touched; an unknown / someone else's order (the loader
 *     returns null) and a PRODUCT order are the same 404;
 *   • the loader is asked with the caller's own id (seller scope);
 *   • the page shows the service, the buyer's stated budget and timeframe from the brief, the 4-stage rail, the
 *     history, and none of G9's shipping / delivery / COD panels;
 *   • the action rail per status; the cancel dialog carries the five service presets and revalidates this route.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import type { SellerOrderDetail } from '@/lib/marche/seller-order-detail'

const h = vi.hoisted(() => ({
  requireFreelancer: vi.fn(),
  getDetail: vi.fn(),
  lang: { value: 'fr' as 'fr' | 'ar' },
  advance: vi.fn(async (_i: unknown) => ({ ok: true })),
  cancel: vi.fn(async (_i: unknown) => ({ ok: true })),
}))

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/components/shell/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('@/lib/auth/require-seller', () => ({ requireFreelancer: h.requireFreelancer }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => h.lang.value }))
vi.mock('@/lib/marche/seller-order-detail', () => ({ getSellerOrderDetail: h.getDetail }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc: vi.fn() }) }))
vi.mock('@/app/actions/orders', () => ({
  advanceOrderAction: (i: unknown) => h.advance(i),
  cancelOrderAction: (i: unknown) => h.cancel(i),
}))

const { default: EngagementDetailPage } = await import('./page')

const ID = '11111111-1111-4111-8111-111111111111'
const USER = 'freelancer-user-1'

const ORDER: SellerOrderDetail = {
  id: ID,
  status: 'pending',
  orderType: 'service',
  createdAt: '2026-10-15T09:00:00Z',
  receivedAt: null,
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  quantity: 1,
  itemTitle: 'Création de logo professionnel',
  unitPrice: 300,
  unitPriceFrozen: 300,
  priceUnit: null,
  deliveryFee: null,
  carrier: null,
  trackingNumber: null,
  events: [{ eventType: 'created', fromStatus: null, toStatus: 'pending', actorRole: 'buyer', note: null, createdAt: '2026-10-15T09:00:00Z' }],
  buyerId: 'buyer-1',
  buyerName: 'Ahmed Ben Salah',
  buyerCity: 'Tunis',
  deliveryName: null,
  deliveryStreet: '',
  deliveryQuartier: null,
  deliveryVille: null,
  deliveryGovernorate: null,
  deliveryPhone: null,
  buyerNote: null,
  serviceBrief: { description: 'Je veux un logo moderne pour ma boutique.', timeframe: '2 semaines', budget: '400' },
}

async function renderPage(order: Partial<SellerOrderDetail> | null, lang: 'fr' | 'ar' = 'fr') {
  h.lang.value = lang
  h.getDetail.mockResolvedValue(order === null ? null : { ...ORDER, ...order })
  const ui = await EngagementDetailPage({ params: Promise.resolve({ id: ID }) })
  return render(<LangProvider lang={lang}>{ui}</LangProvider>)
}

beforeEach(() => {
  h.requireFreelancer.mockResolvedValue({ userId: USER, topBarUser: {}, freelancerProfile: { id: 'fp-1' } })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('guards — one 404', () => {
  it('rejects a malformed id before the session is touched', async () => {
    await expect(EngagementDetailPage({ params: Promise.resolve({ id: 'not-a-uuid' }) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(h.requireFreelancer).not.toHaveBeenCalled()
    expect(h.getDetail).not.toHaveBeenCalled()
  })

  it('asks the loader for the CALLER\'s order only (seller scope), in STRICT mode', async () => {
    await renderPage({})
    // strict: a failed query throws instead of reading as « not found »
    expect(h.getDetail).toHaveBeenCalledWith(ID, USER, true)
  })

  it('a failed query is an ERROR, not a 404', async () => {
    h.getDetail.mockRejectedValue(new Error('seller order fetch failed: timeout'))
    await expect(EngagementDetailPage({ params: Promise.resolve({ id: ID }) })).rejects.toThrow('seller order fetch failed')
  })

  it('an unknown or someone else\'s order (loader returns null) is a 404', async () => {
    h.getDetail.mockResolvedValue(null)
    await expect(EngagementDetailPage({ params: Promise.resolve({ id: ID }) })).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('a product order is a 404 too — this page is service-only', async () => {
    h.getDetail.mockResolvedValue({ ...ORDER, orderType: 'product' })
    await expect(EngagementDetailPage({ params: Promise.resolve({ id: ID }) })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})

describe('layout — a service, not a parcel', () => {
  it('shows the service, the buyer\'s own budget and timeframe, and the brief', async () => {
    await renderPage({})
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Engagement ⁦#/) // the ref is an LTR isolate (bidi)
    expect(screen.getByText('Création de logo professionnel')).toBeInTheDocument()
    expect(screen.getByText(/Prix de départ du service : 300 TND/)).toBeInTheDocument()
    expect(screen.getByText('Je veux un logo moderne pour ma boutique.')).toBeInTheDocument()
    expect(screen.getByText('400 TND')).toBeInTheDocument()
    expect(screen.getByText('2 semaines')).toBeInTheDocument()
    expect(screen.getByText('Budget indiqué par le client')).toBeInTheDocument()
  })

  it('keeps an hourly / monthly service\'s unit, so a rate does not read as a total', async () => {
    await renderPage({ unitPrice: 50, priceUnit: 'hour' })
    expect(screen.getByText(/Prix de départ du service : 50 TND \/ heure/)).toBeInTheDocument()
  })

  it('has none of G9\'s product panels: no shipping, delivery address, COD or price breakdown', async () => {
    await renderPage({})
    for (const key of [
      'seller.orderDetail.shipping',
      'seller.orderDetail.delivery',
      'seller.orderDetail.cod_note',
      'seller.orderDetail.price_total',
      'seller.orderDetail.tracking_label',
    ]) {
      expect(screen.queryByText(t(key, 'fr'))).not.toBeInTheDocument()
    }
  })

  it('walks the 4-stage SERVICE rail, not the 7-step product one', async () => {
    await renderPage({ status: 'arrived' })
    for (const label of ['En attente', 'Acceptée', 'Travail livré', 'Reçue']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    expect(screen.queryByText('Préparée')).not.toBeInTheDocument()
    expect(screen.queryByText('Expédiée')).not.toBeInTheDocument()
  })

  it('a request with no brief says so instead of rendering empty rows', async () => {
    await renderPage({ serviceBrief: null })
    expect(screen.getByText('Le client n\'a pas détaillé sa demande.')).toBeInTheDocument()
    expect(screen.queryByText('Budget indiqué par le client')).not.toBeInTheDocument()
  })

  it('shows « Non précisé » for a missing budget or timeframe', async () => {
    await renderPage({ serviceBrief: { description: 'Un logo.', timeframe: null, budget: null } })
    expect(screen.getAllByText('Non précisé')).toHaveLength(2)
  })

  it('never shows a heading over nothing: events that have no rendering (print) leave no Historique', async () => {
    await renderPage({
      events: [{ eventType: 'print', fromStatus: null, toStatus: null, actorRole: 'seller', note: null, createdAt: '2026-10-16T09:00:00Z' }],
    })
    expect(screen.queryByRole('heading', { name: 'Historique' })).not.toBeInTheDocument()
  })

  it('shows the history only when events exist', async () => {
    await renderPage({})
    expect(screen.getByRole('heading', { name: 'Historique' })).toBeInTheDocument()
    cleanup()
    await renderPage({ events: [] })
    expect(screen.queryByRole('heading', { name: 'Historique' })).not.toBeInTheDocument()
  })

  it('dates a finished order from the receipt event when the column is empty', async () => {
    await renderPage({
      status: 'received',
      receivedAt: null,
      events: [
        { eventType: 'created', fromStatus: null, toStatus: 'pending', actorRole: 'buyer', note: null, createdAt: '2026-10-15T09:00:00Z' },
        { eventType: 'status_change', fromStatus: 'arrived', toStatus: 'received', actorRole: 'buyer', note: null, createdAt: '2026-10-20T10:00:00Z' },
      ],
    })
    expect(screen.getByText(/^Terminé le /)).toBeInTheDocument()
  })
})

describe('the action rail', () => {
  it('pending: « Accepter » (advance, revalidating this route) and the cancel link', async () => {
    const user = userEvent.setup()
    await renderPage({ status: 'pending' })
    await user.click(screen.getByRole('button', { name: 'Accepter' }))
    expect(h.advance).toHaveBeenCalledWith({ orderId: ID, revalidate: '/mes-engagements' })
    expect(screen.getByText(/Confirmez la demande avec le client sur WhatsApp/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler la commande' })).toBeInTheDocument()
  })

  it('accepted: « Marquer livré »', async () => {
    await renderPage({ status: 'accepted' })
    expect(screen.getByRole('button', { name: 'Marquer livré' })).toBeInTheDocument()
  })

  it('arrived: no button — it waits on the buyer — but the order can still be cancelled', async () => {
    await renderPage({ status: 'arrived' })
    expect(screen.queryByRole('button', { name: 'Marquer livré' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accepter' })).not.toBeInTheDocument()
    expect(screen.getByText('En attente de confirmation acheteur')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Annuler la commande' })).toBeInTheDocument()
  })

  it.each(['received', 'cancelled'] as const)('%s: no action at all', async (status) => {
    await renderPage({ status })
    expect(screen.queryByRole('button', { name: 'Accepter' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marquer livré' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Annuler la commande' })).not.toBeInTheDocument()
  })

  it('the cancel dialog carries the five SERVICE presets and revalidates /mes-engagements', async () => {
    const user = userEvent.setup()
    await renderPage({ status: 'accepted' })
    await user.click(screen.getByRole('button', { name: 'Annuler la commande' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByRole('radio')).toHaveLength(5)
    expect(within(dialog).getByLabelText('La demande est hors de mon périmètre')).toBeInTheDocument()
    expect(within(dialog).queryByLabelText('Produit en rupture de stock')).not.toBeInTheDocument()
    await user.click(within(dialog).getByLabelText('Budget ou délai incompatibles'))
    await user.click(within(dialog).getByRole('button', { name: "Confirmer l'annulation" }))
    expect(h.cancel).toHaveBeenCalledWith({
      orderId: ID,
      reason: 'Budget ou délai incompatibles',
      revalidate: '/mes-engagements',
    })
  })

  it('shows a cancelled order\'s reason ONCE — in the rail when no history event carries it', async () => {
    await renderPage({ status: 'cancelled', cancelledAt: '2026-10-18T10:00:00Z', cancellationReason: 'Client injoignable', events: [] })
    expect(screen.getAllByText('Motif : Client injoignable')).toHaveLength(1)
  })

  it('…and once in the history, not repeated in the rail, when the cancellation event carries it', async () => {
    await renderPage({
      status: 'cancelled',
      cancelledAt: '2026-10-18T10:00:00Z',
      cancellationReason: 'Client injoignable',
      events: [
        { eventType: 'created', fromStatus: null, toStatus: 'pending', actorRole: 'buyer', note: null, createdAt: '2026-10-15T09:00:00Z' },
        { eventType: 'status_change', fromStatus: 'pending', toStatus: 'cancelled', actorRole: 'seller', note: 'Client injoignable', createdAt: '2026-10-18T10:00:00Z' },
      ],
    })
    expect(screen.getAllByText('Motif : Client injoignable')).toHaveLength(1)
  })
})

describe('Arabic', () => {
  it('renders the page in Arabic', async () => {
    await renderPage({ status: 'pending' }, 'ar')
    expect(screen.getByRole('button', { name: t('engagements.advance.accepted', 'ar') })).toBeInTheDocument()
    expect(screen.getByText(t('engagements.detail.request_panel', 'ar'))).toBeInTheDocument()
    expect(screen.getByText(t('engagements.detail.hint_pending', 'ar'))).toBeInTheDocument()
  })
})

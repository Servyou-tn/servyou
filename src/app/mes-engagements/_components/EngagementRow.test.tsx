/**
 * @vitest-environment jsdom
 *
 * H8 — EngagementRow (the row + its actions cell), server actions and the WhatsApp reveal mocked:
 *   • the next control per status — « Accepter » (pending), « Marquer livré » (accepted), « Voir » otherwise —
 *     and the advance call it makes (id + /mes-engagements only: the TARGET is derived server-side);
 *   • « Dès X TND » (ruling D3), the client type, the requested-timeframe cell (D4) and the terminal notes;
 *   • the kebab: « Voir le détail », and « Annuler » only while the order can still be cancelled (D10), which
 *     opens the dialog with the 5 SERVICE presets — not the shop owner's;
 *   • the same row in Arabic.
 *
 * Run: npx vitest run src/app/mes-engagements/_components/EngagementRow.test.tsx
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LangProvider } from '@/components/LangProvider'
import { t, type Lang } from '@/lib/i18n'
import type { Engagement } from '@/lib/marche/engagements'

const advanceMock = vi.fn(async (_input: unknown) => ({ ok: true }))
const cancelMock = vi.fn(async (_input: unknown) => ({ ok: true }))
const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: refreshMock }) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc: vi.fn() }) }))
vi.mock('@/app/actions/orders', () => ({
  advanceOrderAction: (input: unknown) => advanceMock(input),
  cancelOrderAction: (input: unknown) => cancelMock(input),
}))

const { EngagementRow } = await import('./EngagementRow')

afterEach(() => {
  cleanup()
  advanceMock.mockClear()
  cancelMock.mockClear()
  refreshMock.mockClear()
})

const BASE: Engagement = {
  id: '11111111-1111-4111-8111-111111111111',
  status: 'pending',
  title: 'Création de logo professionnel',
  categorySlug: 'design-graphique-logo',
  clientId: 'client-1',
  clientName: 'Ahmed Ben Salah',
  clientCity: 'Tunis',
  clientAvatarUrl: null,
  clientType: 'consumer',
  createdAt: '2026-10-15T09:00:00Z',
  receivedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  startingPrice: 300,
  priceUnit: null,
  requestedTimeframe: null,
}

function renderRow(over: Partial<Engagement> = {}, lang: Lang = 'fr') {
  return render(
    <LangProvider lang={lang}>
      <ul>
        <EngagementRow engagement={{ ...BASE, ...over }} lang={lang} />
      </ul>
    </LangProvider>,
  )
}

const kebab = (title = BASE.title, lang: Lang = 'fr') =>
  screen.getByRole('button', { name: t('engagements.row_actions_aria', lang, { title }) })

describe('EngagementRow — the next control per status', () => {
  it('pending: « Accepter » advances the order, naming only the id and the page to refresh', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'pending' })
    expect(screen.queryByRole('link', { name: 'Voir' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Accepter' }))
    await waitFor(() => expect(advanceMock).toHaveBeenCalledTimes(1))
    expect(advanceMock).toHaveBeenCalledWith({ orderId: BASE.id, revalidate: '/mes-engagements' })
    await waitFor(() => expect(refreshMock).toHaveBeenCalled())
  })

  it('accepted: « Marquer livré »', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'accepted' })
    await user.click(screen.getByRole('button', { name: 'Marquer livré' }))
    await waitFor(() => expect(advanceMock).toHaveBeenCalledWith({ orderId: BASE.id, revalidate: '/mes-engagements' }))
  })

  it.each(['arrived', 'received', 'cancelled'] as const)('%s: a « Voir » link to the detail, and no advance button', (status) => {
    renderRow({ status })
    expect(screen.getByRole('link', { name: 'Voir' })).toHaveAttribute('href', `/mes-engagements/${BASE.id}`)
    expect(screen.queryByRole('button', { name: 'Accepter' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Marquer livré' })).not.toBeInTheDocument()
  })

  it('always offers the WhatsApp icon button, named for assistive tech', () => {
    renderRow({ status: 'received' })
    expect(screen.getByRole('button', { name: t('engagements.whatsapp_aria', 'fr') })).toBeInTheDocument()
  })
})

describe('EngagementRow — what the cells say', () => {
  it('prices from the snapshot as « Dès X TND » (D3) and says nothing when there is no snapshot', () => {
    renderRow({ startingPrice: 3500 })
    expect(screen.getByText(/^Dès 3[\s  ]500 TND$/)).toBeInTheDocument()
    cleanup()
    renderRow({ startingPrice: null })
    expect(screen.queryByText(/^Dès/)).not.toBeInTheDocument()
  })

  it('keeps an hourly / daily / monthly listing\'s unit, so a rate does not read as a total', () => {
    renderRow({ startingPrice: 50, priceUnit: 'hour' })
    expect(screen.getByText('Dès 50 TND / heure')).toBeInTheDocument()
    cleanup()
    renderRow({ startingPrice: 450, priceUnit: 'month' })
    expect(screen.getByText('Dès 450 TND / mois')).toBeInTheDocument()
    cleanup()
    renderRow({ startingPrice: 450, priceUnit: 'fixed' })
    expect(screen.getByText('Dès 450 TND')).toBeInTheDocument()
  })

  it('labels the client: Consommateur / Boutique / Freelance', () => {
    renderRow({ clientType: 'consumer' })
    expect(screen.getByText('Consommateur')).toBeInTheDocument()
    cleanup()
    renderRow({ clientType: 'shop' })
    expect(screen.getByText('Boutique')).toBeInTheDocument()
    cleanup()
    renderRow({ clientType: 'freelancer' })
    expect(screen.getByText('Freelance')).toBeInTheDocument()
  })

  it('names an unnamed client « Client »', () => {
    renderRow({ clientName: '' })
    expect(screen.getByText('Client')).toBeInTheDocument()
  })

  it('shows the category label and the service title', () => {
    renderRow()
    expect(screen.getByText('Création de logo professionnel')).toBeInTheDocument()
    expect(screen.getByText('Design graphique & logo')).toBeInTheDocument()
  })

  it('a request still moving shows « Demandée le … » over what the buyer asked for (D4)', () => {
    renderRow({ status: 'pending', requestedTimeframe: '2 semaines' })
    expect(screen.getByText(/^Demandée le /)).toBeInTheDocument()
    expect(screen.getByText('2 semaines')).toBeInTheDocument()
    cleanup()
    renderRow({ status: 'accepted', requestedTimeframe: null })
    expect(screen.getByText('Non précisé')).toBeInTheDocument()
  })

  it('terminal and waiting rows keep the frame\'s single note', () => {
    renderRow({ status: 'arrived' })
    expect(screen.getByText('en attente de confirmation')).toBeInTheDocument()
    cleanup()
    renderRow({ status: 'received', receivedAt: '2026-10-20T10:00:00Z' })
    expect(screen.getByText(/^terminé le /)).toBeInTheDocument()
    cleanup()
    renderRow({ status: 'cancelled', cancelledAt: '2026-10-18T10:00:00Z', cancellationReason: 'Client injoignable' })
    expect(screen.getByText(/^annulé le /)).toBeInTheDocument()
    expect(screen.getByText('Client injoignable')).toBeInTheDocument()
  })

  it('uses the shipped pill labels (D2): « Travail livré » for arrived, not a new word', () => {
    renderRow({ status: 'arrived' })
    expect(screen.getAllByText('Travail livré').length).toBeGreaterThan(0) // the pill is in the DOM twice: one per breakpoint layout
  })
})

describe('EngagementRow — the kebab (D10)', () => {
  it('holds « Voir le détail » and « Annuler » while the order is open', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'accepted' })
    await user.click(kebab())
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'Voir le détail' })).toHaveAttribute('href', `/mes-engagements/${BASE.id}`)
    expect(within(menu).getByRole('menuitem', { name: 'Annuler' })).toBeInTheDocument()
  })

  it.each(['received', 'cancelled'] as const)('%s: « Annuler » is not offered', async (status) => {
    const user = userEvent.setup()
    renderRow({ status })
    await user.click(kebab())
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'Voir le détail' })).toBeInTheDocument()
    expect(within(menu).queryByRole('menuitem', { name: 'Annuler' })).not.toBeInTheDocument()
  })

  it('« Annuler » opens the dialog with the five SERVICE presets, and a reason is sent through the server action', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'accepted' })
    await user.click(kebab())
    await user.click(await screen.findByRole('menuitem', { name: 'Annuler' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getAllByRole('radio')).toHaveLength(5)
    expect(within(dialog).getByLabelText('Je ne suis pas disponible sur cette période')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('La demande est hors de mon périmètre')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Budget ou délai incompatibles')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Client injoignable')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Autre raison')).toBeInTheDocument()
    // none of the shop owner's product reasons
    expect(within(dialog).queryByLabelText('Produit en rupture de stock')).not.toBeInTheDocument()

    // accepted is past the pivot: a reason is required before the confirm button works
    const confirm = within(dialog).getByRole('button', { name: "Confirmer l'annulation" })
    expect(confirm).toBeDisabled()
    await user.click(within(dialog).getByLabelText('Budget ou délai incompatibles'))
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    await waitFor(() => expect(cancelMock).toHaveBeenCalledTimes(1))
    expect(cancelMock).toHaveBeenCalledWith({
      orderId: BASE.id,
      reason: 'Budget ou délai incompatibles',
      revalidate: '/mes-engagements',
    })
  })

  it('a pending request can be refused without a reason', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'pending' })
    await user.click(kebab())
    await user.click(await screen.findByRole('menuitem', { name: 'Annuler' }))
    const dialog = await screen.findByRole('dialog')
    const confirm = within(dialog).getByRole('button', { name: "Confirmer l'annulation" })
    expect(confirm).toBeEnabled()
    await user.click(confirm)
    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith({ orderId: BASE.id, reason: undefined, revalidate: '/mes-engagements' }))
  })

  it('« Garder la commande » closes the dialog without writing', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'pending' })
    await user.click(kebab())
    await user.click(await screen.findByRole('menuitem', { name: 'Annuler' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Garder la commande' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(cancelMock).not.toHaveBeenCalled()
  })
})

describe('EngagementRow — Arabic', () => {
  it('renders the controls and cells in Arabic', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'pending', startingPrice: 300, clientType: 'shop', requestedTimeframe: 'أسبوعان' }, 'ar')
    expect(screen.getByRole('button', { name: t('engagements.advance.accepted', 'ar') })).toBeInTheDocument()
    expect(screen.getByText(t('engagements.client_type.shop', 'ar'))).toBeInTheDocument()
    expect(screen.getByText(/^ابتداء من /)).toBeInTheDocument()
    expect(screen.getByText('أسبوعان')).toBeInTheDocument()

    await user.click(kebab(BASE.title, 'ar'))
    await user.click(await screen.findByRole('menuitem', { name: t('engagements.cancel', 'ar') }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText(t('common.cancel_reason_freelancer_out_of_scope', 'ar'))).toBeInTheDocument()
  })
})

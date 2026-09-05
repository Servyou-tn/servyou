/**
 * @vitest-environment jsdom
 *
 * Behavior-level tests for ServiceRow — the founder's verification list (PR body):
 *   - all three StatusPill states render (Actif / Mis en pause / Masqué par la modération)
 *   - the is_published cascade modal fires only when the row is the freelancer's LAST active
 *     listing, never on an ordinary pause
 *   - the moderation toggle is disabled, and the blocked write is never attempted (the mocked
 *     action must not be called at all when the item is disabled)
 *   - the delete kebab item is disabled when the service has orders, same "never attempted" bar
 *
 * The is_published TRIGGER cascade itself (does pausing the last active row really flip
 * freelancer_profiles.is_published) is proven separately, live, in
 * src/__tests__/h5-service-status-cascade.test.ts — this file only proves the UI's OWN decision of
 * when to show the warning, using a mocked action.
 *
 * Run: npx vitest run src/app/mes-services/_components/ServiceRow.test.tsx
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LangProvider } from '@/components/LangProvider'
import type { SellerServiceRow } from '@/lib/marche/seller-services'

const toggleMock = vi.fn(async (_input: unknown) => ({ ok: true }))
const deleteMock = vi.fn(async (_input: unknown) => ({ ok: true }))
const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: refreshMock }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/app/actions/services', () => ({
  toggleServiceStatusAction: (input: unknown) => toggleMock(input),
  deleteServiceAction: (input: unknown) => deleteMock(input),
}))

const { ServiceRow } = await import('./ServiceRow')

afterEach(() => {
  cleanup()
  toggleMock.mockClear()
  deleteMock.mockClear()
  refreshMock.mockClear()
})

const BASE: SellerServiceRow = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Création de logo professionnel',
  description: 'Logo vectoriel et déclinaisons pour votre marque',
  priceTnd: 300,
  status: 'active',
  adminHiddenAt: null,
  ordersCount: 5,
  hasOrders: true,
  isLastActive: false,
}

function renderRow(overrides: Partial<SellerServiceRow> = {}) {
  return render(
    <LangProvider lang="fr">
      <ul>
        <ServiceRow service={{ ...BASE, ...overrides }} lang="fr" />
      </ul>
    </LangProvider>,
  )
}

async function openKebab(user: ReturnType<typeof userEvent.setup>, title: string) {
  const trigger = screen.getByRole('button', { name: `Actions pour ${title}` })
  await user.click(trigger)
  return screen.findByRole('menu')
}

describe('ServiceRow — StatusPill, all three states', () => {
  it('active row reads "Actif"', () => {
    renderRow({ status: 'active', adminHiddenAt: null })
    expect(screen.getByText('Actif')).toBeInTheDocument()
  })

  it('self-paused row (hidden, no admin_hidden_at) reads "Mis en pause"', () => {
    renderRow({ status: 'hidden', adminHiddenAt: null })
    expect(screen.getByText('Mis en pause')).toBeInTheDocument()
    expect(screen.queryByText('Masqué par la modération')).not.toBeInTheDocument()
  })

  it('admin-moderated row (hidden, admin_hidden_at set) reads "Masqué par la modération"', () => {
    renderRow({ status: 'hidden', adminHiddenAt: '2026-09-05T00:00:00Z' })
    expect(screen.getByText('Masqué par la modération')).toBeInTheDocument()
    expect(screen.queryByText('Mis en pause')).not.toBeInTheDocument()
  })
})

describe('ServiceRow — the is_published cascade modal fires only on the LAST active listing', () => {
  it('pausing an active row that is NOT the last active one calls the toggle directly — no modal', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'active', isLastActive: false, title: 'Not last' })
    const menu = await openKebab(user, 'Not last')
    await user.click(within(menu).getByRole('menuitem', { name: 'Mettre en pause' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(toggleMock).toHaveBeenCalledWith({ serviceId: BASE.id, nextStatus: 'hidden' })
  })

  it('pausing the LAST active row shows the cascade warning FIRST — the action is not called yet', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'active', isLastActive: true, title: 'Last one' })
    const menu = await openKebab(user, 'Last one')
    await user.click(within(menu).getByRole('menuitem', { name: 'Mettre en pause' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Votre profil deviendra invisible')).toBeInTheDocument()
    expect(within(dialog).getByText(/dernier service actif/)).toBeInTheDocument()
    expect(toggleMock).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Mettre en pause quand même' }))
    expect(toggleMock).toHaveBeenCalledWith({ serviceId: BASE.id, nextStatus: 'hidden' })
  })

  it('cancelling the cascade warning never calls the toggle', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'active', isLastActive: true, title: 'Cancel me' })
    const menu = await openKebab(user, 'Cancel me')
    await user.click(within(menu).getByRole('menuitem', { name: 'Mettre en pause' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(toggleMock).not.toHaveBeenCalled()
  })
})

describe('ServiceRow — moderation lock: the blocked write is never attempted', () => {
  it('"Activer" is disabled on a moderated row, and clicking it does not call the action', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'hidden', adminHiddenAt: '2026-09-05T00:00:00Z', title: 'Moderated' })
    const menu = await openKebab(user, 'Moderated')
    const activate = within(menu).getByRole('menuitem', { name: 'Activer' })
    expect(activate).toHaveAttribute('aria-disabled', 'true')

    await user.click(activate)
    expect(toggleMock).not.toHaveBeenCalled()
  })

  it('a self-paused (non-moderated) row keeps "Activer" enabled and calls the toggle', async () => {
    const user = userEvent.setup()
    renderRow({ status: 'hidden', adminHiddenAt: null, title: 'Just paused' })
    const menu = await openKebab(user, 'Just paused')
    await user.click(within(menu).getByRole('menuitem', { name: 'Activer' }))
    expect(toggleMock).toHaveBeenCalledWith({ serviceId: BASE.id, nextStatus: 'active' })
  })
})

describe('ServiceRow — delete kebab item, disabled when the service has orders', () => {
  it('"Supprimer" is disabled when hasOrders is true, and no delete modal opens', async () => {
    const user = userEvent.setup()
    renderRow({ hasOrders: true, title: 'Has orders' })
    const menu = await openKebab(user, 'Has orders')
    const del = within(menu).getByRole('menuitem', { name: 'Supprimer' })
    expect(del).toHaveAttribute('aria-disabled', 'true')

    await user.click(del)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('a zero-order service opens the typed-confirm delete modal', async () => {
    const user = userEvent.setup()
    renderRow({ hasOrders: false, isLastActive: false, title: 'No orders' })
    const menu = await openKebab(user, 'No orders')
    await user.click(within(menu).getByRole('menuitem', { name: 'Supprimer' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Supprimer ce service ?')).toBeInTheDocument()
  })
})

describe('ServiceRow — "Modifier" is permanently disabled (H6/H7 do not exist in code)', () => {
  it('the kebab\'s Modifier item is disabled with a tooltip, regardless of row state', async () => {
    const user = userEvent.setup()
    renderRow({ title: 'Edit target' })
    const menu = await openKebab(user, 'Edit target')
    const edit = within(menu).getByRole('menuitem', { name: 'Modifier' })
    expect(edit).toHaveAttribute('aria-disabled', 'true')
    expect(edit).toHaveAttribute('title', 'Bientôt disponible')
  })
})

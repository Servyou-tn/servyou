/**
 * G4 — seller dashboard: the transition map, the write path's guards, and the shop_owner IA.
 *
 * WHY THESE THREE. G4 is the first surface that can MOVE an order, so the risk is not layout:
 *   1. `nextSellerStatus` (now in @/lib/types/order-status, consolidated in G8) is the UI's copy
 *      of `check_order_status_transition`. If it drifts, the
 *      dashboard offers a button the database will refuse — the failure is invisible until a
 *      seller clicks it. The cases below are transcribed from the live trigger body.
 *   2. `advanceOrderAction` is the first seller write path and the pattern the other nine G pages
 *      will copy, so its auth/ownership/validation guards are pinned here.
 *   3. `sidebarSectionsForRole` previously fell shop_owner through to the consumer IA; that is
 *      exactly the kind of silent regression a one-line edit reintroduces.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextSellerStatus } from '@/lib/types/order-status'
import { sidebarSectionsForRole } from '@/components/shell/sidebar-items'
import { roleWorkspacePath } from '@/lib/roles'

// ── 1. Transition map vs check_order_status_transition ────────────────────────────────────

describe('nextSellerStatus — product chain', () => {
  // The trigger allows exactly these adjacent hops for order_type='product'.
  it.each([
    ['pending', 'accepted'],
    ['accepted', 'prepared'],
    ['prepared', 'dispatched'],
    ['dispatched', 'in_delivery'],
    ['in_delivery', 'arrived'],
  ])('advances %s -> %s', (from, to) => {
    expect(nextSellerStatus(from as never, 'product')).toBe(to)
  })

  it('stops at arrived — `received` is BUYER-only in the trigger', () => {
    expect(nextSellerStatus('arrived', 'product')).toBeNull()
  })

  it.each(['received', 'cancelled'])('offers nothing from the terminal state %s', (s) => {
    expect(nextSellerStatus(s as never, 'product')).toBeNull()
  })
})

describe('nextSellerStatus — service chain', () => {
  // A service order skips the logistics hops entirely: pending -> accepted -> arrived.
  it.each([
    ['pending', 'accepted'],
    ['accepted', 'arrived'],
  ])('advances %s -> %s', (from, to) => {
    expect(nextSellerStatus(from as never, 'service')).toBe(to)
  })

  it('stops at arrived — `received` is BUYER-only', () => {
    expect(nextSellerStatus('arrived', 'service')).toBeNull()
  })

  it.each(['prepared', 'dispatched', 'in_delivery'])(
    'never offers the product-only hop %s for a service',
    (s) => {
      expect(nextSellerStatus(s as never, 'service')).toBeNull()
    },
  )
})

// ── 3. shop_owner IA ──────────────────────────────────────────────────────────────────────

describe('sidebarSectionsForRole', () => {
  it('gives shop_owner its own activities section, not the consumer fallback', () => {
    const shop = sidebarSectionsForRole('shop_owner')
    const consumer = sidebarSectionsForRole('consumer')
    expect(shop.length).toBeGreaterThan(consumer.length)
    expect(shop[0].labelKey).toBe('shell.sidebar.section.activities')
    expect(shop[0].items.map((i) => i.href)).toEqual([
      '/tableau-de-bord-vendeur',
      '/mes-produits',
      '/commandes-recues',
    ])
  })

  it('marks only the unbuilt shop pages disabled, so the nav never links to a 404', () => {
    const [activities] = sidebarSectionsForRole('shop_owner')
    const byHref = Object.fromEntries(activities.items.map((i) => [i.href, Boolean(i.disabled)]))
    expect(byHref['/tableau-de-bord-vendeur']).toBe(false)
    // Enabled in G8 — the page now exists. Mes produits stays disabled until G5.
    expect(byHref['/commandes-recues']).toBe(false)
    expect(byHref['/mes-produits']).toBe(true)
  })

  it('leaves the freelancer and consumer IAs untouched', () => {
    expect(sidebarSectionsForRole('freelancer')[0].items[0].href).toBe('/tableau-de-bord')
    expect(sidebarSectionsForRole('consumer')[0].labelKey).toBe('shell.sidebar.section.discover')
  })
})

describe('roleWorkspacePath', () => {
  it('lands a shop owner on the dashboard that exists, not the /ma-boutique 404', () => {
    expect(roleWorkspacePath('shop_owner')).toBe('/tableau-de-bord-vendeur')
  })
})

// ── 2. advanceOrderAction guards ──────────────────────────────────────────────────────────

const state = {
  user: null as { id: string } | null,
  order: null as { id: string; seller_id: string; status: string; order_type: string } | null,
  readError: null as { message: string; code?: string; details?: string } | null,
  updateError: null as { message: string; code?: string } | null,
  updates: [] as { status: string }[],
}

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => {
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = () => q
      q.maybeSingle = async () => ({ data: state.order, error: state.readError })
      q.update = (patch: { status: string }) => {
        state.updates.push(patch)
        return { eq: async () => ({ error: state.updateError }) }
      }
      return q
    },
  }),
}))

const OWNER = 'owner-1'
const ORDER = { id: '11111111-1111-4111-8111-111111111111', seller_id: OWNER, status: 'pending', order_type: 'product' }

beforeEach(() => {
  state.user = { id: OWNER }
  state.order = { ...ORDER }
  state.readError = null
  state.updateError = null
  state.updates = []
})

describe('advanceOrderAction', () => {
  it('advances the order by exactly one hop, derived server-side', async () => {
    const { advanceOrderAction } = await import('@/app/actions/orders')
    const res = await advanceOrderAction({ orderId: ORDER.id })
    expect(res.ok).toBe(true)
    expect(state.updates).toEqual([{ status: 'accepted' }])
  })

  it('rejects a non-uuid orderId before touching the database', async () => {
    const { advanceOrderAction } = await import('@/app/actions/orders')
    const res = await advanceOrderAction({ orderId: 'not-a-uuid' })
    expect(res.ok).toBe(false)
    expect(state.updates).toEqual([])
  })

  it('rejects a logged-out caller', async () => {
    state.user = null
    const { advanceOrderAction } = await import('@/app/actions/orders')
    const res = await advanceOrderAction({ orderId: ORDER.id })
    expect(res.ok).toBe(false)
    expect(state.updates).toEqual([])
  })

  it("refuses an order the caller does not sell, and does not confirm it exists", async () => {
    state.order = { ...ORDER, seller_id: 'someone-else' }
    const { advanceOrderAction } = await import('@/app/actions/orders')
    const res = await advanceOrderAction({ orderId: ORDER.id })
    expect(res.ok).toBe(false)
    expect(state.updates).toEqual([])
    // Same generic message as a missing order — a distinct "not yours" would confirm the id.
    if (!res.ok) expect(res.error).toBe('Une erreur est survenue. Veuillez réessayer.')
  })

  it('refuses to write when the seller owns no further hop (arrived is buyer-only)', async () => {
    state.order = { ...ORDER, status: 'arrived' }
    const { advanceOrderAction } = await import('@/app/actions/orders')
    const res = await advanceOrderAction({ orderId: ORDER.id })
    expect(res.ok).toBe(false)
    expect(state.updates).toEqual([])
  })

  it('never advances a service order down the product chain', async () => {
    state.order = { ...ORDER, order_type: 'service', status: 'accepted' }
    const { advanceOrderAction } = await import('@/app/actions/orders')
    await advanceOrderAction({ orderId: ORDER.id })
    // 'arrived', never 'prepared'.
    expect(state.updates).toEqual([{ status: 'arrived' }])
  })

  it("surfaces the trigger's own message when the DB rejects the transition", async () => {
    state.updateError = { message: 'Transition invalide pour une commande produit: pending → prepared.' }
    const { advanceOrderAction } = await import('@/app/actions/orders')
    const res = await advanceOrderAction({ orderId: ORDER.id })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('Transition invalide')
  })

  it('does not write when the order read fails', async () => {
    state.readError = { message: 'boom' }
    const { advanceOrderAction } = await import('@/app/actions/orders')
    const res = await advanceOrderAction({ orderId: ORDER.id })
    expect(res.ok).toBe(false)
    expect(state.updates).toEqual([])
  })
})

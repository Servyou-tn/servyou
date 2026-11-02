import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'

// Admin › Utilisateurs (list): every role as a badge, the owner's shop linked, the ?role= filter. Supabase, the
// admin gate and the language are mocked — this pins the page's own logic, not RLS.
type Row = Record<string, unknown>
const h = vi.hoisted(() => ({
  profiles: [] as Row[],
  shops: [] as Row[],
  profilesError: null as { message: string; code: string } | null,
  shopsError: null as { message: string; code: string } | null,
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))
vi.mock('@/lib/auth/require-admin', () => ({ requireAdmin: async () => ({ userId: 'admin-1' }) }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/supabase/query-error', () => ({ reportQueryError: vi.fn() }))
vi.mock('@/components/marche/ErrorState', () => ({ ErrorState: () => createElement('p', null, 'ERROR_STATE') }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ order: async () => ({ data: h.profilesError ? null : h.profiles, error: h.profilesError }) }) }
      }
      return { select: async () => ({ data: h.shopsError ? null : h.shops, error: h.shopsError }) }
    },
  }),
}))

const Page = (await import('./page')).default

const profile = (id: string, over: Row): Row => ({
  id,
  full_name: `Nom ${id}`,
  email: `${id}@test.invalid`,
  seller_type: null,
  is_admin: false,
  city: null,
  created_at: '2026-10-01T00:00:00Z',
  suspended_at: null,
  ...over,
})

async function render(role?: string) {
  const el = await Page({ searchParams: Promise.resolve(role ? { role } : {}) })
  return renderToString(el)
}
const rowOf = (html: string, id: string) => html.split('<tr').find((r) => r.includes(`/admin/utilisateurs/${id}"`)) ?? ''

beforeEach(() => {
  h.profiles = [
    profile('admin', { is_admin: true, seller_type: 'shop_owner' }),
    profile('free', { seller_type: 'freelancer' }),
    profile('cons', {}),
  ]
  h.shops = [{ id: 'shop-1', name: 'OM shop', owner_id: 'admin' }]
  h.profilesError = null
  h.shopsError = null
})

describe('Admin › Utilisateurs — roles, shop, filter', () => {
  it('an admin who owns a shop shows « Administrateur » AND « Boutique », with the shop linked', async () => {
    const admin = rowOf(await render(), 'admin')
    expect(admin).toContain('Administrateur')
    expect(admin).toContain('Boutique')
    expect(admin).toContain('href="/boutique/shop-1"')
    expect(admin).toContain('OM shop')
    expect(admin).not.toContain('Consommateur')
  })

  it('a plain account is « Consommateur », a freelancer « Freelance », neither with a shop link', async () => {
    const html = await render()
    expect(rowOf(html, 'cons')).toContain('Consommateur')
    expect(rowOf(html, 'free')).toContain('Freelance')
    expect(rowOf(html, 'free')).not.toContain('/boutique/')
  })

  it('the filter shows counts and marks the active role; ?role=shop_owner keeps only shop owners', async () => {
    const html = await render('shop_owner')
    expect(html).toContain('href="/admin/utilisateurs?role=shop_owner" aria-current="page"')
    expect(html).toMatch(/Tous(<!-- -->)?<span[^>]*>3</)
    expect(html).toMatch(/Boutique(<!-- -->)?<span[^>]*>1</)
    expect(rowOf(html, 'admin')).not.toBe('')
    expect(rowOf(html, 'free')).toBe('')
    expect(rowOf(html, 'cons')).toBe('')
  })

  it('?role=admin, consumer and an unknown value', async () => {
    let html = await render('admin')
    expect(rowOf(html, 'admin')).not.toBe('')
    expect(rowOf(html, 'cons')).toBe('')
    html = await render('consumer')
    expect(rowOf(html, 'cons')).not.toBe('')
    expect(rowOf(html, 'admin')).toBe('')
    html = await render('superadmin')
    expect(['admin', 'free', 'cons'].every((id) => rowOf(html, id) !== '')).toBe(true)
    expect(html).toContain('href="/admin/utilisateurs" aria-current="page"')
  })

  it('a role with no account says so, distinct from « Aucun utilisateur. »', async () => {
    h.profiles = [profile('cons', {})]
    h.shops = []
    const html = await render('freelancer')
    expect(html).toContain('Aucun utilisateur avec ce rôle.')
    expect(html).not.toContain('Aucun utilisateur.')
  })

  it('a failed shops read is the error state, never a list with shops silently missing', async () => {
    h.shopsError = { message: 'boom', code: '42501' }
    const html = await render()
    expect(html).toContain('ERROR_STATE')
    expect(rowOf(html, 'admin')).toBe('')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import type { SellerType } from '@/lib/layout/select-variant'

// A render-only smoke: pure-logic tests + the anonymous SSR check never exercise
// the LOGGED-IN render branches (account avatar, workspace pills, mobile account
// section). This renders every variant to a string and asserts the right surface
// shows up — catching a render-time throw or bad map before the founder's manual
// pass. Interaction (dropdown open, keyboard nav, overlay) is out of scope here.

const nav = vi.hoisted(() => ({ path: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => nav.path,
  useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))

// Imported after the mocks above are registered.
const { Header } = await import('./Header')

function html(
  props: { isLoggedIn: boolean; sellerType: SellerType; fullName: string | null },
  path: string,
): string {
  nav.path = path
  return renderToString(createElement(LangProvider, { lang: 'fr' }, createElement(Header, props)))
}

describe('Header render smoke — every variant initial-renders without throwing', () => {
  it('public: brand + Missions + signup CTA, and NO account button', () => {
    const out = html({ isLoggedIn: false, sellerType: null, fullName: null }, '/')
    expect(out).toContain('Navigation principale')
    expect(out).toContain('href="/missions"')
    expect(out).toContain('href="/inscription"')
    expect(out).not.toContain('aria-label="Mon compte"')
  })

  it('consumer: account button + consumer links + rendered initials', () => {
    const out = html({ isLoggedIn: true, sellerType: null, fullName: 'Amine Test' }, '/mes-demandes')
    expect(out).toContain('aria-label="Mon compte"')
    expect(out).toContain('href="/mes-favoris"')
    expect(out).toContain('AT') // initials from "Amine Test"
  })

  it('workspace shop: dashboard + produits + commandes', () => {
    const out = html({ isLoggedIn: true, sellerType: 'shop_owner', fullName: 'X' }, '/ma-boutique')
    expect(out).toContain('href="/ma-boutique/produits"')
    expect(out).toContain('href="/ma-boutique/commandes"')
    expect(out).toContain('aria-label="Mon compte"')
  })

  it('workspace freelance (no name → avatar fallback): services + demandes + reponses', () => {
    const out = html({ isLoggedIn: true, sellerType: 'freelancer', fullName: null }, '/mon-profil-freelance')
    expect(out).toContain('href="/mon-profil-freelance/services"')
    expect(out).toContain('href="/mon-profil-freelance/demandes"')
    expect(out).toContain('href="/mes-reponses"')
  })

  it('hidden contexts render nothing (admin section + auth pages)', () => {
    expect(html({ isLoggedIn: true, sellerType: null, fullName: 'X' }, '/admin')).toBe('')
    expect(html({ isLoggedIn: true, sellerType: 'shop_owner', fullName: 'X' }, '/admin/litiges')).toBe('')
    expect(html({ isLoggedIn: false, sellerType: null, fullName: null }, '/connexion')).toBe('')
    expect(html({ isLoggedIn: false, sellerType: null, fullName: null }, '/inscription')).toBe('')
  })

  it('active page wears aria-current + the green status dot', () => {
    const out = html({ isLoggedIn: false, sellerType: null, fullName: null }, '/')
    expect(out).toContain('aria-current="page"')
    expect(out).toContain('status-dot-success')
  })
})

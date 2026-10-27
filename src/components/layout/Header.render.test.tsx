import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import type { SellerType } from '@/lib/layout/select-variant'
import type { HeaderAccount } from '@/lib/layout/nav-config'

// A render-only smoke: the marketing navbar renders only on '/', identically for
// every visitor. This renders it on '/' (with and without seller data) and on a
// spread of other routes, asserting the right surface shows up — catching a
// render-time throw or bad map before the founder's manual pass. Interaction
// (dropdown open, keyboard nav, overlay) is out of scope here.

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
  props: { sellerType: SellerType; fullName: string | null; account?: HeaderAccount },
  path: string,
): string {
  nav.path = path
  return renderToString(<LangProvider lang="fr">{createElement(Header, props)}</LangProvider>)
}

describe('Header render smoke — marketing navbar, landing-only, same for every visitor', () => {
  it('"/": brand + nav anchors + Missions + signup CTA, and NO account button', () => {
    const out = html({ sellerType: null, fullName: null }, '/')
    expect(out).toContain('Navigation principale')
    expect(out).toContain('href="/#boutiques"')
    expect(out).toContain('href="/missions"')
    expect(out).toContain('href="/inscription"')
    expect(out).not.toContain('aria-label="Mon compte"')
  })

  it('"/": role data WITHOUT an `account` still renders the public navbar (account is the only signal)', () => {
    const out = html({ sellerType: 'shop_owner', fullName: 'Amine Test' }, '/')
    expect(out).not.toContain('aria-label="Mon compte"')
    expect(out).toContain('href="/inscription"')
  })

  // A signed-in viewer sees THEM, not the logged-out CTAs — for every role.
  describe('"/": signed-in viewer (account)', () => {
    const cases: [string, SellerType, HeaderAccount][] = [
      ['freelancer', 'freelancer', { fullName: 'Amine Ben Salah', avatarUrl: null, spaceHref: '/tableau-de-bord' }],
      ['shop owner', 'shop_owner', { fullName: 'Amine Ben Salah', avatarUrl: null, spaceHref: '/tableau-de-bord-vendeur' }],
      ['admin', null, { fullName: 'Amine Ben Salah', avatarUrl: null, spaceHref: '/admin' }],
      ['consumer', null, { fullName: 'Amine Ben Salah', avatarUrl: null, spaceHref: '/marche/produits' }],
    ]
    it.each(cases)('%s: name + a link to their space, and NO « Se connecter / S\'inscrire »', (_l, sellerType, account) => {
      const out = html({ sellerType, fullName: account.fullName, account }, '/')
      expect(out).toContain('Amine Ben Salah')
      expect(out).toContain(`href="${account.spaceHref}"`)
      expect(out).toContain('Tableau de bord')
      expect(out).toContain('aria-label="Mon compte"') // the avatar menu (carries Déconnexion)
      expect(out).not.toContain('href="/connexion"')
      expect(out).not.toContain('href="/inscription"')
      expect(out).not.toContain('Se connecter')
    })

    it('a viewer with no name still renders the avatar + space link (initials fallback, no empty name node)', () => {
      const out = html(
        { sellerType: 'freelancer', fullName: null, account: { fullName: null, avatarUrl: null, spaceHref: '/tableau-de-bord' } },
        '/',
      )
      expect(out).toContain('href="/tableau-de-bord"')
      expect(out).not.toContain('href="/connexion"')
    })
  })

  it('renders nothing on every route other than "/" (each owns its own nav)', () => {
    for (const p of [
      '/admin',
      '/admin/litiges',
      '/connexion',
      '/inscription',
      '/mon-espace',
      '/ma-boutique',
      '/mon-profil-freelance',
      '/missions',
    ]) {
      expect(html({ sellerType: 'shop_owner', fullName: 'X' }, p)).toBe('')
    }
  })

  it('active page wears aria-current + the green status dot', () => {
    const out = html({ sellerType: null, fullName: null }, '/')
    expect(out).toContain('aria-current="page"')
    expect(out).toContain('status-dot-success')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import type { SellerType } from '@/lib/layout/select-variant'

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
  props: { sellerType: SellerType; fullName: string | null },
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

  it('"/": renders the SAME public navbar even with seller data present (no avatar variant)', () => {
    // req 2: a logged-in seller on the landing page gets the public navbar, never
    // the account dropdown. The Header takes no auth flag, so this is structural —
    // the test guards against a future change re-introducing the variant.
    const out = html({ sellerType: 'shop_owner', fullName: 'Amine Test' }, '/')
    expect(out).not.toContain('aria-label="Mon compte"')
    expect(out).toContain('href="/inscription"') // public CTA, not the avatar
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

import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'

// Both system pages compose MarketingShell (Header uses usePathname; Footer uses next/image
// + LanguageToggle), so we mock the same surface as marketing-shell.render.test, plus
// next/headers for not-found's getLang().
const nav = vi.hoisted(() => ({ path: '/unknown-route' }))

vi.mock('next/navigation', () => ({
  usePathname: () => nav.path,
  useRouter: () => ({ refresh: () => {}, push: () => {}, replace: () => {} }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: unknown; alt?: string }) =>
    createElement('img', { src: typeof src === 'string' ? src : '#', alt: alt ?? '' }),
}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}))

const NotFound = (await import('./not-found')).default
const ErrorPage = (await import('./error')).default

describe('not-found (404)', () => {
  it('renders the title and recovery actions', async () => {
    const el = await NotFound()
    const out = renderToString(createElement(LangProvider, { lang: 'fr' }, el))
    // renderToString HTML-escapes apostrophes; assert on apostrophe-free fragments.
    expect(out).toContain('Cette page')
    expect(out).toContain('existe pas')
    expect(out).toContain('href="/marche"')
    expect(out).toContain('href="/contact"')
    expect(out).toContain('Liens utiles')
  })
})

describe('error (500)', () => {
  it('renders the apologetic title and a working retry button', () => {
    const out = renderToString(
      createElement(
        LangProvider,
        { lang: 'fr' },
        createElement(ErrorPage, { error: new Error('boom'), reset: () => {} }),
      ),
    )
    expect(out).toContain('Une erreur') // apostrophe in "s'est" is escaped by renderToString
    expect(out).toContain('Réessayer')
    expect(out).toContain('<button')
  })
})

import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'

// A9 / A10 (404 / 500) are the shell-less SystemStateScreen card (next/image for the S-mark, next/link for the actions), plus next/headers for
// not-found's getLang(). global-error is rendered WITHOUT a LangProvider on purpose — it replaces the root layout and must not need one.
vi.mock('next/navigation', () => ({
  usePathname: () => '/unknown-route',
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
const GlobalError = (await import('./global-error')).default

describe('not-found (404) — A9', () => {
  it('is the shell-less card: eyebrow, title, body, « Retour à l’accueil » and « Parcourir la marketplace »', async () => {
    const el = await NotFound()
    const out = renderToString(<LangProvider lang="fr">{el}</LangProvider>)
    // renderToString HTML-escapes apostrophes; assert on apostrophe-free fragments.
    expect(out).toContain('Erreur 404')
    expect(out).toContain('Page introuvable')
    expect(out).toContain('Cette page n')
    expect(out).toContain('href="/"')
    expect(out).toContain('Parcourir la marketplace')
    expect(out).toContain('href="/marche"')
    // The old MarketingShell page is gone (D1): no « Liens utiles », no header / footer chrome.
    expect(out).not.toContain('Liens utiles')
    expect(out).not.toContain('<footer')
    expect(out).toContain('id="main-content"')
  })
})

describe('error (500) — A10', () => {
  const render = (error: Error & { digest?: string }, lang: 'fr' | 'ar' = 'fr') =>
    renderToString(<LangProvider lang={lang}>{createElement(ErrorPage, { error, retry: () => {} })}</LangProvider>)

  it('shows the danger outline, the reference, a working retry BUTTON and the way home', () => {
    const out = render(Object.assign(new Error('boom'), { digest: '1234567890' }))
    expect(out).toContain('Une erreur s')
    expect(out).toContain('Erreur 500 · réf. 1234567890')
    expect(out).toContain('Réessayer')
    expect(out).toContain('<button')
    expect(out).toContain('border-danger-500')
    expect(out).toContain('href="/"')
  })

  it('shows « Erreur 500 » alone when Next provides no digest — never an invented reference', () => {
    const out = render(new Error('boom'))
    expect(out).toContain('Erreur 500')
    expect(out).not.toContain('réf.')
  })

  it('Arabic renders translated, with no raw key', () => {
    const out = render(Object.assign(new Error('boom'), { digest: 'abc' }), 'ar')
    expect(out).toContain('خطأ 500')
    expect(out).not.toMatch(/system\.error\./)
  })
})

describe('global-error — the root layout crashed', () => {
  it('is a whole document in French with no provider, no shell and no data: html + body, the 500 card, a plain link home', () => {
    const out = renderToString(createElement(GlobalError, { error: Object.assign(new Error('boom'), { digest: '42' }), retry: () => {} }))
    expect(out).toContain('<html')
    expect(out).toContain('lang="fr"')
    expect(out).toContain('<body')
    expect(out).toContain('Erreur 500 · réf. 42')
    expect(out).toContain('Réessayer')
    expect(out).toContain('<button')
    expect(out).toContain('href="/"')
    expect(out).not.toContain('<footer')
    expect(out).not.toContain('<img') // no next/image: the wordmark is text
  })
})

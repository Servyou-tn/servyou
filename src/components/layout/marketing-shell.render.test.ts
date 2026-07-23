import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'

// Render smoke for the (marketing) chrome: MarketingShell must mount the Header (forceShow,
// so it appears on a non-'/' content route) AND the shared Footer, with the page content
// in between. Mirrors Header.render.test's mock setup, plus a next/image stub for the
// Footer logo.

const nav = vi.hoisted(() => ({ path: '/a-propos' }))

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

const { MarketingShell } = await import('./MarketingShell')

function html(): string {
  return renderToString(
    createElement(
      LangProvider,
      { lang: 'fr', children: createElement(MarketingShell, { lang: 'fr', children: 'PAGE_CONTENT' }) },
    ),
  )
}

describe('MarketingShell render smoke', () => {
  it('mounts the Header (visible on a content route via forceShow)', () => {
    const out = html()
    expect(out).toContain('Navigation principale') // the Header nav aria-label
    expect(out).toContain('href="/inscription"') // public signup CTA
  })

  it('mounts the shared Footer', () => {
    const out = html()
    expect(out).toContain('<footer')
    expect(out).toContain('href="/faq"') // a footer "Servyou" column link
    expect(out).toContain('href="/contact"')
  })

  it('renders the page content between header and footer', () => {
    expect(html()).toContain('PAGE_CONTENT')
  })
})

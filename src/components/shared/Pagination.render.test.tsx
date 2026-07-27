import { describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'

// Render smoke for the SHARED Pagination, rebuilt to Figma 188:14219 (delta rows S1/S2/P2-P4/C1-C3).
// It has four consumers and only one of them (/marche/services) can be made to paginate on the
// current seed data — /categories/[slug] tops out at 5 items, /mes-missions is auth-gated. So the
// two unreachable consumers are covered here, by their real prop shapes, rather than left unchecked.
//
// What this locks:
//   - the caption sits AFTER the nav in DOM order (Figma stacks it below; it used to be above)
//   - prev/next are ICON-ONLY — the visible "Précédent"/"Suivant" labels are gone, and aria-label
//     is now the sole accessible name, so the a11y contract is asserted explicitly
//   - the caption is opt-in: three of the four consumers pass no totalItems/perPage and must not
//     render it

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))

const { Pagination } = await import('./Pagination')

type Props = Parameters<typeof Pagination>[0]
const html = (props: Props) =>
  renderToString(<LangProvider lang="fr">{createElement(Pagination, props)}</LangProvider>)

describe('Pagination — shared across 4 consumers, rebuilt to Figma 188:14219', () => {
  // /marche/services — the only consumer that passes the caption props.
  const withCaption: Props = {
    page: 1,
    totalPages: 2,
    basePath: '/marche/services',
    totalItems: 21,
    perPage: 12,
  }
  // /recherche · /categories/[slug] · /mes-missions — nav only, no caption.
  const noCaption: Props = { page: 2, totalPages: 5, basePath: '/recherche' }

  it('S1: the caption renders AFTER the nav, not before it', () => {
    const out = html(withCaption)
    expect(out).toContain('Affichage 1 à 12 sur 21')
    expect(out.indexOf('</nav>')).toBeLessThan(out.indexOf('Affichage 1 à 12 sur 21'))
  })

  it('S2: prev/next are icon-only — no visible label, aria-label still present', () => {
    const out = html(noCaption)
    expect(out).toContain('aria-label="Précédent"')
    expect(out).toContain('aria-label="Suivant"')
    // The label used to render inside a <span class="hidden sm:inline">. It must be gone as text.
    expect(out).not.toContain('>Précédent<')
    expect(out).not.toContain('>Suivant<')
  })

  it('the three caption-less consumers render the nav and no caption', () => {
    const out = html(noCaption)
    expect(out).toContain('aria-label="Pagination"')
    expect(out).not.toContain('Affichage')
  })

  it('C1/C3: idle cells are bordered 36×36 squares (rounded-md), the active cell is a solid fill', () => {
    const out = html(noCaption)
    expect(out).toContain('rounded-md')
    expect(out).not.toContain('rounded-full')
    expect(out).toContain('border-border-subtle')
    expect(out).toContain('bg-brand-blue-600')
    expect(out).toContain('aria-current="page"')
  })

  it('a single page still renders the caption alone when the consumer asks for one', () => {
    const out = html({ ...withCaption, totalPages: 1, totalItems: 8, perPage: 12 })
    expect(out).toContain('Affichage 1 à 8 sur 8')
    expect(out).not.toContain('<nav')
  })

  it('a single page with no caption props renders nothing at all', () => {
    expect(html({ page: 1, totalPages: 1, basePath: '/recherche' })).toBe('')
  })
})

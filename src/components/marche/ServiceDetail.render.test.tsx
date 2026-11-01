// @vitest-environment jsdom
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// D2 at 375 (m375-d2-service): structure and order only — pixel geometry is measured in the browser (docs/design/m375-d2-service-deltas.md).

const h = vi.hoisted(() => ({ listing: vi.fn(), observers: [] as { cb: () => void }[] }))

vi.mock('@/components/LangProvider', () => ({ useLang: () => 'fr' }))
vi.mock('@/components/FavoriteButton', () => ({
  FavoriteButton: (p: { label?: string }) => <button data-testid="fav">{p.label}</button>,
}))
vi.mock('@/components/produits/ShareLinkButton', () => ({
  ShareLinkButton: () => <button data-testid="share">Partager</button>,
}))
vi.mock('@/components/listings/ListingResults', () => ({
  ListingResults: (p: unknown) => {
    h.listing(p)
    return <div data-testid="related" />
  },
}))
vi.mock('@/components/report/ReportListingModal', () => ({ ReportListingModal: () => <button>Signaler ce service</button> }))

import { ServiceDetail } from './ServiceDetail'
import { ServiceDescription } from './ServiceDescription'
import type { ServiceDetailData } from '@/lib/marche/service-detail'

const base: ServiceDetailData = {
  id: 'svc-1',
  title: 'Développement d’application mobile',
  description: 'Je conçois des applications mobiles.',
  startingPrice: 900,
  priceUnit: null,
  deliveryTime: '20-30 j',
  category: 'Application mobile',
  categoryId: 'cat-1',
  freelancerProfileId: 'fp-1',
  freelancer: { name: 'Yassine Ben Ali', city: 'Tunis', headline: 'Développeur Full Stack', avatarUrl: null },
  deliverables: ['Design UI natif', 'Publication App Store'],
  deliveryMode: 'remote',
  revisionsCount: 2,
  tags: [],
}

const view = (over: Partial<ServiceDetailData> = {}, related: unknown[] = [{ id: 'r1' }]) =>
  render(<ServiceDetail service={{ ...base, ...over }} related={related as never} lang="fr" isLoggedIn={false} />)

beforeEach(() => {
  vi.clearAllMocks()
  h.observers.length = 0
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(cb: () => void) {
        h.observers.push({ cb })
      }
      observe() {}
      disconnect() {}
    },
  )
})
afterEach(cleanup)

describe('ServiceDetail — the 375 buy box', () => {
  it('the DOM is the 375 order (tab order = visual order, WCAG 2.4.3); the desktop order is lg:order-N', () => {
    view()
    const cta = screen.getByRole('link', { name: 'Demander ce service' })
    const profile = screen.getByRole('link', { name: /Yassine Ben Ali/ })
    const cod = screen.getByText(/Paiement à la livraison/)
    const row = screen.getByTestId('fav').parentElement as HTMLElement
    const price = screen.getByText('À partir de').closest('div')?.parentElement as HTMLElement

    // price · CTA · freelancer row · COD note · favori / partager — in the DOM
    const inDomOrder = [price, cta, profile, cod, row]
    for (let i = 0; i < inDomOrder.length - 1; i++) {
      expect(inDomOrder[i].compareDocumentPosition(inDomOrder[i + 1]) & Node.DOCUMENT_POSITION_FOLLOWING, `step ${i}`).toBeTruthy()
    }
    // …and from lg: price · CTA · favori / partager · freelancer block · COD (the dividers are 4 and 6)
    expect([price, cta, row, cod].map((el) => el.className.match(/lg:order-(\d)/)?.[1])).toEqual(['1', '2', '3', '7'])
    const desktopBlock = screen.getByRole('link', { name: 'Voir profil' }).parentElement as HTMLElement
    expect(desktopBlock.className).toContain('lg:order-5')
  })

  it('the freelancer row is a link to their profile: name, headline, no city, hidden from lg (the desktop block takes over)', () => {
    view()
    const profile = screen.getByRole('link', { name: /Yassine Ben Ali/ })
    expect(profile.getAttribute('href')).toBe('/freelance/fp-1')
    expect(profile.textContent).toContain('Développeur Full Stack')
    expect(profile.textContent).not.toContain('Tunis')
    expect(profile.className).toContain('lg:hidden')
    expect(screen.getByRole('link', { name: 'Voir profil' })).toBeInTheDocument()
  })

  it('without a freelancer profile id the row is plain, not a dead link', () => {
    view({ freelancerProfileId: null })
    expect(screen.queryByRole('link', { name: /Yassine Ben Ali/ })).toBeNull()
    expect(screen.getAllByText('Yassine Ben Ali').length).toBeGreaterThan(0)
  })

  it('favori and partager are the two boxed buttons', () => {
    view()
    expect(screen.getByTestId('fav').textContent).toBe('Favori')
    expect(screen.getByTestId('share')).toBeInTheDocument()
  })
})

describe('ServiceDetail — the rest of the frame', () => {
  it('375 breadcrumb is « ‹ Services › category »; Accueil and the title are desktop-only', () => {
    view()
    const nav = screen.getByRole('navigation', { name: /Ariane/ })
    expect(screen.getByRole('link', { name: 'Services' }).getAttribute('href')).toBe('/marche/services')
    expect(screen.getByRole('link', { name: 'Accueil' }).className).toContain('hidden')
    expect(nav.textContent).toContain('Application mobile')
    expect(nav.querySelector('span.hidden.lg\\:inline')?.textContent).toBe(base.title)
  })

  it('related services sit in the horizontal rail', () => {
    view()
    expect(h.listing).toHaveBeenCalledWith(expect.objectContaining({ type: 'service', layout: 'rail' }))
  })

  it('« Ce qui est inclus » / « Mode de prestation » appear only with data', () => {
    const { unmount } = view()
    expect(screen.getByRole('heading', { name: 'Ce qui est inclus' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mode de prestation' })).toBeInTheDocument()
    unmount()
    view({ deliverables: [], deliveryMode: null })
    expect(screen.queryByRole('heading', { name: 'Ce qui est inclus' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Mode de prestation' })).toBeNull()
  })
})

describe('ServiceDescription — « Voir plus » only when the text overflows its 8-line clamp', () => {
  let scrollHeight = 192
  let clientHeight = 192

  beforeEach(() => {
    scrollHeight = 192
    clientHeight = 192
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => scrollHeight })
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => clientHeight })
  })

  const measure = () => act(() => h.observers.forEach((o) => o.cb()))

  it('a short text shows no button — not even with a couple of px of mixed-script slack', () => {
    render(<ServiceDescription text="Court." />)
    scrollHeight = 194 // Arabic / mixed-script line boxes can read 2 px over
    measure()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('a text that overflows shows « Voir plus », expands to « Voir moins », and collapses back', () => {
    render(<ServiceDescription text={'Long. '.repeat(200)} />)
    scrollHeight = 192 + 48 // two more lines than the clamp
    measure()
    const button = screen.getByRole('button', { name: 'Voir plus' })
    expect(button.getAttribute('aria-expanded')).toBe('false')
    const text = document.getElementById('service-description') as HTMLElement
    expect(text.className).toContain('line-clamp-8')

    fireEvent.click(button)
    expect(screen.getByRole('button', { name: 'Voir moins' }).getAttribute('aria-expanded')).toBe('true')
    expect(text.className).not.toContain('line-clamp-8')

    fireEvent.click(screen.getByRole('button', { name: 'Voir moins' }))
    expect(screen.getByRole('button', { name: 'Voir plus' })).toBeInTheDocument()
  })

  it('from lg the text is whole and the button is hidden', () => {
    render(<ServiceDescription text={'Long. '.repeat(200)} />)
    scrollHeight = 240
    measure()
    expect((document.getElementById('service-description') as HTMLElement).className).toContain('lg:line-clamp-none')
    expect(screen.getByRole('button', { name: 'Voir plus' }).className).toContain('lg:hidden')
  })
})

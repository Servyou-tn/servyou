import { describe, it, expect } from 'vitest'
import { selectVariant } from './select-variant'
import { navLinks, accountItems, activeHref } from './nav-config'

describe('selectVariant', () => {
  it('hides the Header on every auth route (chromeless auth)', () => {
    for (const p of ['/login', '/signup', '/forgot-password', '/update-password', '/connexion']) {
      expect(selectVariant({ isLoggedIn: false, sellerType: null, pathname: p }).hidden).toBe(true)
      // also hidden even if somehow logged in
      expect(selectVariant({ isLoggedIn: true, sellerType: 'shop_owner', pathname: p }).hidden).toBe(true)
    }
  })

  it('hides the Header across the signup funnel (/inscription owns its minimal navbar)', () => {
    for (const p of ['/inscription', '/inscription/consumer', '/inscription/shop-owner', '/inscription/freelancer']) {
      expect(selectVariant({ isLoggedIn: false, sellerType: null, pathname: p }).hidden).toBe(true)
    }
    // a sibling that merely shares the prefix is NOT under the funnel
    expect(selectVariant({ isLoggedIn: false, sellerType: null, pathname: '/inscriptionx' }).hidden).toBe(false)
  })

  it('hides the Header across the admin section (AdminSidebar owns admin nav)', () => {
    expect(selectVariant({ isLoggedIn: true, sellerType: null, pathname: '/admin' }).hidden).toBe(true)
    expect(selectVariant({ isLoggedIn: true, sellerType: null, pathname: '/admin/utilisateurs' }).hidden).toBe(true)
    expect(selectVariant({ isLoggedIn: true, sellerType: null, pathname: '/admin/litiges/abc' }).hidden).toBe(true)
  })

  it('renders the public variant for logged-out visitors', () => {
    for (const p of ['/', '/missions', '/boutique/123', '/produit/9']) {
      expect(selectVariant({ isLoggedIn: false, sellerType: null, pathname: p })).toEqual({
        hidden: false,
        variant: 'public',
      })
    }
  })

  it('renders the consumer variant for a logged-in user outside any workspace', () => {
    for (const p of ['/', '/mes-demandes', '/mes-favoris', '/profile']) {
      expect(selectVariant({ isLoggedIn: true, sellerType: null, pathname: p })).toEqual({
        hidden: false,
        variant: 'consumer',
      })
    }
  })

  it('renders the shop workspace only for a shop owner inside /ma-boutique', () => {
    expect(selectVariant({ isLoggedIn: true, sellerType: 'shop_owner', pathname: '/ma-boutique' })).toEqual({
      hidden: false,
      variant: 'workspace',
      workspace: 'shop',
    })
    expect(
      selectVariant({ isLoggedIn: true, sellerType: 'shop_owner', pathname: '/ma-boutique/produits' }).workspace,
    ).toBe('shop')
  })

  it('renders the freelance workspace only for a freelancer inside /mon-profil-freelance', () => {
    expect(
      selectVariant({ isLoggedIn: true, sellerType: 'freelancer', pathname: '/mon-profil-freelance' }),
    ).toEqual({ hidden: false, variant: 'workspace', workspace: 'freelance' })
    expect(
      selectVariant({ isLoggedIn: true, sellerType: 'freelancer', pathname: '/mon-profil-freelance/services' })
        .workspace,
    ).toBe('freelance')
  })

  it('does NOT show a workspace whose role the user lacks (mid-redirect → consumer)', () => {
    // A consumer who somehow lands on a workspace route gets the neutral nav.
    expect(selectVariant({ isLoggedIn: true, sellerType: null, pathname: '/ma-boutique' }).variant).toBe('consumer')
    // A shop owner is not given the freelance workspace, and vice-versa.
    expect(
      selectVariant({ isLoggedIn: true, sellerType: 'shop_owner', pathname: '/mon-profil-freelance' }).variant,
    ).toBe('consumer')
    expect(
      selectVariant({ isLoggedIn: true, sellerType: 'freelancer', pathname: '/ma-boutique' }).variant,
    ).toBe('consumer')
  })

  it('shop owner browsing outside their boutique sees the consumer variant', () => {
    expect(selectVariant({ isLoggedIn: true, sellerType: 'shop_owner', pathname: '/' }).variant).toBe('consumer')
  })

  it('respects the path boundary (no prefix false-positives)', () => {
    // "/ma-boutiquex" is not under "/ma-boutique".
    expect(
      selectVariant({ isLoggedIn: true, sellerType: 'shop_owner', pathname: '/ma-boutiquex' }).variant,
    ).toBe('consumer')
  })
})

describe('navLinks', () => {
  it('public links: Accueil, Boutiques/Freelances/À propos anchors, Missions', () => {
    // Boutiques/Freelances/À propos scroll to the landing-page anchor sections
    // (#boutiques, #freelances, #a-propos) shipped with the marketing page.
    const links = navLinks({ hidden: false, variant: 'public' })
    expect(links.map(l => l.href)).toEqual([
      '/',
      '/#boutiques',
      '/#freelances',
      '/missions',
      '/#a-propos',
    ])
  })

  it('freelance workspace points Commandes/Réponses at their real routes', () => {
    const links = navLinks({ hidden: false, variant: 'workspace', workspace: 'freelance' })
    const byKey = Object.fromEntries(links.map(l => [l.key, l.href]))
    expect(byKey['nav.workspace_orders']).toBe('/mon-profil-freelance/demandes')
    expect(byKey['nav.responses']).toBe('/mes-reponses')
    expect(byKey['nav.jobs']).toBe('/missions')
  })
})

describe('accountItems', () => {
  it('offers "Devenir vendeur" only when the user has no seller role', () => {
    const consumer = accountItems(null).filter(i => i.kind === 'link').map(i => (i as { href: string }).href)
    expect(consumer).toContain('/devenir-vendeur')

    const shop = accountItems('shop_owner').filter(i => i.kind === 'link').map(i => (i as { href: string }).href)
    expect(shop).not.toContain('/devenir-vendeur')
  })

  it('always ends with a divider then logout', () => {
    const items = accountItems('freelancer')
    expect(items[items.length - 2].kind).toBe('divider')
    expect(items[items.length - 1].kind).toBe('logout')
  })
})

describe('activeHref (longest-prefix match)', () => {
  const shop = navLinks({ hidden: false, variant: 'workspace', workspace: 'shop' })

  it('highlights only the dashboard on the dashboard index', () => {
    expect(activeHref(shop, '/ma-boutique')).toBe('/ma-boutique')
  })

  it('highlights the nested page, not the index, when on a sub-route', () => {
    expect(activeHref(shop, '/ma-boutique/produits')).toBe('/ma-boutique/produits')
    expect(activeHref(shop, '/ma-boutique/produits/nouveau')).toBe('/ma-boutique/produits')
  })

  it('matches "/" exactly only', () => {
    const consumer = navLinks({ hidden: false, variant: 'consumer' })
    expect(activeHref(consumer, '/')).toBe('/')
    expect(activeHref(consumer, '/mes-favoris')).toBe('/mes-favoris')
  })

  it('returns null when nothing matches', () => {
    expect(activeHref(shop, '/some/other/page')).toBeNull()
  })
})

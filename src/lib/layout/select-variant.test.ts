import { describe, it, expect } from 'vitest'
import { selectVariant } from './select-variant'
import { navLinks, accountItems, activeHref } from './nav-config'

describe('selectVariant', () => {
  it('hides the Header on every auth route (chromeless auth)', () => {
    for (const p of ['/connexion', '/verifier-email', '/mot-de-passe-oublie', '/nouveau-mot-de-passe']) {
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

  it('hides the Header on the consumer dashboard (/mon-espace owns its own shell)', () => {
    expect(selectVariant({ isLoggedIn: true, sellerType: null, pathname: '/mon-espace' }).hidden).toBe(true)
    // sub-routes of the dashboard shell are hidden too
    expect(selectVariant({ isLoggedIn: true, sellerType: null, pathname: '/mon-espace/parametres' }).hidden).toBe(true)
    // a sibling that merely shares the prefix is NOT under the shell
    expect(selectVariant({ isLoggedIn: true, sellerType: null, pathname: '/mon-espacex' }).hidden).toBe(false)
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
  it('public links: Accueil + Boutiques/Freelances/À propos anchors (Missions removed)', () => {
    // The /missions job board was removed in the design-phase reset; the remaining
    // anchors scroll to the landing-page sections.
    const links = navLinks({ hidden: false, variant: 'public' })
    expect(links.map(l => l.href)).toEqual([
      '/',
      '/#boutiques',
      '/#freelances',
      '/#a-propos',
    ])
  })

  it('consumer center nav is just Accueil (utility pages removed)', () => {
    const links = navLinks({ hidden: false, variant: 'consumer' })
    expect(links.map(l => l.href)).toEqual(['/'])
  })

  it('workspace variants have no center links (dashboards removed, to be rebuilt)', () => {
    expect(navLinks({ hidden: false, variant: 'workspace', workspace: 'shop' })).toEqual([])
    expect(navLinks({ hidden: false, variant: 'workspace', workspace: 'freelance' })).toEqual([])
  })
})

describe('accountItems', () => {
  it('is just logout for every role (profile + become-seller removed in the reset)', () => {
    for (const role of [null, 'shop_owner', 'freelancer'] as const) {
      expect(accountItems(role)).toEqual([{ kind: 'logout', key: 'nav.logout' }])
    }
  })
})

describe('activeHref (longest-prefix match)', () => {
  // Synthetic link set (kept routes) exercising the three match kinds independently
  // of nav-config's current contents.
  const links = [
    { href: '/', key: 'home' },
    { href: '/#boutiques', key: 'shops' },
    { href: '/admin', key: 'a' },
    { href: '/admin/litiges', key: 'b' },
  ]

  it('matches "/" exactly only, and the anchor on an exact pathname+hash', () => {
    expect(activeHref(links, '/')).toBe('/')
    expect(activeHref(links, '/', '#boutiques')).toBe('/#boutiques')
  })

  it('highlights the nested page, not the index, on a sub-route (longest prefix)', () => {
    expect(activeHref(links, '/admin')).toBe('/admin')
    expect(activeHref(links, '/admin/litiges')).toBe('/admin/litiges')
    expect(activeHref(links, '/admin/litiges/abc')).toBe('/admin/litiges')
  })

  it('returns null when nothing matches', () => {
    expect(activeHref(links, '/some/other/page')).toBeNull()
  })
})

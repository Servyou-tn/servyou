import { describe, it, expect } from 'vitest'
import { selectVariant } from './select-variant'
import { navLinks, accountItems, activeHref } from './nav-config'

describe('selectVariant — marketing navbar renders only on the landing page', () => {
  it('shows the public variant on "/" (and nothing else lights it up)', () => {
    expect(selectVariant({ pathname: '/' })).toEqual({ hidden: false, variant: 'public' })
  })

  it('hides the Header on every route other than "/"', () => {
    for (const p of [
      // former public/listing routes
      '/missions',
      '/boutique/123',
      '/produit/9',
      '/recherche',
      // chromeless auth + signup funnel
      '/connexion',
      '/verifier-email',
      '/mot-de-passe-oublie',
      '/nouveau-mot-de-passe',
      '/inscription',
      '/inscription/consumer',
      // dashboard shell + role workspaces (own their own nav)
      '/mon-espace',
      '/mon-espace/parametres',
      '/ma-boutique',
      '/mon-profil-freelance',
      // admin (AdminSidebar owns admin nav)
      '/admin',
      '/admin/litiges/abc',
    ]) {
      expect(selectVariant({ pathname: p })).toEqual({ hidden: true, variant: 'public' })
    }
  })
})

describe('navLinks', () => {
  it('public links: Accueil + Boutiques/Freelances/Missions/À propos', () => {
    // Missions points to /missions (the same target the page footer links to); the
    // other entries are landing-page section anchors.
    const links = navLinks({ hidden: false, variant: 'public' })
    expect(links.map(l => l.href)).toEqual([
      '/',
      '/#boutiques',
      '/#freelances',
      '/missions',
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

// Pure link/menu configuration for the Header, derived from the resolved
// HeaderState. No React, no i18n resolution here — entries carry i18n KEYS
// (resolved with t() at render time) and the real routes confirmed to exist
// during Step 0 discovery.

import type { HeaderState, SellerType } from './select-variant'

export type NavLink = { href: string; key: string }

/** Center-pill links for the resolved variant. Routes are the real ones that exist. */
export function navLinks(state: HeaderState): NavLink[] {
  if (state.variant === 'public') {
    // Boutiques / Freelances / À propos point to landing-page anchor sections
    // that ship in later PRs; until then the links render and scroll to nothing.
    return [
      { href: '/', key: 'nav.home' },
      { href: '/#boutiques', key: 'nav.shops' },
      { href: '/#freelances', key: 'nav.freelancers' },
      { href: '/missions', key: 'nav.missions_board' },
      { href: '/#a-propos', key: 'nav.about' },
    ]
  }

  if (state.variant === 'consumer') {
    return [
      { href: '/', key: 'nav.browse' },
      { href: '/mes-demandes', key: 'nav.orders' },
      { href: '/mes-favoris', key: 'nav.favorites' },
    ]
  }

  // workspace
  if (state.workspace === 'shop') {
    return [
      { href: '/ma-boutique', key: 'nav.dashboard' },
      { href: '/ma-boutique/produits', key: 'nav.products' },
      { href: '/ma-boutique/commandes', key: 'nav.workspace_orders' },
    ]
  }

  // workspace freelance
  return [
    { href: '/mon-profil-freelance', key: 'nav.dashboard' },
    { href: '/mon-profil-freelance/services', key: 'nav.services' },
    { href: '/mon-profil-freelance/demandes', key: 'nav.workspace_orders' },
    { href: '/missions', key: 'nav.jobs' },
    { href: '/mes-reponses', key: 'nav.responses' },
  ]
}

export type AccountItem =
  | { kind: 'link'; href: string; key: string }
  | { kind: 'divider' }
  | { kind: 'logout'; key: string }

/** Account-dropdown items (consumer + workspace share this).
 *  "Devenir vendeur" shows only when the user has no seller role yet. */
export function accountItems(sellerType: SellerType): AccountItem[] {
  const items: AccountItem[] = [{ kind: 'link', href: '/profile', key: 'nav.profile' }]
  if (sellerType === null) {
    items.push({ kind: 'link', href: '/devenir-vendeur', key: 'nav.become_seller' })
  }
  items.push({ kind: 'divider' })
  items.push({ kind: 'logout', key: 'nav.logout' })
  return items
}

/** The single active link for the current pathname + hash, by longest-prefix match.
 *  Three kinds of link:
 *   - Anchor links (e.g. '/#boutiques') light up only on an EXACT pathname+hash
 *     match, so clicking a section anchor moves the active pill off Accueil.
 *   - The home link '/' lights up only on '/' with NO section hash (so it dims
 *     once you scroll into a section anchor).
 *   - Regular route links match by longest pathname prefix, ignoring the hash.
 *  Longest-prefix avoids two links lighting up at once (e.g. the dashboard index
 *  vs a nested sub-page that shares its prefix). `hash` includes its leading '#'
 *  (or '' for none). Returns the matching href or null. */
export function activeHref(links: NavLink[], pathname: string, hash = ''): string | null {
  const current = pathname + hash
  let best: string | null = null
  let bestLen = -1
  for (const link of links) {
    const matches = link.href.includes('#')
      ? current === link.href
      : link.href === '/'
        ? pathname === '/' && hash === ''
        : pathname === link.href || pathname.startsWith(link.href + '/')
    if (matches && link.href.length > bestLen) {
      best = link.href
      bestLen = link.href.length
    }
  }
  return best
}

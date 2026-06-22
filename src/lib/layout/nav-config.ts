// Pure link/menu configuration for the Header, derived from the resolved
// HeaderState. No React, no i18n resolution here — entries carry i18n KEYS
// (resolved with t() at render time) and the real routes confirmed to exist
// during Step 0 discovery.

import type { HeaderState, SellerType } from './select-variant'

export type NavLink = { href: string; key: string }

/** Center-pill links for the resolved variant. Routes are the real ones that exist. */
export function navLinks(state: HeaderState): NavLink[] {
  if (state.variant === 'public') {
    // The marketing navbar. Boutiques / Freelances / À propos are landing-page
    // anchor sections (#boutiques and #freelances live in Journeys, #a-propos in
    // the footer). Missions points to /missions — the same target the page footer
    // links to; that route 404s until the Phase 7 job board ships.
    return [
      { href: '/', key: 'nav.home' },
      { href: '/#boutiques', key: 'nav.shops' },
      { href: '/#freelances', key: 'nav.freelancers' },
      { href: '/missions', key: 'nav.missions_board' },
      { href: '/#a-propos', key: 'nav.about' },
    ]
  }

  if (state.variant === 'consumer') {
    // /mes-demandes and /mes-favoris were removed in the design-phase reset; the
    // consumer center nav is just Accueil until the account-utility pages return.
    return [{ href: '/', key: 'nav.browse' }]
  }

  // Workspace variants are currently unreachable — the shop-owner and freelancer
  // dashboards were removed in the design-phase reset (their routes 404). They will
  // be rebuilt with their own nav; until then they resolve to no center-pill links.
  return []
}

export type AccountItem =
  | { kind: 'link'; href: string; key: string }
  | { kind: 'divider' }
  | { kind: 'logout'; key: string }

/** Account-dropdown items. /profile and /devenir-vendeur were removed in the
 *  design-phase reset, so for now the menu is just logout; account-utility links
 *  (profile, orders, favorites, become-seller) return here as they are rebuilt.
 *  The sellerType param is kept for the call sites and for that future branching. */
export function accountItems(_sellerType: SellerType): AccountItem[] {
  return [{ kind: 'logout', key: 'nav.logout' }]
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

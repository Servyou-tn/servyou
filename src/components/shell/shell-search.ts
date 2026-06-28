// Maps the current route to the topbar search placeholder key (design system Section 3.3 — the
// search is context-aware). Pure + unit-testable; the topbar reads it via usePathname(). Routes
// without a scoped search (favoris, settings, account, help, statistics) fall through to the
// generic placeholder. The submit target itself is the global /recherche engine — true in-list
// search is page behavior, deferred past the shell PR.
export function searchPlaceholderKey(pathname: string): string {
  if (pathname.startsWith('/mes-services')) return 'shell.topbar.search.services'
  if (pathname.startsWith('/trouver-des-missions')) return 'shell.topbar.search.missions'
  if (pathname.startsWith('/mes-engagements')) return 'shell.topbar.search.engagements'
  if (pathname.startsWith('/mes-propositions')) return 'shell.topbar.search.proposals'
  if (pathname.startsWith('/mes-commandes')) return 'shell.topbar.search.orders'
  if (pathname.startsWith('/marche') || pathname.startsWith('/produits')) {
    return 'shell.topbar.search.products'
  }
  return 'shell.topbar.search.default'
}

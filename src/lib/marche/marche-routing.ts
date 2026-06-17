// Pure routing helper for the legacy /marche entry point. The browse surface split into
// two engines (/marche/produits, /marche/services); /marche itself is now a redirect.
// Kept dependency-free so it is unit-tested directly (see marche-routing.test.ts).

import type { SearchType } from '@/lib/search/search-params'

// The two browse-engine routes, keyed by catalog type. The single source of truth for
// "where does each engine live" — the redirect resolver, the cross-engine toggle, and the
// sidebar all read it through the helpers below.
export const MARCHE_ENGINE_PATHS: Record<SearchType, string> = {
  product: '/marche/produits',
  service: '/marche/services',
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

/**
 * The browse-engine path for a catalog type. Drives the cross-engine toggle in the marche
 * top bar — after sidebar isolation that toggle is the ONLY way to switch engines, and it
 * lands on the clean other engine (bare path, no carried query/filters: the engines are
 * browse-by-default).
 */
export function marcheEngineHref(type: SearchType): string {
  return MARCHE_ENGINE_PATHS[type]
}

export type MarcheSidebarNav = {
  /** On any /marche route → the Marché accordion is expanded. */
  onMarche: boolean
  /** The Produits engine owns the visible sub-item + filter. */
  produitsActive: boolean
  /** The Services engine owns the visible sub-item + filter. */
  servicesActive: boolean
}

/**
 * Resolve which marche browse engine (if any) a pathname is on. Drives the sidebar's Marché
 * accordion: `onMarche` expands it; off /marche all three are false (collapsed). When
 * expanded, exactly one of produits/services is active and is the ONLY sub-item rendered —
 * each engine shows only its own side of the marketplace. Bare /marche (mid-redirect) and
 * /marche/produits* both read as the Produits engine (the default).
 */
export function resolveMarcheSidebarNav(pathname: string): MarcheSidebarNav {
  const onMarche = pathname === '/marche' || pathname.startsWith('/marche/')
  const servicesPath = MARCHE_ENGINE_PATHS.service
  const servicesActive =
    pathname === servicesPath || pathname.startsWith(servicesPath + '/')
  const produitsActive = onMarche && !servicesActive
  return { onMarche, produitsActive, servicesActive }
}

/**
 * Resolve a hit on /marche to its engine, preserving the refinement params so old
 * shareable links (e.g. /marche?type=service&q=logo&ville=Tunis) still land correctly.
 * `type` routes to the engine and is then dropped (the route IS the type); `page` is
 * dropped too (a fresh engine view starts at page 1). Default engine is Produits.
 */
export function marcheRedirectTarget(
  sp: Record<string, string | string[] | undefined>,
): string {
  const type: SearchType = first(sp.type) === 'service' ? 'service' : 'product'
  const carry = ['q', 'categorie', 'ville', 'prix_min', 'prix_max', 'tri'] as const
  const params = new URLSearchParams()
  for (const key of carry) {
    const v = first(sp[key])
    if (v != null && v.trim() !== '') params.set(key, v)
  }
  const qs = params.toString()
  const base = MARCHE_ENGINE_PATHS[type]
  return qs ? `${base}?${qs}` : base
}

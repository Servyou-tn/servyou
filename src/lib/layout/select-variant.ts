// Pure, presentation-free decision for which Header to render on a given route.
// Kept out of the React tree so it can be unit-tested in isolation (the Header
// itself is a client component that calls this with the live pathname).

export type HeaderVariant = 'public' | 'consumer' | 'workspace'
export type WorkspaceKind = 'shop' | 'freelance'
export type SellerType = 'shop_owner' | 'freelancer' | null

export type HeaderState = {
  /** When true, no Header chrome renders at all (admin owns its own nav; auth flows are chromeless). */
  hidden: boolean
  variant: HeaderVariant
  workspace?: WorkspaceKind
}

// Auth flows render chromeless (modern SaaS pattern); /admin/* is owned by AdminSidebar.
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/update-password']

/** True when `pathname` is exactly `base` or a child of it — with a real path boundary
 *  so that e.g. "/ma-boutiquex" does NOT count as under "/ma-boutique". */
function isUnder(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(base + '/')
}

export function selectVariant({
  isLoggedIn,
  sellerType,
  pathname,
}: {
  isLoggedIn: boolean
  sellerType: SellerType
  pathname: string
}): HeaderState {
  if (isUnder(pathname, '/admin')) return { hidden: true, variant: 'public' }
  if (AUTH_ROUTES.includes(pathname)) return { hidden: true, variant: 'public' }

  if (!isLoggedIn) return { hidden: false, variant: 'public' }

  // Workspace nav only when the role matches the workspace route. A logged-in user
  // whose role doesn't match is mid-redirect (the page guards bounce them), so show
  // the neutral consumer nav rather than a workspace they don't own.
  if (sellerType === 'shop_owner' && isUnder(pathname, '/ma-boutique')) {
    return { hidden: false, variant: 'workspace', workspace: 'shop' }
  }
  if (sellerType === 'freelancer' && isUnder(pathname, '/mon-profil-freelance')) {
    return { hidden: false, variant: 'workspace', workspace: 'freelance' }
  }

  return { hidden: false, variant: 'consumer' }
}

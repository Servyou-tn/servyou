import type { Role } from '@/lib/roles'

// Pure, presentation-free decision for which Header to render on a given route.
// Kept out of the React tree so it can be unit-tested in isolation (the Header
// itself is a client component that calls this with the live pathname).

export type HeaderVariant = 'public' | 'consumer' | 'workspace'
export type WorkspaceKind = 'shop' | 'freelance'
// The seller_type column's values ARE the resolved Role (consumer = null). Aliased so the header/nav
// call sites keep the SellerType name while @/lib/roles stays the single source of the union.
export type SellerType = Role

export type HeaderState = {
  /** When true, no Header chrome renders at all (admin owns its own nav; auth flows are chromeless). */
  hidden: boolean
  variant: HeaderVariant
  workspace?: WorkspaceKind
}

// The shared Header is now a marketing-only navbar: it renders ONLY on the landing
// page ('/'), and renders identically for logged-in and logged-out visitors (no
// consumer/workspace variant, no account avatar). Every other route is chromeless
// here — each owns its own nav (AdminSidebar, the auth funnels, future role
// dashboards). Visibility no longer depends on auth or role, only on the pathname.
//
// The `variant`/`workspace` machinery and the consumer/workspace nav-config branches
// are intentionally preserved (unused for now) so the per-role navbars can be rebuilt
// on this foundation when the role dashboards return.
export function selectVariant({ pathname }: { pathname: string }): HeaderState {
  if (pathname === '/') return { hidden: false, variant: 'public' }
  return { hidden: true, variant: 'public' }
}

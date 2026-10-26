import type { ShellRole } from '@/components/shell/sidebar-items'

// The seller_type → role resolver: the ONE place the frontend turns a profile's raw `seller_type`
// into a typed Role, plus the exhaustive mappings the app reads (i18n key, shell role, workspace
// path). Before F4a this was re-derived at 9 call sites in 3 shapes (roleFromSellerType, roleKey ×2,
// inline ===). Lives in lib — NEVER in components/ui, because boundary rule 3b forbids a primitive
// importing a role resolver, and that must stay true.
//
// PURE / client-safe by necessity: ProfileAvatarMenu and VerifyEmailFlow are `'use client'` and both
// call resolveRole, so this module must not import the server Supabase client (that would pull
// next/headers into the client bundle). The `import type { ShellRole }` is erased at build.
//
// There is deliberately NO getUserRole() reader here. Every current-user site already fetches a
// multi-field profile and derives the role locally via resolveRole, so a role-ONLY server read would
// be dead code today. If a FUTURE need is genuinely role-only and server-side, add ONE canonical
// reader HERE —
//   export async function getUserRole(): Promise<{ role: Role; isAdmin: boolean } | null>
// that reads the caller's OWN profiles row (owner-only RLS — never widen) — instead of scattering an
// 8th ad-hoc `.select('seller_type')`.

// consumer = null. `is_admin` is a SEPARATE boolean beside the role, NOT a fourth Role: modelling
// admin as a role would break the admin routes for a user who is both an admin and a seller.
export type Role = 'shop_owner' | 'freelancer' | null

function assertNever(x: never): never {
  throw new Error(`roles: unhandled Role ${JSON.stringify(x)}`)
}

// The single typed read of seller_type. Accepts any profile-like object (server rows, the top-bar
// user, admin table rows). An unknown/absent value resolves to consumer (defensive; the DB constraint
// keeps seller_type in {shop_owner, freelancer, null}).
export function resolveRole(profile: { seller_type?: string | null } | null | undefined): Role {
  const s = profile?.seller_type
  return s === 'shop_owner' || s === 'freelancer' ? s : null
}

// Role → admin i18n label key. `is_admin` wins (a user who is both admin and a seller reads as admin
// in the admin table's Role column). Exhaustive over Role — remove a case and tsc fails at assertNever.
export function roleI18nKey(role: Role, isAdmin: boolean): string {
  if (isAdmin) return 'admin.users.role_admin'
  switch (role) {
    case 'shop_owner':
      return 'admin.users.role_shop_owner'
    case 'freelancer':
      return 'admin.users.role_freelancer'
    case null:
      return 'admin.users.role_consumer'
    default:
      return assertNever(role)
  }
}

// Role → the v2 shell IA role (consumer for logged-out / no seller_type). Exhaustive over Role.
export function roleToShellRole(role: Role): ShellRole {
  switch (role) {
    case 'shop_owner':
      return 'shop_owner'
    case 'freelancer':
      return 'freelancer'
    case null:
      return 'consumer'
    default:
      return assertNever(role)
  }
}

// Role → workspace landing path (the post-verify cross-device fallback; consumer → home).
// Exhaustive over Role.
export function roleWorkspacePath(role: Role): string {
  switch (role) {
    // G4. Was '/ma-boutique', which has never existed — a shop owner verifying email on a second
    // device landed on a 404. The dashboard is the shop owner's real home base.
    case 'shop_owner':
      return '/tableau-de-bord-vendeur'
    case 'freelancer':
      return '/mon-profil-freelance'
    case null:
      return '/'
    default:
      return assertNever(role)
  }
}

// Role → the dashboard a signed-in user lands on after sign-in (and the "my space" link in the
// landing header). Distinct from roleWorkspacePath above, which is the post-email-verify fallback
// and deliberately left alone. Consumers have no dashboard route, so they stay on the marketplace
// entry; admins are handled by the callers (they keep `/` after sign-in, `/admin` as their space).
// Exhaustive over Role.
export function roleDashboardPath(role: Role): string {
  switch (role) {
    case 'shop_owner':
      return '/tableau-de-bord-vendeur' // G4
    case 'freelancer':
      return '/tableau-de-bord' // H4
    case null:
      return '/'
    default:
      return assertNever(role)
  }
}

// Where the signed-in header's "Tableau de bord" link points. `is_admin` wins (same precedence as
// roleI18nKey): an admin who is also a seller gets the admin area.
export function accountSpaceHref(role: Role, isAdmin: boolean): string {
  if (isAdmin) return '/admin'
  return role === null ? '/marche/produits' : roleDashboardPath(role)
}

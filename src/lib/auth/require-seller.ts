import { redirect } from 'next/navigation'
import { getShellUser } from '@/lib/marche/shell-user'
import { createClient } from '@/lib/supabase/server'
import { resolveRole, type Role } from '@/lib/roles'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'

// Shared seller guard for the workspace route groups (Zone G shop_owner, Zone H freelancer).
// Written for G4 as the first consumer, because repeating the auth-then-role-then-redirect
// dance per page across ten G routes is how one of them ends up subtly different — and the one
// that differs is the one that leaks.
//
// THREE outcomes, deliberately distinct:
//   logged out          -> /connexion?next=<the page they wanted>, so login returns them here
//   wrong / no role     -> the role-upgrade funnel (a consumer hitting a seller page wants
//                          /devenir-vendeur, not a 403 they cannot act on)
//   right role, no shop -> returned as `shop: null` for the caller to handle, NOT a redirect:
//                          G4 renders its own "create your shop" state, and only G2 can fix it.
//
// This is defence in depth on top of RLS, never instead of it: every query it feeds still runs
// under the user's own session, so a bypass of this guard still cannot read another shop's rows.

export type SellerContext = {
  userId: string
  role: Role
  topBarUser: Awaited<ReturnType<typeof getShellUser>> extends infer T
    ? T extends { topBarUser: infer U }
      ? U
      : never
    : never
}

export type ShopOwnerContext = SellerContext & {
  /** The owner's shop, or null when the account is a shop_owner that never completed G2. */
  shop: { id: string; name: string; city: string | null } | null
}

/**
 * Guard a shop_owner workspace page. Redirects a logged-out or non-shop-owner visitor;
 * otherwise returns the session, the resolved role and the owner's shop (possibly null).
 */
export async function requireShopOwner(nextPath: string): Promise<ShopOwnerContext> {
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(nextPath)}`)

  const role = resolveRole(shell.topBarUser)
  if (role !== 'shop_owner') redirect('/devenir-vendeur')

  const supabase = await createClient()
  // RLS restricts shops SELECT to `true` (public), so this is scoped by owner_id explicitly.
  // maybeSingle: shops.owner_id is UNIQUE-per-owner in practice but not constrained, and a
  // missing row is a real state (shop_owner who never finished G2), not an error.
  const { data, error } = await supabase
    .from('shops')
    .select('id, name, city')
    .eq('owner_id', shell.id)
    .maybeSingle()

  // Never swallow the error into "you have no shop" — that would send an owner with a real shop
  // into the create-a-shop state and invite a duplicate.
  if (error) {
    console.error('[require-seller] shop fetch failed:', error.message, error.code, error.details)
    throw new Error(`shop fetch failed: ${error.message}`)
  }

  return {
    userId: shell.id,
    role,
    topBarUser: shell.topBarUser,
    shop: data ?? null,
  }
}

export type FreelancerContext = SellerContext & {
  /** The freelancer's own row, or null when the account is a freelancer that never finished H2
   *  step 1 — see resolveOwnedFreelancerProfileId. A real state, not an error. */
  freelancerProfile: { id: string } | null
}

/**
 * Guard a freelancer workspace page (H4 and beyond). Same three-outcome shape as
 * requireShopOwner: logged-out and wrong-role both redirect; a freelancer with no
 * freelancer_profiles row yet is returned as `freelancerProfile: null` for the caller to handle,
 * not redirected — only H2 step 1 can fix that, and the caller renders its own prompt.
 */
export async function requireFreelancer(nextPath: string): Promise<FreelancerContext> {
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(nextPath)}`)

  const role = resolveRole(shell.topBarUser)
  if (role !== 'freelancer') redirect('/devenir-vendeur')

  const supabase = await createClient()
  const resolved = await resolveOwnedFreelancerProfileId(supabase, shell.id)

  // Never collapse a failed query into "no profile" — see resolveOwnedFreelancerProfileId's own
  // comment: that would push a freelancer WHO HAS a profile back into the create funnel.
  if (!resolved.ok && resolved.reason === 'query_failed') {
    throw new Error('freelancer profile fetch failed')
  }

  return {
    userId: shell.id,
    role,
    topBarUser: shell.topBarUser,
    freelancerProfile: resolved.ok ? { id: resolved.freelancerProfileId } : null,
  }
}

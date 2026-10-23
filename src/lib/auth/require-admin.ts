import { cache } from 'react'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Server-side admin guard, in the same two shapes the seller guards already use:
//
//   requireAdmin(nextPath) — for the admin LAYOUT and PAGES. Mirrors requireFreelancer
//     (require-seller.ts): logged out -> /connexion?next=<page>, not an admin -> '/', a failed
//     lookup throws. Called from the layout AND every admin page, because an App Router layout
//     does not re-render on client-side navigation between its child pages — a layout-only check
//     guards the first load, not the page segment fetched on the next click.
//
//   checkAdmin(supabase) — for SERVER ACTIONS. Returns a result instead of redirecting, for the
//     reason src/lib/shops/owner-shop.ts gives: an action's caller is a form that renders
//     { success, error }, and a redirect thrown mid-action is not something it can render.
//
// `profiles.is_admin` is a trustworthy signal: authenticated cannot write it (migration
// 20260609190541_lock_profiles_privileged_columns). This is defence in depth on top of the DB —
// the admin RLS policies and the is_admin()-gated SECURITY DEFINER RPCs stay the real boundary.

export type AdminCheck =
  | { ok: true; userId: string }
  | { ok: false; reason: 'unauthenticated' }
  | { ok: false; reason: 'forbidden' }
  /** The profiles lookup itself failed. Fails closed — never collapsed into "is an admin". */
  | { ok: false; reason: 'query_failed' }

export async function checkAdmin(supabase: SupabaseClient): Promise<AdminCheck> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'unauthenticated' }

  // Owner-read RLS lets a user read their own row, so this resolves the caller's own flag.
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('[require-admin] is_admin fetch failed:', error.message, error.code, error.details)
    return { ok: false, reason: 'query_failed' }
  }
  if (data?.is_admin !== true) return { ok: false, reason: 'forbidden' }

  return { ok: true, userId: user.id }
}

// Memoized per request (React cache), argument-free on purpose: the layout and the page call
// requireAdmin with different paths, and keying the cache on the path would run the lookup twice.
const checkAdminForRequest = cache(async (): Promise<AdminCheck> => checkAdmin(await createClient()))

/**
 * Guard an admin page or the admin layout. Redirects a logged-out or non-admin visitor; otherwise
 * returns the admin's user id.
 */
export async function requireAdmin(nextPath: string): Promise<{ userId: string }> {
  const check = await checkAdminForRequest()
  if (check.ok) return { userId: check.userId }

  if (check.reason === 'unauthenticated') redirect(`/connexion?next=${encodeURIComponent(nextPath)}`)
  if (check.reason === 'forbidden') redirect('/')
  throw new Error('admin check failed')
}

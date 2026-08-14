import type { SupabaseClient } from '@supabase/supabase-js'

// Resolves the freelancer_profiles row a write/guard should be attributed to, for the SERVER
// layer. Mirrors src/lib/shops/owner-shop.ts's resolveOwnedShopId — same "has the role vs has
// the profile" split G2 already solved for shops, applied to freelancer_profiles. See
// docs/design/h2-discovery.md §2 for the live count that makes this a real state, not a
// theoretical one: 1 of 11 seller_type='freelancer' profiles has no freelancer_profiles row.
//
// Simpler than the shop version: freelancer_profiles.profile_id IS unique (unlike
// shops.owner_id), so there is no multi-row ambiguity to detect — a plain maybeSingle() is
// the whole query, no limit(2)/ordering dance needed.

export type OwnedFreelancerProfile =
  | { ok: true; freelancerProfileId: string }
  /** Authenticated freelancer (seller_type='freelancer') who never completed H2 step 1. A real
   *  state, not an error. */
  | { ok: false; reason: 'no_profile' }
  /** The query itself failed. Never collapsed into 'no_profile' — that would invite a
   *  duplicate freelancer_profiles row past this guard. */
  | { ok: false; reason: 'query_failed' }

export async function resolveOwnedFreelancerProfileId(
  supabase: SupabaseClient,
  userId: string,
): Promise<OwnedFreelancerProfile> {
  const { data, error } = await supabase
    .from('freelancer_profiles')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle()

  // Never destructure only `data` (CLAUDE.md): a swallowed error here would read as "you have
  // no profile" and push a freelancer WITH a profile back into the create funnel.
  if (error) {
    console.error('[resolveOwnedFreelancerProfileId] fetch failed:', error.message, error.code, error.details)
    return { ok: false, reason: 'query_failed' }
  }
  if (!data) return { ok: false, reason: 'no_profile' }

  return { ok: true, freelancerProfileId: data.id as string }
}

import type { SupabaseClient } from '@supabase/supabase-js'

// Resolves the shop a write should be attributed to, for the SERVER-ACTION layer.
//
// WHY THIS EXISTS SEPARATELY FROM `requireShopOwner`. That guard is for PAGES: it redirects a
// logged-out visitor to /connexion and a non-owner to /devenir-vendeur. A server action cannot
// redirect its caller mid-mutation — it has to return a result the form can render. Same question,
// two answers, so the shape differs rather than the rule.
//
// ⚑ `shops.owner_id` IS NOT UNIQUE. There is only a non-unique index (`shops_owner_idx`), so one
// owner CAN hold multiple shops. Today the sole shop owner holds exactly one and nothing in the app
// can create a second, which is precisely what makes this dangerous: `.maybeSingle()` works now and
// THROWS the day a second shop appears, surfacing as a generic action failure on an unrelated day
// with nothing pointing at the cause.
//
// So: ordered, limit(2), take the first, and log loudly when a second exists. `limit(2)` rather
// than `limit(1)` on purpose — it is what makes ">1" detectable at all without fetching the set.
//
// ⚑ `requireShopOwner` (src/lib/auth/require-seller.ts:51) still uses `.maybeSingle()` and has the
// same latent break. NOT changed here: it is on ten other routes and rewriting it is a different
// PR's blast radius. Logged in docs/design/g6-write-path.md §2.

export type OwnedShop =
  | { ok: true; shopId: string }
  /** Authenticated shop_owner who never completed G2. A real state, not an error. */
  | { ok: false; reason: 'no_shop' }
  /** The query itself failed. Never collapsed into 'no_shop' — that would invite a duplicate shop. */
  | { ok: false; reason: 'query_failed' }

export async function resolveOwnedShopId(
  supabase: SupabaseClient,
  userId: string,
): Promise<OwnedShop> {
  const { data, error } = await supabase
    .from('shops')
    .select('id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(2)

  // Never destructure only `data` (CLAUDE.md): a swallowed error here would read as "you have no
  // shop" and push an owner WITH a shop into the create-a-shop funnel.
  if (error) {
    console.error('[resolveOwnedShopId] shops fetch failed:', error.message, error.code, error.details)
    return { ok: false, reason: 'query_failed' }
  }
  if (!data || data.length === 0) return { ok: false, reason: 'no_shop' }

  // TODO: shop switcher. Until one exists, the oldest shop is the deterministic choice — arbitrary
  // is fine, silent is not.
  if (data.length > 1) {
    console.warn(
      `[resolveOwnedShopId] user ${userId} owns more than one shop; using the oldest (${data[0].id}). ` +
        'shops.owner_id is not unique and there is no shop switcher — see docs/design/g6-write-path.md §2.',
    )
  }

  return { ok: true, shopId: data[0].id as string }
}

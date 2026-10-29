import { z } from 'zod'

// Favorites of a SHOP or a FREELANCER (migration 98: `favorites.item_type` 'shop' / 'freelancer', one row per user per target,
// `favorite_target_matches_type` CHECK). Products and services keep their own button (FavoriteButton) — unchanged.

export type FavoriteKind = 'shop' | 'freelancer'

/** The `favorites` column that carries each kind's target id (exactly one is non-null per row — the CHECK). */
export const TARGET_COLUMN = {
  shop: 'shop_id',
  freelancer: 'freelancer_profile_id',
} as const satisfies Record<FavoriteKind, string>

export const SetFavoriteInput = z.object({
  kind: z.enum(['shop', 'freelancer']),
  targetId: z.string().uuid(),
  /** The state the caller wants — idempotent, so a double click or a retry cannot flip it back. */
  favorited: z.boolean(),
})

export type SetFavoriteInput = z.infer<typeof SetFavoriteInput>

/** Where a guest lands after signing in: the public page of the target they tried to favorite. */
export function favoriteReturnPath(kind: FavoriteKind, targetId: string): string {
  return kind === 'shop' ? `/boutique/${targetId}` : `/freelance/${targetId}`
}

/** `/connexion?next=…` for a guest tapping a heart (same `?next=` pattern as every guarded destination). */
export function signInHref(nextPath: string): string {
  return `/connexion?next=${encodeURIComponent(nextPath)}`
}

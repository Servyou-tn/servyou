// Favorites of a SHOP or a FREELANCER (migration 98: `favorites.item_type` 'shop' / 'freelancer', one row per user per target,
// `favorite_target_matches_type` CHECK). Products and services keep their own button (FavoriteButton) — unchanged.
//
// Client components import this file (TopbarUserMenu, the hearts), so it must stay free of zod: the action's input schema
// lives in the server-only ./set-favorite-input.ts (speed PR-1).

export type FavoriteKind = 'shop' | 'freelancer'

/** The `favorites` column that carries each kind's target id (exactly one is non-null per row — the CHECK). */
export const TARGET_COLUMN = {
  shop: 'shop_id',
  freelancer: 'freelancer_profile_id',
} as const satisfies Record<FavoriteKind, string>

/** Where a guest lands after signing in: the public page of the target they tried to favorite. */
export function favoriteReturnPath(kind: FavoriteKind, targetId: string): string {
  return kind === 'shop' ? `/boutique/${targetId}` : `/freelance/${targetId}`
}

/** `/connexion?next=…` for a guest tapping a heart (same `?next=` pattern as every guarded destination). */
export function signInHref(nextPath: string): string {
  return `/connexion?next=${encodeURIComponent(nextPath)}`
}

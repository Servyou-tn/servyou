# B6 Favoris Boutiques / Freelances + hearts on D3 / D4 (`feat/favoris-boutiques-freelances`, 2026-10-29)

## Paramètres 375 mobile (node 1488:59777) not yet measured
**What:** the founder asked for the mobile Notifications frame to be measured and adjusted « on the next branch if needed ». It lives in `ParametresShell` / `NotificationsTab`, which only exist after #235 merges, so it is not in this PR.
**Trigger:** #235 merged → one `fig.mjs dump 1488:59777`, compare, small commit.

## « Affichage 1 à N sur N » footer under the favorites lists
**What:** the frames draw a pagination row (« Affichage 1 à 6 sur 6 ») under the Boutiques / Freelances grids. `Pagination` self-hides at one page, exactly like the Produits / Services tabs, so nothing renders at current volumes.
**Trigger:** a user with more than one page of favorites (the lists are unpaginated today) — add real paging for all four tabs together.

## The hearts are a client write path of their own
**What:** D3 / D4 hearts use the idempotent server action `setFavoriteAction`; products and services still use the older `FavoriteButton` (client Supabase + a `useEffect` read). Two mechanisms for one table.
**Trigger:** next touch of `FavoriteButton` — move products / services onto the action and seed their state from the server.

## Freelancer Card border
**What:** the frame's specimens draw a `blue/600` border; it reads as a hover/selected state, so the resting border is `border/subtle` and `blue/600` shows on hover. Confirm with design.

## Shop Card `state` variants (hover / etc.)
**What:** `Shop Card` has more states (578:42186 / 42216 / 42246) that B4 will measure; the card here is the default state only.
**Trigger:** B4.

## Favorites list is capped, not paged
**What:** `getMyFavoriteTargets` loads the 60 most recent shop/freelancer favorites (`FAVORITE_TARGETS_CAP`) — it bounds the `.in()` URL length and the one-query-per-shop card fan-out (review of #237). Older favorites are not shown.
**Trigger:** a user with more than 60 shop/freelancer favorites → real paging for all four tabs (also resolves the « Affichage 1 à N » footer above).

## Freelancer service count reads ids, not a count
**What:** `getFreelancerCards` counts services client-side from `select freelancer_profile_id` over the visible freelancers; with ≤ 60 freelancers it stays well under the API row cap, but a bigger listing page (B4-style) would need per-freelancer `count: 'exact'`.
**Trigger:** the first caller with more than ~100 freelancers per batch.

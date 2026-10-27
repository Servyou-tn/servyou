# Pluralization helper + AR fixes (`feat/i18n-plurals`, 2026-08-23)

## `consumer.dashboard.orders.confirm_count` still holds literal French in `ar.ts` — found, not fixed here

- **What:** while migrating `consumer.dashboard.orders.count_one`/`count_many` (which held literal
  French in `ar.ts` — fixed in this PR by the migration to `tn()`), the adjacent key
  `consumer.dashboard.orders.confirm_count` (`"{n} à confirmer"`, rendered in
  `ActiveOrdersSnapshot.tsx` next to the migrated line) turned out to have the exact same defect:
  its `ar.ts` value is the same literal French string, untranslated.
- **Why deferred:** not named in this PR's brief (which scoped exactly two keys), and it is not a
  plural-agreement bug — "à confirmer" doesn't inflect by count, so it needs a straight translation
  fix, not `tn()`. Per the standing PR-discipline rule, an out-of-scope bug found mid-PR gets logged,
  not fixed inline.
- **Trigger:** next AR-copy pass, or bundle it with any future touch of `ActiveOrdersSnapshot.tsx`.
  Needs a real Arabic translation for "{n} à confirmer" (e.g. "{n} بانتظار التأكيد").

## `boutique.public.products_count` and `seller.dashboard.tile.profit_sub` — real one/two data doesn't exist yet

- **What:** `tn()`'s `one`/`two` variants for these two keys are unit-tested but not
  screenshot-verified against real data — the live DB has exactly one shop (25 active products, so
  only the `other` bucket is reachable for `products_count`) and no delivered order yet carries a
  `unit_price_tnd` snapshot (so `profit_sub` never renders at all today — `netProfit` stays `null`
  and the muted "profit_soon" tile shows instead, per the existing phase-aware gating).
- **Why deferred:** seeding a second shop or backfilling a price snapshot to force a screenshot
  wasn't worth the blast radius on production data for a text-wiring check the unit tests already
  cover deterministically.
- **Trigger:** once a second real shop or a snapshot-bearing delivered order exists, confirm
  `boutique.public.products_count` / `seller.dashboard.tile.profit_sub` render correctly at 1 and 2
  in situ (both AR and FR).

## `mesannonces.expiry_countdown` cannot be screenshot-verified with ANY real data today — the countdown window itself is unreachable, not just a specific count

- **What:** `getExpiryCountdownDays()` (`lib/marche/annonce-expiry-countdown.ts`) only returns a
  number inside the **last 7 days** of a post's 30-day life — outside that window it returns `null`
  and `AnnonceCard` renders no countdown chip at all. The 6 real `job_posts` rows are either ~46
  minutes old or ~80 days old; none falls in the 23-29-day window that would make the chip render.
  So this key can't be proven live at ANY count today, not even `other`.
- **Why deferred:** the gap is in the data (no post is the right age), not in the code. Backdating
  a real post's `created_at` to force the window, or waiting three weeks for the new one to enter
  it, wasn't worth doing for a screenshot when `plurals.test.ts` already asserts the exact FR/AR
  strings the component calls `tn()` with.
- **Trigger:** once a real post naturally sits in its last 7 days, confirm the chip renders "Expire
  dans {n} j" (FR) / the correct one-يوم / two-يومين / other-أيام form (AR) in situ.

## `mesfavoris.count` cannot be screenshot-verified at all — the `favorites` table has zero rows in the live DB

- **What:** every `tn('mesfavoris.count', ...)` call site is gated `total > 0 ? tn(...) : undefined`
  (`mes-favoris/page.tsx:29`), and the live `favorites` table currently has 0 rows across every
  account. There is no way to reach a non-empty `/mes-favoris` today without writing a favorite —
  the empty state is all that's reachable.
- **Why deferred:** favoriting a product/service through the app UI (rather than a raw INSERT)
  would work and leaves no orphaned data, but doing it purely to screenshot a count pill wasn't
  worth the extra write for a check `plurals.test.ts`'s `mesfavoris.count` assertions already cover
  deterministically (same `one`/`two`/`other` shape as `mesannonces.count`, which IS
  screenshot-verified against 3 real accounts).
- **Trigger:** next time `/mes-favoris` is touched with real favorited data in hand, confirm
  "{count} favori" / "1 مفضّلة" render correctly at 1 in situ.

## `consumer.dashboard.orders.count` (`ActiveOrdersSnapshot`) has zero page importers — confirmed pre-existing, not caused by this PR

- **What:** while migrating `consumer.dashboard.orders.count_one`/`count_many` to `tn()`, a grep for
  `ActiveOrdersSnapshot` (the component that calls this key) turned up no importer anywhere in
  `src/app` — the component is real, tested (`ActiveOrdersSnapshot.test.ts`), and exports cleanly,
  but no page currently renders it. `/tableau-de-bord` (the obvious guess) is a `ComingSoon` stub for
  a `seller_type: null` account, and `ConsumerHomepage.tsx` doesn't import it either.
- **Why deferred:** this predates the PR — nothing in this diff removed an import — and wiring a
  dashboard section into a real page is a product decision outside a pluralization PR's scope.
- **Trigger:** whichever PR builds the real consumer dashboard route. Until then,
  `consumer.dashboard.orders.count`'s exact FR/AR wording is proven only by `plurals.test.ts`, not by
  a screenshot — there is no live route to screenshot.

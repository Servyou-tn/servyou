# Purging corrupt storage objects (`chore/purge-corrupt-product-images`, 2026-08-07)

## What was purged, and why nothing could be salvaged

- **6 objects out of `product-images`, and 5 `product_images` rows**, leaving both at zero:
  - 5 objects under `f4757d2d…/8eff9603…/` — the entire gallery of the first real seller product
    ("Baskets Nike Air Force 1 Low en cuir"), 42,145 / 167,182 / 14,335 / 70,524 / 38,261 bytes,
    each with a `product_images` row at `display_order` 0-4.
  - 1 object under `f4757d2d…/8e397079…/` (74,410 B) — the deliberate orphan left by the PR #122
    verification upload, which proved the fix without publishing a product, so it never had a row.
- **Cause:** a Node `Buffer` passed to `supabase.storage.upload()` was stringified through UTF-8 by
  storage-js 2.107.0 (`dist/index.mjs:620`), turning every non-UTF-8 byte into U+FFFD. Fixed in
  PR #122 by sending a `Blob`, which takes the FormData branch (`:610`) instead.
- ⚑ **Unrecoverable, which is why this was a delete and not a repair.** U+FFFD is a *replacement*,
  not an escape — the original byte is gone, so there is no inverse transform. `sharp` reports
  `corrupt header: webp: unable to parse image`, and the damage is visible in the header: the RIFF
  length field still declares the pre-corruption size (23,310) while the file is 42,145 bytes,
  ~1.8x inflated. Do not spend time on a recovery script for this class.
- **Deliberately NOT deleted:** the `products` row itself. Only its photos went — title, `active`
  status, 10.00 TND, delivery fee, `stock_count` 10 and category Mode are untouched, and
  `updated_at` was unchanged by the operation (`14:31:46`), which is the cheap proof nothing else
  in the row moved.

## 🔴 Delete storage objects through the Storage API — NEVER `delete from storage.objects`

- A SQL delete against `storage.objects` removes **only the metadata row**. The physical file stays
  in the S3 backend: still billed, still counted against the 1 GB free tier, and now invisible to
  every listing, every sweep and every audit — because all of them enumerate through the metadata
  table that no longer mentions it.
- That is strictly worse than the corruption being cleaned up: a corrupt object you can see is a
  bug, an untracked file you cannot see is a leak with no handle to grab.
- **Use `supabase.storage.from(bucket).remove([paths])` with explicit paths**, never a prefix
  wildcard — the blast radius of a cleanup should be readable at a glance in the diff or the script.
- This applies to any future cleanup: the reconciliation sweep in
  `docs/design/image-storage-discovery.md` §6c, avatar sweeps, and shop-asset cleanup all inherit
  the same rule.

## The verification shape that made this trustworthy

Three habits, each of which caught something a naive version would have missed:

- **Check the REVERSE direction before deleting.** The brief was "objects to remove", but "zero
  dangling pointers" also depends on rows pointing at objects that do not exist. Querying
  `product_images` rows with no matching `storage.objects` entry returned 0 — so the inventory was
  complete in both directions, and the delete could not leave a half-cleaned state. A one-directional
  inventory would have looked equally green while missing that class entirely.
- ⚑ **`.remove()` FAILS OPEN — never treat its return value as proof.** It returns success with an
  empty `data` array when it deleted nothing (RLS hiding the rows is the usual reason). Its report
  said "6 deleted" here, and that was still not evidence. Verification came from three independent
  angles instead: re-querying `storage.objects` (0 rows), re-querying `product_images` (0 rows), and
  fetching the public URLs directly (400, not 200) — the last being the only one that proves the
  bytes left the backend rather than just the index.
- **Snapshot the row you intend to KEEP, before the delete.** The product row was captured up front
  precisely so "the product survived intact" could be asserted field by field afterwards instead of
  eyeballed. `updated_at` matching is what turns "it looks fine" into "nothing touched it".

## 🟡 D1 `/produits/[id]` has NO 375 frame — every responsive value on it is INFERRED

- **What:** D1 was rebuilt (feat/d1-product-detail) from `562:39013`, a **1440 frame plus four
  DESKTOP specimens** (`563:39552` galerie · `563:39579` rupture · `563:39668` partager ·
  `563:39705` signaler). There is no mobile frame anywhere on the Screens page. Every desktop
  number in the build is measured and recorded in `docs/design/d1-discovery.md §2`; **every
  responsive number is a decision, not a measurement.**
- **What was inferred** (founder-approved, following D2's pattern rather than inventing a third
  answer): single column below `lg` · gallery main from 600² to a full-width `aspect-square` ·
  thumb strip horizontally scrollable (`overflow-x-auto`, inert at `lg` where 368 < 600) ·
  related row on C1's `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`.
- **⚑ This is the SAME gap C1 already carries** — see `docs/design/marche-produits-measurements.md`
  "Known gaps", which logs that no 375 C1 frame exists either and that its `grid-cols-1` /
  `sm:grid-cols-2` ramp is inherited verbatim from `ListingResults` with no design source. **Two
  product surfaces now share one undrawn mobile story.** The services side resolved the analogous
  question only once it had a 375 frame (`sm:gap-6` desktop / `gap-4` mobile, delta P11).
- **Trigger:** draw the 375 frames for C1 and D1 together, in one pass, and reconcile both ramps
  against them. Doing D1 alone would re-create the split it is currently avoiding.
- **Verified at 375 in a real browser regardless:** strip scrolls (368 vs 343 client), the last
  thumb is reachable and selectable after scrolling, and `documentElement.scrollWidth` is 375
  against a 375 viewport — no horizontal overflow. So the inferred layout *works*; it is just not
  *designed*.

**🟡 E1-product `/demander/[id]` (product branch) joins this same gap.** Built from `589:43997` —
one 1440 frame, no mobile specimen anywhere on the Screens page, same as D1's own measurement
(`docs/design/d1-discovery.md §6`). The stacked layout below `xl:` (order summary first in the
DOM, form second — E1-service's own `col-start`/`row-start` reorder trick, just moved to a
different breakpoint per the grid-overflow rulings) is INFERRED from the sibling that does have
one, not measured. **Three product/service-adjacent surfaces now share one undrawn mobile story**
(D1, C1, and now E1-product) — the trigger below should draw all three together, not just the
original two, or a fourth pass will split the reconciliation again.

- **Verification status:** see the PR's own verification section for the actual 375/band results —
  not restated here to avoid this doc drifting out of sync with what was really measured.

## D2's share control is inert — it links to the page it is already on

- **What:** `ServiceDetail.tsx:91-99` renders the share affordance as
  `<Link href={`/services/${service.id}`}>` carrying `aria-label={t('serviceDetail.share')}` —
  which is "Copier le lien". Clicking it navigates to the current page and copies nothing.
- **Found during:** the D1 build, while looking for a share precedent to follow. **D1 deliberately
  did NOT reproduce it** — `ShareLinkButton` writes `window.location.href` to the clipboard and
  toasts `product.detail.link_copied`, using keys that already existed in both locales.
- **Why deferred:** one PR, one focus. D1 is a product-surface PR and D2 is a different route; the
  fix is ~15 lines (swap the `<Link>` for the same client component) but it belongs in a PR that
  can gate D2's own walkthrough.
- **Trigger:** next time D2 is opened for any reason. `ShareLinkButton` is already generic enough
  to serve it — only the toast key differs, and `serviceDetail.share` would need a sibling
  `link_copied` key in fr.ts/ar.ts.

## `ProductBrowseCard` + `ProductCoverImage` are route-local but now serve two routes

- **What:** both live in `src/app/marche/produits/_components/` and are now imported from
  `src/components/produits/` by D1 — a component in the shared tree reaching **into** an app route's
  private `_components` folder. It works and it is intentional (founder ruling: import in place, do
  not move), but the direction of that dependency is backwards.
- **Why not moved now:** moving them means touching C1's imports inside a D1 PR, and C1 is the
  surface whose card geometry the whole D1 related-row measurement is calibrated against. The move
  is mechanical; the risk is that it lands in a PR whose reviewer is looking at a different page.
- **⚑ `ProductCoverImage` DID gain one additive change here:** an optional `priority` prop
  defaulting to `false`, so every existing C1 call site renders byte-identically. D1's gallery main
  image is the page's LCP element and the standards require `priority` above the fold; the
  alternative was re-inlining the placeholder at the call site, which that component's own header
  explicitly forbids.
- **Trigger:** when D3 `/boutique/[slug]` becomes the **third** consumer. At that point move both to
  `src/components/produits/` in their own PR and update all three import sites together.
- **🔴 ADDENDUM (F1-favoris PR, 2026-08-16) — the trigger already fired, and now there's a fourth.**
  `ProductBrowseCard` itself (not just `ProductCoverImage`) is imported directly from
  `@/app/marche/produits/_components/ProductBrowseCard` by THREE call sites already:
  `ProductBrowseGrid.tsx` (C1), `ProductDetail.tsx` (D1), `ShopDetail.tsx` (D3) — the "third
  consumer" trigger above was met before this PR touched anything. F1 adds a fourth
  (`src/app/mes-favoris/_components/FavorisProductGrid.tsx`, same import path, same in-place
  pattern per the existing ruling — see `docs/design/f1-discovery.md` §2). Not moved here either:
  this PR is a header fix + card swap, not the promotion PR the founder already scoped above.
  Four call sites reaching into one route's private folder is a stronger case for that promotion
  PR than three was — nothing here changes the plan, just the urgency.

## `tndPrice` is locale-blind, and `ar.ts` carries two currency notations

- **What:** `tndPrice` (`listing-utils.ts`) hardcodes Latin `" TND"` and takes no `lang`, so every
  price on every Arabic page renders `1600 TND`. Meanwhile `ar.ts` uses `د.ت` in **22** places —
  including `product.form.currency_suffix`, which is the currency adornment inside G6's own price
  field — while its header comment states the opposite rule: *"Currency code mirrors fr.ts: fr uses
  'TND', so ar keeps 'TND'."* The file contradicts its own documented convention.
- **Surfaced by:** D1's price block, which is three adjacent lines — the price through `tndPrice`,
  then a fee line and a total line through translated templates. Writing `د.ت` in the two new AR
  templates put **two notations inside one block**. D1 followed the header rule and uses `TND` in
  both, so the block is internally consistent; it did **not** resolve which notation Servyou
  actually wants.
- **Why deferred:** `tndPrice` serves `/recherche`, `/categories/[slug]`, `ConsumerHomepage`, C1 and
  now D1. Making it locale-aware is a one-line change to the function and a five-surface AR
  walkthrough — and the *product* question (does an Arabic Servyou page say `TND` or `د.ت`?) is a
  founder call, not an engineering one. Picking one inside a D1 PR would set platform-wide currency
  vocabulary from a product-detail page.
- **Trigger:** the next i18n pass, or the first time a founder reviews an Arabic page with prices.
  Decide the notation first, then either add `lang` to `tndPrice` or normalise the 22 `د.ت` strings
  — not both.
- **🔴 ADDENDUM (E1-product PR, 2026-08-10) — this is not only a notation choice, it is an actual
  bidi rendering defect, confirmed in a real browser.** `"1600 TND"` is the correct DOM text on
  every affected page (as the entry above already says), but the VISUAL order under `dir="rtl"` is
  not "1600 TND" — it renders **"TND 1600"**, the two tokens swapped. Per UAX#9 (rules W7/N1/N2): a
  digit run (EN) followed by a space then a strong-LTR letter run (the Latin "TND"), with no
  strong-LTR character preceding the digits, gets reordered so the letter run moves ahead of the
  number under an RTL paragraph — the identical bug class as D1's gallery counter
  ([[reference_rtl_numeric_run_reversal]]-shaped, just EN+L instead of EN+neutral+EN). Confirmed
  live on E1-product's own price rows before they were fixed locally (`dir="ltr"` on each value
  span, matching D1's counter fix) — **not fixed at the source** in this PR, since `tndPrice` has
  five OTHER call sites this PR does not touch, and a source-level fix is exactly the "add `lang` to
  `tndPrice`" work this entry already describes. Whoever picks up this trigger should treat
  `dir="ltr"` (not merely the `د.ت`-vs-`TND` notation) as part of the fix — a locale-aware
  `tndPrice` that still lacks bidi isolation will produce a correctly-worded, still-visually-
  reversed price.

## `aria-label="Fil d'Ariane"` is hardcoded French on both detail pages

- **What:** the breadcrumb `<nav>` on `ProductDetail.tsx` and `ServiceDetail.tsx:142` both carry a
  literal French accessible name, so an Arabic screen-reader user hears "Fil d'Ariane".
- **Why deferred:** D1 copied D2's existing markup deliberately — matching the precedent was the
  right call for a rebuild, and diverging on one page would leave the two detail pages announcing
  their breadcrumbs differently. It is two surfaces and one new i18n key.
- **Trigger:** fix both together with a `common.breadcrumb.label` key. Cheap; just not a D1 change.

## 🔴 PRE-LAUNCH — Google Fonts CDN is a third-party single point of failure for every route

- **What:** `src/app/layout.tsx` loads both platform typefaces — Cairo (AR) and Inter (FR/default)
  — through `next/font/google`. In production this self-hosts and the runtime dependency on Google
  disappears; **in dev (Turbopack), it does not** — the font CSS/files are fetched from
  `fonts.gstatic.com`/`fonts.googleapis.com` at compile time, and because `layout.tsx` is the root
  layout, a failed font module fails the module graph for **every route**, `/connexion` included.
- **Confirmed live, 2026-08-12** (while chasing an unrelated blocked CDP pass, see
  `g2-discovery.md` §26): a genuine Google-side CDN blip caused `fonts.gstatic.com` to 404 on the
  exact Cairo `.woff2` path this app requests, and the dev server 500'd on every route with
  `Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'`. Worse: the
  outage **did not need to still be happening** for the app to stay broken — Turbopack's dev cache
  had baked in the failed CSS response (dead asset hashes), so even after Google recovered
  (confirmed by a bare `curl` returning real `200`s), the app kept 500ing until `.next` was deleted
  and the dev server restarted. Two compounding failure modes on one third-party dependency.
- **Why this matters for Tunisia specifically, not just as a general best practice:** per this
  repo's own market anchors (CLAUDE.md), Servyou serves a market where mobile-first,
  intermittent-connectivity access is the norm, not the edge case. A platform whose landing,
  login, and every other page depend on a single external CDN being reachable is a self-inflicted
  outage surface that has nothing to do with Servyou's own infrastructure or Supabase/Vercel
  uptime.
- **Fix:** self-host both font families (download the `.woff2` files, serve them via
  `next/font/local` or a static `/public` path) — removes the runtime Google dependency in dev
  *and* removes any residual build-time fetch dependency in production, where `next/font/google`
  already self-hosts the *output* but still needs to reach Google *once*, at build time, to
  produce it.
- **Why deferred:** not a regression in any open PR, not blocking `feat/g2-success` (the CDP pass
  it was discovered during a dev-server restart + `.next` clear unblocked it fully, so this is a
  resilience gap, not an active bug) — a platform-wide infra change, not this branch's blast
  radius.
- **Trigger:** pre-launch hardening pass, alongside wiring up Sentry (`docs/follow-ups.md:450`
  already tracks the `@sentry/nextjs` dependency bump) — both are "the platform should not go dark
  because of a third party" items and read naturally as one pass.

## ✅ RESOLVED 2026-08-12 — every guarded-page bounce to `/connexion` sends `?next=`, but `SigninForm` only reads `?redirect=`

- **Fixed on `fix/signin-next-param`.** `SigninForm.tsx` now reads `?next=` via a new
  `resolvePostLoginDestination()` (`src/lib/internal-path.ts`), matching all 10 producer call
  sites below. Verified live across three guarded routes (`/mon-compte`, `/parametres`,
  `/ma-boutique/creer/configuration`) plus two crafted external `next` values (`//evil.example.com`,
  `https://evil.example.com`), both correctly rejected and falling back to `/`. Unit tests added
  (`src/__tests__/internal-path.test.ts`) covering the param-name contract itself, including a
  `next` value that carries its own query string, so a future rename back to `redirect` fails a
  test instead of silently regressing. Original write-up kept below for context.

## Every guarded-page bounce to `/connexion` sends `?next=`, but `SigninForm` only reads `?redirect=`

- **What:** `SigninForm.tsx:76` reads the return destination as
  `new URLSearchParams(window.location.search).get('redirect')`. Every server-side guard in the app
  that redirects a logged-out visitor to sign in builds the query string as `?next=` instead —
  confirmed at **10 call sites**: `succes/page.tsx:40` and `configuration/page.tsx:32` (both new in
  this PR), `ma-boutique/creer/page.tsx:33`, `mon-compte/page.tsx:23`, `parametres/page.tsx:18/21`,
  `mes-commandes/[id]/page.tsx:20`, `mes-missions/[id]/page.tsx:30`, `demander/[id]/page.tsx:29`, and
  the shared `require-seller.ts:42` helper (used by `mes-produits/ajouter` and others). `next` is
  never read anywhere under `src/app/connexion/`, including the page component itself
  (`connexion/page.tsx`) which awaits `searchParams` but only forwards `passwordReset`. The result:
  sign in from any guarded page and you land on `/` (SigninForm's own fallback,
  `SigninForm.tsx:85`), not back on the page you were trying to reach — silently, no error, easy to
  miss in a click-through because "landing on the marketplace" doesn't look broken.
- **Surfaced by:** the G2-success CDP verification pass (2026-08-12,
  `g2-discovery.md` §26) — noticed while scripting a real sign-in through `/connexion`, not fixed
  there per "one PR, one focus"; this is a pre-existing, wider-than-this-PR defect, not something
  `succes/page.tsx` introduced (it copied the same `?next=` pattern every other guard already uses).
- **Fix:** either rename every producer's query key to `redirect` (10+ call sites, mechanical, easy
  to grep-verify), or make `SigninForm.tsx:76` read `next` (one line, matches the majority
  convention already in the codebase, and would need `connexion/page.tsx` to also stop dropping it
  if a server-rendered variant of the check is ever added). The second is cheaper and matches what
  every guard already writes — no reason to rename 10 call sites to fix a 1-line reader.
- **Trigger:** next PR that touches `/connexion` or any of the listed guards. Grep
  `?next=` before assuming this list is exhaustive — this pass found it via a full-repo search, not
  a systematic audit of every guard.

## `servyou-pages-elements-and-interactions.md`'s sign-in spec describes role-based landing pages that don't exist

- **What:** `docs/servyou-pages-elements-and-interactions.md:367` (section B.2, sign-in) still says
  "the server action... redirects to the user's appropriate landing page based on their role:
  consumers go to `/`, shop owners go to `/ma-boutique`, freelancers go to `/mon-profil-freelance`."
  `SigninForm.tsx`'s own comment says otherwise: "Role dashboards were removed in the design-phase
  reset... until then there is one destination for all roles" — every role currently lands on `/`.
- **Why deferred:** noticed while fixing the adjacent `?next=`/`?redirect=` param-name bug
  (`fix/signin-next-param`, 2026-08-12) — that fix corrected the param name in the same sentence
  (it's the literal subject of that PR) but did not touch this separate, pre-existing role-landing
  claim, which is wider doc-drift unrelated to the redirect-param fix.
- **Trigger:** whenever role-specific post-login landing pages actually get built, or the next pass
  through this doc for unrelated reasons — cheap to fix (one clause), just not this PR's scope.

## 7 orphaned `shop-assets` storage objects from G2's own verification fixtures — never swept

- **What:** `storage.objects` (bucket `shop-assets`, public, `image/webp` only) holds 7 objects
  across 4 shop-id-shaped folders, all timestamped 2026-08-11, none of which match any `shops.id`
  in the live DB today. These are leftovers from the G2 step-1/step-2 CDP verification passes:
  ephemeral service-role-seeded fixtures (auth user + shop row) that uploaded a real logo/banner
  through the real write path, then had their **DB rows** torn down (`auth.admin.deleteUser`,
  cascading `profiles` → `shops`) — but the **storage objects were never swept**, because the
  teardown scripts (deleted after use, per this repo's own convention) only deleted the DB side.
- **Confirmed live** (`fix/d3`, 2026-08-12): downloaded 3 of the 7 and ran `sharp().metadata()` —
  all decode clean (`webp`, `1024×1024` banner / `512×512` logo, `srgb`). Not corrupt, just
  orphaned. Small (≈4.5–12 KB each, ~50 KB total) — not urgent, but the general problem this is one
  instance of is already tracked (see below) and this repo's own storage-hygiene rule applies.
- **This is a harness/verification-process gap, not a product feature gap.** The general
  "reconciliation sweep" this needs is already tracked at this file's own **"Orphaned storage
  objects need a reconciliation sweep before the first deletable image surface"** entry (line 89) —
  that entry already names `shops.logo_url`/`banner_url` as a future sweep target. This is the
  first concrete instance of exactly what it predicted, arriving via test-fixture teardown rather
  than a real deletable-image-surface PR.
- **Whoever sweeps this must go through the Storage API, never SQL** — this repo's own rule, already
  logged and learned the hard way: **"🔴 Delete storage objects through the Storage API — NEVER
  `delete from storage.objects`"** (line 1650). A SQL delete only removes the metadata row; the
  physical file stays in the S3 backend, still billed, still counted against the 1 GB free tier,
  and now invisible to every future sweep because sweeps enumerate through the metadata.
- **Trigger:** either the general reconciliation-sweep entry's own trigger (first deletable image
  surface), or — cheaper — whoever next writes a CDP verification fixture that uploads to
  `shop-assets` should add a storage sweep to that fixture's own teardown (mirroring
  `scripts/rls-smoke.mjs`'s `sweepSmokeStorage`, which already does this correctly for its own
  buckets — the pattern exists, this class of fixture just didn't use it).

## Admin `signalements` detail page's `TARGET_ROUTES` map has wrong base paths for 4 of 6 target types

- **What:** `src/app/admin/signalements/[id]/page.tsx:52-58` maps `report.target_type` to a base
  path for the "view target" link: `product: '/produit'` (real route is `/produits/[id]`, plural),
  `service: '/service'` (real route is `/services/[id]`, plural) — both singular where the app is
  plural. `shop: '/boutique'` is correct (confirmed while verifying this PR's own D3 route lands
  where every existing caller already expected it). `freelancer_profile: '/freelance'` is also
  unverified — D4 is not built yet, so there is nothing to check it against.
- **Why deferred:** found incidentally while confirming the admin surfaces that link to
  `/boutique/{id}` were shaped correctly (they were) — a different target-type's base path, no
  overlap with D3's own scope.
- **Trigger:** next pass through the admin moderation surfaces, or whenever `/produits`/`/services`
  next changes shape. Two-line fix (`/produit`→`/produits`, `/service`→`/services`), just not found
  by this PR's own walk.

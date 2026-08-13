# D3 « Boutique publique » — discovery record

**Provenance.** Built on `fix/d3`, 2026-08-12. Figma frame `540:32918` (main, 1440) + `540:32920`
("right" — desktop content panel, see §1), specimens `543:33852` (share dialog), `543:33895`
(report modal), `543:33938` (empty shop). File `jDNjJ8D1gnXiW7Ry3GkN4U`.

**Why this file exists.** A prior D3 re-scope report was produced earlier in the same working
session that shipped `feat/g2-success`, but was never written to disk — it existed only in
conversation and was lost when that context was summarized. This file is the record that should
have existed from that point on. Everything below was freshly re-verified against current code,
the live DB, and Figma — not recovered from the lost report.

## 1. `540:32920` is NOT a breakpoint specimen

Spending the one `get_metadata` call the founder approved resolved this cleanly: `540:32920`
("right", 1200×1658) is the desktop content panel — `Topbar` + `content` (hero + products) — the
same "sidebar-excluded companion frame" pattern already seen elsewhere in this file set, not a
mobile/tablet variant. It confirms the hero has **zero two-column regions**: `header-block`
(281w) → `description` (760w) → `chipsWrap` (330w) → all stack vertically inside `top`
(1088×318), each left-aligned with slack to their right, not stretched — matching D4's own
"running text ~700 measure" pattern (readability cap, not a column split). `avatar-ring` sits
absolutely positioned, overlapping the banner's bottom edge by 64px, with all identity content
starting below it — never beside it.

Per the founder's own fallback instruction, this is NOT a breakpoint specimen, so the responsive
ramp below the 1440 measurement is **inferred from the nearest built sibling and flagged
INFERRED**, following D1's own precedent for the identical situation (D1 also had no responsive
frame and inferred from D2).

## 2. Field table — corrected, not re-derived

Confirmed via `list_tables` (project `xggomcitqrkaylqezjjz`) and reading `creer/actions.ts` +
`configuration/actions.ts` directly:

| D3 field | Column | Written by |
|---|---|---|
| Banner | `shops.banner_url` | G2 step 1 |
| Logo | `shops.logo_url` | G2 step 1 |
| Name | `shops.name` | G2 step 1 |
| City | `shops.city` | G2 step 1 |
| Member since | `shops.created_at` | automatic |
| Shop type | `shops.shop_type` | G2 step 2 |
| Delivery setup | `shops.delivery_setup` | G2 step 2 |
| Description | `shops.description` | G2 step 1 |
| Payment chips | `shop_payment_methods` | G2 step 2 (reconciled, `cod` always forced) |
| Category chips | `shop_categories` | G2 step 2 (reconciled, product-kind intersected) |
| Products grid | `products` | G6 (separate surface) |

Every field D3 draws is fillable. Nothing is genuinely stuck. `working_hours`/`location_detail`/
`preferred_carriers` are collected by G2 step 2 but not drawn anywhere in D3's current field list
— collected, not shown, not a gap.

**Two corrections the field table alone didn't surface, found while building:** the Figma frame's
demo text for the info-bits row ("Artisan" / "Livraison à domicile") does not match ANY real enum
value — `shop_type` ∈ `physical/online_only/dropshipper`, `delivery_setup` ∈
`self_delivery/third_party/buyer_pickup`. Built against the real `shopTypeLabelKey`/
`deliverySetupLabelKey` helpers (already used by `ConfigurationForm`), not the frame's literal
copy — consistent with this project's own "mock state differs from real data" rule.

## 3. Live DB — shop assets

**Zero shops have a logo or banner.** The live DB has exactly one shop ("OM shop",
`f4757d2d-705c-48c8-bd58-37a35c7bdab3`, created 2026-06-03 — predates G2 entirely) with
`logo_url`/`banner_url`/`shop_type`/`delivery_setup` all null, 0 payment methods, 0 categories,
26 real products. Nobody has been through G2's upload flow live yet.

Found 7 orphaned objects in `shop-assets` storage (all 2026-08-11, none matching any live
`shops.id`) — leftovers from G2's own CDP verification fixtures, DB rows torn down but storage
never swept. Downloaded 3 and ran `sharp().metadata()`: all decode clean (`webp`, `1024×1024`
banner / `512×512` logo, `srgb`). The upload pipeline works; logged as its own follow-up
(`docs/follow-ups.md`), not fixed here — harness gap, not a product gap.

## 4. The five surfaces — corrected, not four

| Surface | File:line | Resolution |
|---|---|---|
| D1 shopSnippet | `ProductDetail.tsx:231-236` | Real `<Link href="/boutique/{id}">` |
| D1 shopPanel | `ProductDetail.tsx:267-273` | Real `<Link href="/boutique/{id}">` |
| G4 quick action | `tableau-de-bord-vendeur/page.tsx:83` | Already correctly shaped, no code change — just needed the route to exist |
| G2-success button | `succes/page.tsx:74-77` | Real `<Link href="/boutique/{shopId}">`, replacing the disabled `Button` |
| C1 Boutiques toggle | `ProduitsLensToggle.tsx:36-47` | **Stays disabled** — comment corrected, not the code |

**C1 is not the same kind of fix as the other four**, per the founder's explicit ruling: D3 landing
does not unblock the Boutiques grid. `ShopCard` (`578:42367`) exists only in Figma — a full `src/`
grep returns zero matches — and no grid-render path exists for `/marche/produits` either.
Re-enabling the toggle needs a new component, a new query, and wiring: a separate PR. The comment
now says exactly this instead of "no shop page exists," which is what would have been wrong to
leave in place after D3 shipped. `docs/follow-ups.md`'s "Boutiques lens" entry was re-ruled to
match (kept the original reasoning inline, marked superseded, not deleted).

Two stale comments corrected on `ProductDetail.tsx` (lines ~33-36 and the old 231-233 span
comment): both previously claimed "D3 `/boutique/[slug]` has neither a route nor a slug column" —
now point at the real, shipped `/boutique/[id]` route.

## 5. Route

Confirmed already recorded: `docs/follow-ups.md`, `### ✅ D3 URL shape — RESOLVED 2026-08-12: bare
`[id]`, not `[slug]``. `/boutique/[id]` built exactly to that ruling — bare uuid, no slug column,
mirrors `/produits/[id]`'s own pattern (public route, nullable shell, `notFound()` on missing/
admin-hidden row).

## 6. Data layer

`src/lib/marche/shop-detail.ts` — `getShopDetail(id)` (wrapped in `cache()`, same reason as
`getProductDetail`: `generateMetadata` + the render share one fetch) and `getShopProducts(shopId,
name, city)`. Both mirror `product-detail.ts`'s exact shape: `admin_hidden_at IS NULL` moderation
on the shop fetch, `status='active'` on the products fetch — the same filter every public browse
query in this codebase already uses (`data.ts`, `product-detail.ts`'s related row, `demander.ts`),
which already excludes both `hidden` and `sold_out` (nothing in the app writes `sold_out` today,
per `product-stock.ts`'s own header note — not a special case, the existing convention).

## 7. Products grid — inherited, not re-derived

`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, identical to C1's own grid and to D1's related-products
row, which already explicitly inherits C1's ramp rather than inventing a second one ("keeps the two
product surfaces identical rather than inventing a second answer" — `ProductDetail.tsx:278-281`).
D3 is the third surface to reuse this ramp, unchanged. Desktop arithmetic from the Figma metadata:
4 × 272px card + 3 × 16px gap = 1136px, exact match against content-1200/pad-32→inner-1136, zero
slack — confirms why a fixed-width WRAP reflow (Figma) and a CSS-Grid fr-unit reflow (the actual
Tailwind implementation) land on the same column counts without being the same mechanism.

## 8. Components built

- `src/app/boutique/[id]/page.tsx` — route, mirrors `/produits/[id]/page.tsx` exactly.
- `_components/ShopDetail.tsx` — hero (banner, avatar, identity, chips, actions) + products grid/empty state.
- `_components/ShopShareButton.tsx` — copy-link, route-local (2nd consumer of the pattern after D1's `ShareLinkButton`; promotes to shared at the 3rd, per this project's own component rule). Does **not** build the full share dialog (`543:33852`, Facebook/Instagram/WhatsApp rows) — same reason D1 already declined it: needs `icon-share` + 3 brand glyphs that don't exist in the Figma file. Following D1's precedent, not diverging from it.
- `_components/ShopReportModal.tsx` + `actions.ts` (`createShopReportAction`) — the first CONSUMER-facing report-creation surface in the codebase (everything under `admin/signalements/*` only reads/moderates existing rows). RLS already allows it (`"Reporter creates own report"`, `with_check reporter_id = auth.uid()`) — this action is the first caller to exercise that policy. 3 reasons offered (`fake_scam`/`offensive`/`other`), not the full 4-value `reports.reason` CHECK — `wrong_category` is a listing-shape concept that doesn't apply to a shop, matching the Figma specimen's own 3-option dropdown.
- **Avatar**: real `logo_url` image when present, initials fallback when null — the existing `Avatar` component's own `src` > `initials` > glyph priority already does exactly this; not a new pattern. Deliberately does not reproduce the Figma frame's initials-only literal, which was drawn when `logo_url` had no write surface.
- i18n: `boutique.public.*` + `report.shop.*`, both `fr.ts`/`ar.ts`. One Arabic gender-agreement bug caught and fixed pre-commit: "متجر" (shop) is masculine, an initial draft used the feminine demonstrative "هذه" — corrected to "هذا" in both new strings before landing.

## 9. Verification

Full gate, main working directory (dev server stopped before build, restarted after): `tsc`
clean, `eslint` clean on all touched/new files, `next build` clean (`/boutique/[id]` compiled),
`vitest run` 613/613 passing, zero regressions.

Live, against the real production DB (no fixture needed for the read paths — the one live shop,
"OM shop", has 26 real products):

- `curl /boutique/{OM shop id}` → 200, real content (name, city, description, product count) confirmed via grep.
- Breakpoint overflow sweep at 375/1024/1152/1279/1280/1366/1440px, FR **and** AR, `behavior:'instant'` scroll-to-origin before each measure: **zero overflow at every width, both languages** (14/14).
- AR pass: `dir="rtl"` confirmed, no French string leak, screenshot taken. One visual read of the screenshot suggested an icon-placement inconsistency between the two meta-row pairs (calendar vs map-pin) — **not trusted on sight**; measured instead via `getBoundingClientRect()` on both icons and their pair containers. Both come back `iconOnRight: true`, consistent and correct. The eyeballed read was wrong at screenshot resolution — this is the "report what the browser computes, not what you think you see" rule in practice.
- Real walk: D1's two links → both real `<a href="/boutique/{id}">`, clicking one lands on a rendering shop page. Signed in as an ephemeral shop-owner fixture (seeded, verified, torn down — ADT auth user + shop + payment methods + categories, no storage upload this time so no sweep needed): G4's quick action → lands on `/boutique/{fixture shop id}`, renders. G2-success's button → same. 22/22 checks pass.

## 10. Found, logged, not fixed (out of this PR's scope)

- 7 orphaned `shop-assets` storage objects from G2's fixtures (§3 above) — `docs/follow-ups.md`.
- Admin `signalements` detail page's `TARGET_ROUTES` map has wrong base paths for `product`
  (`/produit`, should be `/produits`) and `service` (`/service`, should be `/services`) — found
  while confirming the `shop` entry was correctly shaped (it was). Unrelated target types,
  `docs/follow-ups.md`.

## 11. Post-review fixes (before merge, same PR)

A second pass caught three issues the first build + verification round missed — all fixed and
re-verified before this branch was pushed:

1. **Logged-out report trigger silently failed.** `createShopReportAction` returned a generic
   error when `getUser()` was null, but D3 is a public route typically reached logged out (a
   shop's shareable link) — a logged-out visitor opening the report form would submit into a dead
   end with no path forward. Fixed: `ShopReportModal` now receives `isLoggedIn` from the page's
   own server-side `getShellUser()` call (no client-side re-check) and the trigger redirects to
   `/connexion?next=<shop path>` — same pattern as every other guarded destination
   (`fix/signin-next-param`) — instead of opening the form. The server action keeps its own
   `if (!user)` check as a defensive backstop for direct calls, not the primary guard.

2. **`getShopProducts` capped at `.limit(100)` with no visible truncation signal.** Unlike C1's
   marketplace-wide grid (paginated because it spans every shop), this query is bounded by one
   shop's own catalog and the Figma frame draws no pagination control here. Removed the cap —
   truncating silently past a threshold nobody would notice crossing was worse than an unbounded
   per-shop query at MVP scale; if a shop's catalog ever grows large enough to matter, that is the
   trigger to add C1's own `Pagination` component, not a silent cap.

3. **Real bug: the report modal crashed for every signed-in user.** `SHOP_REPORT_REASONS` (a
   plain const array) was exported from `actions.ts`, a `'use server'` module. Next's
   server-actions bundler only supports async-function exports from such a file — importing the
   array into the client `ShopReportModal` silently turned it into a non-array at runtime, so
   `.map()` threw and the whole page fell into the global error boundary the instant a signed-in
   visitor clicked "Signaler cette boutique." Neither `tsc`, `eslint`, `next build`, nor the mocked
   vitest suite catches this class of bug — none of them run the actual server-actions bundling
   transform. Only a real click in a real browser did. Fixed by moving `SHOP_REPORT_REASONS` /
   `ShopReportReason` into `report-reasons.ts` (no `'use server'` directive), imported by both
   `actions.ts` and `ShopReportModal.tsx`.

**Verification added for #3 (write-path, previously unexercised):** a unit test file
(`src/__tests__/shop-report-action.test.ts`, 7 cases: validation, the auth backstop, insert shape,
error mapping — mocked Supabase client, matches this codebase's existing `dispute-actions.test.ts`
convention) plus a live CDP pass exercising the exact flow the mocked tests structurally cannot
reach: an ephemeral fixture (`reporter@d3-report-flow.servyou.invalid`, service-role seeded, real
sign-in through `/connexion`, `reports` row + auth user torn down after) opens the real form,
selects a reason, submits, and a service-role read confirms a real `reports` row landed with the
correct shape (`target_type='shop'`, `target_id`, `reporter_id` from the session not the input).
5/5 checks pass, including the logged-out redirect from fix #1. Full gate re-run clean after all
three fixes: `tsc`, `eslint`, `next build`, `vitest` 620/620 (+7 from the new test file).

## 12. UNVERIFIED — pixel values in `ShopDetail.tsx` with no matching entry in this record

Written 2026-08-13, during the founder's fidelity re-audit (`docs/follow-ups.md`, "D3 fidelity
re-audit"). That audit's own analysis found five widths/offsets already recorded above (§1, §7)
that the code matches exactly (`max-w-[760px]` description cap, the 64px avatar/banner overlap,
the 16px grid gap). Grepping this file for the code's OTHER literal pixel values returns nothing:

- `leading-[38px]` / `tracking-[-0.64px]` — the `h1` shop name.
- `leading-[26px]` — the "Produits" `h2`.
- `top-[136px]` — the avatar's absolute offset (consistent by arithmetic with the recorded 64px
  overlap given the code's own `h-[200px]` banner and `size-32` avatar, but the three underlying
  numbers themselves were never individually recorded here).
- `pt-[76px]` — the content block's top padding, clearing the avatar.
- `tracking-[0.48px]` — the PAIEMENT/CATÉGORIES overline captions.
- Every `gap-*` utility in the hero (`gap-8`/`gap-6`/`gap-4`/`gap-3`/`gap-2`/`gap-1.5`/`gap-2.5`/
  `gap-5`) — none has a recorded Figma measurement to check against.

**Origin, honestly: unknown.** §"Why this file exists" above already records that an earlier D3
verification pass was produced in conversation and lost when that session's context was
summarized, and that this file's own content was freshly re-verified afterward, "not recovered
from the lost report." These specific numbers plausibly survived from that lost pass into the
committed code without ever being re-measured or written down here — but that is a plausible
explanation, not a confirmed one. Nobody re-opened Figma to re-check them for this entry.

**Disposition:** left alone. Not deleted, not re-labelled as measured. If a future pass re-measures
the hero region against `540:32918`/`540:32920` and confirms or corrects any of the numbers above,
that pass updates this section directly — do not silently fold a confirmed number back into §1/§7
without saying so.

## 13. Banner render bug — found by the populated-fixture pass, fixed same PR

**Found:** the same populated-fixture pass that produced §12 caught a second, unrelated defect.
`shop-detail.ts` fetches and types `bannerUrl`; `ShopDetail.tsx:58` rendered the gradient `<div>`
unconditionally and never read it. A real, reachable `banner_url` had zero effect on the render —
indistinguishable from "never built" on OM shop, whose `banner_url` is null, which is exactly the
blind spot §"D3 fidelity re-audit" (`docs/follow-ups.md`) exists to catch. Confirmed via DOM read
before any fix (`bannerHasImg: false`, computed `background-image` a `linear-gradient(...)`, no
`<img>` present at all), not by re-reading the screenshot.

**Fixed:** `ShopDetail.tsx` now branches the banner exactly like `Avatar` already branches the
logo — a real `next/image` (`fill`, `object-cover`) when `shop.bannerUrl` is present, the original
gradient `<div>` when it's null. `sizes="(max-width: 1279px) 100vw, 1120px"`, matching the shape
of `ProductGallery.tsx`'s own hero-image `sizes` clamp.

**Verified, both directions, one fixture shop, DOM-level (not computed style, not a screenshot):**
- Populated: `bannerHasImg: true`, `naturalWidth: 895`, `src` resolving through `/_next/image` to
  the real Supabase-storage public URL.
- Same shop, `banner_url` set to `null`, fresh navigation: `bannerHasImg: false`,
  `naturalWidth: null`, gradient `<div>` present with a computed `linear-gradient` background.

`tsc --noEmit` and `eslint` clean on the changed file. Fixture teardown re-verified by SQL
read-back after: `storage.objects` (bucket `shop-assets`) at 0, `shops` back to 1 (OM shop),
`products` back to 26, `shop_payment_methods`/`shop_categories` at 0, zero profiles under the
fixture's email domain.

# Visual-gate findings — v2 shell at 375px (from feat/marche-services-rebuild, 2026-07-26)

Surfaced by the 375px gate run over the shell's blast radius. All three are **pre-existing**
(verified against `2a911f5^`), so per Standard G they are logged, not fixed in the shell PR.

## 🔴 12 of the 20 v2-shell routes cannot be gated without an authenticated session
- **What:** `AppShell` is mounted at **20** sites (19 `page.tsx` + `ServicesBrowsePage`). Only
  **/marche/services, /marche/produits, /services/[id]** render it anonymously — the other 12
  workspace routes 307 → `/connexion`. `AppShell` does render logged-out (consumer IA, per its own
  header comment), so the shell *code path* is exercised; what is **not** reachable is the
  **`freelancer` and `shop_owner` sidebar variants** and every workspace page's content reflow.
- **Consequence:** a sidebar regression that only manifests in a seller IA — a wrong section cap, a
  clipped nav on a short viewport, a role-specific item — **cannot be caught by an anonymous gate**,
  and there is no VRT story for any shell component either (the 32 baselines are F2 `Avatar` + F3
  `Button`/`Input`/`StatusPill` only). The shell is the single most-shared surface in the app and is
  currently the least gate-covered.
- **Fix (two options, not exclusive):** (1) a seeded **gate account per `seller_type`** + a scripted
  login so the sweep can reach the workspace routes; (2) **Storybook stories for `Sidebar` /
  `SidebarItem` / `SidebarSection` / `Topbar`** at the three roles × 375/1440, which brings the shell
  under the existing VRT gate and needs no session at all. (2) is cheaper and catches more.
- **Trigger:** before the next shell-touching PR — this gap recurs on every one.

## Topbar language toggle is a 24px touch target
- `src/components/layout/LanguageToggle.tsx:64` renders each FR/AR button at `h-6` (**24px**;
  measured 41×24 and 43×24 at 375px) with **no hit-area expander**. The touch-target rule requires
  ≥44×44. Pre-existing — `h-6` is byte-identical in `2a911f5^`; that commit only changed the
  active/idle colours. The fix is the F3 pattern already used next to it: an
  `absolute -inset-*` `aria-hidden` span (see `TopbarUserMenu.tsx:52`,
  `TopbarNotifications.tsx:34`), which keeps the measured 24px box while giving a 44px hit region.
- **Trigger:** the touch-target code pass, or the next topbar-touching PR.

## `TopbarSearch` input is 14px → iOS zoom-on-focus (second instance)
- `src/components/shell/TopbarSearch.tsx` ships `text-body-sm` (**14px**), below the 16px iOS
  threshold, so focusing it zooms the viewport on iPhone. This is the **same defect already logged
  for `SharedSearchBar.tsx:99`** — now confirmed on the v2 topbar too, i.e. it affects every one of
  the 20 shell routes, not one component. Pre-existing: `text-body-sm` is unchanged across
  `2a911f5` (that commit swapped `cn()` for a plain template precisely to *stop* tailwind-merge
  dropping the size, and to move the radius to `rounded-[10px]`).
- **Note for whoever fixes it:** bumping to 16px is a **visible** change to the topbar and the
  measured Figma value is 14 — so it needs a design call (16px input text, or a 16px override only
  under `max-lg`), not a silent token swap.
- **Trigger:** fold both instances into one pass — the component audit already scoped for
  `SharedSearchBar`.

## `/categories/[slug]` renders empty while the DB has active listings
- `http://localhost:3000/categories/marketing` renders **"Aucune annonce dans cette catégorie"**,
  but the database reports **5 active `service_listings`** for that slug:
  `select c.slug, count(sl.id) from categories c left join service_listings sl on
  sl.category_id = c.id and sl.status = 'active' group by c.slug` → `marketing = 5`. The page
  resolves the slug (it returns 200, not 404), then finds nothing.
- **Pre-existing, not the services-delta branch.** Confirmed by stashing that branch's changes and
  re-requesting the route on clean `main` — same empty state. The only change that branch makes near
  this path is a `className` gap on `ListingResults`, which cannot affect a query.
- **Consequence:** every `/categories/*` landing page is likely dead for services. It also means the
  shared `ListingResults` service grid has **one consumer that cannot be exercised** — the P11 mobile
  gap change was verified live on `/marche/services` and `/recherche` only (the consumer homepage is
  auth-gated).
- **Suspected area:** how `categories/[slug]/page.tsx` resolves the slug to the id(s) it passes to
  `searchMarketplace` — parent-vs-child category id, or a type filter — but this was **not chased**;
  the above is the observation, not a diagnosis.
- **Trigger:** before any `/categories` rebuild, and before anyone relies on that route's numbers.

## Filter-bar search field is 40px where Figma `611:45644` measures 44
- The services filter bar renders its search field at `h-10` (**40px**) while the Figma search
  measures **44**, taller than the 40px selects beside it. Row **P1** of
  `docs/design/marche-services-deltas.md`.
- **Deliberately not fixed.** It was built and then **cut by founder direction**: out of scope for
  the services-delta PR, and 44 makes the search visually inconsistent with the 40px Catégorie /
  Ville / Prix / Trier-par controls sharing its row. Reinstating it should come with a decision about
  whether the *selects* move to 44 too, rather than a lone taller field.
- **Trigger:** whenever the filter row is next revisited as a whole.

## D2 — three deliberate non-builds, so a future pass does not read them as oversights

All three are founder-decided on the D2 build (`feat/d2-service-detail`, Figma `666:55479` /
`668:55920`). None is a defect; each is recorded here because the *absence* is the decision.

- **`revisions_count` is in the data layer with no D2 region — by design.** The column exists and
  is populated on 21/21 active listings, and `getServiceDetail` returns it as `revisionsCount`.
  `666:55479` has **no region for it**, and UI that is not designed does not get invented. It is
  carried for **E1**, where the buyer needs the revision count *before* committing. If you are
  about to surface it on D2, that is a design decision first, not a wiring task.
- **D2 has no gallery region, and the `service_media` fetch was removed.** `service_media` exists
  but holds **zero rows**; the per-service gallery was retired in favour of
  portfolio-per-freelancer, and neither D2 frame has a gallery. The resurrected
  `service-detail.ts` was still selecting it, feeding nothing — dead weight the next reader would
  assume was load-bearing. **If work samples ever return to D2, the Figma design comes first**,
  then the query.
- **The related-services heading diverges from the Figma, deliberately.** The frame reads
  *"Autres services de {freelancer}"*, which assumes a **same-freelancer** rule. The approved rule
  is **category-first** (category → freelancer → newest active, deduped, cap 3), so the set is
  mixed and a freelancer-scoped heading would be factually wrong for most rows. Ships as the
  neutral **"Services similaires"** (`serviceDetail.related`, FR + AR). If the rule ever becomes
  freelancer-only, the Figma heading becomes correct again and this should be revisited.

## `FavoriteButton` is a text glyph where the design wants an icon button
- `src/components/FavoriteButton.tsx` renders a **`p-2 rounded-full text-xl` button containing a
  `♡` / `♥` text glyph** (and a `text-gray-300 ♡` in its loading state). Figma wants a **20px
  stroked icon inside a 44px box**: on D2 the buy box's `icon-heart-btn` is `147×44`, `r=10`,
  stroke `1 #cbd5e1` on white, holding a `20×20` icon at stroke `2 #64748b` (`666:55479`).
- A **text glyph is not a substitute for an icon**: it inherits font metrics rather than a fixed
  box, so it cannot be sized to 20px reliably, its optical weight differs from every other
  `lucide-react` icon in the app, and it renders differently across platforms and fonts.
- **Pre-existing and unrelated** to the D2 width collapse fixed in `fix/d2-panel-deltas` — that
  was a grid-column issue. Confirmed the glyph renders identically in both auth states, so it is
  not an auth-dependent path either.
- **Blast radius — 3 consumers**, so this is not a D2-local fix: `ServiceDetail.tsx` (the D2 buy
  box), `ServiceListingCard.tsx` and `ProductListingCard.tsx` (the card corner hearts, which are
  a different size and treatment again). A per-page patch would fork the component three ways.
- **Fix as part of a proper icon-button pass across the app**, alongside the other two open
  icon-button items already logged here (the `LanguageToggle` 24px touch target, and the F3
  invisible hit-area pattern) — they share a target shape and should land together.
- **Trigger:** the icon-button / touch-target pass, or whenever `FavoriteButton` is next opened.

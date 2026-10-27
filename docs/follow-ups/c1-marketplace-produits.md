# C1 — Marketplace produits (`feat/c1-marketplace-produits`, 2026-08-07)

## ✅ RESOLVED 2026-08-12 — `tableau-de-bord-vendeur:83` — "Voir ma boutique" is a live 404 a seller can press today

- **This is a defect NOW, not a consequence of the Boutiques deferral below.** It is filed
  separately on purpose: deferring a marketplace lens is a scope decision, but a button on the
  seller's own dashboard that leads nowhere is broken behaviour that predates this PR and outlives
  the deferral.
- `src/app/tableau-de-bord-vendeur/page.tsx:83` renders an action-rail item:
  ```ts
  { key: 'viewPublic', href: shop ? `/boutique/${shop.id}` : '/devenir-vendeur', icon: Eye }
  ```
  Any shop owner who has completed G2 gets the `/boutique/{id}` branch. **There is no `/boutique`
  route anywhere under `src/app`** — not a `ComingSoon` stub, no directory at all. Verified against
  a running dev server on a clean `.next`:
  ```
  GET http://localhost:3000/boutique/f4757d2d-705c-48c8-bd58-37a35c7bdab3  →  404 Not Found
  ```
  Nothing rescues it: no catch-all segment exists under `src/app`, and `next.config.ts`
  `redirects()` covers only the four legacy auth routes (`/login`, `/signup`, `/forgot-password`,
  `/update-password`).
- **Two more callers, same 404**, both admin-only so lower blast radius:
  `src/app/admin/utilisateurs/[id]/page.tsx:137` (opens in a new tab) and
  `src/app/admin/signalements/[id]/page.tsx:53` (`shop: '/boutique'` base).
- ⚑ **Not fixed in C1, and that is a scope call rather than an oversight.** The honest fix is
  building D3 (`540:32918`), which is a page rebuild. The dishonest fix — pointing the button at a
  new stub — trades a 404 for a dead end, which is the thing C1 exists to stop doing.
- **Closed by `fix/d3` (2026-08-12).** `/boutique/[id]` now exists (`src/app/boutique/[id]/page.tsx`).
  No code change was needed at this call site or the two admin ones below — all three already
  built the correct `/boutique/{id}` href, they just had nowhere to land. Verified live: signed-in
  shop owner, G4 quick action → real shop page, not a 404 (see this PR's own verification record).

## ✅ RESOLVED 2026-08-12 (was: 🔴 4th entry) `/ma-boutique/creer/succes:83` — G2 success

- **"Voir ma boutique publique" ships as a `disabled` `Button`, not a `Link` to `/boutique/{id}`.**
  Founder ruling, checked against this same entry's first three surfaces before building: D1
  (`ProductDetail.tsx`, two "Voir la boutique" spans) and C1 (`ProduitsLensToggle.tsx`, disabled
  "Boutiques" segment) already treat D3 as absent; only the G4 quick action above links live, and
  that link is this entry's own 🔴, not a pattern to extend. The succes screen matches D1/C1, the
  majority and the deliberate treatment — logged here as the 4th surface against the same root
  cause, not a new bug.
- **Correction to a stale in-code comment surfaced while auditing this:** `ProductDetail.tsx:35`
  claims "same treatment as `ServiceDetail.tsx:232`" — checked, and that line is D2's report-line
  today, not a shop link. D2 (service detail) is freelancer-owned and has no shop/D3 concept at all,
  so it was never a real surface in this count. Not fixed (a comment, not a defect), logged so it
  isn't re-cited as a fourth precedent by a future pass.
- **Closed by `fix/d3` (2026-08-12).** All four surfaces now link to `/boutique/[id]` (D1's two
  spans, the G2-success button) or stay deliberately disabled with a corrected reason (C1's
  Boutiques toggle — re-ruled to stay off, see "Boutiques lens" entry below, not simply unblocked).

## ✅ D3 URL shape — RESOLVED 2026-08-12: bare `[id]`, not `[slug]`

- **Ruled by the founder while this entry was still open** — recorded here now because the ruling
  predates this doc entry and was never written down, which is why a later pass (G2 success) read
  it as still pending. Decided **once**, per this entry's own original request, and it does cover
  all four public-profile-shaped routes, not only D3: **D1, D2, D3, D4 all use a bare id.** `shops`
  and `freelancer_profiles` both remain without a `slug` column — this was not a per-route choice
  that happened to converge, it is one decision applied uniformly.
  - **`[id]`** — the shape every live link already builds (`/boutique/${shop.id}`, this entry's
    first 🔴) and the shape D1 shipped its own route on (`/produits/[id]`). Zero migration, ships D3
    immediately when it's built.
  - **`[slug]`** was the alternative on the table (nullable `slug`, unique index, backfill,
    collision strategy) — not pursued. No `slug` column exists on `shops` or `freelancer_profiles`
    today, and none is planned against this ruling.
- **Nothing left to decide when D3 (or D4) is built.** D1 (`/produits/[id]`) and D2
  (`/services/[id]`) are already shipped on bare id. D3 is not yet built; when it is, the route is
  `/boutique/[id]`. D4 is not yet built either (`src/app/freelance*` does not exist under `src/app`
  today) — its route is `/freelance/[id]` under this ruling, **correcting** the `/freelance/[slug]`
  naming carried in the design registry and memory notes, which reflects the Figma frame's own
  node name, not a coded decision. One shape across all four public-profile-style routes, decided
  once rather than re-opened per page.

## Boutiques lens — DEFERRED with a "Bientôt" badge, and why the Freelances precedent did not decide it

- **The frame is real and buildable.** `C1 — vue Boutiques = 578:42528` (browseHead `578:42529`,
  gridWrap `578:42532`), and the card exists as a component **in Figma only**:
  **`Shop Card = 578:42367` — 4 variants · `state[default,hover]` `banner[true,false]` ·
  props: `shopName(text) city(text) productCount(text)`.** All three props map to real columns
  (`shops.name`, `shops.city`, and a count over `products`). This is NOT deferred for missing data.
- ⚑ **RE-RULED 2026-08-12, after D3 shipped — stays disabled.** The original reasoning below ("the
  card has nowhere to link") is now stale and superseded: D3 (`/boutique/[id]`) shipped and the
  destination exists. The toggle was re-examined anyway and the founder ruled it **stays
  disabled**, because the actual blocker was always bigger than the destination: **`ShopCard`
  exists nowhere in code** (`578:42367` is Figma-only, confirmed by a full `src/` grep — zero
  matches) and neither does a shop-grid render path for `/marche/produits`. Flipping the toggle
  needs a new component, a new query, and wiring — a separate build, not something D3 unlocks for
  free. `ProduitsLensToggle.tsx`'s own comment now states this correctly.
  - *(Original reasoning, kept for history: "It is deferred because the card has nowhere to
    link. Every Shop Card CTA resolves to `/boutique/{id}`, which 404s. A grid of shops linking
    into hard 404s is worse than a disabled toggle." — true at the time, incomplete: it named the
    destination as the only blocker when the code path was equally missing.)*
- **The Freelances precedent (`ServicesLensToggle`) was checked and does NOT transfer.** Freelances
  was deferred because its data layer, its cards, and the `/freelance` pages all did not exist.
  Here the data exists (`shops`, `products`) and the destination now exists (D3); only the
  component + grid code is missing. Same outcome, different reason — do not cite "we deferred
  Freelances too" as the justification when revisiting.
- **What ships instead:** the `Produits` segment active, `Boutiques` rendered `disabled` +
  `aria-disabled` with a visible "Bientôt" badge. That is a **deliberate divergence from
  `578:42513`, which draws both segments enabled** — marked in-code so a later fidelity pass can
  tell it from drift.
- **Data reality at deferral time** (1 shop total): 1 visible, 1 with active products, 1 with a
  city, **0 with a logo**. So the lens would have rendered a one-card grid, and the Shop Card's
  logo slot has no data on any row — it would fall back to initials, as the Product Card's shop
  badge already does.
- **Trigger:** build `ShopCard` (from `578:42367`) + a shop-grid query + wire the toggle, as its
  own PR. D3 landing does not trigger this by itself — that assumption is what this re-ruling
  corrected.

## The C1 product card is a FORK, not a restyle — the delta table, so the consolidation is not re-measured

- **Decision (founder, explicit): fork route-local, leave `ProductListingCard` alone.**
  `ProductListingCard` reaches `/recherche`, `/categories/[slug]` and `ConsumerHomepage` through
  `ListingResults`. Those three work today. Rewriting the shared card to match a frame drawn for a
  fourth surface breaks three pages to fix one.
- **Measured `569:39818` (272×373) against the shipped `ProductListingCard`.** The geometry closes
  exactly: cover 276 + body (12 + 22 title + 10 gap + 41 bottom-row + 12) = 373.

  | | Figma `569:39818` | `ProductListingCard` |
  |---|---|---|
  | Cover | **276 px fixed**, `surface/sunken`, `border-b subtle` | `aspect-square` (272 at this width) |
  | Heart | top-**start** 8, 32 px, white + 1px subtle, radius 16 | top-**end** 12, 36 px, `white/90` + backdrop-blur |
  | Shop badge | **32 px initials chip, top-end**, `blue/800` 12 semibold | ✗ absent |
  | Category chip | **on the cover, bottom-start**, sunken, body-sm 14 medium | ✗ absent |
  | Title | 16 semibold, leading 22, single-line ellipsis | 16 semibold, `line-clamp-1` |
  | Description | ✗ **none** | 2-line, `min-h-[40px]` |
  | Meta | city + `icon-map-pin` 14, 12 px medium, `text/muted` | `"shop · city"` text, 12 px, no icon |
  | Price | 17 px semibold, leading 22 | `text-body` bold |
  | CTA | 40 px, **`blue/600`**, radius 8, `icon-shopping-bag` 20 | 36 px, **black**, full-round, arrow-up-right |
  | Container | 1px `border/subtle`, radius 12, no shadow | `card-premium` (drop shadow) |

- **The grid CLASSES were validated against the frame and copied; `ListingResults` itself is NOT
  consumed.** Its product branch is already `grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4`, and
  the Figma grid is 4-up with gap 16 on both axes (x 0/288/576/864, y 0/389/778 at 272×373) — so the
  responsive ramp needed no rethinking. But `ListingResults` hard-renders `ProductListingCard`, and
  that card is forked here, so C1 carries its own one-purpose grid wrapper with the same classes.
  The value of the check was the opposite of reuse: it proved C1 needs **no change to a 7-consumer
  component**, so that blast radius was never taken. Do not "DRY this up" by adding a variant to
  `ListingResults` — that re-opens precisely the risk the fork was chosen to avoid.
- **Trigger for consolidation:** whichever comes first — `/recherche` or `/categories/[slug]` being
  rebuilt to a Figma frame, or a third product-card variant appearing. At that point the table above
  IS the diff; do not re-measure.

## The two marketplace filter bars are forks of each other — deltas, for the same reason

- `ProduitsFilterBar` is forked from `ServicesFilterBar` (331 lines) per the skill's
  "route-local until the third consumer" rule. They are ~90% identical: search → `q`, single-select
  Catégorie, single-select Ville, Prix min/max popover, sort dropdown, dismissible chips, all
  writing to the URL via `buildSearchQuery` → `router.push`.
- **Real measured deltas, not preference:**

  | | Services (`611:45644`) | Produits (`570:40225`) |
  |---|---|---|
  | Search field height | 40 (`h-10`) | **44** |
  | Select height | 40 | 40 |
  | Lens toggle icons | Briefcase / Users | **none — text only** |
  | Search placeholder | "Rechercher un service…" | "Rechercher un produit…" |
  | i18n namespace | `services.filters.*` / `services.sort.*` | `produits.filters.*` / `produits.sort.*` |

- ⚑ **The Figma's empty label + helperRow slots are NOT reproduced.** `570:40225`'s search block
  measures 97 tall as 21 (empty label) + 8 + 44 (field) + 8 + 16 (empty helper) — those are
  artifacts of the shared `Input` component instance rendering with no label and no helper text,
  not design intent. The build renders the 44 px field alone, with the 40 px selects vertically
  centred against it, which is what the frame looks like.
- **Trigger for consolidation:** a third browse surface, or the Boutiques lens landing (which needs
  a third variant of the same bar). Fold both into one `MarketplaceFilterBar` taking a namespace +
  a control list; do not re-derive the deltas.

## 🟡 In Arabic, filter chips say `د.ت` and the cards beside them say `TND` — platform-wide

- **Pre-existing, NOT introduced by C1, and reproduced by C1 on purpose.** Found while verifying
  the AR render of `/marche/produits`; logged rather than fixed because fixing it correctly is a
  cross-surface change and this PR is one page.
- The two halves disagree:
  - `tndPrice()` (`components/listings/listing-utils.ts`) returns a literal `"{n} TND"` in **both**
    locales, by an explicit decision in its own docstring: *"currency code, not translatable copy."*
    It feeds every listing card on every surface.
  - `services.filters.currency` / `produits.filters.currency` resolve to `"TND"` in FR and
    **`"د.ت"` in AR**, and feed the price filter chip.
- So an Arabic buyer filtering by price sees a chip reading `≥ 100 د.ت` sitting directly above cards
  reading `100 TND`. Verified in the served AR HTML: 9 cards rendered `>10 TND<` etc. under
  `dir="rtl"`.
- ⚑ **C1 deliberately matched the services behaviour instead of correcting it locally.** A one-page
  fix would have made `/marche/produits` disagree with `/marche/services`, `/recherche`,
  `/categories/[slug]` and the consumer homepage — trading a consistent platform-wide inconsistency
  for an inconsistent one, which is harder to find and harder to fix later.
- **The decision when this is picked up** is which half is right, and it is a founder call, not a
  mechanical one: either `tndPrice` becomes locale-aware (touches every listing surface, and the
  digits must stay LTR inside RTL text), or the AR currency keys become `"TND"` (cheap, one line
  each, and arguably correct since TND is an ISO code rather than copy).
- **Trigger:** the next PR that touches `tndPrice`, or the first AR-language QA pass on any listing
  surface. Do not fix it on one page.

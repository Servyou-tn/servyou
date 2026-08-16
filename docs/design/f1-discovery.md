# F1 — Mes favoris — discovery record (post-build review)

**Provenance.** Written retroactively, 2026-08-16, after the founder reviewed the built
`/mes-favoris` page live against Figma. Card- and header-level Figma facts below are tagged
**🗣 FOUNDER-REPORTED** — read directly off Figma by the founder in this session, not
independently re-pulled via a fresh Figma call: the MCP Figma server has a hard ~20
read-calls/month cap on this plan ([[reference_figma_mcp_monthly_quota]]) and the figma-cli CDP
bridge is confirmed dead on the current Figma Desktop build (`scripts/figma/README.md`,
[[project_figma_cli_bridge]]). Code facts are read live from the working tree on
`feat/f1-favoris`. Registry facts cite `docs/design/figma-registry.md:1034-1052`.

## 1. Header — real defect, tracked separately, NOT fixed by this doc

`718:60584` draws an H1 reading **"Mes favoris"**. 🗣 FOUNDER-REPORTED

The built page never renders that string. `src/app/mes-favoris/page.tsx` renders the animated
`shared/PageHeader` (imported there as `PageSubtitle`) with
`subtitle={t('page_header.favoris.subtitle', lang)}` = `"Retrouvez vos articles sauvegardés"`
(`src/lib/i18n/fr.ts:1238`) as the page's **only** `<h1>` — `marche/PageHeader`'s `title` prop,
the one built to carry a short page title (`src/components/marche/PageHeader.tsx:19`), is never
passed a value (`page.tsx:32` passes `countLabel` only). The emphasis word `"sauvegardés"`
renders `text-brand-blue-600` plus an absolutely-positioned `.ph-underline` bar
(`src/app/globals.css:275-284`) — a decorative accent treatment the component was built to draw,
not a link, but visually indistinguishable from one.

Root cause: `mes-favoris/page.tsx` copied the exact two-header composition already used by
`mes-missions/page.tsx:53-62` (same aliasing, same missing `title`), where the animated
component silently absorbed the page's only H1 role. That mechanism predates this PR. Nothing in
F1 corrected it for the one page where Figma specifies a literal short H1 rather than a
descriptive phrase. The correct string is already in the codebase, used consistently elsewhere
for this exact feature: `fr.ts:1193` `'consumer.dashboard.actions.favs_title': "Mes favoris"`
and `fr.ts:1201` `'dashboard.sidebar.mesFavoris': "Mes favoris"`.

**✅ RESOLVED — 2026-08-16, same branch.** `shared/PageHeader` gained `as?: 'h1' | 'p'` (default
`'h1'`, so its other 6 callers — `mes-missions/nouvelle`, `recherche`, `categories/[slug]`,
`ConsumerHomepage` (`/`), `profil`, `parametres` — render byte-identically). `mes-favoris/page.tsx`
and `mes-missions/page.tsx` now pass `as="p"` and wire a real `title` into `marche/PageHeader`:
`shell.sidebar.favorites` ("Mes favoris" — the same string the live `AppShell` sidebar already
uses on this page; **not** the missions sidebar key `shell.sidebar.listings`, which is "Mes
annonces", a documented vocab drift) and `job.my_missions_title` ("Mes missions" — previously
unused anywhere, exact match for the route). The other 6 callers were deliberately NOT touched —
logged instead to `docs/follow-ups.md` as a headings-audit candidate, since 4 have no second title
component at all and 2 (`profil`, `parametres`) already carry a duplicate `<h1>`, and telling
which of those needs a Figma-driven fix is a per-page question the quota can't answer right now.

Verified live (throwaway `f1-gate-*@rls-smoke.servyou.invalid` fixture, authenticated CDP,
teardown after): exactly one `<h1>` on `/mes-favoris` reading "Mes favoris", the old subtitle
string now on a `<p>`; same on `/mes-missions` ("Mes missions"). AR: `<html dir="rtl">`, h1 reads
"المحفوظات", no French leak. No horizontal overflow at 375/1024/1152/1279/1280/1366/1440 (the
constant −15 is the scrollbar gutter, not a layout defect).

## 2. Card fidelity — Produits (`718:60584`) vs `ProductListingCard`

Figma card, 🗣 FOUNDER-REPORTED: heart top-left · shop monogram top-right · category label ·
title · price · city · cart button.

Built (`src/components/listings/ProductListingCard.tsx`), read live:

| element | Figma (founder) | Code | Match? |
|---|---|---|---|
| heart | top-left | top-right (`end-3 top-3`, line 75) | ✗ opposite corner |
| shop identity | monogram (avatar), top-right | plain text `"shop.name · shop.city"` (line 32, 61); no avatar anywhere | ✗ missing element |
| category label | present | never rendered — `category` is accepted in the type (line 22) but not read anywhere in the JSX; component's own comment (lines 18-21) states this card deliberately omits it | ✗ missing element |
| description | not listed by founder | 2-line-clamp description block rendered (line 58-60) | + extra element |
| title | present | present (line 55-57) | ✓ |
| price | present | present, bold (line 63) | ✓ |
| city | present | folded into the shop-meta text line, not separate | ~ present but merged |
| cart button | cart icon | circular black button with `ArrowUpRightIcon` (↗), not a cart glyph (line 64-69) | ✗ wrong icon |

This component's own header comment (lines 25-30) says it was built "Wink-style, pure mono" for
**`/recherche`, `/categories/[slug]`, and the consumer homepage** — three other surfaces. It was
never measured against `718:60584`. The F1 commit (`d1a142f`) reused it as a drop-in via
`ListingResults` without re-checking it against this frame; the divergences above are exactly
what that skipped check would have caught.

**✅ RESOLVED — 2026-08-16, same branch.** `ProductListingCard` was left untouched — none of its
three actual surfaces (`/recherche`, `/categories/[slug]`, `ConsumerHomepage`) were ever measured
against a Figma frame either (introducing commit `b5b6bfa`: "premium minimalist aesthetic per
**Wink reference**", not a node ID), so there is no Figma standard for them to be wrong against.
This is only wrong on F1 relative to a frame, and the founder already ruled on exactly this
situation once before, for C1: fork, don't restyle the shared card
(`docs/follow-ups.md`, "The C1 product card is a FORK, not a restyle"). That entry's own measured
delta table against `569:39818` is row-for-row the same four divergences found here (heart side,
shop badge, category chip, CTA icon — plus "no description," confirming the extra block isn't
F1-specific either), and its own trigger condition — *"a third product-card variant
appearing... do not re-measure"* — names this moment.

So F1 reuses `ProductBrowseCard` as-is (new `src/app/mes-favoris/_components/FavorisProductGrid.tsx`,
mirroring `ProductBrowseGrid`'s classes/stagger, wired into `FavorisTabs.tsx`'s Produits branch
only) — no third card, no variant prop on `ListingResults` (which `ProductBrowseGrid.tsx` already
warns against). This makes F1 the **4th** consumer of `ProductBrowseCard` (after C1, D1's
`ProductDetail.tsx`, D3's `ShopDetail.tsx`) — further pressure on the already-logged, still-open
follow-up to move it out of `marche/produits/_components/` (`docs/follow-ups.md`,
"`ProductBrowseCard` + `ProductCoverImage` are route-local but now serve two routes" — that
entry's own "third consumer" trigger already fired at D3; not resolved here, out of scope for a
header/card-swap PR).

**Data-layer gap found and fixed in the same PR:** `getMyFavorites`'s product query never
selected `categories` at all (`src/lib/marche/my-data.ts`), so the category chip would have stayed
empty even after the card swap — nothing to do with `ProductBrowseCard`, the favorites read just
never fetched it (the service leg already did). Added `categories ( name_fr, name_ar )` to the
select and `category` to the mapped `ProductListing`, mirroring the exact join `getMyOrders`
already uses in the same file.

**Residual, honestly-flagged uncertainty:** `718:60584` itself was not pulled and cannot be —
Figma MCP quota is exhausted for this cycle and the figma-cli CDP bridge is dead
([[project_figma_cli_bridge]]). The match to `ProductBrowseCard` is inferred from the founder's
element-by-element description of the frame plus the grid-ramp match (`ProductBrowseGrid.tsx`'s
own comment: the responsive classes were the thing actually checked against `569:39818`, and F1
already used those same classes before this fix). **Verified, not inferred:** a live fixture
(throwaway shop + 2 products, one with a category and one without) favorited from a throwaway
buyer account, read via authenticated CDP — heart sits at the card's own left edge (~11px in),
shop-initials monogram at the card's own right edge (~9px in), the category chip renders on the
product that has one and is absent (not empty) on the one that doesn't, and no element in the grid
carries the `card-premium` class that would mark the old `ProductListingCard`. What's still
unverified is exact spacing/sizing against `718:60584` itself — if a future Figma read finds a
delta, that is a follow-up correction, not evidence this fix was wrong: correct elements on
correct sides beats the prior state (missing elements on wrong sides).

## 3. Card fidelity — Services (`720:61378`) vs `ServiceListingCard`

Figma card, 🗣 FOUNDER-REPORTED: title · description · skill chips · price · avatar with
freelancer name · "Voir le service" button.

Built (`src/components/listings/ServiceListingCard.tsx`), read live: title (line 73) ·
description (line 74-76) · up to 3 skill chips, category-name fallback (line 78-91) · price (line
107-109) · avatar + freelancer name (line 97-104) · "Voir le service" CTA (line 110-112). **Every
element the founder listed is present** — no missing/extra element found.

Open gap: this component's own comment (lines 23-24) states it was "measured to Figma 'Service
Card' v3.7 (`124:6200` / variant `123:6120`)" — that's the `/marche/services` card, **not**
`720:61378`. Element inventory matches; exact spacing/sizing (279px height, 2px border, chip
radius) has not been checked against `720:61378` itself, only inherited from a different frame.
Not asserting a divergence here — flagging it as unverified, distinct from the confirmed Produits
divergences above.

**Left untouched — 2026-08-16 ruling.** Adjusting spacing that can't be measured is worse than
leaving it: Figma quota is exhausted this cycle, so there is no way to confirm whether `720:61378`
actually differs from `124:6200`/`123:6120` before making a change. `ServiceListingCard` stays
exactly as shipped; this paragraph is the log entry, not a TODO to act on speculatively.

Pre-existing, already-logged, not new to F1: skill chips render the localized *category* name
instead of real tag labels, because `tags` stores unlabeled slugs with no label map (component
comment lines 30-34, `docs/follow-ups.md`). Affects `/marche/services` too — not an F1 defect.

## 4. Boutiques / Freelances "Bientôt" badges — deliberate divergence, not a speculative design

`720:62084` (Boutiques) and `720:62688` (Freelances) draw **full, complete card designs** for
both tabs — they are not TBD or placeholder frames in Figma. 🗣 FOUNDER-REPORTED

The build disables both tabs outright: `SegmentedControl`'s `disabled` option renders a
non-interactive tab with a "Bientôt" badge, and no tab body is rendered at all
(`src/app/mes-favoris/_components/FavorisTabs.tsx:41-54`). This is because `favorites.item_type`
has no value for shop or freelancer favorites at the database level — no `shop_id` or
`freelancer_profile_id` column exists on `favorites` — so there is no data path that could
populate either tab today. **The design is not speculative; the schema is missing.** Confirmed
by founder ruling logged in commit `d1a142f`: no migration was authorized for this PR.

Trigger for closing this gap: a migration widening `favorites` to accept shop/freelancer targets
(new nullable FK columns + a matching `item_type` value, or a parallel table), then building the
Boutiques/Freelances tab bodies directly against `720:62084` / `720:62688` — which, per this
record, are ready to build from as soon as the schema exists.

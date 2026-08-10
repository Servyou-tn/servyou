# /produits/[id] (D1) — discovery record

**Provenance — read this before trusting a number.** This file was written in two passes and the two
carry DIFFERENT weight. Every value is tagged inline: **📐 MEASURED** or **🧠 MEMORY**.

**Pass 1 (discovery, no Figma call spent).** Schema, route and component facts read live from the
database and the working tree on **2026-08-08** — trust these. Layout facts taken from the D1 build
memory, written ~2026-07-20 and flagged point-in-time — unverified at the time of writing.

**Pass 2 (2026-08-08, two `get_metadata` reads).** `562:39015` (D1 `right`) and `589:43997` (E1
product). Everything tagged 📐 below is a Figma node bound as returned, plus arithmetic derived from
it — nothing in a 📐 line is a recollection or a transcription. This is the same standard as
`docs/design/marche-produits-measurements.md`. Values still tagged 🧠 were NOT in the returned tree
(overwhelmingly: things inside instances, which `get_metadata` does not expand).

**Result of pass 2: the memory record was correct on every value it asserted.** Nothing was
contradicted. What follows adds the values memory was silent on, and flags three build artifacts in
the frame itself.

The registry cannot help below depth 1 by construction: `registry-scan.js:157` emits Screens frames
as `name = id = (w×h, x)` and states outright that sub-frames "change often — go deeper via live
query." Same reason `marche-produits-measurements.md` exists as a separate file.

**Still unmeasured, and the call that would close it:** breadcrumb crumb COUNT and label text
(`562:39170` is an instance — `get_metadata` returns its 354×17 bounds and no children). One
`get_design_context` on `562:39170` resolves it.

---

## 1. The frame

`docs/design/figma-registry.md:682-684`:

```
Détail du produit — 1440 = 562:39013  (1440×2077, x=73363)
  Sidebar = 562:39014
  right = 562:39015
```

Four specimens, `figma-registry.md:685-692`, all desktop:

| specimen | id | bounds |
|---|---|---|
| D1 — galerie (image active) | `563:39552` | 432×775 |
| D1 — rupture de stock | `563:39579` | 568×623 |
| D1 — partager (dialog) | `563:39668` | 544×570 |
| D1 — signaler (modal) | `563:39705` | 480×660 |

**⚑ No 375 / mobile D1 frame exists.** Grepped the registry for every 375 product frame — none.
D1 is the outlier: D2 has `668:55920`, F1 has `720:63214`. Same gap C1 logs under "Known gaps."

## 2. Page structure, top to bottom — 📐 MEASURED

**Provenance:** one `get_metadata` read of **`562:39015`** (`right`) on **2026-08-08**, file
`jDNjJ8D1gnXiW7Ry3GkN4U`.

### 2a. Node tree as measured

| node | id | x | y | w | h |
|---|---|---|---|---|---|
| `right` | `562:39015` | 240 | 0 | 1200 | 2077 |
| — `Topbar` | `562:39016` | 0 | 0 | 1200 | 64 |
| — `content` | `562:39017` | 0 | 64 | 1200 | 2013 |
| —— `topGroup` | `562:39169` | 32 | 32 | **1136** | 709 |
| ——— `Breadcrumb` | `562:39170` | 0 | 0 | 354 | 17 |
| ——— `aboveFold` | `562:39178` | 0 | 33 | 1136 | 676 |
| ———— **`galleryCol`** | `562:39179` | 0 | 0 | **600** | **676** |
| ———— **`infoCol`** | `562:39180` | **632** | 0 | **504** | **495** |
| —— `belowFold` | `562:39181` | 32 | **781** | **1136** | 1200 |
| ——— `descSection` | `562:39267` | 0 | 0 | 1136 | 149 |
| ——— `shopPanel` | `562:39271` | 0 | 181 | 1136 | 154 |
| ——— `relatedSection` | `562:39296` | 0 | 367 | 1136 | 415 |
| ——— `reviewsSection` | `562:39279` | 0 | 814 | 1136 | 333 |
| ——— « Signaler ce produit » | `562:39295` | 0 | 1179 | 127 | 21 |

Region order is exactly as the memory recorded it: breadcrumb → gallery+info → description → shop
panel → similaires → avis → signaler.

### 2b. Every value the brief asked to confirm — all CONFIRMED, none corrected

| claim (🧠 memory) | 📐 measured | verdict |
|---|---|---|
| galleryCol 600 | `562:39179` w=600 | ✅ |
| infoCol 504 | `562:39180` w=504 | ✅ |
| aboveFold gap 32 | infoCol x=632 − galleryCol w=600 | ✅ |
| topGroup gap 16 | aboveFold y=33 − Breadcrumb h=17 | ✅ |
| belowFold gap 40 from topGroup | 781 − (32 + 709) = 40 | ✅ |
| belowFold children gap 32 | 181−149 · 367−335 · 814−782 · 1179−1147 — **all 32** | ✅ uniform |
| main image 600 square | `main 562:39183` = 600×600 | ✅ |
| content pad 32 | topGroup @ (32,32); bottom 2013 − (781+1200) = 32 | ✅ symmetric |

Both axes close exactly against their parents, which is what confirms authored values rather than
rounded readings:

- `aboveFold` width — `600 + 32 + 504 = **1136**` ✓, the same inner-content width independently
  derived for C1 (`1440 − 240 sidebar − 2×32 margin`).
- `belowFold` height — last child ends at `1179 + 21 = **1200**` ✓ = its own height.
- `galleryCol` height — `600 main + 12 + 64 thumbs = **676**` ✓.

### 2c. Gallery — `Image Gallery 562:39182` (600×676) — 📐 NEW, memory carried no geometry

```
main 562:39183  600 × 600
  ├ counter    562:39185  40×21  @ (12, 567)   → inset 12 start / 12 bottom
  ├ arrow ‹    562:39187  40×40  @ (12, 280)   → inset 12 start, centred (280+20 = 300 = 600/2)
  ├ arrow ›    562:39189  40×40  @ (548, 280)  → inset 12 end,   centred
  └ fav-circle 562:39205  44×40  @ (548, 12)   → inset 12 top, ⚑ 8 end (not 12)
      └ Favorite Heart 562:39206  44×44 @ y=−2 ⚑ overflows its parent 2px top and bottom
  ↓ 12
thumbs 562:39191  368 × 64  @ y=612
  └ thumb-1…5   64×64 each @ x = 0 / 76 / 152 / 228 / 304  → itemSpacing 12
```

`5×64 + 4×12 = 320 + 48 = **368**` ✓ closes exactly against the strip's own width.

**⚑ Two artifacts in the frame, not in the spec.** (1) `fav-circle` sits at end-inset **8** while all
three other overlays use **12** — treat 12 as the intent. (2) `fav-circle` is 44 **wide × 40 tall**
but holds a 44×44 `Favorite Heart` at `y=−2`, so the child overflows 2px top and bottom. The
container height is the slip; build the circle 44×44.

**⚑ The thumb strip is 368 of the column's 600** — it does NOT span the gallery width. Five fixed
64px thumbs, start-aligned, and the design shows exactly as many thumbs as images (5/5). A product
with 3 images gets a 3-thumb strip, not 5 slots.

**🔴 CORRECTION (fix/d1-grid-overflow, 2026-08-10) — every `600` above is a value measured AT 1440,
NOT a constant the layout can enforce below it.** The first build (`d3f4b39`) read `galleryCol 600`
literally and shipped `lg:grid-cols-[600px_504px]` — two RIGID tracks whose sum, `600 + 32 + 504 =
1136`, is fixed regardless of viewport. Below ~1424px of available content width (240 sidebar + 64
padding + scrollbar gutter), 1136 does not fit, and the grid overflowed its own shell by up to 384px
— founder-reproduced at his 1366px window, sidebar (`position: sticky`) dragged off-screen along
with the scroll. Measured broken band: **[1024, 1407]** inclusive; clean at 1408+. Fixed in
`fix/d1-grid-overflow` (commit follows this doc update).

**The fix: `galleryCol` becomes `minmax(0, 600px)`; `infoCol` stays the rigid `504px`.** 600 is now
a CEILING the track grows to when the shell has room (true at 1440, where it renders exactly
`600×600` per this section) and shrinks below on demand — measured `511×511` at 1366, `585×585` at
1440 itself (the shell's *available* content width there is 1121, one CSS pixel short of the full
1136 the frame implies — see the note below), and as small as `169×169` at the 1024 floor of the
`lg:` breakpoint. **`y=612` for the thumb strip, and every other pixel value in §2c, is therefore
also a 1440 point-value, not a floor.** The strip itself never breaks: it is `w-full overflow-x-auto`
already (built for the no-375-frame mobile ramp), so at 1024 its own 368px content simply becomes
scrollable within a 169px box instead of overflowing the page — a real UX squeeze at the very bottom
of the `lg:` band, flagged to the founder as an observation, not fixed in that PR.

**Why `infoCol` was left rigid.** D2's identical shape — `lg:grid-cols-[minmax(0,750px)_354px]` —
already puts the flexible track on the MEDIA side and keeps the text/CTA side fixed. Shrinking
`infoCol` instead would wrap the price block and the CTA label first, which is worse than a smaller
photo. This is why the pattern generalizes as "the fixed-width column is text/controls, the flexible
column is media" rather than "make both minmax" — the second option is more correct on paper but
was not what D2 already established in-repo, and the founder's fix directive was explicit: "apply
an existing in-repo rule rather than inventing one."

**Note on the 1440 shortfall:** even at the frame's own native width, the shell's real available
content width for the grid measured 1121px against the frame's `1136` — the frame assumes zero
scrollbar-gutter reservation, the browser does not. This 15px gap is present on every measured D1/C1
page at every width (it is the site-wide scrollbar constant, not a D1 defect) and is why `585`, not
`600`, is what actually renders at a bare 1440px viewport; only a WIDER-than-1440 viewport reaches
the full 600 ceiling.

### 2d. infoCol `562:39180` — 📐 order and gaps confirmed, uniform 16

| child | id | y | w × h |
|---|---|---|---|
| `Badge` | `562:39209` | 0 | 130 × 29 |
| `titlePriceGroup` | `562:39216` | 45 | 504 × 168 |
| — title (2 lines) | `562:39217` | 0 | 504 × 76 |
| — `priceBlock` | `562:39218` | 84 | 504 × 84 |
| —— « 45 TND » | `562:39219` | 0 | 103 × **34** |
| —— « + 7 TND de livraison » | `562:39220` | 38 | 135 × 21 |
| —— « Total : 52 TND à la livraison » | `562:39221` | 63 | 182 × 21 |
| « Plus que 3 en stock » | `562:39222` | 229 | 504 × 21 |
| `ctaCodGroup` | `562:39223` | 266 | 504 × 77 |
| — `Button` | `562:39224` | 0 | **504 × 48** — full-width, h48 = **lg** ✓ |
| — note COD | `562:39235` | 56 | 504 × 21 |
| `secondaryRow` | `562:39236` | 359 | 504 × 44 |
| — Heart + « Enregistrer » | `562:39237` | 0 | 126 × 44 (heart 44, label @ x=52) |
| — « Partager » | `562:39242` | — | @ x=150, w=59 → gap 24 after favG |
| `shopSnippet` | `562:39243` | 419 | 504 × 76 |
| — logo (monogram « AS ») | `562:39244` | @ (16,18) | 40 × 40 |
| — nameCity | `562:39246` | @ (68,16) | 286 × 44 |
| — « Voir la boutique → » | `562:39249` | @ x=366 | 122 × 21 → end pad 16 |

**Inner gap is 16 between all six children** (29→45, 213→229, 250→266, 343→359, 403→419).

**⚑ THE COLUMNS ARE TOP-ALIGNED, NOT STRETCHED — memory never recorded this.** `infoCol` is **495**
tall against `galleryCol`'s **676**: **181px of empty space** below the shop snippet. Do not build
`aboveFold` with `items-stretch`, and do not expect the shop snippet to sit on the gallery's bottom
edge.

### 2e. belowFold sections — 📐 internal geometry

| section | header | gap | body |
|---|---|---|---|
| `descSection` 1136×149 | « Description » h=26 | 12 | body 1136×**78** (3 × 26 — confirms clamp-3), then « Voir plus » 58×21 @ y=128 |
| `shopPanel` 1136×154 | — | — | logo **56×56** @ (24,24) monogram « AS »; `col` @ x=96 (24+56+16), 1016×106 — nom h26 · ville y30 · desc y55 h26 · « Voir tous les produits de cette boutique → » y85 w281 |
| `relatedSection` 1136×415 | « Produits similaires » h=26 | 16 | `cardsRow` 1136×373 — 4 × **272×373** @ x = 0/288/576/864 → **itemSpacing 16** |
| `reviewsSection` 1136×333 | « Avis » h=26 | 16 | `Empty State 562:39281` 1136×**291** |
| report link | — | — | « Signaler ce produit » 127×21 |

**All four sections close exactly against their own heights**, which is what makes the gaps above
authored rather than inferred:

- `descSection` — `128 + 21 = **149**` ✓
- `shopPanel` — `24 pad + 106 col + 24 pad = **154**` ✓
- `relatedSection` — `42 + 373 = **415**` ✓
- `reviewsSection` — `42 + 291 = **333**` ✓

**⚑ The related row is C1's grid geometry exactly** — same 272×373 card, same 16 spacing, one row of
4 instead of three rows of 4. `4×272 + 3×16 = 1136` ✓. Note the card is **272**, which C1's record
warns is a point value that holds *at 1440* only.

## 3. Field gap — the scope gate

Live schema (`information_schema`, 2026-08-08):

- `products` — id, shop_id, category_id, title, description, price_tnd, status, tracks_stock,
  stock_count, created_at, updated_at, admin_hidden_at, admin_hidden_reason, search_vector,
  **delivery_fee_tnd** (NOT NULL DEFAULT 7). **No `slug`.**
- `product_images` — id, product_id, image_url, display_order, created_at.
- `shops` — …, city, **logo_url**, banner_url, description, … **No `slug`.**
- `categories` — 14 rows, **`parent_id` NULL on ALL of them** (5 product · 8 service · 1 both). Flat.

| # | D1 displays | Settable in G6 today? | Evidence |
|---|---|---|---|
| 1 | Gallery, 5 images | ✅ | `ImageUploadGrid` → `product_images`, insert order = `display_order`; cap `MAX_PRODUCT_IMAGES` |
| 2 | Titre (H1) | ✅ | `ProductForm.tsx:149-159`, max 100 |
| 3 | Description | ✅ | `ProductForm.tsx:198-207`, max 2000, nullable |
| 4 | Prix « 45 TND » | ✅ | `products.price_tnd` numeric(10,2) |
| 5 | « + 7 TND de livraison » + « Total : 52 TND » | ⚠️ **set, but not fetched** | G6 writes `delivery_fee_tnd` (`ProductForm.tsx:62`, insert in `products.ts`). `product-detail.ts:59-62` **does not select it** and `ProductDetailData` (:22-34) has no field. **Fetch gap, not a field gap.** |
| 6 | « Plus que 3 en stock » | ✅ | `tracks_stock` + `stock_count`; D1 shows only when tracked & low |
| 7 | Pill « Rupture de stock » (specimen D) | ✅ derived | CHECK is `active\|hidden\|sold_out` but G6 writes only `active\|hidden` — so the state is `tracks_stock && stock_count === 0`, **not** `status` |
| 8 | Breadcrumb crumb2 = **secteur** | ❌ **NO** | No sector level exists. `categories.parent_id` NULL on all 14 rows |
| 9 | Badge + crumb3 = **sous-catégorie** | ❌ **NO** | Same cause. G6 has ONE select (`ProductForm.tsx:171-186`); the divergence is documented at `:161-164` and `product-categories.ts:19-22` |
| 10 | Nom boutique | ✅ | `shops.name`, set at G2 |
| 11 | Ville boutique | ✅ | `shops.city` — 1/1 populated |
| 12 | Description boutique (panel) | ✅ | `shops.description` — 1/1 populated |
| 13 | **Logo boutique** (rond « AS ») | ❌ **NO — settable nowhere** | `shops.logo_url` exists, **0/1 rows populated**; G2 is the only shop-write surface and G3 `/ma-boutique/modifier` does not exist. `ProductBrowseCard.tsx:34-42` already fell back to a 2-letter monogram |
| 14 | « Voir la boutique → » / « Voir tous les produits → » | ❌ | Targets D3 `/boutique/[slug]` — **route absent** AND `shops` has **no `slug`** |
| 15 | Share URL `/produits/coussin-brode-main` | ❌ | `products` has **no `slug`**; live route is `[id]` = uuid |
| 16 | Report modal (specimen C) | ✅ **DB ready**, no consumer UI | `reports` CHECK: `target_type` includes `'product'`; `reason ∈ fake_scam\|offensive\|wrong_category\|other` — exact match for Arnaque/Contenu/Mauvaise catégorie/Autre. Only `/admin/signalements` touches it |
| 17 | Heart « Enregistrer » | ✅ | `FavoriteButton item_type="product"`, already used at `ProductBrowseCard.tsx:107` |
| 18 | Avis | — deliberate | No reviews table, Phase 3 |
| 19 | Produits similaires | ✅ built | `getRelatedProducts` (`product-detail.ts:115-156`), same-shop OR same-category, excludes current, cap 8 |

### What G6 cannot produce — five items, and **G7 closes none of them**

| gap | why | what would close it |
|---|---|---|
| **A. Secteur** (crumb2) | taxonomy level does not exist in the DB | migration (`g6-discovery.md §6 B2`) |
| **B. Sous-catégorie** (badge + crumb3) | same | same migration |
| **C. Logo boutique** | shop field, not a product field; no shop-edit route | G3 |
| **D. Slug** (produit + boutique) | no column on either table | migration |
| **E. `delivery_fee_tnd`** | ~~written but not selected~~ | ✅ **CLOSED** in the D1 build — added to the select and to `ProductDetailData`; E1 inherits it |

G7 edits exactly the seven fields G6 creates. **Nothing on D1's display surface changes if G7 is in
or out of this PR.**

## 4. Route state today

**`/produits/[id]`** — `src/app/produits/[id]/page.tsx:14-26` renders `<ComingSoon>` inside the v2
`AppShell`. The `[id]` segment is ignored (comment, :13). Public, nullable shell user.

**A complete data layer already exists and is unused.** `src/lib/marche/product-detail.ts` —
`getProductDetail` (React-`cache()`'d, moderation-enforcing: `status='active'` + `shops!inner` with
`admin_hidden_at IS NULL`) and `getRelatedProducts`. **Zero importers** — grep returns only
self-references and a comment at `data.ts:39`. Resurrected from `59cb952^`.

Card hrefs — identical on both cards:

```tsx
// src/app/marche/produits/_components/ProductBrowseCard.tsx:46
<Link href={`/produits/${product.id}`} className={`block ${FOCUS_RING}`}>

// src/components/listings/ProductListingCard.tsx:36
<Link href={`/produits/${product.id}`} className={`block ${FOCUS_RING}`}>
```

**⚑ Gate finding — D1's primary CTA lands on a placeholder.** « Demander ce produit » → E1
`/demander/[id]`. That route exists, but `demander/[id]/page.tsx:19-24` states its PRODUCT branch is
still the `ComingSoon` stub; only the SERVICE branch was rebuilt. The product COD form is a separate
Figma screen (`589:43997`).

**⚑ Stale comment** — `ProductListingCard.tsx:30` says `/produits/[id]` "404s until that route is
rebuilt." It does not 404; it renders `ComingSoon`.

**⚑ Known live defect on this surface** — `follow-ups.md:1356` lists `/produits/[id]` (D1's gallery)
among the surfaces still hitting the `next/image` NAT64 400 in local dev. Confirmed on
`ProductListingCard` 2026-08-07.

## 5. Component inventory

### Exists, reusable

| component | path | note |
|---|---|---|
| `StatusPill` | `ui/status-pill.tsx` | `'rupture-stock'` already in `StatusValue` → danger tone. Ready |
| `Avatar` + `getInitials` | `ui/avatar.tsx`, `ui/initials.ts` | D2 uses both for the freelancer block |
| `Button` | `ui/button.tsx` | `lg` = h-12 (:66) and `disabled` colours compose independently of size (:103-104). **The Figma `primary/lg/disabled` gap is a Figma-matrix gap only — code can render it** |
| `FavoriteButton` | `components/FavoriteButton.tsx` | `item_type="product"` in use |
| `ProductListingCard` via `ListingResults type="product"` | `components/listings/` | D2's like-for-like for *similaires*. **NOT** `ProductBrowseCard` — single-surface C1 fork (`marche-produits-measurements.md:117-128`) |
| `getProductDetail` / `getRelatedProducts` | `lib/marche/product-detail.ts` | built, unused |
| `AppShell` | `components/shell/AppShell.tsx` | already in the stub |

### Does not exist

| region | status |
|---|---|
| **Image Gallery** (Figma `197:14853`) | **zero hits for `ImageGallery` in `src/`.** `ImageUploadGrid` is the seller-side uploader, not a viewer |
| **Lightbox** | **zero hits in `src/`** |
| Breadcrumb | no component — D2 hand-rolls it inline (`ServiceDetail.tsx:141-146`) |
| Share dialog | no component — D2 renders a bare icon button with no dialog behind it (`:86-93`) |
| Report modal | no component — D2 renders the report line as a static muted `<p>`, not a link (`:232`) |
| Shop trust Panel | `tableau-de-bord-vendeur/_components/Panel.tsx` is route-local, not shared |

**⚑ `EmptyState` for Avis — RECOMMENDATION REVERSED BY THE PASS-2 MEASUREMENT.**

Pass 1 said: follow D2, which hand-rolls an inline centred div for Avis (`ServiceDetail.tsx:226-231`,
`h-30` = **120px**, a bare `<p>`, no icon). That advice was written without the number.

📐 D1's frame draws `Empty State 562:39281` at **1136 × 291** — 2.4× D2's block, and the memory
records it as carrying a **star icon**. That is `EmptyState`-shaped (`components/marche/EmptyState.tsx`
= rounded-2xl card, `p-12`, 48px muted glyph, message, optional CTA); a 120px iconless `<p>` is not.

**Use `EmptyState` on D1 and diverge from D2 here.** Note the 291 will not fall out of `p-12`
defaults alone (icon 48 + `mt-4` + message ≈ 184 with no CTA) — closing the last ~100px is a build
detail, not a reason to pick the other component. D2's block stays as it is; this is an addition,
not a re-implementation.

**Regions with no component at all:** the whole `galleryCol` (gallery + lightbox), breadcrumb, share
dialog, report modal, shop trust panel.

---

## 6. E1 « Demander ce produit » `589:43997` — 📐 MEASURED

**Provenance:** one `get_metadata` read of **`589:43997`** on **2026-08-08**. Memory held only
"two-col + sticky order-summary + COD trust + Number Stepper" — everything below is new.

**This is D1's CTA destination**, and its product branch is a `ComingSoon` stub today (§4).

**🔴 SECOND CALL, 2026-08-10 — one `get_metadata`, spent per instruction to close the gap. What it
actually returned: geometry only, no new information beyond confirming §6a-6d's numbers with
absolute coordinates (previously several were relative offsets). Two genuinely new facts: the
frame's own title is `Demander ce produit — 1440`, and the order-summary `thumb` (`589:44225`)
holds an instance named `icon-image` (`589:44226`, 24×24 @ 20,20) — this SPECIMEN's product has no
photo, so the frame is drawing the placeholder-glyph state, not a real thumbnail. That is directly
reusable: it is the same state `ProductCoverImage`'s `Placeholder` already renders for exactly this
case (§5, D1).**

**⚠ `get_metadata` cannot deliver what was asked for, and this is a tool limit, not an oversight.**
Its own description: "only includes node IDs, layer types, names, positions and sizes" — no text
content. Every text node in this frame is named generically (`h3`, `label`, `value`,
`adresseLabel`, `codText`, `title`, `seller`) — structural names, not copy, the same pattern
already true of D1's own badge/price rows. **Reading the actual French labels, helper text, and
required markers needs `get_design_context` or a screenshot — a different call, not spent here.**
Every label/helper below is therefore sourced from the **founder's own screenshot**, not from
Figma, and is marked accordingly. Two section headings (`h3` at `589:44116` and `589:44210`) are
named by **neither** source — genuinely still open; see the flag in §6e.

### 6a. Node tree

| node | id | x | y | w | h |
|---|---|---|---|---|---|
| frame | `589:43997` | 80000 | 0 | 1440 | 1192 |
| — `Sidebar` | `589:43998` | 0 | 0 | 240 | 1192 |
| — `right` | `589:44067` | 240 | 0 | 1200 | 1192 |
| —— `Topbar` | `589:44068` | 0 | 0 | 1200 | 64 |
| —— `content` | `589:44100` | 0 | 64 | 1200 | 1128 |
| ——— `header` | `589:44101` | 32 | 32 | 1136 | 92 |
| ———— `Breadcrumb` | `589:44102` | 0 | 0 | 149 | 17 |
| ———— `H1` | `589:44110` | 0 | 25 | 1136 | 38 |
| ———— `subline` | `589:44111` | 0 | 71 | 1136 | 21 |
| ——— `twoCol` | `589:44112` | 32 | **148** | 1136 | 948 |
| ———— **`formCol`** | `589:44113` | 0 | 0 | **724** | 948 |
| ———— **`summaryCol`** | `589:44114` | **756** | 0 | **380** | **394** |

**Region order top to bottom:** breadcrumb → H1 → subline → two columns (form ‖ summary). No
below-fold content at all — the page ends with the form.

### 6b. Column split — ⚑ DIFFERENT FROM D1

`724 + 32 + 380 = **1136**` ✓ — same inner width, **different split**. D1 is 600/504; E1 is 724/380.
Do not carry D1's column widths across. Header→twoCol gap = `148 − (32+92)` = **24**. Bottom pad =
`1128 − (148+948)` = **32**.

**⚑ `summaryCol` is 394 tall against `formCol`'s 948** — same top-aligned, non-stretched posture as
D1's `aboveFold`. "Sticky" is a code behaviour to add; it is not a property of the frame.

### 6c. formCol `589:44113` — sections and address fields

```
section1 589:44115  724 × 838
  ├ h3                        724×26
  ↓ 20
  ├ Input        589:44117    724×97
  ↓ 20
  ├ Input        589:44134    724×97
  ↓ 20
  ├ adresse      589:44154    724×365
  │   ├ adresseLabel          724×26
  │   ↓ 16
  │   ├ Input    589:44156    724×97
  │   ↓ 16
  │   ├ Input    589:44165    724×97
  │   ↓ 16
  │   └ cityRow  589:44174    724×97
  │       ├ Select — Trigger  589:44175   354×97  @ x=0
  │       └ Select — Trigger  589:44186   354×97  @ x=370   → gap 16
  ↓ 20
  └ Textarea     589:44197    724×173
↓ 32
section2 589:44209  724 × 78
  ├ h3                        724×26
  ↓ 12
  └ stepGrp      589:44211    724×40
      ├ Number Stepper 589:44212  136×40
      └ « avail »      589:44222   89×21  @ x=148  → gap 12
```

- `354 + 16 + 354 = **724**` ✓ — the city row closes exactly.
- **Every field control is 97 tall.** That is the F3 `Input` composite at label + field + helper
  (21 + 44 + gaps + 21), which is the same 97 the `Select — Trigger` instances report. One field
  height across the whole form.
- **Two sections, gap 32**; within a section the gap is **20**, and inside the `adresse` sub-group it
  tightens to **16**.
- **⚑ The city row is two `Select` triggers, NOT text inputs.** That means reference data on both —
  a governorate/city pair, not free text. `src/lib/marche/filter-cities.ts` already exists and is
  what C1's Ville filter consumes; whether it satisfies both triggers is unresolved and is a build
  question, not a measurement.

### 6d. summaryCol `589:44114` → `order-summary 589:44223` (380×394)

Padding **24** on all sides — every child is `x=24, w=332`, and `24 + 332 + 24 = 380` ✓.

| child | id | y | w × h | gap above |
|---|---|---|---|---|
| `product` | `589:44224` | 24 | 332 × 64 | — |
| — `thumb` | `589:44225` | 0 | **64 × 64** | — |
| — `pinfo` | `589:44230` | 0 | 256 × 46 @ x=76 → gap 12 | — |
| —— title / seller | `589:44231/2` | 0 / 25 | 256 × 21 each | — |
| `Divider` | `589:44233` | 104 | 332 × 1 | 16 |
| `priceBox` | `589:44234` | 121 | 332 × 103 | 16 |
| — row (prix) | `589:44235` | 0 | label 93 · value 59 @ x=273 | — |
| — row (livraison) | `589:44238` | 34 | label 68 · value 48 @ x=284 | 8 |
| — `Divider` | `589:44241` | 68 | 332 × 1 | 8 |
| — row (**total**) | `589:44242` | 77 | label 101 · value 59 @ x=273 | 8 |
| `cod` | `589:44245` | 240 | 332 × 66 — text inset 12, 308×42 (2 lines) | 16 |
| `CTA` | `589:44247` | 322 | **332 × 48** = lg | 16 |

`322 + 48 + 24 pad = **394**` ✓ closes exactly against the box height. CTA copy, from the
founder's screenshot (not Figma — get_metadata can't read it): **« Confirmer la demande »**.

### 6e. Full field list, top to bottom — 📐 geometry MEASURED, copy FOUNDER-SOURCED

Every label/helper/required-marker below is transcribed from the founder's own screenshot of the
frame, mapped onto the node IDs in §6c/§6d. **None of it came from Figma** — `get_metadata` cannot
return text content (see the flag above §6a); reading it directly needs `get_design_context`,
not spent this pass. Required markers are cross-checked against `submitProductRequest`'s existing
server-side validation (`src/app/demander/[id]/actions.ts`), which is the authoritative source for
what is actually enforced, independent of what the frame draws.

| node | field | label (founder) | helper (founder) | required |
|---|---|---|---|---|
| `589:44116` h3 | section1 heading | 🔴 **not given by either source** — neither the founder's screenshot nor Figma metadata names it | — | — |
| `589:44117` Input | destinataire name | « Nom complet du destinataire » | « Modifiable si la commande est livrée à quelqu'un d'autre » | ✅ — `submitProductRequest` rejects an empty `deliveryName` |
| `589:44134` Input | phone | « Téléphone » + static `+216` prefix | « Le livreur vous contactera à ce numéro » | ✅ — `!isValidPhone(...)` gate |
| `589:44155` adresseLabel | address group heading | 🔴 **not given by either source** | — | — |
| `589:44156` Input | street | « Rue et numéro » | *(none stated)* | ✅ — folds into `deliveryAddress`, which `submitProductRequest` rejects empty |
| `589:44165` Input | quartier | « Quartier » | *(none stated)* | 🔴 **unknown — see the gap below** |
| `589:44175` Select | ville | « Ville » | *(none stated)* | 🔴 **unknown — see the gap below** |
| `589:44186` Select | gouvernorat | « Gouvernorat » | *(none stated)* | ✅ — `submitProductRequest` validates against `GOVERNORATES` |
| `589:44197` Textarea | seller note | « Note pour le vendeur (optionnel) » | 0/300 counter + helper (exact helper copy not stated) | ❌ optional — matches `input.note.trim() \|\| null` |
| `589:44210` h3 | section2 heading | 🔴 **not given by either source** | — | — |
| `589:44212` Number Stepper + `589:44222` avail | quantity | « Quantité » (stepper has no own label per the founder's list — the section h3 likely serves as its label, unconfirmed) | « {n} disponibles » | ✅ implicit — always has a value, `qty < 1` rejected |

**🔴 The address group is TWO fields short of what `submitProductRequest` accepts today.**
`ProductRequestInput` (`actions.ts:27-35`) has exactly `deliveryAddress: string` and
`governorate: string` — one free-text field plus the validated governorate. It has **no
`quartier` and no `ville` field**. The frame draws four address controls (street, quartier, ville,
gouvernorat); the shipped action accepts two. Whoever builds the form must decide: fold
street+quartier+ville into the one `deliveryAddress` string client-side (zero action changes), or
extend `ProductRequestInput` with new fields and fold server-side (touches an already-shipped,
working file). Not resolved here — flagged for the founder, §Step 3 below.

**🔴 « Ville » has no reference dataset anywhere in this codebase — it would ship as free text.**
`src/lib/tunisia-governorates.ts` supplies the 24 governorates (canonical, already validated
server-side). `src/lib/marche/filter-cities.ts` looks like a match by name but is not one: it
returns the **seller's** shop/freelancer city as a browse-filter option list (`getServiceCities` /
`getProductCities`), scoped to "which cities currently have active listings" — a completely
different concept from a **buyer's delivery city**, and reading from it would silently couple E1's
address form to which sellers happen to be active. If the frame's "Ville" `Select` is meant to be
a true reference-data picker (not free text), that dataset does not exist yet and is new scope.

**🔴 The Textarea's internal geometry (where the 0/300 counter sits inside its 724×173 outer
box) is not resolvable from `get_metadata`** — it doesn't expand an instance's internals with
text content. `src/components/produits/ProductForm.tsx`'s description field (label+asterisk /
`<textarea>` / a row with the helper on one side and a live `{length}/{max}` counter on the
other, `mt-1.5 flex items-start justify-between gap-2`) is the exact in-repo precedent for a
textarea-with-counter and is presumably what 173 decomposes into — reusable directly at
`maxLength={300}` and no `required`, without a further Figma read.

`322 + 48 + 24 pad = **394**` ✓ closes exactly against the box height.

**Price breakdown is three rows with a rule before the total** — every value right-aligned
(`273 + 59 = 332`, `284 + 48 = 332`). **It needs `delivery_fee_tnd`**, exactly as D1's `priceBlock`
does — so the one-line fetch fix in §3E serves both surfaces, not just D1.

---

## 7. Reconciliation against the agreed build scope

| scope decision | measurement says | flag |
|---|---|---|
| Breadcrumb 2 levels (Accueil › catégorie › titre) | 🧠 **unresolved.** `562:39170` is an instance — 354×17 bounds, no children returned. Memory claims 4 crumbs; 354 is consistent with 3 or 4 and proves neither. | Cheap to settle: one `get_design_context` on `562:39170`. Not a blocker — dropping to 3 crumbs only shortens the row, and the row is 17 tall regardless |
| Badge shows the flat category | 📐 Badge is **130×29**. At the frame's own label (« Textile artisanal ») that is a hug width. The flat categories are sector-level and **longer** (« Artisanat & fait main »), so the badge will render wider than 130 | Not a conflict — build the badge hug-width, don't pin 130 |
| Shop logo uses the monogram fallback | 📐 **The frame already draws a monogram.** Both logo slots hold a text node « AS », not an image: `562:39244` 40×40 → text 20×17, and `562:39272` 56×56 → text 28×24 | ✅ **The fallback is not a compromise — it is what the design shows.** Strongest confirmation in this pass |
| Share URL `/produits/[uuid]` | not touched by either read (dialog is specimen `563:39668`) | no conflict |
| `delivery_fee_tnd` into the select + `ProductDetailData` | 📐 required by **two** surfaces: D1 `priceBlock` (`+ 7 TND` and `Total : 52 TND`) and E1 `priceBox` (livraison row + total row) | widen the scope note: the fix serves E1 too |
| « Voir la boutique » has no destination | 📐 **there are TWO such links, not one** — `562:39249` « Voir la boutique → » (infoCol, 122 wide) and `562:39278` « Voir tous les produits de cette boutique → » (shopPanel, 281 wide) | see below |

### 7a. « Voir la boutique » — options, not a decision

Reporting rather than deciding, per instruction. Both links target D3 `/boutique/[slug]`, which has
neither a route nor a `slug` column (§3 D).

**Option A — render as static text, don't link.** Exact D2 precedent: `ServiceDetail.tsx:232` draws
the report line as a static muted `<p>` rather than a dead link. Costs nothing, keeps both regions
drawn as designed, and the shop panel still does its trust job (name, city, description) without
onward navigation. Reversible in one line when D3 lands.

**Option B — drop both links.** Cheapest to reason about, but it halves the shop panel's purpose and
means redrawing two regions again when D3 arrives.

**Option C — point at a filtered C1, `/marche/produits?boutique=<shopId>`.** The only option that
gives real navigation with no new route. **⚑ It is NOT free:** C1's URL contract is
`q / categorie / ville / prix / tri / page` (`marche/produits/page.tsx:34`) — **there is no shop
facet.** This means a new param, a new filter branch in the C1 data layer, and a filter-bar decision
(does the shop show as an active chip?). That is a second surface changed inside a D1 PR, which the
one-PR-one-focus rule pushes back on.

**Recommendation: A.** It is the smallest honest thing, it has a same-repo precedent doing exactly
this (`ServiceDetail.tsx:232`), it keeps both measured regions drawn as designed, and it reverses in
one line the day D3 lands. C is the only option a buyer would actually thank us for, and it is
rejected here only because it changes C1's URL contract and filter bar from inside a D1 PR — if the
founder wants the navigation now, C is the right shape and should be its own PR. B loses design work
already done and is not recommended under any reading.

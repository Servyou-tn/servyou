# G6 « Ajouter un produit » — Phase 1 discovery

**REPORT ONLY. No code written, no migration applied, no bucket touched.**
**Date:** 2026-08-04 · **Branch:** `feat/g6-ajouter-produit` off `origin/main` @ `18eb7aa`
**Node:** `530:31784` · **Route proposed:** `/mes-produits/ajouter`

---

## 0. The headline — two blockers, before anything else

The brief's premise is that `product-images` "has a bucket and RLS from PR #104 but no writer."
**The bucket is real. The RLS is not.** And the category cascade has no data source.

| # | blocker | consequence |
|---|---|---|
| **🔴 B1** | The `product-images` storage policies are **provably unsatisfiable** — an alias-capture bug | G6 cannot upload **one byte**. Needs a migration. |
| **🔴 B2** | The cascade picker's taxonomy (`product-categories.ts`) and the live `categories` table are **irreconcilable** | Section 1's two-Select cascade has nothing to read. Founder call. |

Neither is a "while we're here." Both sit directly on the critical path of the thing this PR exists
to build. **G6 is not a pure application PR.**

**Plus one prior recommendation overturned by measurement (§4d):**
`image-storage-discovery.md` §2e recommends capping uploads at "~2048px." Measured, a 2048px WebP
at q82 reaches **2900 KB worst case — 142% of the `product-images` bucket's own 2 MiB
`file_size_limit`.** The cap and the bucket were set in the same PR and never checked against each
other. **`PRODUCT_MAX_EDGE = 1280`** (890 KB worst case, 43% of the cap) is the corrected figure.

---

## 1. Node IDs — confirmed from the registry

All four confirmed in `docs/design/figma-registry.md:624-635`. Child anchors as recorded:

| node | title | size | children |
|---|---|---|---|
| **530:31784** | Ajouter un produit — 1440 | 1440×1643 | `Sidebar = 530:31785` · `right = 530:31786` |
| **532:32191** | G6 — stock non suivi (dropshipper) | 600×259 | `Frame = 532:32193` · `Frame = 532:32199` |
| **532:32201** | G6 — galerie remplie | 600×276 | `gallery = 532:32204` |
| **532:32245** | G6 — cascade catégorie | 680×1203 | `state = 532:32247` · `state = 532:32282` · `state = 532:32344` |

**No mobile frame.** Confirmed — the registry holds exactly these four G6 entries between G5
(`522:29106`, x=55403) and G7 (`535:32433`, x=59923), all at x=57683. G6 follows the same
desktop-only pattern as G5/G7/G9. **375px has no target to match**, exactly as `g9-deltas-3.md`
X-3 records for G9. Any responsive decision here is a product decision, not a fidelity one.

---

## 2. Measurement budget — **recommendation: spend ZERO**

Connector is ~6 calls/month on a rolling reset; CDP is dead on Figma 126.7.10
(`project_figma_cli_bridge`, confirmed clean-slate 2026-08-03 — stop retrying).

### Already on file — do not re-measure

| source | what it settles |
|---|---|
| `figma-registry.md:624-635` | all four node ids, sizes, child anchors, x-positions, no-mobile-frame |
| **G6 build memory** (`project_figma_g6_ajouter_produit`) | **the full field spec**: 4 sections, 760px form column, every field and its control, counters (/100, /2000), the cascade contract, the two-CTA gate list, the buyer-total preview copy, `tracks_stock` toggle behaviour, image grid 1–8 + cover, and 4 build gotchas |
| `g9-deltas-3.md` | panel chrome (pad 24 · gap 16 · r12 · 1px `#e2e8f0` · `#ffffff`), content pad 32, X-1 line-height drift, X-2 rhythm collapse, X-4 money format |
| `image-storage-discovery.md` | §1b render sizes (G6 grid 600×276), §2b TTL config, §5 upload path, §3 path convention |
| `figma-registry.md` (type ramp) | `leading/*`, `size/*`, `weight/*` + the `leading/body` 26-vs-24 drift |
| existing components | Price Input `202:15487`, Toggle `75:1840`, Select, Input/Textarea, Button 42-variant matrix — all built and Figma-measured in F3 |

Per `g9-deltas-3.md`'s own method rule: **grep `docs/design/*-deltas*.md` and the memory files for
the node id before spending a call.** That rule was earned by PB-1/PB-2 shipping wrong when the
answer had been measured a week earlier.

### The one honest candidate — and why it still isn't needed

**`532:32201` (galerie remplie, `gallery = 532:32204`)** is the only region where the repo holds a
*description* but not *geometry*: the memory records "4×96 thumbs, 1st ribbon relabel
Principale→Couverture, remove-×, grip, uploading tile" and `image-storage-discovery.md:66` records
the 600×276 region — but no thumb gap, no ribbon padding, no dashed-border spec.

**Recommendation: still don't spend it.** Two reasons:

1. **There is no built `ImageUploadGrid` or Dropzone in the codebase.** Grepped
   `Dropzone|ImageUpload|dropzone|upload-cloud|UploadCloud` across `src/` — **zero matches.** The
   G6 memory's "Real ImageUploadGrid component extraction STILL deferred" is still true. So this
   PR builds the grid from scratch either way, and it will be built from the same primitives
   (96px thumb, r8/r10, `#e2e8f0` border) that every other panel already uses.
2. **B1 blocks the upload entirely.** Measuring a grid that cannot receive a file is spending the
   scarcer resource first. If a call is spent this cycle, spend it *after* the storage policy is
   fixed and the grid is standing — on a fidelity pass, where a delta list makes it pay for itself.

**Budget answer: 0 calls. One deferred candidate (`532:32204`), named, for a later fidelity pass.**

---

## 3. Route — `/mes-produits/ajouter`, and it ships standalone

**Not a proposal — the codebase already decided.** Two live links point at it:

- `src/app/tableau-de-bord-vendeur/page.tsx:80` — quick action `{ key: 'addProduct', href: '/mes-produits/ajouter', icon: Plus }`
- `src/app/tableau-de-bord-vendeur/page.tsx:109` — `href="/mes-produits/ajouter"` CTA

**Both are dead links today.** `src/app/mes-produits/` does not exist. G4 ships a button that 404s.

**G5 is not required.** G6 ships standalone and *fixes* a live defect — it turns two 404s into a
working surface. Evidence:

- The sidebar entry is `{ key: 'shell.sidebar.products', href: '/mes-produits', icon: Package, disabled: true }`
  (`src/components/shell/sidebar-items.ts:84`) — **already disabled**, so no nav promises a list page.
- Reachability is G4's quick action + CTA, which is exactly the entry point the founder named.

**Two consequences to settle, since G5 is absent:**

| question | options |
|---|---|
| **Post-create redirect** | `/mes-produits` **does not exist** — cannot redirect there. `/produits/[id]` (D1) **does** exist and is live. **Recommend: redirect to `/produits/[id]`** — the seller sees exactly what the buyer will see. Alternative: stay on the form with a success state (E2-style). |
| **`revalidatePath` set** | Follow `SELLER_PATHS` in `src/app/actions/orders.ts:35`. A new product changes `/marche/produits` (the live marketplace grid) and `/boutique/[slug]` (D3). Recommend a fixed allow-list, same posture — never an arbitrary caller-supplied route. |

**Breadcrumb caveat:** the frame's chrome was cloned from G5 with "Mes produits" active in the
sidebar. With `/mes-produits` disabled and absent, a breadcrumb "Mes produits › Ajouter" would link
to a 404. Recommend the breadcrumb parent point at `/tableau-de-bord-vendeur` until G5 lands.

---

## 4. THE IMAGE UPLOAD — the point of this PR

### 4a. 🔴 B1 — the `product-images` RLS is broken, and it is not "no writer"

Read live from `pg_policies`. The INSERT policy `"product-images: shop owner inserts under own shop"`:

```sql
bucket_id = 'product-images' AND EXISTS (
  SELECT 1 FROM shops s
  WHERE s.id::text = (storage.foldername(s.name))[1]   -- ← s.name, NOT objects.name
    AND s.owner_id = auth.uid()
)
```

**`storage.foldername(s.name)`** — it reads **`shops.name`** (the shop's display name), not
`storage.objects.name` (the object path). This is a Postgres **alias capture**: the policy was
written `storage.foldername(name)`, the inner `FROM shops s` shadowed the outer `objects.name`
with `shops.name` (a real `text` column — confirmed in `information_schema`), and Postgres
silently resolved it to the inner one and stored it that way.

**Proven empirically, not inferred:**

```
shop_id: f4757d2d-705c-48c8-bd58-37a35c7bdab3
name:    'OM shop'
(storage.foldername('OM shop'))[1]  →  NULL
s.id::text = NULL                   →  NULL   ⇒ policy NEVER grants
```

`storage.foldername()` strips the final path segment, so a shop name with no `/` yields an empty
array and `[1]` is NULL. **The predicate is unsatisfiable for every shop.** Even a shop named
`"a/b"` would compare a uuid against `'a'`.

**The same defect is on all four of these policies** (one origin migration, one mistake):

| policy | cmd | state |
|---|---|---|
| `product-images: shop owner inserts under own shop` | INSERT | 💀 dead |
| `product-images: shop owner deletes own` | DELETE | 💀 dead |
| `shop-assets: shop owner inserts under own shop` | INSERT | 💀 dead |
| `shop-assets: shop owner deletes own` | DELETE | 💀 dead |

The **uid-first** buckets are all **correct** — `avatars`, `portfolio-media`, `verifications` have
no subquery, so `name` resolved to `objects.name` as intended. That is exactly why the avatar
writer (PR #104) works and this one cannot: **only the two `EXISTS`-shaped policies are affected.**

**The fix** is `(storage.foldername(objects.name))[1]` — schema-qualify the outer reference so the
alias cannot capture it.

**Scope call for the founder:** `shop-assets` is G3's writer, not G6's. It is one defect from one
migration and fixing both in one migration is honest and auditable; fixing only `product-images`
leaves a known-dead policy in the database. **Recommend fixing both, flagged rather than bundled
silently.**

### 4b. 🔴 B1b — a third gap: no SELECT policy on `product-images`

`storage.objects` has SELECT policies for `avatars` ("owner reads own") and `verifications` only.
**`product-images` has none.**

Public-bucket reads bypass RLS *by URL*, so rendering is fine. But **`.list()` goes through SELECT
RLS** — and the avatar writer depends on it: `sweepAvatarFolder` (`mon-compte/actions.ts:179`)
calls `.list()` to clear stale objects, and `uploadAvatarAction:138` calls `.remove()` to roll back
an orphan. Without a SELECT policy, G6's equivalent cleanup **silently sees an empty folder** and
every failure leaves an orphan.

`avatars: owner reads own` exists for precisely this reason. **Add the matching
`product-images` SELECT policy in the same migration.**

### 4c. Is `normalizeAvatar` reusable? — **Yes, as-is. Do not rename it.**

`normalizeAvatar(input: Buffer, maxEdge = AVATAR_MAX_EDGE)` (`src/lib/images/normalize.ts:99`) is
**already parameterized on `maxEdge`**. The pipeline — magic-byte sniff → decode → `.rotate()` EXIF
→ `resize({fit:'inside', withoutEnlargement:true})` → `.webp({quality:82})`, metadata stripped — is
format-agnostic and is the platform's content gate. Nothing in it is avatar-specific except the
default.

**Recommend:** export a thin `normalizeProductImage(buf)` wrapper in the same module rather than
renaming the function. Renaming is a refactor into merged, working code — "once built, stays built."

### 4d. Does a product photo want a different cap than 512?

**Yes — 512 is far too small, and 2048 is too generous.** Derive it from render widths:

| surface | rendered width | source |
|---|---|---|
| G9 order row thumb | 48 | `OrderActionRow.tsx` `h-12 w-12` |
| G6/G7 upload grid thumb | 96 | Figma `532:32201` |
| marketplace card | `aspect-square`, ≤25vw at ≥1280 | `ProductListingCard.tsx:39` |
| D1 hero gallery | 432×775 region | Figma `563:39552` |

The widest *rendered* product region is D1's **432px** gallery. `deviceSizes` tops at 1920 but no
product layout requests it — `next.config.ts:66` was trimmed to the project's real breakpoints
precisely so unused widths cost nothing.

**Recommend `PRODUCT_MAX_EDGE = 1280`** — and this is now a **measured constraint, not a judgment
call.** Measured against the installed `sharp` 0.35.3, encoding pure random noise (the worst case
for any codec — if the worst case fits, every real photo does) at `quality: 82`, the same setting
`normalize.ts:123` uses:

| max edge | worst-case WebP output | vs the `product-images` 2 MiB `file_size_limit` |
|---:|---:|---|
| 512 (`AVATAR_MAX_EDGE`) | 89 KB | 4% |
| **1280 (recommended)** | **890 KB** | **43% — safe** |
| 2048 (the doc's figure) | **2900 KB** | **🔴 142% — EXCEEDS THE CAP** |

### 🔴 This overturns a recommendation in `image-storage-discovery.md`

§2e of that doc recommends capping the longest edge at **"~2048px."** **A 2048px WebP can exceed
the `product-images` bucket's own 2 MiB `file_size_limit`** — the upload would be rejected by
Storage *after* a successful decode and re-encode, surfacing to the seller as a failed upload with
no actionable cause. The two settings were chosen in the same PR and were never checked against
each other.

1280 is the largest round edge that keeps the worst case comfortably inside the cap while still
serving D1's 432px hero at ~3x (enough for a lightbox and 2x retina) and sitting inside the trimmed
`deviceSizes`. It preserves roughly the same headroom ratio the avatar pair already has (89 KB
worst case against a 256 KiB cap).

**Storage-budget caveat, stated honestly:** 890 KB is the *worst* case, not the typical one. A real
photograph compresses far below it (a 1024px repo asset re-encoded at 1280/q82 measured **12 KB**,
though a flat graphic is not photo-representative either). Typical phone photos land between those
poles, so **per-product storage cannot be predicted from this measurement alone** — the honest
statement is that 8 images per product is bounded at ~7 MB worst case and will in practice be a
small fraction of that. The 1 GB free-tier ceiling that `image-storage-discovery.md` §0 names as
the binding constraint should be tracked from real uploads, not projected from here.

Flag: `AVATAR_MAX_EDGE`'s docstring (`limits.ts:31`) says "the platform-wide ceiling is 2048 for
content images." That line is now known to be wrong for any bucket with a 2 MiB cap and should be
corrected with the table above rather than left to drift.

### 4e. 🔴 The Vercel payload cap vs 1–8 images — an architectural constraint

`MAX_INPUT_BYTES = 4 MB` (`src/lib/images/limits.ts:25`) is **not a per-file preference** — it is
sized against **Vercel's 4.5 MB cap on a whole function request payload** (`413
FUNCTION_PAYLOAD_TOO_LARGE`, unraisable by any `bodySizeLimit`).

The designed grid accepts **1–8 images**. **Eight files in one FormData cannot fit.** Two phone
photos already exceed the cap.

**This is architectural and the single-page/single-submit design does not express it.** The write
path must be **one file per server-action call** — the client uploads images individually (each
tile showing its own progress; the memory records an "uploading tile" in the design, so the frame
already anticipates per-file state) and the form submit carries only the resulting rows.

Also note: `limits.ts:23` already logs that a >4 MB phone photo cannot be uploaded *at all* today,
and that the real fix is client-side downscaling before upload. G6 multiplies the pain by 8. Worth
deciding now whether client-side downscale enters this PR's scope or stays logged.

### 4f. Where the URL lives — `product_images` rows. Confirmed, not a choice.

Live shape (`information_schema`):

| column | type | null | default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `product_id` | uuid | **NO** | — |
| `image_url` | text | NO | — |
| `display_order` | integer | NO | `0` |
| `created_at` | timestamptz | NO | `now()` |

FK `product_images.product_id → products(id)` **ON DELETE CASCADE**. No unique constraint on
`(product_id, display_order)`.

**Not a column, not an array.** `image_storage_discovery.md` §7a already settled this and the live
schema agrees: many-per-product **with ordering** ⇒ its own table. An array cannot carry
`display_order`, per-item RLS, or reordering without rewriting the row. `product_images` is the
right shape and needs **no migration**.

**Table RLS (`public.product_images`) — all three correct**, no alias capture (they reference
`product_images.product_id`, an outer column with no shadow):

| cmd | predicate |
|---|---|
| SELECT | `true` (public) |
| INSERT | `WITH CHECK EXISTS (products p JOIN shops s ON s.id=p.shop_id WHERE p.id=product_images.product_id AND s.owner_id=auth.uid())` |
| DELETE | same join, as `USING` |
| UPDATE | **none** — replace is delete+insert, matching the never-overwrite path rule |

⚑ **No UPDATE policy** means image *reordering* (the design's drag-grip) cannot be a
`display_order` UPDATE. It must be delete+reinsert, or the PR needs an UPDATE policy. **Recommend:
ship G6 with insert-order only (first upload = cover) and defer drag-reorder to G7**, where editing
an existing gallery is the actual use case.

### 4g. Ordering constraint — images cannot precede the product

`product_images.product_id` is **NOT NULL** and its INSERT policy requires the product row to
exist. But the designed flow uploads images *before* the form is submitted.

**Resolution that preserves the design:** generate the product uuid **server-side up front** and
upload to `{shop_id}/{productId}/{uuid}.webp` — **the storage path needs no row, only the FK does.**
Then: insert `products` (with the pre-generated id) → insert `product_images` rows → revalidate.
An abandoned form leaves orphaned objects under a `productId` that never existed, which is exactly
what the reconciliation sweep in `image-storage-discovery.md` §6c is for — and §6c already names
"the first *deletable* image surface (G5/G6/G7)" as its trigger. **This PR is that trigger.**
Recommend logging the sweep rather than building it here.

Path convention `{shop_id}/{product_id}/{uuid}.webp` is per §3 and is what the (fixed) storage
policy will gate on — the **first** segment must be `shop_id`.

---

## 5. The three broken layers from `g9-deltas-3.md`

### (a) No writer — **G6 is the fix. In scope.** ✅

That is this PR, subject to B1. Clearing it also clears the platform's first product-image write
path.

### (b) 8 rows point at `/products/*.jpg` with no such directory — **🔴 LIVE, not latent. Recommend: OWN PR.**

`g9-deltas-3.md` filed this as "a latent trap." **It is not latent — it is broken in production right now.** Traced end to end:

```
src/lib/marche/data.ts:45   .select('… product_images(image_url, display_order)')
src/lib/marche/data.ts:71   image_url: primary?.image_url ?? null
ProductListingCard.tsx:34   {product.image_url ? <Image src={product.image_url} … />
public/products/            ABSENT
```

`/marche/produits` is a **live, shipped route** (`src/app/marche/produits/`). All **8** rows carry
`/products/nike.jpg`, `/products/iphone.jpg`, `/products/skincare.jpg`; all 8 belong to the one
real shop; all have `display_order = 0`. **8 of 9 product cards on the live marketplace are
rendering a failed image today.** Precisely what is proven: `image_url` is non-null, so the
`PackageIcon` placeholder branch **cannot** fire (it is gated on `image_url === null`), and
`next/image` is handed a path that resolves to a 404. The exact rendered artefact (alt text vs an
empty box) is browser-dependent and was **not** visually confirmed in this pass — but either way it
is a failed image where a designed placeholder exists. One look at `/marche/produits` settles the
cosmetic detail; it does not change the finding.

**Recommendation: its own PR, and it is a two-line fix** — `UPDATE product_images SET image_url =
NULL` is not possible (NOT NULL), so it is `DELETE FROM product_images` for the 8 seed rows, which
makes every card fall to the correct `PackageIcon` placeholder. Optionally re-seed through G6 once
G6 works.

**Why not in this PR:** it is a data fix to demo seed on a *buyer* surface, with a different blast
radius (`/marche/produits`, `/categories/[slug]`, D1, favorites, order rows) and a different
verification. Bundling it would violate one-PR-one-focus. **But it should ship first or
concurrently** — it is a live visual defect, and G6's own "does my photo show up?" walkthrough runs
through the same card.

### (c) `getSellerOrderDetail` never joins images — **OUT of scope. Own PR (or G9 fidelity).**

Confirmed at `src/lib/marche/seller-order-detail.ts:156`: `products ( title, price_tnd )` — no
`product_images` join.

`g9-deltas-3.md` already called this correctly: **"Layer 3 survives G6."** It is a page-side change
to G9's query + its `SellerOrderDetail` type + the `LP-1` thumb container — and `LP-1` is itself
**blocked on design (F5)**: the frame's thumb is a 28×80 sliver on a frame plainly meant to be
square, and building it literally ships a sliver.

**So (c) is blocked on a founder/design call that G6 does not touch.** Recommend it ship with the
G9 fidelity pass that closes LP-1, not here.

**Summary:** (a) in · (b) own PR, ship first, it's live · (c) own PR, blocked on F5.

---

## 6. Regions against the schema — every field G6 collects

Live `products` columns vs the G6 field spec (from the build memory + the frame's 4 sections):

| § | field | column | exists | notes |
|---|---|---|---|---|
| 1 | Titre (counter /100) | `title` text NOT NULL | ✅ | no DB length cap — 100 is a form rule |
| 1 | **Catégorie (Select)** | `category_id` uuid → `categories` | ⚠️ | **see B2 below** |
| 1 | **Sous-catégorie (cascade)** | — | ❌ | **no column, no rows. B2.** |
| 1 | Description (counter /2000) | `description` text NULL | ✅ | |
| 2 | Prix | `price_tnd` numeric NOT NULL | ✅ | `CHECK (price_tnd >= 0)` |
| 2 | **Frais de livraison** | **`delivery_fee_tnd` numeric NOT NULL DEFAULT 7** | ✅ | **CONFIRMED — see below** |
| 2 | buyer-total preview | — | n/a | computed client-side, not stored |
| 3 | Toggle "Gérer le stock" | `tracks_stock` boolean NOT NULL DEFAULT true | ✅ | |
| 3 | Quantité | `stock_count` integer NULL | ✅ | `CHECK (stock_count >= 0)` |
| 4 | Images 1–8 | `product_images` rows | ✅ | table fine; storage blocked by B1 |
| footer | Statut | `status` text NOT NULL DEFAULT `'active'` | ⚠️ | **see §8** |
| — | `shop_id` | uuid NOT NULL → shops | ✅ | derived from auth, never client input |

**No migration is needed for the form fields themselves.** Every one has a column.

### `delivery_fee_tnd` — confirmed, and the form must surface it

```
delivery_fee_tnd | numeric | NOT NULL | DEFAULT 7 | CHECK (delivery_fee_tnd >= 0)
```

All 9 live products carry `7.00`. **The form surfaces it and must.** Per the locked profit model in
the G6 memory: the 7 is a **suggestion, not a rule** — the seller's input is the source of truth.
A `NOT NULL DEFAULT 7` column that no UI exposes would silently lock every seller to 7 TND, and
`g9-deltas-3.md` A-5 confirms this column is the last number the bordereau needed. Section 2
renders Prix + Frais + the live "Le client paiera : 45 + 7 = 52 TND à la livraison" preview.

### 🔴 B2 — the category picker has no data source

**The cascade specimen (`532:32245`, three states) cannot be built against the live database.**

| | `src/lib/taxonomy/product-categories.ts` | live `public.categories` |
|---|---|---|
| shape | 11 sectors → 57 subcategories, 2 levels | **flat — 14 rows, `parent_id` NULL on every one** |
| key | stable **slug** strings, "URL params AND DB values" | `uuid` PK; `products.category_id` is a uuid FK |
| scope | products only | **products AND services in ONE tree, no `kind` column** |
| consumers | **ZERO** — grepped `PRODUCT_SECTORS\|product-categories`, no matches. File is **untracked** (`?? src/lib/taxonomy/`) | `filter-categories.ts`, `product-detail.ts`, `service-detail.ts`, `order-detail.ts`, `my-data.ts`, … |

**Slug overlap is 1 of 11.** TS sector ids vs the live product-ish slugs:

| TS (`product-categories.ts`) | live `categories.slug` | match |
|---|---|---|
| `electronique` | `electronique` | ✅ |
| `mode-accessoires` | `mode` | ❌ |
| `beaute-cosmetique` | `beaute-soins` | ❌ |
| `maison-deco` | `maison` | ❌ |
| `auto-moto` | `automobile-accessoires` | ❌ |
| `sante-parapharmacie` | `sante` | ❌ |
| `electromenager`, `artisanat`, `alimentation`, `bebe-enfant`, `sport-loisirs` | — | ❌ absent |

Full TS sector list (11, market-weighted): `mode-accessoires` · `electronique` · `electromenager` ·
`beaute-cosmetique` · `maison-deco` · `artisanat` · `alimentation` · `bebe-enfant` ·
`sport-loisirs` · `auto-moto` · `sante-parapharmacie`.

The live table's other 8 rows (`business-conseil`, `data-science-analyse`, `design-creation`,
`developpement`, `marketing`, `montage-video`, `redaction`, `ugc`) are **service** sectors — which
is the shared-tree problem stated above, visible in one query.

**Blast radius if the taxonomy is seeded.** `filter-categories.ts:24-44` derives the marketplace
filter's option list from the **distinct `category_id` of active products**, then looks up
`slug/name_fr/name_ar`. So:

- Re-pointing products at *subcategory* rows changes what `/marche/produits` and `/categories/[slug]`
  offer as filters — on a **shipped** surface.
- Renaming `mode` → `mode-accessoires` is a **migration**, not an edit, per the file's own
  stable-slug contract (`product-categories.ts:22-28`) — the slugs are live URL params.
- The tree is **shared with services**. Adding 57 product subcategories under product sectors puts
  them in the same table the service browse reads. Without a `kind` discriminator, any query that
  lists "all categories" gets both. `filter-categories.ts` is scoped by usage so it is safe today,
  but the shared tree is a latent correctness issue the moment something lists categories directly.

**Three options, none free:**

| option | cost | risk |
|---|---|---|
| **A. Seed the taxonomy** — insert 11 sectors + 57 subs, remap 5 slugs, re-point 9 products | a real migration; touches live URLs and the shipped filter | highest, but it is the designed end state and G5/D3/marketplace all want it |
| **B. One-level picker for now** — G6 offers only the 14 existing flat rows, no cascade | no migration; **abandons specimen `532:32245`** | ships a G6 that does not match its own frame |
| **C. Read the TS file, write the slug to a new `products.category_slug` text column** | small migration; leaves `category_id` dangling | two sources of truth for category — worst of both |

**Recommendation: A, as its OWN migration PR landing before G6's application code** — with the
`servyou-discovery-first-migration` skill run on it properly, since it touches live slugs, a shared
tree, and a shipped filter. Then G6 consumes it and the cascade is real. **This is a founder call
and the largest scope question in this discovery.**

### The cascade specimen's behaviour (`532:32245`, 3 states)

Per the build memory, read from the frame at build time:

1. **`532:32247`** — empty: Sous-catégorie Select **disabled** until a sector is chosen
2. **`532:32282`** — "Mode" chosen → panel open showing **its 7 subs**
3. **`532:32344`** — "Électronique" chosen → **its 7 subs**

Values are exact from the taxonomy (Figma hardcodes them; designed dynamic). Wire to
`getProductSector(sector).subcategories`. **Never hardcode the taxonomy in code.**

---

## 7. Write path — the server action

**Confirmed: zero writes to `products` exist anywhere.** No insert, no update, no delete — the
seller product surface was stripped in PR #83. G6 writes the first one.

`advanceOrderAction` (`src/app/actions/orders.ts:51`) is the named pattern and its three-layer
posture transfers exactly:

```
1. Zod parses the input before anything touches the database
2. The action re-checks auth + ownership server-side
3. RLS enforces it again in Postgres; the DB is the authority
```

### Proposed `createProductAction` shape

```ts
const CreateProductInput = z.object({
  title:          z.string().trim().min(1).max(100),
  categoryId:     z.string().uuid(),
  subcategoryId:  z.string().uuid().optional(),      // pending B2
  description:    z.string().trim().max(2000).optional(),
  priceTnd:       z.number().nonnegative(),          // CHECK price_tnd >= 0
  deliveryFeeTnd: z.number().nonnegative(),          // CHECK delivery_fee_tnd >= 0
  tracksStock:    z.boolean(),
  stockCount:     z.number().int().nonnegative().optional(),
  publish:        z.boolean(),                       // which CTA — see §8
})
```

**What it needs, in order:**

1. `getLang()` + `createClient()` + `auth.getUser()` → `notAuth` on miss.
2. **Zod parse before any DB call.** Mirror the numeric CHECKs in Zod so a clear message beats a
   raised constraint — the same reasoning as `setOrderTrackingAction:153`.
3. **Ownership = shop resolution.** `products` has no `owner_id`; ownership runs
   `products.shop_id → shops.owner_id`. **Resolve `shop_id` server-side from `auth.uid()`, never
   from client input** — accepting a `shopId` argument would let a caller try to write into
   someone else's shop (RLS would reject it, but the check belongs before the round trip).
4. **⚑ `shops.owner_id` is NOT unique** — only a non-unique index `shops_owner_idx`
   (`image-storage-discovery.md` §4a). One owner **can** hold multiple shops. Today the sole
   shop-owner has exactly one, so `.maybeSingle()` works *now* and breaks silently later.
   **Recommend: query ordered, take the first, and log if >1** — plus a `// TODO: shop switcher`
   line. A multi-shop picker is out of scope.
5. **No-shop guard.** A `shop_owner` with zero shops must not reach a 500. **⚑ There is no
   shop-creation route to send them to.** `src/app/` has no `ma-boutique/`; G2 (`555:37234`) is
   unbuilt, and `/devenir-vendeur/page.tsx:18` already points its consumer CTA at
   **`/ma-boutique/creer`** — another dead link, as is its `manageHref="/ma-boutique"`.
   **Recommend redirecting to `/devenir-vendeur`**, which does render, and logging the two dead
   links against G2. The guard is defensive today (the one shop owner has exactly one shop, and no
   UI can create another), but it must not be a crash.
6. Conditional: `stock_count` only when `tracksStock`; **null it when the toggle is off** so
   "Non suivi" is a real state and not a stale count.
7. `status` from the CTA — **see §8.**
8. Insert `products` with the **pre-generated uuid** from §4g, then the `product_images` rows.
9. **Never destructure only `data`** — capture and surface `error`; log
   `error.message`/`.code`/`.details` explicitly, never the raw object (CLAUDE.md).
10. `revalidatePath` over a fixed allow-list; redirect per §3.

### Must-test (CLAUDE.md — auth paths, ownership, business rules)

| test | why |
|---|---|
| rejects unauthenticated | auth path |
| resolves `shop_id` from the session, ignores any client-supplied shop | **ownership** — the security-relevant one |
| no-shop user gets the guard, not a crash | auth path |
| Zod rejects negative price / negative fee / >100 title / >2000 desc | business rules mirroring live CHECKs |
| `tracksStock=false` ⇒ `stock_count` written NULL | data-integrity |
| `normalizeProductImage` at `PRODUCT_MAX_EDGE` — extend `src/__tests__/image-normalize.test.ts` | the content gate |

Form rendering, layout and i18n strings are **may-skip** per the testing discipline.

### i18n

The `product.*` namespace **already exists** (`fr.ts:600-643`, ~40 keys) from the stripped seller
UI. Directly reusable: `product.new_title` ("Ajouter un produit"), `product.field_price`,
`product.field_stock_manage`, `product.field_stock_count`, `product.stock_always_hint`,
`product.error_title`, `product.error_price`, `product.error_add`, `product.back`.

**New keys needed** (FR + AR parity, per `servyou-i18n-vocabulary-lock`): delivery-fee label +
helper, the buyer-total preview sentence, the 4 section headers, subcategory label + its
disabled-state helper, the image dropzone copy + "Couverture" ribbon, the 4 `NormalizeFailure`
messages (product variants of `monCompte.avatar.error.*`), the two CTA labels, and the
publish-gate hint. **Note `product.back` = "Retour aux produits"** — it points at the absent
`/mes-produits`; re-target it per §3.

---

## 8. `products.status` — the two-CTA model does **not** map cleanly

**Live CHECK:**

```sql
products_status_check: CHECK (status = ANY (ARRAY['active', 'hidden', 'sold_out']))
```

Default `'active'`. **There is no `'draft'`.**

The designed footer is **[Enregistrer le brouillon]** (secondary, ungated) + **[Publier le produit]**
(primary, gated on titre+cat+subcat+desc+prix+frais+stock-if-tracking+**≥1 image**).

| CTA | intent | nearest column value | honest? |
|---|---|---|---|
| Publier le produit | live on the marketplace | `'active'` | ✅ exact |
| Enregistrer le brouillon | **incomplete**, not yet publishable | `'hidden'` | ⚠️ **not the same thing** |

**`hidden` means "a complete product the seller chose to withdraw."** `draft` means "an incomplete
product that was never publishable." They land in different places in the UI: G5's filter tabs are
**Tous / Actifs / Masqués / Épuisés** — a draft would file under "Masqués" alongside deliberately
withdrawn products, and G5's StatusPill would paint it grey "Masqué", which is a lie about what the
seller did.

**The design already knows they differ:** G7 has a dedicated **`536:32841` "G6 — produit en
brouillon"** specimen with its own `Alert`. A frame exists for a state the database cannot store.

**Three options:**

| option | change | consequence |
|---|---|---|
| **A. Add `'draft'` to the CHECK** | one-line migration, `ALTER … DROP/ADD CONSTRAINT` | honest. But **every read path must exclude it** — `data.ts`, `filter-categories.ts`, search, D3, D1 all filter `status='active'` so drafts are correctly invisible today; still needs an audit. G5 wants a 5th tab. |
| **B. Map brouillon → `hidden`** | no migration | ships now; mislabels drafts as "Masqué" in G5/G7 and makes `536:32841` unbuildable as designed |
| **C. Drop the second CTA for now** | no migration; publish-only | contradicts the frame's own main specimen, which shows **Publish DISABLED** precisely to document the gate — killing the draft CTA leaves a seller with a full form and no way to save |

**Recommendation: A**, as a one-line addition to the same migration that fixes B1 — but **only
after auditing every `status` read path**, which is a `servyou-discovery-first-migration` job.
If the founder prefers zero schema change this cycle, **B ships and G7's `536:32841` gets logged as
blocked.** Not C: an ungated save is the whole reason the two-CTA footer exists.

---

## 9. Proposed scope — and what I recommend leaving out

**In this PR:**
1. Migration: fix the 4 alias-capture storage policies + add the `product-images` SELECT policy (+ `'draft'` if §8-A approved) — **presented for approval before applying**
2. `/mes-produits/ajouter` — the G6 form, 4 sections, 760px column, sticky two-CTA footer
3. The image upload grid (built from primitives; no component exists) — **one file per action call**
4. `normalizeProductImage` wrapper + `PRODUCT_MAX_EDGE`
5. `createProductAction` + `uploadProductImageAction`
6. FR + AR keys
7. Tests per §7

**Blocking on a founder call before code:**
- **B2 / §6** — the taxonomy. Recommend its own migration PR *first*.
- **§8** — `draft` vs `hidden`.
- **§4a** — fix `shop-assets` in the same migration, or leave it dead?

**Out of scope, logged:**
- (b) the 8 broken seed rows — **own PR, live defect, ship first**
- (c) G9's missing image join — own PR, blocked on F5
- the storage reconciliation sweep (`image-storage-discovery.md` §6c names G5/G6/G7 as its trigger)
- drag-reorder of images (needs an UPDATE policy — defer to G7)
- client-side downscale before upload (already logged; G6 multiplies its urgency 8×)
- G5 `/mes-produits`, and re-targeting `product.back`
- delete-product DB behaviour (🔴 open flag, shared with G5/G7)

---

## Awaiting founder direction. Nothing has been built.

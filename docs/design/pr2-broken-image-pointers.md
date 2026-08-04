# PR-2 — the 8 broken `product_images` pointers, and the absent-image state

**REPORT ONLY.** No rows touched, no code written.
**Date:** 2026-08-04 · **Branch:** `fix/broken-product-image-pointers` off `origin/main` @ `18eb7aa`

---

## 0. Two corrections to what I reported earlier

Both are mine, both change the shape of this PR, and neither was caught by the reasoning that
produced them — only by loading the routes.

### 🔴 C-1 — `/marche/produits` is **not** the broken surface. It is a stub.

`docs/design/g6-discovery.md` §5(b) states: *"`/marche/produits` is a **live, shipped route** …
8 of 9 product cards on the live marketplace are rendering a broken image today."*

**`/marche/produits` and `/produits/[id]` are both `ComingSoon` placeholders**, stripped by PR #83
(`chore/strip-legacy-consumer-ui`). They render no products at all.

The import chain I traced (`data.ts` → `ProductListingCard`) is real, but I assumed it terminated
at `/marche/produits`. It terminates at **`src/app/page.tsx`** — the home page. The breakage is
real; three different routes carry it. §2 has the corrected map, verified by loading each one.

### 🔴 C-2 — it is **8 of 8**, not 8 of 9.

`image-storage-discovery.md` §1a recorded 8 image rows against 9 products (one product imageless).
Live today: **8 products, 8 image rows, every product has exactly one, and `products_with_zero_images = 0`.**
A product was deleted between 2026-07-31 and now.

This is not a rounding difference. It means **no product in the database exercises the
absent-image path** — so whatever the empty state is, nothing has ever rendered it in production.

---

## 1. What the 8 rows contain, and whether they ever pointed at real files

| image_url | count | display_order | created |
|---|---:|---:|---|
| `/products/nike.jpg` | 3 | 0 | 2026-06-14 |
| `/products/iphone.jpg` | 3 | 0 | 2026-06-14 |
| `/products/skincare.jpg` | 2 | 0 | 2026-06-14 |

Three distinct filenames across eight rows, every row `display_order = 0`, all eight created the
same day.

### They were **always placeholder seed**. They never pointed at real files.

Three independent checks, all negative:

| check | result |
|---|---|
| `git log --all --diff-filter=A -- 'public/products/*'` | **empty — the directory was never added, in any branch, ever** |
| `find public -name '*.jpg'` | only 2 brand icons; no `public/products/` |
| `git log --all -S 'products/iphone.jpg'` | 3 commits, **all documentation** (this session's PR-1 doc, the PB-1/PB-2 doc, the storage-buckets PR). The string has never appeared in application code or in a committed seed file |

So the rows were inserted **directly into the database** — not through a seed file in the repo —
naming assets that were never authored. One tell: `iphone 13 pro` was created 2026-06-03 but its
image row is dated 2026-06-14, i.e. a backfill pass that stamped every existing product with one of
three stock filenames.

**This is not rot. Nothing decayed.** The rows were a placeholder written against files someone
intended to add and never did.

---

## 2. Every surface that renders them — corrected and verified by loading

All live surfaces funnel through **one** component: `ListingResults` → `ProductListingCard`.

### Live — renders the broken pointer

| # | surface | route | how it gets there | evidence |
|---|---|---|---|---|
| **L1** | **Home / marketplace browse** | **`/`** | `page.tsx:51` — for an authenticated consumer (`role === null && !isAdmin`), **`product` is the canonical default**; only `?type=service` flips it | **loaded as a real signed-in consumer: 8 product cards, `LandingView` marker absent, and 64 broken image refs** (8 products × 8 srcset widths), covering all three filenames |
| **L2** | Search | `/recherche?type=product` | `searchMarketplace` | loaded: **24** `%2Fproducts%2F` srcset entries |
| **L3** | Category browse | `/categories/[slug]` | `searchMarketplace` | loaded: `src="/_next/image?url=%2Fproducts%2Fnike.jpg&w=1920&q=75"` |

**L1 is the highest-impact of the three** — it is the default view of the home page for every
logged-in consumer, not a route someone has to navigate to.

L1 was verified by **loading it**, not by reading the branch — an ephemeral consumer
(`seller_type = null`, `is_admin = false`) was created, signed in, and its session cookie used to
`GET /`. That distinction is why C-1 exists: the same reasoning-from-import-chain that produced the
wrong route in `g6-discovery.md` would have produced an unverified claim here too. An
*unauthenticated* visitor gets `LandingView` (the marketing page), which is why an anonymous
`curl /` shows zero product cards and why this needed a real session to settle.

**The branch is reachable by real users, not just in principle:** `profiles` holds **6 plain
consumers** (`seller_type IS NULL AND NOT is_admin`) against 11 sellers and 1 admin.

### Empirically confirmed broken, not inferred

```
/_next/image?url=%2Fproducts%2Fnike.jpg&w=640&q=75     →  HTTP 400
/_next/image?url=%2Fbrand%2Flogo%2F…png&w=256&q=75     →  HTTP 200  image/png   (control)
/products/nike.jpg                                      →  HTTP 404
```

**400, not 404** — Next's optimizer rejects a source it cannot fetch, so `next/image`'s `onError`
fires. Whether the visible artefact is alt text or an empty box is **browser-dependent and was not
visually confirmed**; what is proven is that the optimizer refuses the request and no image can
render. Distinct cause from the 402-at-quota case in `image-storage-discovery.md` §2a, same class
of outcome.

### Not live — reads images but the route is a stub, or never reads them

| surface | state |
|---|---|
| `/marche/produits` | **ComingSoon stub** (PR #83) — ← C-1 |
| `/produits/[id]` (D1) | **ComingSoon stub**; `getProductDetail` has **no consumer at all** |
| `/demander/[id]` product branch | ComingSoon stub; `demander.ts` maps `imageUrl` into nothing |
| `/demander/succes` (E2) | does not use an image |
| `getMyOrders` / `getMyFavorites` (`my-data.ts`) | **no consumers** — map `imageUrl` for stubbed routes |
| `order-detail.ts` (buyer order detail) | maps `imageUrl`; route stubbed |
| **G4 seller dashboard** | **never reads `product_images`** — grep empty. (The founder asked about a low-stock rail; it renders no image.) |
| **Admin** | **never reads `product_images`** — grep empty |
| **G9 seller order detail** | never joins images (the layer-3 gap from PR-1 discovery) |

So **five data-layer readers map an image into a shape nobody renders.** Deleting the rows cannot
break them; neither can anything else.

---

## 3. Ordering — yes, and it is completely untested

`product_images.display_order integer NOT NULL DEFAULT 0`, plus `created_at timestamptz NOT NULL`.

| fact | consequence |
|---|---|
| **All 8 rows are `display_order = 0`** | the ordering column has never sorted anything |
| **No unique constraint on `(product_id, display_order)`** | duplicate positions are legal; ties break on `created_at` |
| **No UPDATE policy on `product_images`** (PR-1 discovery) | reordering must be delete+reinsert, or G7 needs a new policy |
| **Six separate implementations of "pick the primary image"** — `primaryImage()` duplicated verbatim in `demander.ts:16`, `my-data.ts:17`, `order-detail.ts:19`, `product-detail.ts:17`, plus inline sorts in `data.ts:63` and `search-marketplace.ts:85` | all six agree today (`display_order` then `created_at`). Six copies of one rule is a drift surface, but centralizing is its own refactor, not this PR |

---

## 4. The three options, costed

### Option A — delete the 8 rows

`image_url` is `NOT NULL`, so "blank them" is not available; it is `DELETE` or nothing.

- **Cost:** one statement. Reversible by re-inserting.
- **Effect:** all three live surfaces immediately fall to `ProductListingCard`'s existing
  `PackageIcon` placeholder — the branch that is already built and currently unreachable.
- **Side effect that is actually the point:** it makes zero-image the **universal** state, so the
  placeholder gets exercised on every surface *before* G6 ships rather than after.
- **Downside, stated plainly:** the marketplace shows no product photography at all until G6 lands
  and a seller uploads one. For a demo or investor walkthrough that reads as emptier — but it is
  emptier *honestly*, versus eight broken images today.

### Option B — repoint at something real

Two sub-variants, both worse than they look:

- **Commit real files to `public/products/`** — contradicts the storage decision that was just
  made and just repaired (`image-storage-discovery.md` §8 moved images to Supabase Storage);
  adds binary weight to the repo; and re-establishes exactly the repo-asset pattern being retired.
- **Upload to the `product-images` bucket** — now genuinely possible (PR-1 repaired the policies;
  service role bypasses RLS regardless). But it needs three licensed images sourced, an upload
  script, and it spends the 1 GB free-tier cap on seed data that will masquerade as real seller
  content.

- **Cost:** highest of the three, and it **leaves the zero-image path unexercised** — the one thing
  that has to be settled either way.

### Option C — leave them, make every consumer handle a missing image

**The instinct behind C is correct and the framing is not.** The consumers *already* handle a
missing image — `ProductListingCard.tsx:34` is exactly that branch. It has simply never run.

The 8 rows are not a *missing* image. They are a **present and broken** one: `image_url` is
non-null, so the ternary takes the `<Image>` branch and there is nothing left to fall back to. No
null-check anywhere can catch this class.

Making C work would require detecting a **broken** image at runtime — an `onError` handler swapping
in the placeholder, which means client JS in what is currently a clean server-rendered card, on
every product surface, to compensate for eight rows of bad seed data.

- **Cost:** real component work + client JS, to preserve data that has no value.
- **But its kernel is right:** *"the empty state has to exist regardless."* True — and that is
  **Option A's** main benefit, not C's. A gets the empty state exercised; C keeps it hidden behind
  eight rows that will keep taking the image branch.

### Recommendation: **A**, and treat the empty state as this PR's actual deliverable.

One reversible statement removes three live broken surfaces and converts the absent-image path from
never-executed to always-executed — which is the pre-condition G6 needs and the thing §5 is about.

---

## 5. The real question — what a product with zero images should render

After G6 ships, zero images stays the common case for a long while: every product predating G6 has
none, and a seller can save a draft before uploading.

### What exists today

| surface | absent-image state | status |
|---|---|---|
| `ProductListingCard` (L1/L2/L3) | `PackageIcon` `h-12 w-12 text-icon-muted`, centred in `aspect-square bg-[#F4F4F4]` | **built, never exercised** |
| `OrderActionRow` 48×48 | icon placeholder | built (PR-1 discovery) |
| D1 detail gallery | — | route is a stub |
| **i18n `product.detail.no_images`** = "Aucune image" / "لا توجد صورة" | present in **both** `fr.ts:635` and `ar.ts:666` | **orphaned — referenced nowhere in `src/`**, left behind when D1 was stripped |

### 🔴 Design has no empty-image target for any *display* surface

Checked the registry:

- **`563:39552` — "D1 — galerie (image active)"** — an **active** state. There is no empty variant.
- **`532:32201` — "G6 — galerie remplie"** — **filled**. Its empty counterpart is the Dropzone
  `197:14957`, which is the **upload** affordance, not a display placeholder.

So every empty-image treatment currently in the code is a **code-side invention**. The
`ProductListingCard` placeholder is a defensible one — quiet, uses the existing icon set, holds the
card's aspect ratio so the grid does not reflow. But it has no Figma reference, and the one string
design did write (`no_images`) points at a surface that no longer exists.

### What needs a decision

1. **Does the card placeholder stay as-is?** It is reasonable and already built. Recommend
   blessing it rather than redesigning — but it should be *decided*, since after Option A it
   becomes the entire visual identity of the marketplace until G6 lands.
2. **Is a bare icon enough, or does the empty state carry a word?** "Aucune image" already exists
   FR+AR. On a card it is probably noise; on D1's 432×775 hero it probably is not.
3. **`product.detail.no_images` — wire it or delete it.** An orphaned bilingual key is a small
   thing, but it is the only piece of evidence that design ever specified this state at all.
4. **Should G6 require ≥1 image to publish?** The G6 build memory records the publish gate as
   including **≥1 image**, with "Enregistrer le brouillon" ungated. If that gate holds, then
   *published* products always have a photo and the empty state is confined to drafts and to
   pre-G6 rows — which materially lowers the stakes on items 1–3.

**Item 4 is worth settling first**, because it decides whether the empty state is a permanent
marketplace surface or a transitional one.

---

## 6. Proposed scope for PR-2

**In:**
1. Delete the 8 `product_images` rows (Option A) — a data fix, presented for approval as SQL first,
   per the migration discipline.
2. Whatever item 5.1–5.3 resolve to — at minimum, bless or replace the card placeholder, and
   resolve the orphaned `no_images` key.

**Out, logged:**
- Centralizing the six `primaryImage` implementations.
- The five dead data-layer image readers — they resolve when their routes rebuild.
- D1's gallery empty state — no route, no frame; belongs to the D1 rebuild.
- G9's missing image join (blocked on design F5).
- **Correcting `g6-discovery.md` §5(b)** for C-1 and C-2 — it is committed on PR #109. Recommend a
  small amendment there rather than silently leaving the wrong route named.

---

## Awaiting founder direction. Nothing has been touched.

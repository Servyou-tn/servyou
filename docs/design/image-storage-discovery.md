# Platform image storage — Phase 1 discovery

**Status:** REPORT ONLY. No DDL run, no bucket created, no code written.
**Date:** 2026-07-31
**Target:** one upload, many render sizes, across every surface that needs an image.
**Awaiting founder approval before anything is created.**

Everything in the "current state" columns below was read from the live database
(`xggomcitqrkaylqezjjz`) or measured in the repo. Nothing is inferred from `data-model.md`.

---

## 0. The headline, before the detail

Four findings change the shape of the decision:

1. **The variant question is not the binding constraint. The 1 GB free-tier cap is.** Raw phone
   photos are 3–8 MB. At 5 MB, the free tier holds ~200 images total — before any variant
   strategy is chosen. **Downscaling the original at upload matters more than (a) vs (b).**
2. **Option (b) is already half-wired, and its default configuration is catastrophic.**
   `next.config.ts` already has `remotePatterns` pointed at this project's Supabase public
   object path. But with stock settings the effective cache TTL is **1 hour**, which makes
   transformations scale with *elapsed time* rather than with *distinct images* — worst case
   ~180 re-transforms per cache key per month against a 5,000/month allowance. See §2.
3. **Supabase's own image transformation service is not available on the free plan.** It is Pro+
   (100 origin images included, then $5/1,000). So "resize on read at the storage layer" is off
   the table until the plan changes. That leaves Vercel as the only read-time resizer.
4. **`orders` froze `item_title` and `unit_price_tnd` but not an image.** Combined with the
   delete rules already in the schema, a delivered order keeps its title and price and **loses
   its thumbnail** when the product is deleted. See §6 — this is the sharpest gap found.

---

## 1. What needs an image today

### 1a. What the database actually holds

| Table / column | Rows | Populated | Reality |
|---|---:|---:|---|
| `product_images` (id, product_id, image_url, display_order, created_at) | 8 | 8 | **Seed data pointing at bundled static assets** — `/products/iphone.jpg`, `/nike.jpg`, `/skincare.jpg`, each repeated. Not uploads, not external URLs. Covers 8 of 9 products. |
| `service_media` (+ `media_type` default `'image'`) | **0** | 0 | Empty. Its only consumer was removed — see §7. |
| `shops.logo_url` | 2 shops | **0** | Column exists, nothing populated. |
| `shops.banner_url` | 2 shops | **0** | Column exists, nothing populated. |
| `profiles` avatar | 18 | — | **No avatar column exists**, on `profiles`, `public_profiles` or `freelancer_profiles`. |
| Freelancer portfolio | — | — | **No table exists.** |
| `storage.buckets` / `storage.objects` | **0 / 0** | — | No upload backend of any kind. |

So: the "URL-paste at MVP" plan (§8) was never actually exercised. There is not one
user-supplied image URL in the database. Every image on the platform today is a repo asset.

### 1b. Surfaces, and the size each needs

Measured from the built component where the surface exists (those were built Figma-measured), and
cited to the Figma node where it is designed but unbuilt.

| Surface | Render size (px) | Source | State |
|---|---|---|---|
| **Avatar** (6 sizes, Figma-exact) | 24 · 32 · 40 · 56 · 80 · 120 | `ui/avatar.tsx:17-24` | Built, **no data source** |
| Topbar user menu avatar | 32 (sm) | `shell/Topbar.tsx`, Figma `430:17703` | Built, initials fallback |
| D4 public profile hero avatar | 120 (2xl) | Figma `390:11152` (fallback spec) | Built, initials fallback |
| FreelancerCard avatar | 72 | Figma `659:53837` | Built, initials fallback |
| D2 service detail freelancer row | 40 (md) | Figma `666:55479` | Built, initials fallback |
| **Product photo — G9 order row** | **48 × 48** | `OrderActionRow.tsx:64` (`h-12 w-12`) | Built as an **icon placeholder**, not an image |
| Product photo — marketplace card | `aspect-square`, full card width; `sizes` 100vw/50vw/33vw/25vw | `ProductListingCard.tsx:33,39` | Built, renders seed assets |
| Product photo — D1 hero gallery | 432 × 775 region | Figma `563:39552` | Designed |
| Product photo — G6/G7 upload grid | 600 × 276 | Figma `532:32201` | Designed |
| **Shop logo** | 128 × 128 (`avatar-ring`) | Figma `555:37449` | Designed, column unused |
| Shop logo form field | 712 × 100 | Figma `555:37443` (`field-logo`) | Designed |
| **Shop banner** | full card width, ShopCard `banner[true,false]` | Figma `578:42367` | Designed, column unused |
| ServiceCard (v3.7) | 368 × 279 card | Figma `124:6200` | Built |
| **Freelancer portfolio** | H3 « Portfolio rempli » 1136 × 1185 | Figma `413:15941` | Designed, **no table** |
| **Verification documents** (CIN, diplomas) | n/a — not rendered publicly | spec §1349, §1824 | Designed, nothing built |
| `freelancer_certifications.credential_url` | n/a — a **link**, not an image | live schema (text, nullable) | Exists, unused |

**One column that is *not* a storage surface, and should stay that way:**
`freelancer_certifications.credential_url` sits alongside `name`, `issuing_org` and
`year_obtained` — its shape says it is a **link to the issuer's own verification page** (a
Coursera/Google/university credential URL), not an uploaded scan. It needs **no bucket**. This is
the one place where the URL-paste approach of §8 is genuinely correct, because the authority
being linked to is external by definition and a self-hosted copy would be *less* trustworthy.

Keep it distinct from the `verifications` bucket, which holds **uploaded** CIN scans and diplomas
for the Servyou-verified badge (spec §1349: *"Freelancer uploads PDF / image"*). Same subject
matter, opposite trust model: one is a link out to an authority, the other is a private document
only an admin may read. Conflating them would put a private scan behind a public column.

**Distinct render widths across the whole platform: roughly 24, 32, 40, 48, 56, 72, 80, 120, 128,
368, 600, 1136.** That set matters for §2 — every distinct width is a separate cache key.
(Card and hero widths are fluid — `ProductListingCard` sizes at 100vw/50vw/33vw/25vw — so the
*rendered* widths there are whatever `deviceSizes` snaps to, which is precisely the knob §2b
recommends trimming.)

### 1c. One tradeoff already shipped

`ui/avatar.tsx:56` passes `sizes="120px"` for **all six** avatar sizes. A 24px `xs` avatar
therefore downloads a 120px image. This is wasteful in bytes but **favourable for the
transformation budget** — one cache key serves all six sizes instead of six. Reported as a
tradeoff, not a bug: "fixing" it would multiply avatar transformations by up to 6×. Revisit only
alongside §2's config decisions.

---

## 2. The variant decision

### 2a. Vercel Hobby — precise limits

Current pricing model (transformation-based; source-image-based pricing is legacy):

| Metric | Hobby included | Billed when |
|---|---:|---|
| Image transformations | **5,000 / month** | every cache **MISS** and **STALE** |
| Image cache reads | **300,000 / month** | fetch from *global* shared cache (8 KB units); in-region recent access is free |
| Image cache writes | **100,000 / month** | every MISS and STALE (8 KB units) |

**At the cap:** new images **fail to optimize and return HTTP 402**. This fires `next/image`'s
`onError` and **renders the `alt` text instead of the image**. Previously optimized images stay
cached and keep working. **You are not charged** for exceeding — Vercel treats it as a signal to
upgrade.

So the failure mode is graceful and partial: old images keep rendering, *new* ones break. For a
marketplace, that means a seller who uploads a product photo sees alt text where their photo
should be — bad, but not a site-wide outage.

**Hard limits:** transformed image max 10 MB; source max 8192 × 8192; source must be
`image/jpeg`, `image/png`, `image/webp` or `image/avif` (anything else is served as-is, un-optimized).

**⚠ Plan-eligibility flag:** Vercel's Fair Use Policy restricts **Hobby to non-commercial personal
use only**. Servyou is a commercial marketplace with real sellers and COD transactions. This is a
plan-terms question independent of the technical limits, and it should be settled before the
platform depends on Hobby image optimization. On Pro the transformation math changes entirely.

### 2b. The cache key — why the default configuration is the whole problem

The remote-image cache key is:

> `{ Project ID, q, w, url, normalized Accept header }`

and the remote cache TTL is:

> `max(upstream Cache-Control max-age, minimumCacheTTL)` — **`minimumCacheTTL` default `14400`s**
>
> (Read from the installed `next@16.2.11` `imageConfigDefault`, not from the docs. Vercel's page
> documents `3600`; the framework default is what actually applies and it is 4x larger.)

Supabase Storage's default upload `cacheControl` is **also 1 hour** (Supabase docs, Smart CDN §
Cache eviction: *"The default TTL is typically set to 1 hour"*).

**`max(3600, 14400) = 14400`. Four hours.**

That produces the scaling law that decides this question:

> **At a 1-hour TTL, transformations scale with elapsed time, not with distinct images.**

Worst case, a single cache key under continuous traffic re-transforms **6 × 30 = 180 times per
month**. Against 5,000/month that supports **~27 cache keys** — roughly nine product images at three
widths each. (180 is an upper bound: a key only re-transforms when actually requested, so
low-traffic images cost far less. But popular images — exactly the ones that matter — hit it.)

**The fix is configuration, not architecture:**

| Lever | Current | Recommended | Effect |
|---|---|---|---|
| `cacheControl` at upload | default 3600 | **1 year** | removes the 4-hourly re-transform |
| `minimumCacheTTL` | unset (14400) | **1 year, explicit** | second half of the `max()` |
| `deviceSizes` | default (8 widths) | trim to Servyou's breakpoints | fewer keys per image |
| `imageSizes` | default (8 widths) | trim | fewer keys |
| `formats` | default `['image/webp']` | **pin explicitly** | already single; pinning stops a future default adding AVIF and doubling the key space |
| `q` | default 75 | **never vary per surface** | each distinct `q` is a new key |

With those set, each image-width pair transforms approximately **once, ever** — and the same
5,000/month covers thousands of images instead of seven.

Note also: **Smart CDN is Pro+ only.** On free, cache invalidation on file replace is not
automatic, which reinforces the "upload to a new path rather than overwrite" rule in §3.

### 2c. Supabase free tier — precise limits

| Metric | Free plan |
|---|---|
| File storage | **1 GB** |
| Egress | **5 GB** + 5 GB cached egress |
| Max file upload | **50 MB** (global limit; per-bucket limits may be lower, never higher) |
| Database size | 500 MB |
| **Storage Image Transformations** | **Not available on Free.** Pro+: 100 origin images included, then **$5 per 1,000 origin images** |

Private buckets have a materially **worse CDN hit rate** than public ones — permissions are
checked per user, so two users fetching the same private object from the same region both miss.
Relevant to §3.

### 2d. Costed comparison

Volume model for an MVP-scale launch — 200 products × 3 images, 100 freelancers × 6 portfolio
items, 20 shops × (logo + banner), 300 user avatars ≈ **1,540 source images.**

**Storage, and why it dominates:**

| Scenario | Per image | 1,540 images | vs 1 GB cap |
|---|---:|---:|---|
| Raw phone photos, no downscale | ~5 MB | **7.7 GB** | **🔴 7.7× over** |
| Downscaled original only (≤2048px, WebP q80) | ~300 KB | **462 MB** | 46% — comfortable |
| Downscaled + 3 stored variants — option (a) | ~590 KB | **908 MB** | **🟠 91% — effectively at the cap** |

**Option (a) — store variants at upload**
- Storage: ~2× the original. Consumes 91% of the free tier at the volume above; leaves no
  headroom for growth without a paid plan.
- Upload complexity: needs server-side image processing (sharp or equivalent) in the upload path,
  N writes per upload, and a re-processing story when a size changes — a new render size means
  re-generating every existing image.
- Egress: every variant served directly from Supabase, so **user traffic drives Supabase egress**
  against the 5 GB cap. A 12-card grid at 60 KB/card ≈ 720 KB/page view → ~7,000 page views/month.
- Read-time dependency: **none.** This is its real advantage.
- Not subject to Vercel's transformation cap or the Hobby commercial-use question.

**Option (b) — one original, resize on read via next/image**
- Storage: 46% of free tier. Half of (a).
- Upload complexity: one write. No image processing in the upload path *if* the original is
  accepted as-is — but see the recommendation, which adds a downscale anyway.
- Egress: **Vercel's cache shields Supabase.** Vercel fetches the source once per cache key, not
  once per user. Supabase egress becomes bounded by transformation count rather than by traffic —
  a significant and easily-missed advantage on a 5 GB cap.
- Transformations, **with the §2b config fixed**: there is no backfill regime — §1a establishes
  zero user-uploaded images exist, so the 1,540 is volume that *arrives* as sellers upload, not a
  corpus to bulk-load. Steady state is the only regime: ~200 new images/month × ~5 widths ≈
  **1,000 transformations/month** against 5,000. Cache writes ≈ 1,000 × 8 units = 8,000 of
  100,000. Reads: 300,000 units ≈ 2.4 GB from global cache. Comfortably inside free on every axis.
- Supabase egress under (b), priced: each cache key pulls the full source once, so
  ~5 widths × 300 KB × 1,540 images ≈ **2.3 GB** against the 5 GB cap — and that is a one-time
  cost as images accumulate, not a per-traffic cost. Under (a) the same 5 GB is consumed by user
  traffic instead, at ~720 KB per 12-card grid view ≈ 7,000 page views/month.
- Transformations, **with the config unfixed**: ~7 sustainable cache keys. Unusable.
- Read-time dependency: real. At the cap, new images render as alt text.

### 2e. Recommendation

**Option (b), plus a mandatory downscale of the original at upload.**

That is, store exactly one normalized variant — not the raw upload, not a variant set:

1. **Downscale + re-encode at upload** — cap the longest edge (~2048px), convert to WebP. This
   is the single highest-value step and it is required under *either* option, because the 1 GB cap
   binds before the variant question does.
2. **Let Vercel produce the render sizes** — it already has `remotePatterns` configured.
3. **Fix the TTL chain and trim the size config** per §2b. Without this step (b) does not work;
   with it, (b) is comfortable and (a) is unnecessary.

Rationale: (a) buys independence from Vercel at the price of ~2× storage against the constraint
that is already binding, plus real upload complexity and a re-processing problem every time a
design adds a render size. (b)'s failure mode is graceful, partial, and free. The decisive risk
in (b) is not architectural — it is a default value, and it is one line of config.

**Conditional on plan.** This recommendation assumes Vercel image optimization remains available.
If the Hobby commercial-use restriction (§2a) forces a move to Pro, revisit — Pro also unlocks
Supabase's own transformation service and Smart CDN, which would make a storage-layer resize
competitive again.

---

## 3. Buckets

Proposed set. `portfolio-media/` and `verifications/` are already named in the freelancer
tools/accounts spec (§1375, §1690–1700); the rest are new.

| Bucket | Public? | Path convention | Who writes |
|---|---|---|---|
| `product-images` | **public** | `{shop_id}/{product_id}/{uuid}.webp` | shop owner of that shop |
| `shop-assets` | **public** | `{shop_id}/logo/{uuid}.webp`, `{shop_id}/banner/{uuid}.webp` | shop owner |
| `avatars` | **public** | `{user_id}/{uuid}.webp` | that user |
| `portfolio-media` | **public** | `{user_id}/{uuid}.webp` | that freelancer |
| `verifications` | **PRIVATE** | `{user_id}/{uuid}.{ext}` | that user; **admin-only read** |

**Separate buckets, not one shared bucket.** Three reasons, all concrete: `allowed_mime_types`
and `file_size_limit` are configured *per bucket*, so a shared bucket would have to take the
loosest setting of all its tenants; the public/private split is a bucket-level property and
`verifications` must be private; and the RLS policy for each bucket is a different ownership
join (§4), which is far more auditable one-per-bucket than as branches of a single policy.

**Product images and avatars do not share a bucket** — they have different owners (shop vs user),
different path roots, and different size ceilings.

**⚠ Spec defect to resolve.** The freelancer spec (§1693) describes `portfolio-media/` as
*"public read via signed-URL convention"*. That is incoherent — a public bucket serves objects
from a plain unauthenticated URL and **bypasses RLS for reads entirely**; signed URLs are the
mechanism for *private* buckets. It has to be one or the other. Recommendation: **public**, since
portfolio work is meant to be seen, and public buckets get a materially better CDN hit rate
(§2c). Flagging rather than silently picking.

**Path rule regardless of bucket:** upload to a **new path** on replace, never overwrite. On the
free tier there is no Smart CDN auto-invalidation, and both Vercel's and the CDN's caches key on
URL — overwriting an object leaves stale images served until TTL expiry, which is exactly the
long TTL §2b recommends.

---

## 4. RLS on `storage.objects`

**Yes — path-based ownership is enforceable in the policy itself, not in app code.** This is the
part worth getting right, so here is the mechanism and the decision it forces.

`storage.objects` is a regular table with RLS. Policies key on `bucket_id` plus the path, using
`storage.foldername(name)` — which splits the object path into a text array, so
`(storage.foldername(name))[1]` is the **first path segment**. Comparing that segment to
`auth.uid()` enforces "write only under your own folder" in the database.

### 4a. The path-root decision: uid-first vs shop_id-first

This is a real fork, and the answer differs per bucket because of a constraint found in discovery:

- `freelancer_profiles.profile_id` is **UNIQUE** — one freelancer profile per user.
- `shops.owner_id` has **only a non-unique index** (`shops_owner_idx`). **One owner can hold
  multiple shops.**

Therefore:

**`avatars`, `portfolio-media`, `verifications` → uid-first.** Direct comparison, no subquery,
trivially auditable:

```
bucket_id = 'avatars'
AND (storage.foldername(name))[1] = auth.uid()::text
```

**`product-images`, `shop-assets` → shop_id-first.** A uid-first path cannot distinguish two shops
belonging to the same owner, and shop assets belong to the shop, not the person. This needs the
same `EXISTS … JOIN` shape already used by `product_images` in `public`:

```
bucket_id = 'product-images'
AND EXISTS (
  SELECT 1 FROM shops s
  WHERE s.id::text = (storage.foldername(name))[1]
    AND s.owner_id = auth.uid()
)
```

Secondary benefit: shop_id-first survives a shop transfer to a new owner without moving objects.

### 4b. Policy shape — mirror what `public` already does

Discovery pulled the existing patterns, and storage should match them rather than invent:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `product_images` | `true` (public) | `WITH CHECK` EXISTS products→shops→`owner_id = auth.uid()` | **none** | EXISTS, same join |
| `service_media` | `true` (public) | `WITH CHECK` EXISTS service_listings→freelancer_profiles→`profile_id = auth.uid()` | **none** | EXISTS, same join |
| `shops` | `true` (public) | `WITH CHECK owner_id = auth.uid()` | `USING` + `WITH CHECK` | `USING owner_id = auth.uid()` |

Three things to carry across:

- **INSERT needs `WITH CHECK`** (not `USING`); **UPDATE needs both**, or a row can be moved out of
  the owner's namespace by the update itself.
- **`product_images` has no UPDATE policy** — replace is delete + insert. Storage should match, and
  it aligns with the never-overwrite path rule in §3.
- **A public bucket bypasses RLS on read.** These policies gate *writes*. Anything genuinely
  secret must live in `verifications` (private), where reads are gated too.

### 4c. `verifications` — the one bucket that needs a SELECT policy

The four public buckets need no SELECT policy: public reads bypass RLS by design. `verifications`
is the opposite case and is the only place where a read policy carries weight. `profiles.is_admin`
already exists (boolean, NOT NULL, default false), so the predicate is:

```
-- SELECT on storage.objects
bucket_id = 'verifications'
AND (
  -- the owner may read their own submitted document back
  (storage.foldername(name))[1] = auth.uid()::text
  OR
  -- an admin may read any of them, to review for the verified badge
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin)
)
```

Two properties worth stating, because they are what make this bucket different:

- **Signed URLs do not bypass this.** A signed URL can only be minted for an object the signer is
  permitted to read, so the policy is what decides who can produce a shareable link — the
  "admin-only read, admin-only signing" requirement in spec §1828 is expressed *here*, not in app
  code.
- **Private buckets have a materially worse CDN hit rate** (§2c) — permissions are evaluated per
  user, so two admins reading the same document both miss. Acceptable: these are low-volume
  admin-review reads, not user-facing traffic. It is another reason not to put anything
  high-traffic in a private bucket.

⚠ Also note token/cache independence: a signed URL's expiry and the cached response's TTL are
**independent**. Revoking or expiring a token does **not** purge its CDN cache entry. To actually
cut off access to a verification document, **delete the object** — do not rely on token expiry.

Per the Supabase scaling guidance, add indexes supporting these policy lookups — `storage.objects`
policy predicates are evaluated per row.

---

## 5. Upload path

**Recommendation: through a server action, not client direct-to-storage.**

The RLS posture makes both *safe* in the sense that neither can write outside the owner's path —
§4 enforces that in the database regardless of who calls. So the choice turns on validation, not
on authorization.

**Where the gates actually are, weakest to strongest:**

1. **Client-side validation — not a gate.** Trivially bypassed. Use it for UX feedback only.
2. **Bucket `allowed_mime_types` + `file_size_limit` — a real DB-level gate, but weaker than it
   looks.** `allowed_mime_types` checks the **client-declared** `Content-Type`. It stops accidents
   and honest mistakes; it does not stop someone who sets the header to `image/webp` on arbitrary
   bytes.
3. **Server-side magic-byte sniffing — the only real content gate.** Read the leading bytes and
   confirm the file is actually the image format it claims.

Since §2e already requires server-side downscale + WebP re-encode at upload, the server action is
doing image processing anyway — and **re-encoding is itself the strongest possible content gate**:
a file that is not a real image fails to decode, and the re-encoded output cannot carry a
malicious payload from the input. That single step subsumes both size validation and format
validation, which is why the server action wins.

So: server action → auth check → magic-byte/decode check → downscale + WebP encode → upload with
`cacheControl` set long (§2b) → insert the DB row. Bucket limits stay configured as defence in
depth, not as the primary gate.

The one case for client-direct + signed upload URL is large files where routing bytes through a
serverless function is costly. At a 50 MB free-tier ceiling and images that should be ≤2 MB
post-downscale, that pressure does not exist yet. Revisit only if video is added
(`service_media.media_type` anticipated it; the spec suggests Vimeo embeds instead of self-upload).

---

## 6. Orphans

### 6a. What the delete rules actually are

Read from the live schema:

| FK | Delete rule |
|---|---|
| `product_images.product_id → products` | **CASCADE** |
| `service_media.service_listing_id → service_listings` | **CASCADE** |
| `products.shop_id → shops` | CASCADE |
| `service_listings.freelancer_profile_id → freelancer_profiles` | CASCADE |
| `shops.owner_id → profiles` | CASCADE |
| **`orders.product_id → products`** | **SET NULL** |
| `orders.service_listing_id → service_listings` | SET NULL |

### 6b. The order-image asymmetry — RESOLVED as correct behaviour

> **Founder decision, 2026-07-31: do NOT freeze the image on orders.** The asymmetry described
> below is real but is **not a defect**. Title and price are frozen because they are facts about
> money and identity; a thumbnail is decorative. A frozen URL does not survive its storage object
> being deleted, so freezing buys a broken image rather than a placeholder. The 48×48 slot
> degrading to its icon is the correct outcome. Recorded in `follow-ups.md` as a closed decision so
> a later pass does not "fix" it. The analysis is kept below because it is what the decision rests
> on — and because §6c's orphan-sweep design no longer has to treat `orders` as a referencing row.



Delete a product and: `product_images` rows **CASCADE away**, while the order **survives** with
`product_id` set to NULL.

The orders snapshot (just merged) froze `item_title` and `unit_price_tnd` so an order can render
without its product. It did **not** freeze an image — `orders` has no image column. So a delivered
order keeps its title and price and **loses its thumbnail**.

The 48×48 slot in `OrderActionRow.tsx:64` is currently an icon placeholder, so nothing renders
wrong *today*. The moment that slot becomes a real product image, it becomes a live defect for
every order whose product was deleted — and it will read as a rendering bug when it is actually a
data-lifecycle gap.

**This is the same class of problem the snapshot PR was built to solve, with the third column
missing.** See §7 for the recommendation.

### 6c. Storage orphans are inevitable, not preventable

**There is no transaction spanning Postgres and Supabase Storage.** A row delete cannot atomically
delete an object. A trigger can't do it reliably either — triggers run in-transaction and cannot
make an HTTP call to the storage API without introducing failure modes worse than the orphan
(a failed call would roll back the row delete, or be silently swallowed).

So orphans are a **reconciliation problem, not a prevention problem.** Recommended shape:

1. **Delete objects in the server action**, alongside the row delete. Covers the common path.
2. **A reconciliation sweep** — periodically list objects and delete those with no referencing
   row. This is **required, not optional**, because step 1 fails open: any path that deletes a
   product without going through the action (CASCADE from a shop delete, a raw SQL delete, an
   admin tool, service-role work) leaves the objects behind with nothing to notice.

The CASCADE chains make this concrete: deleting a *shop* cascades to `products` and then to
`product_images` — the DB rows vanish with no application code involved and therefore **no
opportunity for step 1 to run at all**. The sweep is the only thing that catches that case.

✅ **The founder's §6b decision simplifies this.** Because orders do **not** snapshot an image
path, `orders` is not a referencing row and the sweep's test stays simple: an object is an orphan
when no row in its own owning table (`product_images`, `profiles.avatar_url`, `shops.logo_url` /
`banner_url`, `portfolio_items`) points at it. No cross-table reference-tracking, and no
order-owned image copies — which would have doubled stored bytes for every ordered image against
the 1 GB cap that §0 and §2d identify as the binding constraint.

Neither the sweep nor the delete-in-action is in scope for this PR — it ships buckets and one
writer (avatars). The sweep becomes necessary when the first *deletable* image surface ships
(G5/G6/G7 products), and is logged in `follow-ups.md` against that trigger.

---

## 7. What the schema needs

### 7a. Columns and tables

| Table | Change | Type | Rationale |
|---|---|---|---|
| `profiles` | **add `avatar_url`** | `text` null | No avatar column exists anywhere. Must also be exposed on the `public_profiles` view — but **only** `avatar_url`, never alongside phone/email/DOB. The view's protection *is* its SELECT column list. |
| ~~`orders`~~ | ~~add `item_image_url`~~ | — | **❌ REJECTED by founder, 2026-07-31.** Title and price are frozen because they are facts about money and identity; **a thumbnail is decorative.** A frozen URL does not survive the storage object being deleted, so freezing buys a *broken image* rather than a placeholder. The 48×48 slot degrading to its icon when the product is gone is **correct behaviour, not a defect**. See `follow-ups.md`. §7b's trigger findings remain valid and are retained below for whenever a snapshot column *is* added. |
| `product_images` | **keep as-is** | — | Right shape already: separate table, `display_order`, CASCADE. Multiple images per product is a real requirement (D1 gallery, G6 upload grid). The 8 seed rows need re-pointing at real uploads. |
| `shops.logo_url` / `banner_url` | **keep as-is** | `text` | Single-URL columns are correct — exactly one logo and one banner per shop. No table needed. |
| **`portfolio_items`** | **new table** | — | No table exists. Needs its own: freelancer portfolio is many-per-freelancer with ordering, titles and descriptions — richer than a URL array. |

**Single URL vs array vs table — the rule applied:** single column where the cardinality is
exactly one (`shops.logo_url`, `profiles.avatar_url`, `orders.item_image_url`); separate table
where it is many *and* each item carries its own metadata or ordering (`product_images`,
`portfolio_items`). **No arrays** — an array cannot carry `display_order`, per-item captions, or
its own RLS, and reordering rewrites the whole row.

### 7b. `item_image_url` is a different trigger shape — verified against production

The trigger was read from the live database, not assumed from the PR that created it.
`trg_set_order_snapshot` **exists**, is **BEFORE INSERT**, and has **no `WHEN` condition** — so
"already there and unconditional" holds. But its body reads **scalar columns off the joined row**:

```sql
-- public.set_order_snapshot(), verbatim structure
if new.order_type = 'product' then
  select p.title, p.price_tnd   into v_title, v_price
    from public.products p      where p.id = new.product_id;
elsif new.order_type = 'service' then
  select s.title, s.starting_price_tnd into v_title, v_price
    from public.service_listings s     where s.id = new.service_listing_id;
end if;
if v_title is null then raise exception '…article introuvable.' using errcode='23503'; end if;
new.item_title := v_title;  new.unit_price_tnd := v_price;
```

**An image is not a scalar on `products`.** It lives in `product_images` — a separate table with
`display_order`. So filling `item_image_url` needs a **correlated subquery**, not another column
in the existing `select`:

```sql
select pi.image_url from public.product_images pi
 where pi.product_id = new.product_id
 order by pi.display_order, pi.created_at
 limit 1
```

Three consequences that follow from the real body and would have been missed otherwise:

1. **It must not raise.** The existing guard raises `23503` when `v_title` is null. A product with
   **no** image is legitimate — the image lookup must be allowed to return null and proceed.
   Today 1 of 9 products has no `product_images` row, so this path is live immediately.
2. **The service branch has no image source at all.** With `service_media` dropped (§7c), a
   service order has nothing to snapshot. `item_image_url` is therefore **product-only**, or it
   falls back to the freelancer avatar — a product decision, not a schema one.
3. **No BEFORE-trigger ordering hazard here.** The alphabetical-ordering constraint recorded in
   `follow-ups.md` applies to BEFORE **UPDATE** triggers (`orders` has four). On INSERT,
   `trg_set_order_snapshot` is the only BEFORE trigger and `trg_emit_order_event` is **AFTER**, so
   the emitted event already sees the populated snapshot. Verified, not assumed.

### 7c. `service_media` — the wrong table to keep

**Recommendation: drop it. Do not extend it.**

Verified on both sides:

- **Code:** `src/lib/marche/service-detail.ts:8-10` documents the removal explicitly — *"The
  service_media (work-samples) fetch this file used to carry was REMOVED: the table holds zero
  rows, the per-service gallery was retired in favour of portfolio-per-freelancer, and D2 (Figma
  666:55479 / 668:55920) has no gallery region — so it fed nothing."*
- **Figma:** the registry has gallery nodes only for **G6** (`532:32201`, product upload grid) and
  **D1** (`563:39552`, product detail gallery). Both are **product** surfaces. There is no H6
  `field-galerie` and no H7 `section-Galerie` — the per-service gallery was retired on the design
  side too.
- **Data:** 0 rows. Nothing to migrate.

So `service_media` is not "the wrong shape for the job" — it is **a well-shaped table for a
surface that no longer exists.** Its structure is in fact nearly identical to `product_images`
(id, parent FK, url, `display_order`, `created_at`, plus `media_type`), which is why it looks
extensible. But extending it would resurrect a retired surface. The freelancer sample-work
requirement is served by `portfolio_items` (per freelancer), not by per-service media.

Dropping it is safe: 0 rows, 0 code consumers, CASCADE FK only inbound from `service_listings`.
It should be its **own** migration PR, separate from anything that creates buckets — a drop and a
create do not belong in one reviewable change.

---

## 8. Recorded: this reverses the documented MVP plan

The founder asked for this to be recorded as a deliberate change, not an oversight.

**The documented plan (two citations):**

> `docs/architecture.md:29` — *"For media (shop logos, banners, freelancer portfolio images,
> service samples), the URL approach is used at MVP — sellers paste a URL from an existing hosting
> service they already use. Supabase Storage is reserved for a later phase when the platform's
> media volume justifies its own bucket and CDN configuration. This is the Headroom Principle
> applied to storage: deliberately add the complexity only when needed."*

> `docs/servyou-pages-elements-and-interactions.md:825` (G.2 — shop creation) — *"Image uploads use
> Vercel's image optimization for the display. The actual storage is via URL at MVP (the seller
> pastes a URL from their own hosting); a Phase 11 upgrade is Supabase Storage."*

**This report proposes bringing Supabase Storage forward from Phase 11 into MVP.**

Supporting observations, offered as input to that decision rather than as a foregone conclusion:

- **URL-paste was never exercised.** Zero user-supplied URLs exist in the database after seven
  build phases. The 8 `product_images` rows are repo assets.
- **URL-paste assumes the seller already hosts images somewhere.** Against the documented market
  anchors — Tunisia, mobile-first 70%+, sellers concentrated in 7 cities — a shop owner
  photographing stock on a phone has no hosting to paste from. The realistic paste sources are
  Facebook and Instagram CDN URLs, which are hotlink-protected, expire, and would need to be added
  to `remotePatterns` (and to the `img-src` CSP allowlist the standards doc specifies).
- **Every remaining seller surface needs it.** Avatars (already logged 🔴 in `follow-ups.md` as
  blocking the freelancer world), shop logo/banner, product images, portfolio. These are not
  Phase-11 surfaces; they are MVP surfaces.
- **The Headroom Principle still applies to the *variant* question** — which is precisely why §2e
  recommends one normalized original plus read-time resizing rather than a full variant pipeline.
  The complexity being added is a bucket and an RLS policy, not an image CDN.

**Counter-consideration, stated fairly:** the 1 GB free-tier cap means this decision likely forces
a paid Supabase plan sooner than Phase 11 would have. §2d puts a downscaled corpus at 46% of the
cap at MVP volume. That is real, and it is the strongest argument for the original plan.

---

## Awaiting founder approval before proceeding

Nothing has been created. Open decisions that need a founder call before any migration is written:

1. **(a) vs (b)** — recommendation is (b) + mandatory upload downscale (§2e).
2. **Vercel Hobby commercial-use restriction** (§2a) — plan-terms question, independent of the
   technical limits.
3. **`portfolio-media` public vs private** — the spec says both; recommendation is public (§3).
4. **`item_image_url` snapshot vs order-owned image copy** (§6c) — decides how the orphan sweep is
   built.
5. **Confirm the G.2 / Phase 11 reversal** (§8) is intended.
6. **Dropping `service_media`** (§7c) — own migration PR if approved.

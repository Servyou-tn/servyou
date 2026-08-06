# G6 « Ajouter un produit » — write path, decided before the code

**Phase 2 of `g6-discovery.md`.** That document ended "awaiting founder direction, nothing has been
built." This one records the directions given and the reasoning behind them, **before** the code, so
the next person reads a decision rather than reverse-engineers one.

**Date:** 2026-08-06 · **Branch:** `feat/g6-ajouter-produit` off `origin/main` @ `93ac872`
**Route:** `/mes-produits/ajouter` · **Node:** `530:31784`

---

## 0. What changed since Phase 1

Both Phase-1 blockers are cleared. Neither was cleared by this PR.

| # | Phase-1 blocker | status |
|---|---|---|
| **B1** | `product-images` storage RLS provably unsatisfiable (alias capture) | ✅ **fixed** by PR #109, migration `20260804104541`. INSERT + DELETE repaired, and the missing SELECT policy added. `foldername()` is hoisted out of the subquery so it can no longer bind to `shops.name`. |
| **B2** | Category cascade had no data source | ✅ **resolved by founder call:** the picker reads the live `categories` table filtered `kind in ('product','both')`, **one level only**. `src/lib/taxonomy/product-categories.ts` is not consumed. |

`categories.kind` arrived in PR #111 (migration `20260804132447`) and PR #112 put it to work on the
mission picker. G6 is the mirror.

**The product picker offers 6 rows** — the 5 `kind='product'` categories plus **Maison**, which
carries `'both'`. Maison therefore appears in *both* the product picker (6) and the mission picker
(9). **That is what `'both'` is for, not a leak.** Do not "fix" it. The migration's own note explains
why `maison` is `'both'`: ménage / plomberie / bricolage is a real Tunisian market the digital-only
service taxonomy has not reached, and a CHECK value with no honest member is worse than no value.

---

## 1. Decisions taken (founder, 2026-08-06)

| topic | decision |
|---|---|
| Route | `/mes-produits/ajouter`, ships standalone |
| `PRODUCT_MAX_EDGE` | **1280** — measured, see `g6-discovery.md` §4d |
| Upload transport | **one file per server-action call** — forced by §4e, not a preference |
| Product uuid | **generated server-side up front**, before any upload |
| Category picker | `kind in ('product','both')`, **one level**, no subcategory |
| Gallery | **1–8 images** (§4f/§6 stands) |
| Gallery affordances | **3 of 4 built** — remove, cover badge, per-file progress. **Reorder deferred to G7.** |
| `status` | **brouillon → `hidden`** (§8 option B). No migration this cycle. |
| Delivery fee | surfaced in the form, defaulting to **7** |
| Price arithmetic | live client-side preview, not stored |
| Partial-write recovery | **compensating delete** — §4 below |
| Storage reconciliation sweep | **logged, not built.** This PR is its trigger. |

⚑ "3-of-4" counts **affordances, not slots.** An earlier reading took it as a 4-image cap; it is
not. The gallery accepts 8.

---

## 2. Ownership — how `shop_id` is resolved, and why not from the client

`products` has **no `owner_id`**. Ownership runs `products.shop_id → shops.owner_id`. So every write
in this PR needs a shop id, and **it is resolved server-side from `auth.uid()`, never accepted as an
argument.**

Accepting a `shopId` parameter would let a caller aim a write at someone else's shop. RLS would
reject it — but the check belongs before the round trip, which is the same posture
`advanceOrderAction` takes when it derives the next status instead of accepting one
(`src/app/actions/orders.ts:45-50`).

### ⚑ `shops.owner_id` is NOT unique

There is only a non-unique index `shops_owner_idx`. **One owner can hold multiple shops.** Today the
sole shop owner holds exactly one, so `.maybeSingle()` would work *now* and break silently later —
`maybeSingle()` errors when the query returns more than one row, so the failure would surface as a
generic action error on an unrelated day, with nothing pointing at the cause.

**Resolution:** query ordered, take the first, and log when more than one is found.

```ts
// Ordered + limit(2) so ">1" is detectable without fetching the whole set.
const { data: shops, error } = await supabase
  .from('shops')
  .select('id')
  .eq('owner_id', user.id)
  .order('created_at', { ascending: true })
  .limit(2)
```

A `// TODO: shop switcher` marks it. A multi-shop picker is out of scope.

### No-shop guard

A `shop_owner` with zero shops must not reach a 500. Redirect to `/devenir-vendeur`, which renders.

⚑ **Two dead links exist around this** and are NOT fixed here: `/devenir-vendeur/page.tsx:18` points
its CTA at `/ma-boutique/creer` and its `manageHref` at `/ma-boutique`. Neither route exists —
`src/app/` has no `ma-boutique/`, and G2 (`555:37234`) is unbuilt. Logged against G2.

---

## 3. `imagePaths` — the prefix check is the security-relevant one

At submit the client sends the storage paths it already uploaded. **That list is untrusted input.**

Every entry must start with `` `${shopId}/${productId}/` `` where **both segments are server-derived**
— `shopId` from the session per §2, `productId` from the Zod-validated uuid. This is what stops a
caller attaching another shop's objects to their own product row.

The storage policy independently gates the *upload* on the first path segment being a shop the
caller owns (migration `20260804104541`), so this is defence in depth and not the only gate — the
same three-layer posture as the rest of the file. But the policy gates the write to *storage*; only
this check gates what gets written into `product_images.image_url`.

`image_url` stores the **public URL** from `getPublicUrl(path)`, not the raw path — matching
`uploadAvatarAction:127-129`.

---

## 4. 🔴 The failure mode, and what happens

### 4a. The state originally posed is unreachable

The question asked was: *a product is created, then an image upload fails midway, leaving the product
with a partial gallery.* **Under this design that cannot happen.**

Images go to storage **before the product row exists**. That ordering is forced, not chosen:
`product_images.product_id` is NOT NULL and its INSERT policy requires the product row to exist,
while the *storage path* requires no row at all. Generating the uuid up front is what lets the
uploads precede the row (§4g).

So there is no window in which a product exists and its images are still arriving. There are two
other windows, and these are the ones decided below.

### 4b. Window 1 — pre-submit upload failure

**State:** orphaned objects under `{shop_id}/{productId}/`. **No product row.** Nothing is
half-created from a buyer's point of view.

**Handling:** the failing tile reports its own error and the seller retries or removes it. Because
each upload is its own action call, one failure does not disturb the tiles that succeeded.

**Residue:** orphaned storage objects, invisible to every read path.

**Decision: log the reconciliation sweep, do not build it.**
`image-storage-discovery.md` §6c already specifies it and names "the first *deletable* image surface
(G5/G6/G7)" as its trigger. **This PR is that trigger.** Building it here would widen a form PR into
a storage-maintenance PR.

### 4c. Window 2 — submit-time, between two statements

**State:** the `products` insert succeeds, the `product_images` insert fails.

This is the **only** path to a product carrying fewer images than the seller chose, and it is
**exactly one statement wide** — because all image rows are written in a **single multi-row
`insert([...])`**, which Postgres applies atomically.

⚑ **A loop of per-row inserts is what would make a genuinely partial gallery possible.** Do not
refactor the single insert into a loop for readability. That is the entire reason this window is one
statement and not N.

### 4d. Decision — compensating delete

**If the `product_images` insert fails, delete the `products` row just created, then return the
error.**

Three things make this the right call:

1. **The compensation is exact.** `product_images.product_id` is **ON DELETE CASCADE** (§4f), so any
   rows that did land go with the parent. There is no second cleanup to get wrong.
2. **In-repo precedent.** `uploadAvatarAction` (`src/app/mon-compte/actions.ts:136-139`) removes the
   uploaded object when the profile update fails, with a comment saying why. Same shape, same
   reasoning, one layer up.
3. **The property worth protecting is that a buyer never sees a product with a partial gallery.**
   `product_images` SELECT is public and `products` SELECT is public; a half-written product is
   visible immediately.

**Rejected — flip `status` to `'hidden'` instead of deleting.** `products` has a working UPDATE
policy (§5), so it is available. It was rejected because it leaves a row the seller can find in G5's
"Masqués" tab carrying images they did not choose — **a worse artifact than no row at all.**

**Rejected — insert the product row first as a draft, then attach images as they upload.** This
removes Window 2 entirely, but trades invisible storage residue for junk draft rows visible in G5 on
every abandoned form. Invisible residue is strictly better.

### 4e. 🔴 Residual — if the compensating delete also fails

**The product persists in a degraded state:** it exists with fewer images than the seller chose, or
none.

This is not silently absorbed. **It is logged loudly at the call site**, with `error.message`,
`error.code` and `error.details` on both the original failure and the failed compensation, plus the
product id — because that id is the only thing that makes the row findable afterwards.

Severity is bounded but real: if the product was saved as brouillon → `hidden`, no buyer sees it. If
it was published, it is live with an incomplete gallery.

### 4f. Escalation — the `create_product_with_images` RPC

The durable fix is a Postgres function: **one function is one transaction**, which closes Window 2
properly instead of compensating around it.

It is **not** built here. It costs a migration and a `servyou-discovery-first-migration` pass, which
is a different PR from a form.

**Build it when either of these happens:**

1. **The compensating delete fails in production even once** — the §4e log line is the trigger, which
   is why that log must carry the product id.
2. **G7 needs transactional gallery replacement.** Reordering and replacing an existing gallery is
   delete + reinsert (there is no UPDATE policy on `product_images`, §4f), and *that* genuinely
   cannot be compensated cleanly — a failed reinsert after a successful delete destroys images the
   seller already had.

---

## 5. Schema facts confirmed against the live database

### `public.products` RLS — all four policies exist

`db/migrations/20260603182611_shops_products_images.sql:63-70`:

| cmd | predicate |
|---|---|
| SELECT | `true` (public) |
| INSERT | `WITH CHECK exists (select 1 from shops s where s.id = shop_id and s.owner_id = auth.uid())` |
| UPDATE | same, as both `USING` and `WITH CHECK` |
| DELETE | same, as `USING` |

So both halves of §4d's compensation options are actually available.

### ⚑ Why that unqualified `shop_id` is safe — and the #109 bug is not

This is the near-miss twin of the alias-capture bug PR #109 fixed, and **the next person copying this
shape needs to know why one was fatal and the other is fine.**

```sql
-- SAFE (products policy):
exists (select 1 from public.shops s where s.id = shop_id and s.owner_id = auth.uid())
--                                              ^^^^^^^ binds OUTER products.shop_id

-- FATAL (the #109 storage bug):
exists (select 1 from public.shops s where s.id::text = (storage.foldername(name))[1] ...)
--                                                                          ^^^^ bound s.name,
--                                                                          NOT objects.name
```

**The rule is not "qualify your columns" — it is which tables carry the name.** An unqualified
column inside a subquery resolves against the *inner* table first, and only falls through to the
outer query if the inner table has no such column.

- `shops` has **no** `shop_id` column → `shop_id` falls through to `products.shop_id`. Correct.
- `shops` **does** have a `name` column → `name` bound to `shops.name` (the shop's *display name*)
  instead of `storage.objects.name` (the object path). `foldername('OM shop')` returns `NULL`, the
  predicate never matched, and the policy could never grant.

The fatal case is invisible at the call site and reads identically. The fix in #109 was to **hoist
`foldername()` out of the subquery entirely**, to a position where no `shops` column is in scope —
not to qualify it. Qualification fixes the symptom at one site; hoisting removes the whole class.

**Before copying either shape, check whether the joined table carries a column of that name.**

### Columns G6 writes

| column | type | notes |
|---|---|---|
| `id` | uuid | **pre-generated server-side**, not `gen_random_uuid()` at insert |
| `shop_id` | uuid NOT NULL | §2, never client input |
| `title` | text NOT NULL | no DB length cap; 100 is a form rule |
| `category_id` | uuid → `categories` | one level, `kind in ('product','both')` |
| `description` | text NULL | |
| `price_tnd` | numeric NOT NULL | `CHECK (price_tnd >= 0)` |
| `delivery_fee_tnd` | numeric NOT NULL DEFAULT 7 | `CHECK (>= 0)`. Migration `20260801112027`. |
| `tracks_stock` | boolean NOT NULL DEFAULT true | |
| `stock_count` | integer NULL | `CHECK (>= 0)`. **NULL when `tracks_stock` is false.** |
| `status` | text NOT NULL DEFAULT `'active'` | CHECK `active\|hidden\|sold_out`. **No `'draft'`.** |

`delivery_fee_tnd` defaulting to 7 is a **suggestion, not a rule** — ~90% of Tunisian deliveries are
7 TND, and the seller's input is the source of truth. A NOT NULL DEFAULT 7 column that no UI exposed
would silently lock every seller to 7.

### Bucket

`product-images` — public, **2 MiB** `file_size_limit`, `allowed_mime_types` = `['image/webp']` only.
`PRODUCT_MAX_EDGE = 1280` yields 890 KB worst case, **43% of the cap**. (The superseded 2048
recommendation reached 2900 KB — 142% of the cap it was supposed to fit inside.)

---

## 6. Action shapes

```ts
// A. One image per call. Called up to 8 times BEFORE the product row exists.
const UploadProductImageInput = z.object({
  productId: z.string().uuid(),
})
// file arrives via FormData; Zod validates the shape, normalizeProductImage is the content gate
// → upload to `${shopId}/${productId}/${randomUUID()}.webp`
// → { ok: true, path, url }

// B. Submit.
const CreateProductInput = z.object({
  productId:      z.string().uuid(),
  title:          z.string().trim().min(1).max(100),
  categoryId:     z.string().uuid(),
  description:    z.string().trim().max(2000).optional(),
  priceTnd:       z.number().nonnegative().multipleOf(0.01),
  deliveryFeeTnd: z.number().nonnegative().multipleOf(0.01),
  tracksStock:    z.boolean(),
  stockCount:     z.number().int().nonnegative().optional(),
  imagePaths:     z.array(z.string()).max(8),
  publish:        z.boolean(),
})
```

### ⚑ Why the ≥1-image gate is conditional on `publish`

The direction was `imagePaths: z.array(z.string()).min(1).max(8)`, to enforce the publish gate
server-side rather than trusting the client. **The gate is enforced server-side — but conditionally,
because an unconditional `min(1)` breaks the other CTA.**

The designed footer is **[Enregistrer le brouillon]** (secondary, **ungated**) +
**[Publier le produit]** (primary, gated on titre + catégorie + description + prix + frais +
stock-if-tracking + **≥1 image**). An unconditional `min(1)` would make it impossible to save a draft
before adding a photo — and an ungated save is the whole reason the two-CTA footer exists (§8
rejected option C on exactly that ground).

So the array carries `.max(8)` and the ≥1 rule is a `superRefine` predicated on `publish === true`.
The gate is not client-trusted; it is simply scoped to the CTA it belongs to. **One line to make it
unconditional if that reading is wrong.**

### Order of operations, submit

1. `getLang()` → `createClient()` → `auth.getUser()`; miss → generic error.
2. **Zod parse before any DB call.** Numeric bounds mirror the live CHECKs so a clear message beats a
   raised constraint (`setOrderTrackingAction:153`).
3. Resolve `shopId` from `auth.uid()` (§2). No shop → guard, not a crash.
4. Validate every `imagePaths` entry against `` `${shopId}/${productId}/` `` (§3).
5. Insert `products` with the pre-generated uuid, `status = publish ? 'active' : 'hidden'`,
   `stock_count = tracksStock ? n : null`.
6. Insert **all** `product_images` rows in **one** statement (§4c).
7. On failure at 6 → compensating delete (§4d); on failure of that → loud log (§4e).
8. Never destructure only `data`; log `.message` / `.code` / `.details`.
9. `revalidatePath` over a fixed allow-list.

---

## 7. Out of scope, logged

- Storage reconciliation sweep (§4b) — this PR is its trigger
- `create_product_with_images` RPC (§4f) — with its two trigger conditions
- Drag-reorder of images — needs an UPDATE policy on `product_images`; deferred to G7
- Client-side downscale before upload — already logged; G6 multiplies its urgency 8×
- G5 `/mes-produits`, and re-targeting `product.back` (currently "Retour aux produits" → absent route)
- G2 and the two dead links at `/devenir-vendeur/page.tsx:18`
- `'draft'` as a fourth `status` value (§8 option A) — revisit if brouillon-as-`hidden` misleads in G5
- Delete-product DB behaviour — open flag shared with G5/G7
- 🔴 **AppShell topbar overflows at 375px** (431px doc width) — measured on this PR's gate pass and
  reproduced identically on three pre-existing pages, so it is the shell, not G6. Logged in
  `docs/follow-ups.md`; the earlier "380px 0-overflow" audit missed it by measuring at 380.
- The **mission** picker (`my-data.ts` getCategories) selects `name_fr` only and renders French
  category names in the Arabic form. G6's picker selects `name_ar` and falls back; the mission side
  was left alone (PR #112 shipped it, one-PR-one-focus).
- `image-normalize.test.ts` has a pre-existing `tsc` error — sharp's `Create` type requires
  `background` even when `noise` supplies the pixels. G6's own fixture passes it; the sibling avatar
  fixture still does not.

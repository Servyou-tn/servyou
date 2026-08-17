# G5 « Mes produits » — discovery record

**Provenance (inverted from the usual shape).** Most discovery docs in this repo flag *Figma*
facts as the uncertain ones (rate-limited MCP calls, founder-relayed) and treat code reads as
solid ground truth. This one inverts that: the Figma facts are 🗣 **FOUNDER-REPORTED** directly
in-session (frames `522:29106` main + specimens `523:30264`/`523:30284`/`523:30408`, cross-checked
against `docs/design/figma-registry.md:607-623` — no Figma call spent) and are the *most* solid
claims here. The uncertain tier is the code side: most of §1–§6 below is 📖 **READ**, direct
citations off current migrations/source — solid, but static, and several of the load-bearing
claims (delete behavior, bulk-atomicity, the admin-moderation partial-failure scenario) started
as 🔬 **DERIVED, NOT EXECUTED** — reasoned from trigger logic without running it. §7 below closes
that gap for the one claim that mattered most: it is now ✅ **EMPIRICALLY VERIFIED**, executed
against the live dev database, fixture torn down after. Nothing else here has been executed.

No code was written for this record. `/mes-produits` still has no root `page.tsx` — only
`ajouter/` exists (confirmed: `src/app/mes-produits/**` lists exactly one file). The sidebar item
ships `disabled: true` with a comment to flip it off in the PR that builds this page
(`src/components/shell/sidebar-items.ts:109-110,115`).

---

## 1. Write actions

`src/app/actions/products.ts` 📖 has exactly `uploadProductImageAction` and `createProductAction`.
Everything below is new.

| Action | Exists? | Buildable here? |
|---|---|---|
| Status toggle, single row | No | Yes — schema/RLS already support it |
| Delete, single row | No | **Partially — see §7, confirmed blocker for products with order history** |
| Status toggle, bulk | No | Yes, new array-input action shape (no precedent in this codebase) |
| Delete, bulk | No | Same blocker as single delete, multiplied |
| Désélectionner | N/A | Client state only |

**`products.status` today** 📖: CHECK allows `'active' \| 'hidden' \| 'sold_out'`
(`db/migrations/20260603182611_shops_products_images.sql:27`). `'sold_out'` is dead — grepped
every writer in `src/`; only `createProductAction` writes `status`, and only `'active'`/`'hidden'`.
The real "out of stock" signal is derived, not stored: `resolveStockState()`
(`src/lib/marche/product-stock.ts:27-37`) from `tracks_stock` + `stock_count`, independent of
`status` — its own header comment: filtering `status === 'sold_out'` "would render the rupture
state for exactly zero products." **Direct consequence for the "Épuisés" tab**: filtering
`status = 'sold_out'` shows nothing, forever. It needs the derived condition
(`tracks_stock=true AND stock_count<=0`) instead — which also means "Épuisé" is not mutually
exclusive with "Actif" in the data today (nothing stops a product being `status='active'` and out
of stock simultaneously). Whether the tabs partition the catalog cleanly under that overlap is a
product decision, not resolved here.

**Status toggle**: owner already has UPDATE via RLS
(`Shop owner updates products`, same migration:66-68). One real wrinkle 📖:
`enforce_admin_moderation_lock` (`db/migrations/20260607154225_products_services_admin_moderation.sql:23-51`)
blocks a non-admin from moving `status` away from `'hidden'` once `admin_hidden_at IS NOT NULL`.
"Activer" on an admin-moderated product needs a distinct, honest error, not a generic failure —
the string already exists (`owner.moderation_banner.product`, `src/lib/i18n/fr.ts:1879`).

**Delete** — see §7. Confirmed, not just predicted.

**Bulk**: zero precedent anywhere in this codebase for an array-input write action (grepped
`productIds`/`.array(`/batch shapes across every `actions.ts`/`app/actions/*`; every existing
action takes one id) 📖. Two concrete mechanics, both 📖/derived from reading, not executed:
a single `UPDATE ... WHERE id IN (...)` is atomic (all rows or none); `enforce_admin_moderation_lock`
firing on one admin-moderated row inside a bulk "Activer" would roll back the **entire batch**,
including the clean rows. Bulk delete inherits §7's blocker at N× the blast radius.

---

## 2. Modifier

G7 has no code (`src/app/mes-produits/**` confirmed above), but it **is** fully specced in Figma
already — frame `535:32433`, 0-unbound audited per the cached design memory (a G6 clone, single-page
not accordion, plus a §5 Statut/DangerZone with its own typed-confirm delete modal, `536:32818`).
So building it is a from-zero *code* task roughly G6's size, not a from-zero design task.

Three options, costs only, no pick:

1. **Ship disabled** — the sidebar's own established convention
   (`sidebar-items.ts:109-110`): Bientôt badge, correct href, flip `disabled` off in the PR that
   builds the page. Near-zero cost here.
2. **Build G7 in this PR too.** Real cost: a second full CRUD surface bundled into a list-page PR
   (breaks one-PR-one-focus), and G7's DangerZone can't be finished without first resolving §7's
   blocker — so this option either blocks the whole PR on that decision or ships G7 incomplete
   against its own spec.
3. **Ship disabled now, G7 as an explicit next PR** — same near-zero cost as (1), stated as a
   committed follow-up. Matches how every other G-pair in this app has actually shipped
   (G6→G7, H6→H7): two PRs, not one bundled one.

---

## 3. Vendus

No sold-count column on `products`; has to be derived from `orders` at read time. Two precedents
exist 📖, not one:

- `getMyMissions` (`src/lib/marche/my-data.ts:404-435`) — PostgREST embedded count,
  `job_responses ( count )` in the select string, one query, DB-side, per-row. **Unfiltered.**
- G4's dashboard (`src/lib/marche/seller-dashboard.ts`) — fetches raw order rows, reduces in JS
  (`netProfitOf`).

The embedded-count mechanism transplants mechanically. It does **not** transplant as-is: Vendus
almost certainly wants only completed sales counted, and there is zero precedent in this codebase
for a *filtered* embedded count (grepped every `(count)` use in `src/` — both hits are the same
unfiltered `job_responses(count)`, `DashboardRightRail.tsx:27` and `my-data.ts:410`). Filtering an
embed by the child table's own column is a PostgREST feature this app has never exercised — treat
as unverified until spiked, not assumed to work by analogy.

If filtering is needed, `seller-dashboard.ts:118-119` already defines the app's one canonical
"what counts as sold": `const DELIVERED = 'received'`, used for the earnings tile. Reusing it for
Vendus would be consistent with the only existing precedent — noted as the natural default, not
decided as correct for this specific case.

**Cost, 26 vs 500 products**: the embedded-count query is one query regardless of catalog size,
and PostgREST only computes the count for rows the outer (paginated) query actually returns — the
real cost concern isn't catalog size, it's orders volume. 📖 `orders` has no index on `product_id`
at all (`orders_buyer_idx`, `orders_seller_idx`, `orders_status_idx` exist —
`db/migrations/20260603182645_orders.sql:27-29` — `product_id` doesn't). Fine at today's ~14
order rows; a real cost as order volume grows, independent of products-page size.

---

## 4. The row

Confirmed 📖: nothing named `ListRow`/`Table`/`*Row` exists under `src/components` (glob returned
zero matches for both patterns). Figma's side is the opposite — `List Row` (`118:5175`) is one
shared component, 4 variants, typed props (`thumb`, `description`, `chips`, `kebab`,
`col1-3 Label/Value`, `showStatus`, `showBadge`) — reused across G4/G5/G8/G9 mockups per the
registry (`docs/design/figma-registry.md:179`).

The code precedent contradicts the design source: G8 (`/commandes-recues`, already built) needed
the same shape and shipped `OrderActionRow`
(`src/app/commandes-recues/_components/OrderActionRow.tsx`) route-local, not shared — same for the
H-zone's `Engagement Row`/`PropositionRow`. Every time this exact situation has come up before in
this repo, the answer was route-local, even though Figma models it as one shared component. Not a
recommendation — the pattern, reported.

---

## 5. Mobile

No 375 frame for G5. All four known frames are desktop-width (1440 main, 1200 specimens),
confirmed against the registry (`figma-registry.md:607-623`) — nothing else in the G5 cluster.
Not inventing one.

One partial, weaker precedent, named honestly: `OrderActionRow` reflows at a breakpoint
(`flex-col ... lg:flex-row`, `OrderActionRow.tsx:61`) — the *same component* stacking its own
children below `lg`, not a distinct Card component swapped in. Not the "cards on mobile, rows on
desktop" pattern the spec calls for; evidence the app has done *some* row-reflow, not evidence for
the specific two-component pattern.

---

## 6. Bulk select

- **Selection state** — no precedent (grepped `selectedIds`/`selectAll`/`Set`-based checkbox state;
  the two hits found are unrelated — an accordion open-state and a config-form checkbox). New
  client state, route-local by §4's finding.
- **Select-all scope** — current page vs. all pages isn't settled by the bulk-select specimen
  (it shows one page selected); a real decision given pagination exists.
- **Partial failure** — see §1: atomic `UPDATE ... WHERE id IN (...)` means no partial state at
  the SQL level for status changes, but `enforce_admin_moderation_lock` can sink an entire
  otherwise-valid batch on one bad row (derived, not executed — same tier as the rest of §1's bulk
  claims, unlike §7). Bulk delete inherits §7's blocker N× over.

---

## 7. Spike: the delete blocker — ✅ EMPIRICALLY VERIFIED

**Prediction being tested** (from §1, derived by reading, not executed): `orders.product_id` is
`ON DELETE SET NULL` (`db/migrations/20260603182645_orders.sql:10`); `enforce_order_identity_lock`
(`db/migrations/20260801112027_delivery_fee_tnd_product_and_order.sql:126-176`, product_id clause
byte-identical since `20260609190755_lock_orders_identity_and_seller_age_gate.sql`) raises on any
change to `product_id` for a non-admin, authenticated session. A cascading `SET NULL` from
deleting a product **is** such a change, so deleting a product with any order history should raise
inside the owner's own session.

**Method.** One throwaway shop, two throwaway products, one throwaway order, one throwaway buyer —
all created via the service-role client (setup only, not under test). The two DELETE attempts ran
through a **separately minted owner session** (magiclink hash → `verifyOtp`, same mechanism as
`scripts/gate/session.mjs`, no cookies/browser needed since this tests Postgrest/RLS directly, not
UI) — a real `authenticated` Postgrest client, not service role. Confirmed the session actually
authenticated as the intended owner (`auth.getUser()` check) before trusting either result. All
fixture rows verified gone via a service-role read after teardown.

**Result — the prediction held exactly:**

| Product | Order history | DELETE (as owner, real RLS) | Postgres response |
|---|---|---|---|
| A | zero orders | **Succeeded** | `200 OK`, row returned, row gone on re-read |
| B | one order | **Raised** | `403 Forbidden`, `error.code = 42501`, `error.message = "Order identity columns cannot be modified"` |

Post-attempt ground truth (service-role read, not trusting the Postgrest response alone): product
A confirmed absent; product B confirmed **still present** (clean rollback, not a partial delete);
the order's `product_id` confirmed **unchanged**, still pointing at product B. Teardown removed the
order row, the shop (cascading any remaining products), and both throwaway users; a final
service-role sweep across all four fixture ids confirmed zero rows remaining.

**What this settles:** hard-deleting a product with zero order history works today, no new schema.
Hard-deleting a product with any order history is **not** a design choice to make later — it is
already blocked, confirmed against the real trigger, not a theory. "Supprimer" cannot ship as a
plain hard delete against every row; it needs one of the options below decided before G7's
DangerZone (or G5's bulk "Supprimer") is wired to anything.

### If soft-delete is the answer: the fan-out cost, exact call sites

A soft-delete column (e.g. `deleted_at`) is not a self-contained schema change — every existing
read of `products` that's meant to represent the live catalog needs the same new filter added, or
a "deleted" product keeps appearing everywhere it shouldn't. Grepped every `.from('products')` in
`src/` (excluding test files and the two write-only calls in `actions/products.ts`) 📖:

| Call site | Surface | Current filter | Note |
|---|---|---|---|
| `src/lib/search/search-marketplace.ts:206` | C1 (`/marche/produits`, `/recherche`, `/categories/[slug]`) | `status='active'` + admin_hidden_at ×2 | one more `.is()` line |
| `src/lib/marche/product-detail.ts:69` (`getProductDetail`) | D1 main fetch | `status='active'` + admin_hidden_at | one more line |
| `src/lib/marche/product-detail.ts:153` (`getRelatedProducts`) | D1 related rail | `status='active'` + admin_hidden_at | one more line |
| `src/lib/marche/shop-detail.ts:113` (`getShopProducts`) | D3 boutique page | `status='active'` | one more line |
| `src/lib/marche/demander.ts:90` (`getRequestTarget`) | E1 page-level target | `status='active'` + admin_hidden_at | one more line |
| `src/app/demander/[id]/actions.ts:55` | E1 **server-action re-fetch** | `status='active'` + admin_hidden_at | **security-relevant**: this is the write-path gate before an order is created — missing it means a "deleted" product stays orderable |
| `src/lib/marche/filter-cities.ts:68` (`getProductCities`) | C1 filter-bar city list | `status='active'` + admin_hidden_at ×2 | one more line |
| `src/lib/marche/seller-dashboard.ts:199` | G4 dashboard (owner's own products) | **none today** | owner-facing but still needs it — a seller's deleted history shouldn't populate their own "active products" glance count or low-stock rail |
| `src/app/admin/statistiques/page.tsx:49` | Admin platform-wide product count | **none today** (`head:true` count) | judgment call, not mechanical — does a platform metric count ever-listed products or only-live ones? |
| `src/lib/marche/data.ts:44` (`getActiveProducts`) | legacy `/marche` grid | `status='active'` + admin_hidden_at ×2 | **currently has zero live callers** in `src/app/**` (grepped) — only reachable from its own test, `moderation-read-paths.test.ts`; still needs the filter if ever revived, and that test would need a soft-deleted-row case added |
| *(future)* G5's own product-list query | G5 itself, once built | n/a, doesn't exist yet | self-referential — G5 needs this filter from the day it's written, or a seller's deleted products reappear in their own list |

**10 existing call sites, one of them dead code, plus G5's own future query as an 11th.** One of
the ten (`demander/[id]/actions.ts:55`) is not cosmetic — missing the filter there is a real
buyable-deleted-product bug, not a display glitch. Two (G4 dashboard, admin stats) currently have
no status filter at all today, so "add one more line" undersells them — they need a first one.
`moderation-read-paths.test.ts` (must-test territory: business-rule/data-integrity logic per
CLAUDE.md's testing discipline) would need a new case per the filtered call sites, not just the
new column.

This is the real cost of the soft-delete branch of §1/§7's open decision — reported so the choice
between "soft-delete column" and "restrict Supprimer to zero-order products only" can be made with
the fan-out priced in, not discovered mid-build.

### Ruling — 2026-08-17: hard delete, zero-order products only. No soft-delete migration.

**Decided.** `Supprimer` stays a hard delete, restricted to products with zero order history. No
`deleted_at` column, no soft-delete migration.

**Reasoning, as given.** Soft-delete costs a migration plus the 11 SELECT filters in the table
above, one of which (`demander/[id]/actions.ts:55`) is a write-path gate where a miss leaves a
deleted product orderable, plus two surfaces (G4 dashboard, admin stats) with no status filter at
all today, plus an unresolved product question about what admin metrics should count. That is a
large, error-prone fan-out to enable deleting products the seller can already hide — and for a
product with shipped orders, hiding is what actually preserves the order record: `orders` already
freezes `item_title`/`unit_price_tnd`/`delivery_fee_tnd` at insert precisely so a historical order
stays honest after the seller changes or removes the listing (`orders.delivery_fee_tnd`'s own
comment, `20260801112027...sql:60-76`). A soft-deleted-but-still-joinable product would duplicate
that protection through a second mechanism nobody asked for.

**Consequence for the write action.** Per the founder's explicit instruction: do not attempt the
delete and surface a `42501` — §7 shows that failure mode is a raw Postgres exception, not a
designed error path. `deleteProductAction` checks order history FIRST and disables/skips
accordingly; see §8.5 for the bulk equivalent of the same rule, and §8.7 for the neighboring
admin-moderation case this mirrors.

---

## 8. Build plan

Not yet built. This is what the rulings above (row = route-local, bulk = current-page-only,
delete = hard/zero-order-only) and the two remaining open technical questions — settled below by
precedent and a live spike, not left open — turn into, concretely enough to build from.

### 8.1 The four tabs — Tous / Actifs / Masqués / Épuisés

Épuisés filters the DERIVED condition, not `status`:

```
tracks_stock = true AND (stock_count IS NULL OR stock_count <= 0)
```

matching `resolveStockState()`'s own `n <= 0` / null-as-zero treatment
(`src/lib/marche/product-stock.ts:34-36`) — not `status = 'sold_out'`, which is dead (§1) and would
show nothing, ever. Épuisés is a VIEW over the catalog, not a fifth status: a product can be
`status='active'` and out of stock simultaneously, and it appears in **both** Actifs and Épuisés at
once. Tous counts every product for the shop exactly once, independent of the other three — it is
**not** the sum of the other three tab counts (that sum can exceed Tous, since Épuisés overlaps
either of the other two).

**Two queries per page load, not one:**

1. **Counts** (all four tab badges) — one lightweight fetch of every product row for the shop,
   minimal columns only (`id, status, tracks_stock, stock_count`), the same shape
   `seller-dashboard.ts:199` already fetches for G4's low-stock rail (no images, no joins).
   Reduced in JS:
   `tous = rows.length` ·
   `actifs = rows.filter(r => r.status==='active').length` ·
   `masques = rows.filter(r => r.status==='hidden').length` ·
   `epuises = rows.filter(r => r.tracks_stock && (r.stock_count==null || r.stock_count<=0)).length`.
   One round trip, cheap at both 26 and 500 rows, reuses a pattern already proven live in this
   codebase instead of inventing a cross-tab SQL query.
2. **Content** (the selected tab's actual rows) — a second, paginated fetch with the full columns
   the row needs (title, price, images, category, `orders(count)` for Vendus — §8.3), filtered by
   whichever tab is active: Tous = `eq('shop_id', shopId)` only; Actifs = `+ eq('status','active')`;
   Masqués = `+ eq('status','hidden')`; Épuisés = `+ eq('tracks_stock', true)
   + or('stock_count.is.null,stock_count.lte.0')`.

This keeps the derived filter contained to the one place it needs SQL (content), while counts stay
a flat JS reduction over one cheap fetch.

### 8.2 Modifier — ships disabled

Bientôt pattern, matching `sidebar-items.ts:109-110` exactly: "Modifier" renders `disabled`, the
correct `href` to `/mes-produits/[id]/modifier` pre-wired (dead until G7 ships), Bientôt
badge/tooltip. Reuse the existing "Bientôt" i18n convention rather than inventing a new string. G7
is the committed next PR — full CRUD surface, roughly G6-sized per §2's cost analysis, not bundled
into this one.

### 8.3 Vendus — spiked, confirmed this session

The filtered embedded count works. Spiked live (throwaway shop, 3 products: 2 received orders /
1 received + 1 pending / zero orders):

```
.select('id, title, orders(count)').eq('orders.status', 'received')
```

returned exactly `{p1: 2, p2: 1, p3: 0}` — the filter correctly restricts which child rows count,
and the zero-order product still appeared in the result set with `count: 0` rather than being
dropped (LEFT-join semantics preserved, not silently turned into an INNER join by the filter).
Fixture torn down clean after; no orphaned rows.

Ship `DELIVERED = 'received'`, reusing the app's one existing canonical definition
(`seller-dashboard.ts:118-119`) rather than inventing a second one. The §8.1 content query gets
`orders(count)` added to its select list with `.eq('orders.status', DELIVERED)`.

**Index: add it in this PR.** `orders.product_id` has no index today
(`orders_buyer_idx`/`orders_seller_idx`/`orders_status_idx` exist, `orders.sql:27-29`, this one
doesn't) — every row of every G5 page load does a sequential scan over the whole `orders` table to
compute its Vendus count. Fine at ~14 rows today; a real, silent cost as order volume grows. This
is a one-line, purely additive `CREATE INDEX`, zero data risk, zero RLS change, needed specifically
by the read path this PR introduces — the same "migration alongside the feature that needs it"
reasoning this repo already uses elsewhere, not scope creep onto something unrelated. Recommend:
`CREATE INDEX orders_product_idx ON public.orders(product_id);`, presented for approval per the
discovery-first-migration discipline before it's applied.

### 8.4 The row — route-local

`ProductRow` lives at `src/app/mes-produits/_components/ProductRow.tsx`, matching
`OrderActionRow`'s placement and shape exactly (plain JSX/Tailwind, not a generic primitive), per
the founder's ruling and §4's precedent. Props close to what List Row's Figma instance carries
(thumb, title, col1/2/3 label+value for Prix/Stock/Vendus, status pill, Modifier button, kebab) but
hand-built, not parameterized into a shared component — the `SegmentedControl` lesson from the
prior PR applies here too: don't manufacture a shared abstraction for a pattern that has never
actually been shared in this codebase.

### 8.5 Bulk select — current page only

Selection state is route-local client state (`useState<Set<string>>`), scoped to the ids rendered
on the current page — no cross-page selection, no "select all N products" beyond what's visible.

**Admin-moderation risk (bulk "Activer"): pre-filter and report what was skipped, not
all-or-nothing.** `enforce_admin_moderation_lock` only blocks transitions AWAY from `hidden` (§1) —
it never blocks "Masquer" or "Supprimer", only "Activer" on an admin-moderated row. A single atomic
`UPDATE ... WHERE id IN (...)` is simpler code, but its failure mode is bad UX: select 5, click
"Activer", one is admin-moderated, the entire batch silently does nothing with one opaque error —
including the 4 rows that were fine. This app's conventions consistently favor precise, honest
failure over generic ones (the upload-failure reason codes in `actions/products.ts`, the moderation
banner string that already exists for exactly this scenario). So: pre-check `admin_hidden_at` on
the selected ids (one cheap `SELECT id, admin_hidden_at WHERE id IN (...)`), apply "Activer" only
to the eligible subset, report the rest back using the existing `owner.moderation_banner.product`
string (`fr.ts:1879`) as the reason — "3 activés, 2 non modifiés (masqués par modération)" rather
than one failed batch.

**Zero-order constraint (bulk "Supprimer"): the same shape, for the same reason.** Per the delete
ruling above, this is not a second design — it is the identical pre-filter-and-report treatment
applied to the other risky bulk action: pre-check order history on the selected ids (reusing the
`orders(count)` mechanism from §8.3, unfiltered this time — any order at all disqualifies, not only
`received` ones), delete only the zero-order subset, report the rest as "masquez-les plutôt" rather
than attempting the delete and catching a `42501` across a whole batch.

Both bulk-risky actions share one shape: check eligibility first, act on the eligible subset, name
what was skipped and why. Not two separate designs.

### 8.6 Mobile — INFERRED, no frame

No 375 frame exists for G5 (§5). What would ship, marked **INFERRED FROM `OrderActionRow`, NOT
FROM A G5 FRAME**: extend `ProductRow` itself with the same reflow mechanism already proven in
this app (`OrderActionRow.tsx:61`, `flex-col gap-3 lg:flex-row lg:items-center lg:gap-4`) rather
than building a second, distinct "ProductCard" component the spec gestures at but no frame
confirms. Concretely: thumbnail + title + status pill stacked first, Prix/Stock/Vendus wrapped
into a row beneath, Modifier + kebab last — one component, one set of markup, reflowing by
breakpoint, matching the app's only actual mobile-row precedent rather than inventing the
two-component "cards on mobile, rows on desktop" pattern from nothing. Flagged for a founder visual
check once built — a real screenshot at a real mobile width — before being treated as settled: this
is a guess standing in for a measurement, not a measurement.

### 8.7 Activer on an admin-moderated product

Reuses `owner.moderation_banner.product` (`fr.ts:1879` — "Ce produit a été masqué par modération.
Contactez le support pour plus d'informations.") as the error surfaced on both the single-row
"Activer" failure and the bulk pre-filter's skip reason (§8.5) — one string, one message, not a new
one invented for this PR.

---

Nothing built. No branch. Both fixtures (§7 delete spike, §8.3 Vendus spike) created and torn down
in the same session; each verified clean afterward.

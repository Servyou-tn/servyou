# H6 PR-1 — `service_listings` hardening (`feat/h6-data-foundation`, 2026-10-23)

## ✅ CLOSED — `products` / `shops` / `product_images` are still SELECT `using (true)` — their own security PR

- **Closed by** migration 65 (`20261025213214_prelaunch_shop_read_rls`, pre-launch security batch PR-1,
  2026-10-25), with the embed audit this entry asked for (`docs/design/prelaunch-security-batch-discovery.md`
  §2) and the buyer-of-order branch on both `products` and `shops`. Live-tested by
  `prelaunch-shop-read-rls.test.ts`.

- **What:** "Products viewable by everyone", "Shops viewable by everyone" and "Product images
  viewable by everyone" are all `using (true)` (confirmed live, 2026-10-23) — exactly the shape
  `service_listings` had before migration 52. A hidden, sold-out or admin-moderated product, its
  images, or an admin-hidden shop is readable through the REST API by anyone holding its id; only
  the app's own `status` / `admin_hidden_at` filters keep them off public pages.
- **Why it matters:** same class as ruling G1 (standards-reference Section 3 A01). It is not a
  copy-paste of migration 52: the product side has its own version of decision D1 —
  `order-detail.ts`'s product branch renders title and category from the live `products(...)`
  embed, so a narrower policy would blank a buyer's order recap for any order that predates the
  `item_title` / `unit_price_tnd` snapshot. It needs its own embed audit (orders, favorites, G8/G9
  seller views, D1/D3, admin moderation) and probably the same buyer-of-order branch.
- **Not fixed here** — ruling G1 is scoped to `service_listings` only (founder + architect,
  2026-10-23).
- **Trigger:** its own security PR — before any product gains a draft-like state, or in the
  pre-launch security pass, whichever comes first.

## ✅ CLOSED — Orders INSERT never checks that the target listing is live — and since migration 52 an order is also a read grant

- **Closed by** migration 54 (`20261023170918_orders_insert_integrity`, `fix/orders-insert-integrity`,
  2026-10-23): `trg_enforce_order_insert_integrity` derives `seller_id` from the item and, for
  signed-in non-admin callers, requires a live item, a `pending` start and no self-order.
- **What:** "Buyer creates own order" checks only `buyer_id = auth.uid()`. `set_order_snapshot` is
  SECURITY DEFINER (it reads the target regardless of RLS) and FK checks bypass RLS, so a
  signed-in user holding a listing's UUID can create an order on a draft, paused or admin-moderated
  service (or a hidden product). Only the app path (`demander/[id]/actions.ts`, which filters
  `status='active'` and not moderated) prevents it today.
- **Why it matters more after migration 52:** (1) with G2, an order on a price-less draft freezes
  `unit_price_tnd = NULL`; (2) with D1's buyer branch, an order is also a READ grant — inserting one
  lets that user read the non-public listing it targets. Bounded: it needs the UUID (a draft's is
  never public; a paused or moderated listing's was public while it was live), and the exposure is
  still strictly less than the `using (true)` that migration 52 replaced.
- **Fix sketch:** a BEFORE INSERT guard on `orders` (inside `set_order_snapshot` or a sibling
  trigger) that rejects a target that is not `status='active'`, is admin-moderated, or whose shop /
  freelancer profile is moderated.
- **Not fixed here** — a change to the orders write path, outside a PR scoped to `service_listings`'
  read policy and columns.
- **Trigger:** before H6 lets real freelancers save drafts (that is when drafts, and their UUIDs,
  start existing in production) — or with the products/shops security PR above.

## Moving a subcategory to another sector is never re-checked against `service_listings.subcategory_id`

- **What:** `trg_enforce_service_subcategory_parent` lives on `service_listings` only. A
  `categories` UPDATE that moves a subcategory to another sector (`parent_id` change) is never
  re-checked against the services that carry it, so it can silently leave rows whose
  `subcategory_id` is not a child of their `category_id`. Deleting a sector IS caught (decision D2:
  the cascaded `category_id` SET NULL fires the trigger and the delete fails); moving a child is not.
- **Why it is bounded:** `categories` writes are admin-only by RLS and only ever happen through
  migrations — no UI moves a subcategory.
- **Not fixed here** — a categories-side guard is its own design choice (block vs. re-home vs.
  clear), not part of ruling G3.
- **Trigger:** the next taxonomy migration that changes any subcategory's `parent_id` — it must
  re-home or re-validate the affected services in the same migration, or add the categories-side
  guard then.

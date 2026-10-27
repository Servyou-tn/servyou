# Pre-launch security batch PR-3 E1 — orders lifecycle columns (`fix/prelaunch-order-lifecycle`, 2026-10-25)

## LOW — an admin who is a PARTY to an order can still rewrite its lifecycle columns

- ✅ **Closed by migration 76** (2026-10-27): the `is_admin()` override is gone from `check_order_status_transition`
  (9a), and a JWT INSERT discards the cancel columns unless at `cancelled`, where `cancelled_at` is `now()` (10).

- **Found by** the post-apply review of migration 66. `check_order_status_transition` opens with
  `IF is_admin() THEN RETURN NEW`, so an admin who is the buyer or seller of an order can leave a terminal
  state (`cancelled → pending → cancelled`, `received → arrived → received`). Each re-entry is a fresh
  transition to `enforce_order_lifecycle_columns`, so cancel metadata can be rewritten and `received_at`
  restamped forward (never backdated: it is always `now()`). On INSERT, admins skip migration 54's tier 2 and
  `authenticated` holds INSERT on every column, so an admin buying as themselves can insert at `cancelled`
  with any `cancelled_by` / reason and a chosen `cancelled_at`.
- **Bounded:** only an admin's OWN orders (orders has no admin UPDATE policy for anyone else's), and admins are
  trusted. **Fix if wanted:** in `enforce_order_lifecycle_columns`, refuse any JWT change once
  `old.status in ('received', 'cancelled')`, and on a JWT INSERT force the cancel columns NULL unless the
  status is `cancelled` — a new forward migration.

## ⚠ The `prelaunch-shop-read-rls` teardown has the cascade gap fixed here in `orders-lifecycle-columns`

- Deleting a fixture SELLER cascades `orders.seller_id` (ON DELETE CASCADE), and RI cascades run breadth-first,
  so a real customer's order on a live fixture product would be deleted silently — the "fails loudly" comment
  in PR #192's suite is wrong. This suite now refuses to tear down while a non-fixture order references a
  fixture seller. **PR #192 needs the same guard before its suite is run again** (pending the architect's call
  on a third commit there).
- ✅ **Resolved by `fix/rls-suite-teardown-guard` (2026-10-26)** — see the section below.

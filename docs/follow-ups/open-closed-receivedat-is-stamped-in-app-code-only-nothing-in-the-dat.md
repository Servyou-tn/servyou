# ✅ CLOSED (DB side) — 🔴 `received_at` is stamped in app code only — nothing in the database enforces it

- **Closed by** migration 66 (`20261025222218_order_lifecycle_columns`, pre-launch security batch PR-3 E1,
  2026-10-25): `trg_enforce_order_lifecycle_columns` stamps `now()` on the transition into `received` (and on
  an INSERT at `received`) and discards any client value. The two browser writes are removed by H8 PR-2
  (#191). **Still owed:** E2, ✅ done by migration 84 `20261028194721_orders_received_at_revoke` (2026-10-28) — `revoke update (received_at) on orders from authenticated`, once #191 has
  merged. No backfill (decision 14): `33b822ec` stays NULL.

- **What:** `orders.received_at` is written at exactly **two client call sites** —
  `src/components/ReceiptConfirmButton.tsx:33` and
  `src/app/mes-commandes/_components/OrdersList.tsx:253` — both `.update({ status: 'received',
  received_at: new Date().toISOString() })`. The latter's own comment says it outright:
  *"received_at is stamped here because the trigger does not set it."* **No trigger, constraint or
  default touches the column.** `nextSellerStatus` returns `null` at `received`
  (`lib/types/order-status.ts:54`), so the seller path provably cannot reach the state — but seeds,
  raw SQL, service-role writes and any future admin action all can, and all leave it NULL.
- **Evidence from live data (14 orders):** 4 are at `received`; **only 3 carry a `received_at`, and
  only 1 of those came from the buyer action.** The tell is timestamp precision —
  `new Date().toISOString()` yields milliseconds, Postgres arithmetic on `created_at` carries
  microseconds:
  | order | `received_at` | verdict |
  |---|---|---|
  | `191d4307` | `20:10:58.544` — ms precision, 2s before `updated_at` | real buyer click |
  | `bdb55a1a` | `.284896` — identical microseconds to its own `created_at` | seeded arithmetic |
  | `c798df04` | `.407` — same signature as its `created_at` | seeded arithmetic |
  | `33b822ec` (the only **product** order at `received`) | **NULL** | seeded straight to `received` |
- **Consequence, and it is user-visible:** G9's title row renders
  `order.receivedAt ? "Reçue le …" : "Créée le …"` (`commandes-recues/[id]/page.tsx:111-114`). On
  `33b822ec` — a delivered, terminal order — it renders **"Créée le 3 juin 2026"**. The Figma
  (`495:26112`) shows "Reçue le …". So this reads as a layout/copy delta and **is not one**: the
  page is correct and the data is absent. A terminal order with no terminal timestamp.
- **Why it is urgent rather than cosmetic:** both stamping sites are the buyer-side client
  `.update()` calls **already logged for migration to server actions**. If that migration moves the
  status write and not the stamp, every future received order loses its timestamp *silently*, and
  `admin/statistiques` already aggregates on `received_at` (`.gte('received_at', sevenDaysAgo)`) —
  so the number quietly under-reports.
- **Fix:** stamp it in the DB. `check_order_status_transition` is already a BEFORE UPDATE trigger on
  the right table; a `set_received_at_on_transition` sibling (mirroring the shipped
  `trg_set_cancelled_at_on_transition`, which solves precisely this problem for `cancelled_at`)
  makes it unconditional. Note the ordering constraint recorded in `db/migrations/…_order_events`:
  BEFORE triggers fire in alphabetical name order, so pick a name that sorts before the event
  emitter or the emitted event will carry a null stamp.
- **Trigger:** the migration PR that converts the three buyer-side client `.update()` calls to
  server actions — do both in one pass, since that is the moment the app-side stamp disappears.
  Backfill is **not** proposed: we do not know when `33b822ec` was received.

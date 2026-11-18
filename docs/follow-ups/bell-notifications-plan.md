# Bell notifications v1 (in-platform): discovery and plan (`docs/bell-notifications-plan`, 2026-11-16)

**New document.** The session of 2026-11-15 opened this branch but ended before the plan was written, so there was no
earlier version to update. It records the founder's scope (2026-11-15) and actor rule (2026-11-16). Discovery was
read-only on production (`execute_sql` SELECTs, 2026-11-16).

DB-1 is drafted, NOT applied: `db/migrations/PENDING_bell_notifications.sql` on `feat/bell-notifications-db`. Its
header carries the full discovery, the founder decisions and the post-apply checks.

## Founder decisions

1. **Scope of v1 (2026-11-15):** new orders and order status changes only. Proposals, disputes, reports and admin
   events are later phases, listed at the end and nothing more.
2. **The actor rule (2026-11-16):** every order status change notifies the **other** party, never the person who made
   the change.
   - The buyer cancels or confirms receipt → the seller is notified; the buyer gets nothing.
   - The seller accepts, ships or cancels → the buyer is notified; the seller gets nothing.
   - Enforced in the database: the trigger compares `auth.uid()` with the order's `buyer_id` / `seller_id`, not app
     code. A CHECK (`recipient_id <> actor_id`) makes a self-notification impossible even if the trigger is changed.
3. **Open question 1 (2026-11-16):** no signed-in party → no row (the default is kept).
4. **D1 (2026-11-16):** yes. Account deletion also deletes the person's notifications, in a separate small DB PR
   before launch (#398).
5. **D2 (2026-11-16):** no retention in v1. Later: a `pg_cron` job deleting read rows older than 90 days.
6. **D3 (2026-11-16):** no Realtime in v1. The badge count refreshes on page load.
7. **D4 (2026-11-16):** a notification is read when it is opened, plus « Tout marquer comme lu ».

**Architect review of DB-1 (2026-11-16):** discovery re-checked on production, all correct. One fix: the trigger's
INSERT sits in its own block, and any unexpected error becomes a WARNING and no row, so the bell never rolls back an
order (§4).

## 1. Who is told what (v1)

| Event | Made by | Notified | Stored as |
|---|---|---|---|
| New order (product or service) | buyer | seller (« nouvelle commande ») | `order_created`, → `pending` |
| `pending → accepted` | seller | buyer | `order_status_changed` |
| `accepted → prepared → dispatched → in_delivery → arrived` (product, each step) | seller | buyer | `order_status_changed` |
| `accepted → arrived` (service) | seller | buyer | `order_status_changed` |
| `arrived → received` | buyer | seller | `order_status_changed` |
| `→ cancelled` by the seller, refusals included (« Refusée à la livraison ») | seller | buyer | `order_status_changed` |
| `→ cancelled` by the buyer (product orders only) | buyer | seller | `order_status_changed` |

**Not events (no row):** carrier / tracking edits, an admin voiding a refusal (`admin_void_refusal`), the
account-deletion scrub of delivery fields. None of them changes the status.

Rows store keys, never text (`kind`, `from_status`, `to_status`). The UI renders the sentence in the **reader's**
language at read time, and the item title comes from the order (`item_title` snapshot), which the recipient can
already read as a party.

## 2. Open question 1: transitions with no signed-in actor — DECIDED: no row

The founder asked for these to be listed first; the answer (2026-11-16) is no row in every case below. What production
does today:

1. **Status changes with no signed-in party: none can happen today.**
   - `check_order_status_transition` (BEFORE UPDATE, enabled) raises unless `auth.uid()` is the order's buyer or
     seller.
   - That refuses a NULL caller: the service role, the SQL editor and a cron job.
   - It also refuses an **admin** who is not a party: there is no admin branch.
   - **No expiry job exists:** the only cron job is `purge-unconfirmed-signups`. **No admin status path exists.**
   - **When one is added** (an expiry of `pending` orders, an admin cancellation, a cancellation at account deletion),
     that PR must first change `check_order_status_transition`. **It must then answer: who is told, and is anyone?**
2. **New orders with no signed-in actor:** a service-role insert (seeds, live-test fixtures).
   - No app path does this: both order forms insert with the buyer's own session.
   - **Question: should the seller still get « nouvelle commande » for such an order?**
3. **An admin who is signed in but not a party:** unreachable for both inserts and status changes today (RLS and the
   transition trigger).

**Decided (founder, 2026-11-16):** no row is written when the actor is not the buyer or the seller. It only affects
case 2 today. The DB-1 live suite proves that a service-role status change is refused, so the day a future PR adds a
no-actor status change, a test fails and that PR has to come back to the founder.

## 3. Decisions (founder, 2026-11-16: all four recommendations accepted)

1. **Account deletion: yes.** `admin_process_deletion_request` deletes the person's favorites and e-mail preferences,
   and will also delete their bell rows.
   - In a separate small DB PR before launch (#398), because re-creating that long function deserves its own review.
2. **Retention: none in v1** (volumes are tiny: 16 orders).
   - Later: a `pg_cron` job (installed) deleting read rows older than 90 days.
3. **No Realtime in v1.** The Realtime publication is empty today, and DB-1 does not add the table.
   - The badge count refreshes on page load (server-rendered).
4. **Read on open** (UI-1): opening an item marks it read, plus « Tout marquer comme lu ».
   - Opening the dropdown alone marks nothing.

## 4. DB-1 (`feat/bell-notifications-db`): what the migration does

- **Table `public.notifications`:**
  - columns: `recipient_id`, `actor_id`, `order_id` (each with an FK, `on delete cascade`), `kind`, `from_status`,
    `to_status`, `created_at`, `read_at`;
  - constraints: CHECKs on `kind` and its shape, and `notifications_never_self`;
  - RLS on: the recipient reads their own rows (`to authenticated`, `(select auth.uid())`);
  - grants: authenticated SELECT only. The default anon SELECT (migration 107) is revoked. Clients get no INSERT,
    UPDATE or DELETE, so no allow-list entry;
  - indexes: `(recipient_id, created_at desc)` for the list; a partial `(recipient_id) where read_at is null` for the
    badge; the two remaining FKs.
- **Trigger function `notify_order_counterparty()`:**
  - SECURITY DEFINER, `search_path ''`, no client EXECUTE;
  - fires AFTER INSERT, and AFTER UPDATE when the status really changed;
  - the actor is `auth.uid()`; the recipient is the other party;
  - no row when there is no party actor (open question 1) or when the recipient would be the actor: it skips;
  - the INSERT sits in its own block: any unexpected error (FK, CHECK, anything) becomes a WARNING
    (`bell: no notification for order …`) and no row, so the bell never rolls back an order or a status change
    (architect, 2026-11-16);
  - `emit_order_event` / `order_events` are untouched.
- **RPC `mark_my_notifications_read(p_ids uuid[] default null)`:**
  - acts on the caller's own unread rows only (all of them when `p_ids` is null, otherwise the first 200 ids);
  - `read_at = now()`, set once;
  - returns the number marked;
  - EXECUTE for authenticated only.
- **No backfill:** the bell starts empty at the apply. `notification_preferences` (e-mail) is untouched and does not
  gate the bell.

## 5. Must-tests (DB-1 live suite, run after the apply)

3 sign-ins (buyer, seller, outsider), one suite, unique fixtures, verified cleanup. Because an insert error now becomes
a warning, a broken trigger shows up only as a missing row: every positive case asserts **exactly 1** row. For each row
of the matrix: the other party gets exactly 1 row with the right `kind` / `from_status` / `to_status`, and **the actor
gets 0**:
- the buyer's order → the seller;
- each seller step: 5 product steps and 2 service steps;
- a seller cancel, and a seller refusal;
- a buyer cancel of a product order, and a buyer's receipt confirmation.

Then:
- a tracking-number edit adds 0 rows;
- **a service-role status update is refused** (pins open question 1);
- a service-role insert adds 0 rows (open question 1, decided);
- the outsider and anon read nothing;
- direct client INSERT / UPDATE / DELETE fail;
- `mark_my_notifications_read` cannot touch another user's row, and is refused for anon;
- `client-write-grants-live` stays green.

## 6. PRs

1. **DB-1** (`feat/bell-notifications-db`, PR #393).
   - Commit 1: the PENDING migration. Commit 2: the Sonnet review fixes (comments only). Commit 3: the architect's
     fix (the INSERT block) and these decisions in the header.
   - Applied 2026-11-16 as `20261116201553_bell_notifications` (README #136). The post-apply record is commits 4 + 5
     (architect OK for both):
     - commit 4 (`07abd68`) holds the rename only: its `git add` aborted on the already-moved `PENDING_` path;
     - commit 5 (`6737108`) holds the rest: the header lines, README entry 136, `database.types.ts` regenerated,
       `data-model.md` (« No notifications table » replaced) and the live suite `bell-notifications-live` (21/21).
2. **UI-1** (page-builder, from the Figma bell / notification panel).
   - `TopbarNotifications.tsx` is today an honest empty state with no count. It gets:
     - the unread badge;
     - the list, with each item's link resolved by role and order type;
     - the read actions.
   - The Paramètres line « Les notifications en temps réel dans la plateforme (cloche + tiroir) arriveront dans une
     prochaine mise à jour. » is updated.
   - New strings in FR / AR / EN, submitted for the founder's approval.
3. **The deletion PR, #398** (`feat/bell-deletion-cleanup`; decision 1, accepted), before launch: account deletion
   also deletes the notifications the person received. Rows they caused for someone else (`actor_id`) stay.

## 7. Later phases (out of v1; listed only)

Proposals (`job_responses`) · disputes · reports · admin events (moderation, suspension, refusal void, COD block lift).

## 8. Logged, not fixed

- `data_exports` (the personal-data export) does not include bell rows. Check whether it should when the export is next
  touched.

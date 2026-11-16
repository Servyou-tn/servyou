# Bell notifications v1 (in-platform): discovery and plan (`docs/bell-notifications-plan`, 2026-11-16)

**New document.** The session of 2026-11-15 opened this branch but ended before the plan was written, so there was no
earlier version to update. It records the founder's scope (2026-11-15) and actor rule (2026-11-16). Discovery was
read-only on production (`execute_sql` SELECTs, 2026-11-16).

DB-1 is drafted, NOT applied: `db/migrations/PENDING_bell_notifications.sql` on `feat/bell-notifications-db`. Its
header carries the full discovery, the provisional default for open question 1 and the post-apply checks.

## Founder decisions

1. **Scope of v1 (2026-11-15):** new orders and order status changes only. Proposals, disputes, reports and admin
   events are later phases, listed at the end and nothing more.
2. **The actor rule (2026-11-16):** every order status change notifies the **other** party, never the person who made
   the change.
   - The buyer cancels or confirms receipt → the seller is notified; the buyer gets nothing.
   - The seller accepts, ships or cancels → the buyer is notified; the seller gets nothing.
   - Enforced in the database: the trigger compares `auth.uid()` with the order's `buyer_id` / `seller_id`, not app
     code. A CHECK (`recipient_id <> actor_id`) makes a self-notification impossible even if the trigger is changed.

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

## 2. OPEN QUESTION 1: transitions with no signed-in actor

The founder asked for these to be listed, not decided. What production does today:

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

**Provisional default in DB-1 — to confirm, not a ruling:** no row is written when the actor is not the buyer or the
seller. It only affects case 2 today. The DB-1 live suite proves that a service-role status change is refused, so the
day that changes, a test fails and the question becomes live.

## 3. Decisions for the founder (recommendations)

1. **Account deletion.** `admin_process_deletion_request` deletes the person's favorites and e-mail preferences but
   would keep their bell rows.
   - Recommended: a one-line delete in that function, in a separate small DB PR before launch.
   - Re-creating that long function deserves its own review, so it is not in DB-1.
2. **Retention.** None in v1 (volumes are tiny: 16 orders).
   - Recommended later: a `pg_cron` job (installed) deleting read rows older than 90 days.
3. **Live updates.** The Realtime publication is empty today, and DB-1 does not add the table.
   - Recommended v1: the badge is counted on each page load (server-rendered) and refreshed when the bell opens.
   - Realtime is a later phase.
4. **When a row counts as read** (UI-1).
   - Recommended: opening an item marks it read, plus « Tout marquer comme lu ».
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
  - no row when there is no party actor (open question 1) or when the recipient would be the actor. It skips rather
    than raises, so the bell can never fail an order write;
  - `emit_order_event` / `order_events` are untouched.
- **RPC `mark_my_notifications_read(p_ids uuid[] default null)`:**
  - acts on the caller's own unread rows only (all of them when `p_ids` is null, otherwise the first 200 ids);
  - `read_at = now()`, set once;
  - returns the number marked;
  - EXECUTE for authenticated only.
- **No backfill:** the bell starts empty at the apply. `notification_preferences` (e-mail) is untouched and does not
  gate the bell.

## 5. Must-tests (DB-1 live suite, run after the apply)

3 sign-ins (buyer, seller, outsider), one suite, unique fixtures, verified cleanup. For each row of the matrix: the
other party gets exactly 1 row with the right `kind` / `from_status` / `to_status`, and **the actor gets 0**:
- the buyer's order → the seller;
- each seller step: 5 product steps and 2 service steps;
- a seller cancel, and a seller refusal;
- a buyer cancel of a product order, and a buyer's receipt confirmation.

Then:
- a tracking-number edit adds 0 rows;
- **a service-role status update is refused** (pins open question 1);
- a service-role insert adds 0 rows (the provisional default);
- the outsider and anon read nothing;
- direct client INSERT / UPDATE / DELETE fail;
- `mark_my_notifications_read` cannot touch another user's row, and is refused for anon;
- `client-write-grants-live` stays green.

## 6. PRs

1. **DB-1** (`feat/bell-notifications-db`).
   - Commit 1: the PENDING migration (this review).
   - After the architect's apply:
     - the file renamed to the recorded version, plus its README entry;
     - `database.types.ts` regenerated;
     - `data-model.md`: its line « No notifications table » (L217) replaced;
     - the live suite.
2. **UI-1** (page-builder, from the Figma bell / notification panel).
   - `TopbarNotifications.tsx` is today an honest empty state with no count. It gets:
     - the unread badge;
     - the list, with each item's link resolved by role and order type;
     - the read actions.
   - The Paramètres line « Les notifications en temps réel dans la plateforme (cloche + tiroir) arriveront dans une
     prochaine mise à jour. » is updated.
   - New strings in FR / AR / EN, submitted for the founder's approval.
3. **DB-2**, only if decision 1 is accepted: the deletion line.

## 7. Later phases (out of v1; listed only)

Proposals (`job_responses`) · disputes · reports · admin events (moderation, suspension, refusal void, COD block lift).

## 8. Logged, not fixed

- `data_exports` (the personal-data export) does not include bell rows. Check whether it should when the export is next
  touched.

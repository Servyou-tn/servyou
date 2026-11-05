# Admin « Demandes » backend — discovery + plan (`feat/admin-requests-backend`, 2026-11-05)

Role: db-guardian. Migration: `db/migrations/PENDING_admin_requests_backend.sql` — **written, not applied** (the architect reviews and
applies). All reads below are live, read-only `execute_sql` on `xggomcitqrkaylqezjjz`.

## What is live today

| Table | Rows | Columns that matter | RLS / grants (anon, authenticated) | Writers | Readers |
|---|---|---|---|---|---|
| `deletion_requests` | **0** | `status` pending / approved / rejected · `reason` ≤ 500 · `processed_at`, `processed_by` · one pending per user (partial unique) · `user_id → auth.users ON DELETE CASCADE` | owner INSERT (`user_id`, `reason` column grants) + SELECT own; admins SELECT all and **UPDATE** `status`, `processed_at`, `processed_by` directly (policy `is_admin()`, column grants) — unlogged | `requestAccountDeletionAction` (Mon compte) | Mon compte (« Demande en cours ») |
| `data_exports` | **0** | `status` pending / completed / rejected · `export_url` · same processing columns · one pending per user | same shape; admins UPDATE `status`, `processed_*`, `export_url` directly | `requestDataExportAction` (Paramètres) | nobody |
| `contact_messages` | **1** | `name`, `email`, `subject` ≤ 100, `message` ≤ 2000, `user_id → auth.users ON DELETE SET NULL`, `status` new / handled | **no policy, no client grant** | `/contact` server action, service role | nobody |

`log_admin_action(action, target_type, target_id, before, after, note)` exists (SECURITY DEFINER, is_admin gate, writes
`admin_audit_log`; `admin_id → profiles ON DELETE RESTRICT`). `admin_suspend_user` is the pattern followed.

**What the product promises:**
- Mon compte: « Votre demande sera traitée par notre équipe sous 48 h. Votre compte reste actif d'ici là. » and « Vous avez {count} commande(s) en cours. Elles doivent être terminées ou annulées avant que votre compte puisse être supprimé. »
- Paramètres: « Nous préparerons un fichier contenant toutes vos données … et vous l'enverrons par email à {email}. … jusqu'à 48 heures. »
- Contact: « Nous vous répondrons sous 24 à 48 heures. »
- Privacy s6: personal data erased « dans un délai raisonnable, sauf obligations légales de conservation ».

## The two blockers (why « deletion » cannot be a hard delete)

1. **Orders would vanish.** `orders.buyer_id` / `seller_id` are `NOT NULL … ON DELETE CASCADE` to `profiles`, and `profiles` cascades from `auth.users`. Deleting the auth user erases every order the person was part of — the other party's completed history and the seller's figures included. That contradicts « keep completed orders anonymised ».
2. **Shops with orders cannot be deleted.** Deleting a shop cascades its products, which sets `orders.product_id` to NULL, which `order_target_matches_type` refuses (23514). The same holds for freelancer profile → service_listings → `service_listing_id`. The role-switch design gap logged in migration 55 is the same problem.

There is **no deletion path in the app today**: nothing calls `auth.admin.deleteUser`, and the request only records.

## Plan (the PENDING file)

1. **RPC-only processing.** Drop the two « Admins update … » policies and revoke the admins' column UPDATE grants, so every decision goes through a logged RPC. No app code writes those columns.
2. **Lists:** `admin_list_deletion_requests`, `admin_list_data_exports` and `admin_list_contact_messages` (`p_status`, `p_limit` ≤ 200, `p_offset`).
   - Pending first, oldest first (the 48 h promise), then the rest newest first.
   - The deletion list carries name, e-mail, seller type and the **open-order count**.
3. **`admin_process_deletion_request(id, 'approve' | 'reject', note)`**, in one transaction:
   - A reject needs a note.
   - An approve refuses when orders are still open (the Mon compte promise), when the target is an admin, or when it is the caller. Otherwise it **tombstones** the account:
     - deletes favourites, notification prefs, the person's job responses and job posts (a post with an open report is set to `deleted`, the app's soft delete, instead);
     - deletes listings no order **and no open report** points to, and hides the rest for good (`status hidden` + `admin_hidden_* = 'Compte supprimé'`; a draft service stays `draft`);
     - deletes the shop / freelancer profile if nothing is left under it and no open report points to it, otherwise hides it;
     - nulls delivery name / address / phone / note on the orders they **bought** (amounts, item title, statuses and dates stay);
     - replaces the profile with `full_name 'Compte supprimé'`, `email supprime-<id>@deleted.servyou.invalid`, phone / city / avatar null, `date_of_birth 1900-01-01`, and suspends it (any open session can write nothing).
   - It marks the request approved and logs **ids and counts only** (never the erased name / e-mail).
   - It returns `{ user_id, tombstone_email, counts }` for the auth side (D2).
4. **`admin_process_data_export(id, 'completed' | 'rejected', note)`** marks the request processed; a reject needs a note. `export_url` is not set: the file goes by e-mail, as promised.
5. **`admin_mark_contact_message_handled(id, note)`:** new → handled (refuses a second time).
6. **Grants:** EXECUTE for authenticated only (the gate inside is `is_admin()`); explicit revoke from PUBLIC / anon. Errors: 42501 not allowed, 23514 invalid state, P0002 not found. Messages are in French.

**Checked against the live triggers the deletion path fires:**
- The identity lock, admin-marker / moderation locks, capability, age-gate, phone and avatar triggers all bypass `is_admin()`.
- `enforce_service_publish_requirements` has no admin bypass, but it only fails on changed columns that are publish problems; hiding changes only status / moderation columns.
- `enforce_moderated_row_no_delete` blocks deleting a moderated row even for an admin, so those rows are hidden, never deleted.
- **A draft service stays `draft`** when hidden. `draft → hidden` would trip `service_listings_price_required_unless_draft`, and `enforce_service_publish_requirements` treats a move out of draft as a publish. Either would roll the whole approval back.
- Deleting the person's job responses runs `sync_job_post_response_count`, which updates **other people's** `job_posts`. `enforce_job_post_writes` and `enforce_job_post_cap` see only a `response_count` change (status and content unchanged), so they pass.
- `reports.target_id` has no foreign key, so deleting reported content would leave the admin queue pointing at nothing. **Content with an open report (`open` / `under_review`) is hidden, not deleted.** Live today: 1 report, resolved.
- `check_order_status_transition` lets the order scrub through (status unchanged), `emit_order_event` logs nothing for it, and `enforce_order_lifecycle_columns` is untouched (cancellation fields unchanged).
- Functions run as `postgres` (BYPASSRLS).

**Not verified:** the SQL has not been compiled (no throwaway database; nothing was run on prod). The architect's review / apply is the first compile.

## Decisions for the founder (numbered, the file implements the recommended option)

- **D1 Tombstone, not a hard delete** (the two blockers above). The profile row stays so orders keep their counterpart. Alternative: make `orders.buyer_id` / `seller_id` nullable + `ON DELETE SET NULL` — that's a bigger migration touching order RLS, triggers and app types. Not recommended before the beta.
- **D2 The auth side is app code, in the next PR** (the admin UI's server action, service role):
  - `auth.admin.updateUserById(id, { email: tombstone_email, ban_duration: '876000h', user_metadata: {} })`. `on_auth_user_email_changed` then syncs the same e-mail into the profile.
  - Sign the user out everywhere.
  - Remove their storage files (avatar, shop logo / banner, product and portfolio images), plus their `uploaded_objects` rows.
  - The RPC does not touch `auth.*`.
  - The person can register again later with the same e-mail.
  - **Partial failure:** the RPC commits first. If the auth step then fails, the real e-mail stays in `auth.users` while the request reads « approved ». The server action must be retryable on its own (idempotent on an already-tombstoned profile), and the admin UI must show « côté connexion non terminé ». The next PR designs how.
- **D3 Orders they bought** lose the delivery identity and the buyer note. Amounts, item title, dates and statuses stay, so seller history and stats are unchanged. Orders they sold keep everything (nothing personal of theirs is in the row). Side effect: the scrub bumps `updated_at` on those orders (trigger), which moves them in the seller's « most recent » sort.
- **D4 Direct admin UPDATE removed** (RPC-only, always logged). After the apply, three things change in this PR:
  - `prelaunch-acl-hardening.test.ts`: the « an admin processes a request through the processing columns only » case.
  - `suspension-enforcement.test.ts` lines 123–124: `data_exports` / `deletion_requests` UPDATE move from `guarded` to `noGrant`.
  - `db/client-write-allowlist.json`: the two UPDATE entries go.
- **D5 A refusal needs a note** (deletion and export); approve / complete / handle notes are optional. Nothing tells the user yet — there are no notifications in the MVP; the admin replies by e-mail.
- **D6 Kept on deletion:**
  - **Reports the person filed:** moderation evidence about others.
  - **Their contact messages:** the support record; these contain the e-mail they typed.
  - **Their deletion request's own `reason`.**
  - **Hidden shop / freelancer / listing rows:** their text stays in the database, readable by admins only.
  - **Other text they wrote on shared records:** dispute descriptions, `cancellation_reason` on orders, and the notes in `order_events`.

  Say if any of these should be erased too.
- **D7 `date_of_birth`** is NOT NULL, so it's set to `1900-01-01` rather than kept.
- **Low, logged:** a buyer could place an order on one of the person's still-active listings in the instant between the open-order check and the hide step (same transaction, but the listings are not locked `FOR UPDATE`). That order would stay open on a tombstoned seller. Locking the listings first closes it; say if you want that.

## Test plan (after the apply; one live suite, ≤ 12 sign-ins, unique prefix, verified cleanup)

`src/__tests__/admin-requests-live.test.ts`:
- **Access:** non-admin → 42501 on all six RPCs; anon has no EXECUTE.
- **Lists:** pending-first ordering and the open-order count.
- **Deletion, guards:** a reject without a note → 23514; approval refused with an open order (23514), on an admin (42501) and on oneself (42501).
- **Deletion, approve:** a buyer with one received order + a seller with one sold product, and a product with no order:
  - the product with no order is deleted and the sold one hidden;
  - a draft service stays `draft` (hidden), and a listing with an open report is hidden, not deleted;
  - the buyer's order is scrubbed while the seller's history is intact;
  - the profile is tombstoned and suspended;
  - one audit row with no PII; a second process → 23514.
- **Export and contact:** each RPC processes, logs, and refuses a repeat.
- **Grant lockdown:** an admin's direct UPDATE is now refused.

Then `client-write-grants-live.test.ts` and the regenerated types.

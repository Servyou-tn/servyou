# Admin « Demandes » backend — follow-ups (`feat/admin-requests-backend`, 2026-11-06)

Migration `20261106074610_admin_requests_backend` (README #120). Ranked, most important first.

## 0. 🔴 HIGH — the second shop owner's deletion fails on `shops_name_lower_key` (found in review, 2026-11-06)

✅ CLOSED — migration `20261106083409_admin_deletion_shop_name_unique` (architect, 2026-11-06), recorded on
`feat/admin-deletion-auth`; the live suite approves two shop owners in a row.

**What:** section c2 renames every shop that has to stay to the same literal, « Boutique supprimée ». `shops` has a
unique index on `lower(name)` (`shops_name_lower_key`, checked live). The first shop owner whose shop stays (because of a
sold or reported product) goes through. The second one gets a raw **23505**, and the whole approval rolls back, so that
request can never be approved. Live today: 0 deletion requests and 0 renamed shops, so nothing is stuck yet.

**Fix (needs a migration — the architect applies it):** `create or replace` `admin_process_deletion_request` with the
c2 shop update made unique per row, for example:
```sql
set name = 'Boutique supprimée · ' || left(id::text, 8), …
```
- Add a second shop-owner approval to `admin-requests-live.test.ts`.
- Update the name assertion in the seller case.

**Why deferred:** this PR records what is live; a migration needs the architect's review and apply.
**Where it lives:** the migration, section c2, the first `update public.shops`.
**Trigger:** before the admin UI ships the « Approuver » button.

## 1. The auth + storage side of an approved deletion (D2) — NEXT PR

**What:** after `admin_process_deletion_request(…, 'approve')` commits, a server action (service role) must do the
rest. Today a « deleted » person can still sign in with their real e-mail; the profile is suspended, so they can write
nothing.
- `auth.admin.updateUserById(id, { email: tombstone_email, ban_duration: '876000h', user_metadata: {} })`. The
  `on_auth_user_email_changed` trigger then syncs the same e-mail into the profile.
- Sign the user out everywhere.
- Delete their storage files (avatar, shop logo / banner, product and portfolio images) and their `uploaded_objects`
  rows.
- The action must be retryable on its own: idempotent on an already-tombstoned profile, recognised by
  `full_name = 'Compte supprimé'` and the tombstone e-mail. The admin UI must show « côté connexion non terminé » when
  the auth step failed after the RPC committed.

**Why deferred:** founder ruling D2. The RPC cannot touch `auth.*` or storage.
**Where it lives:** the admin « Demandes » server actions (Agent B's admin pages call them). The RPC's return value
`{ user_id, tombstone_email, counts }` is the input.
**Trigger:** before the first real deletion request is approved. Live today: 0 requests.

## 2. Text still kept after a deletion (D6 remainder)

**What:** section c2 scrubs the hidden shop / freelancer profile. These still keep text the person wrote:
- hidden products and services that orders point to: title, description, images;
- dispute descriptions;
- `orders.cancellation_reason`;
- `order_events` notes;
- their contact messages: name, e-mail, message;
- the reports they filed.

Past buyers can still open the hidden products / services through the order clause of the SELECT policies. The rest
is admin-only.
**Why deferred:** founder ruling D6 kept reports and contact messages on purpose (moderation and support records). The
listing text is what the order history shows, and scrubbing it needs a call on what a buyer sees on an old order.
**Where it lives:** `admin_process_deletion_request` section b / c2.
**Trigger:** a privacy review before launch, or a person asking for full erasure.

## 3. Nothing tells the user their request was processed (D5)

**What:** approve / reject / export complete change only the row and the audit log. There is no e-mail or in-app
notice; the admin replies by hand.
**Why deferred:** notifications are out of the MVP.
**Where it lives:** the three processing RPCs; Resend is waiting on the OVH domain.
**Trigger:** when transactional e-mail ships.

## 4. Notes for the next PR (server action + admin UI)

**What:**
- **Nullable fields:** the generated RPC return types say `string` for `email`, `full_name`, `processed_by_name`,
  `processed_at` and `processed_by`. The lists build them with LEFT JOINs, so they can be null. Treat them as nullable
  in the UI.
- **No `export_url`:** `admin_process_data_export` never sets it, and no client can write it any more. The export goes
  out by e-mail, as Paramètres promises. A stored link would need the service role.
- **Moderated listings are relabelled, not deleted:** a listing an admin had already hidden keeps its moderation row,
  even when no order or report points to it. Only the reason label changes, and only if it was empty. The file's
  comment « deleted when no order and no open report points to them » does not mention this. Moderation evidence;
  deliberate.
- **The admin's note is free text** and goes into `admin_audit_log.note`. The UI should say not to type the person's
  e-mail or name there.

**Where it lives:** the migration (sections 2–4); `database.types.ts`.
**Trigger:** the next PR.

## 5. `suspension-enforcement.test.ts` catalog case is red on main (pre-existing, not this PR)

**What:** « the exposed relations are exactly the 28 guarded tables plus the 4 with no client write » now also sees
`contact_messages` and `password_change_attempts`. Earlier PRs created those tables and never classified them.
224/225 pass otherwise (run 2026-11-06).
**Fix:** add both to `NO_CLIENT_WRITES` (no client write grant; check the exact refusal code / message) and update the
header count.
**Why deferred:** another PR's drift; one PR, one focus.
**Where it lives:** `src/__tests__/suspension-enforcement.test.ts`, `NO_CLIENT_WRITES`.
**Trigger:** the next PR that touches the suite, or a test-hygiene PR.

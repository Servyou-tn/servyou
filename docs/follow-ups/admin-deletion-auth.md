# Admin deletion — auth + files server action: follow-ups (`feat/admin-deletion-auth`, 2026-11-06)

`src/app/admin/demandes/actions.ts` + `src/lib/admin/account-erasure.ts` (D2 of `docs/discovery/admin-requests-backend.md`).
Ranked, most important first.

## 1. Open sessions can still READ for up to an hour after the ban

**What:** the ban makes GoTrue refuse sign-in and token refresh. An access token issued before the ban stays valid at
PostgREST / Storage until it expires: ≤ 3600 s on this project (measured 2026-10-24, `src/lib/auth/auth-ban.ts`).
- Every write is already refused: the profile is suspended.
- What that token can read is the tombstone: personal fields are gone.

The admin API has no "sign out user X" (`auth.admin.signOut` needs the user's own JWT).
**Fix if wanted:** a SECURITY DEFINER RPC (migration, architect) that deletes the user's `auth.sessions` /
`auth.refresh_tokens` rows, called from `finishAccountErasure`. This closes refresh, but not the live access token —
only a shorter JWT expiry does that.
**Why deferred:** read-only, ≤ 1 h, and the data it can read is already erased. Needs a migration.
**Where it lives:** `src/lib/admin/account-erasure.ts` (`eraseAuth`).
**Trigger:** a security review, or if the JWT expiry is ever raised.

## 2. The page must show « côté connexion non terminé » from the audit log (Agent B)

**What:** an approved request whose user has no `admin_audit_log` row with `action = 'complete_account_erasure'` and
`target_id = user_id` did not finish its auth + files step. The page should offer « Terminer la suppression ». That
button calls `approveDeletionRequest` again: on an approved request it only finishes the erasure. The constant is
`ERASURE_AUDIT_ACTION` in `src/lib/admin/requests.ts`.
**Why deferred:** UI is Agent B's.
**Where it lives:** the « Demandes » page loader.
**Trigger:** the page PR.

## 3. Error keys to add to fr.ts / ar.ts (Agent B)

**What:** `REQUEST_ERROR` in `src/lib/admin/requests.ts`, all under `admin.requests.*`:
- `error_forbidden`, `error_not_found`;
- `error_already_processed`, `error_already_handled`;
- `error_note_required`, `error_note_too_long`;
- `error_open_orders`, `error_self_account`, `error_admin_account`;
- `error_erasure_incomplete`.

Plus the existing `common.error_generic`.
**Trigger:** the page PR.

## 4. The person can register again with the same e-mail

**What:** the auth e-mail is replaced, so the address is free. A new sign-up creates a NEW account, unrelated to the
tombstone. That is the intended behaviour of D2, but nothing tells the person.
**Trigger:** when the deletion confirmation e-mail ships (Resend / OVH).

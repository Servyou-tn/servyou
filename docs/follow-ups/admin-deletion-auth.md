# Admin deletion — auth + files server action: follow-ups (`feat/admin-deletion-auth`, 2026-11-06)

`src/app/admin/demandes/actions.ts` + `src/lib/admin/account-erasure.ts` (D2 of `docs/discovery/admin-requests-backend.md`).
Ranked, most important first.

## 0. 🔴 HIGH — a Google account keeps its real e-mail / name in `auth.identities` (review, 2026-11-06)

✅ CLOSED — migration `20261106090849_erase_oauth_identities` (architect, 2026-11-06), called from `eraseAuth` on
`feat/erase-oauth-identities`. The Google path is mock-tested; no OAuth identity was created on production.

**What:** sign-in and sign-up offer Google (`SigninForm.tsx`, `SignupForm.tsx`). A Google identity's `identity_data`
holds the e-mail, name and picture.
- `updateUserById({ email })` rewrites only the **e-mail** identity (proven live).
- No admin API removes or rewrites another identity.

Today such an erasure ends `identity_left`: files and rows are erased, but there is no completion row, so the page
shows « non terminé ». Retrying cannot finish it. Live today: 0 Google identities (5 e-mail).
**Fix (migration, architect):** a SECURITY DEFINER function `private.erase_auth_identities(p_user uuid)` that:
- deletes the user's non-e-mail rows in `auth.identities`;
- only when the profile is a tombstone (the same three-field guard);
- has EXECUTE for `service_role` only, revoked from PUBLIC / anon / authenticated.

`eraseAuth` then calls it before the e-mail update. Optionally it also deletes the user's `auth.sessions` /
`auth.refresh_tokens`, which closes #1 too.
**Why deferred:** needs a migration; nobody can hit it until a Google user asks for deletion.
**Where it lives:** `src/lib/admin/account-erasure.ts`, `eraseAuth`.
**Trigger:** before the first Google sign-up's deletion request, or before launch, whichever is first.

## 1. Open sessions can still READ for up to an hour after the ban

Founder ruling 2026-11-06: accepted for the beta; stays logged.

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

## 4. A big shop could outrun the function timeout (Agent B)

**What:** the erasure lists and removes Storage folders one call at a time. A shop with hundreds of images could pass
Vercel Hobby's default function duration. Nothing is lost: each step re-derives its work, and the retry resumes. But
the page would show « non terminé » until the admin clicks again.
**Fix:** `export const maxDuration = 60` on the « Demandes » page (Agent B's file).
**Trigger:** the page PR.

## 5. The person can register again with the same e-mail

**What:** the auth e-mail is replaced, so the address is free. A new sign-up creates a NEW account, unrelated to the
tombstone. That is the intended behaviour of D2, but nothing tells the person.
**Trigger:** when the deletion confirmation e-mail ships (Resend / OVH).

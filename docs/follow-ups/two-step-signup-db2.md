# Two-step sign-up, DB-2: follow-ups (`feat/two-step-signup-db2`, 2026-11-19)

DB-2 of DB-1 → UI-1 → DB-2: `db/migrations/20261119230204_two_step_signup_db2.sql` (applied 2026-11-19), the write gate, the end of the transitional
rule and the 7-day purge. These are the items it leaves, ranked. `docs/follow-ups/two-step-signup-db.md` §3 is closed by
this PR's commit 3, after the apply.

## 1. MEDIUM (UI): the app does not map the two new refusals yet

- **What:** the gate raises 42501 with the hint `account_incomplete` or `session_ended`.
  - The app maps only the suspended refusal (« Ce compte est suspendu. », no hint, in `src/lib/marche/proposal-errors.ts`
    and the cancel / report error helpers).
  - The new refusals therefore show as the generic error.
- **Why deferred:** an incomplete account rarely reaches a write. The middleware sends every page to
  `/finaliser-mon-compte`, and step 2 writes nothing before the RPC. An ended session also cannot refresh, so the next
  page load signs the person out. This PR is DB-only.
- **Where it lives:** the server actions' error mappers; `src/lib/auth/complete-account.ts` for the hint vocabulary.
- **Trigger:** the next UI PR that touches the auth flow. Mapping: `account_incomplete` → `/finaliser-mon-compte`;
  `session_ended` → `/connexion`.

## 2. LOW (UI): the language toggle on « Finalisez votre compte »

- **What:** `LanguageToggle` and `useLangSwitch` write `profiles.language` for any signed-in user.
  - For an incomplete user, the gate refuses that write. The interface still switches through the cookie, and the
    error is only logged (`console.error`).
  - The profile keeps the language sent at step 1. Decision 6 says the language follows the interface.
- **Why deferred:** UI code. Nothing breaks for the user.
- **Where it lives:** `src/components/layout/LanguageToggle.tsx`, `src/components/landing/useLangSwitch.ts`.
- **Trigger:** UI-2 or the next touch of the toggle. Either skip the write while the account is incomplete, or have
  step 2 send the interface language to `complete_my_account` (that needs a new argument).

## 3. LOW: a signed-out session's token can still READ for up to an hour

- **What:** the gate checks the session on writes only. RLS policies do not check `session_id`, so an access token whose
  session was signed out still reads what its account may read until it expires (1 hour by default).
- **Why deferred:** the plan scoped the session check to writes (DB-1 review M4). Adding it to every read policy costs
  one lookup per row-security check across the schema.
- **Where it lives:** every `to authenticated` SELECT policy.
- **Trigger:** if the JWT lifetime is raised, or a security review asks for it. Shortening « JWT expiry » in Auth
  settings narrows the window without schema work.

## 4. MEDIUM: storage writes and the bell are outside the 28-table gate

- **What:** two write paths do not go through the gate.
  - **Storage:** the upload / update / delete policies on `storage.objects` check « not suspended »
    (`is_active_user()`), not completion or a live session. So an incomplete account, or a token whose session has
    ended, can still upload or delete its own objects, within the daily upload caps. That is the population this
    migration targets (DB-2 review M2).
  - **The bell:** `notifications` is not one of the 28 tables. `mark_my_notifications_read` can still mark the caller's
    own rows as read.
- **Why deferred:** the plan's gate is the 28 tables, and changing storage policies is its own review. An incomplete
  account has no listing or profile row that could reference an upload. Marking one's own notification as read is
  harmless.
- **Where it lives:** the storage policies « Suspended accounts cannot upload / update / delete objects »; the
  `notifications` table.
- **Trigger:** before launch, in a small DB PR. Add `and (select private.write_refusal()) is null` to the three storage
  write policies. `authenticated` already has USAGE on `private` and EXECUTE on the function, so no new grant is needed.

## 5. INFO: « Confirm email » ON is now load-bearing for H1

- **What:** with « Confirm email » OFF, GoTrue would confirm a public `/signup` in its creation transaction. The
  creation marker would then match, and a squatter's full-metadata sign-up would be complete again.
- **Why deferred:** it is a setting, not code. The PENDING file's DEPENDENCIES section names it.
- **Where it lives:** Supabase dashboard › Authentication › Providers › Email; `docs/operations/supabase-auth-config.md`.
- **Trigger:** the next refresh of the auth-config runbook. Mark the setting « never turn off: H1 ».

## 6. HIGH (Google sign-in PR): a new Google user could never finish « Finalisez votre compte »

- **What:** `complete_my_account` refuses unless two things hold.
  - The session's JWT `amr` holds `otp` (`email_link_required`).
  - A password was set during that session (`password_required`).
  - A Google (OAuth) sign-in has amr `oauth` and no password, and its profile starts incomplete: no birth date, no city
    (`handle_new_user`).
  - So with Google switched on as it is today, a new Google user would be stuck on step 2 forever. The write gate
    would refuse their every write, and the 7-day purge would delete the account.
- **Why deferred:** Google sign-in is built but disabled (`ENABLE_GOOGLE_OAUTH = false`), and it has its own PR (plan §4
  « Google, later »; DB-1 decision 6).
- **Where it lives:**
  - `public.complete_my_account` (migration `20261119230204_two_step_signup_db2`, from DB-1's);
  - `src/app/finaliser-mon-compte/actions.ts`, which always calls `updateUser({ password })` first.
- **Trigger:** the Google PR, BEFORE Google is switched on.
  - The RPC must accept amr `oauth` for an account whose identity is Google, with the password optional for it
    (plan §4, rule 3).
  - It needs its own must-tests:
    - a Google session completes without a password;
    - a Google session cannot complete an account that has no Google identity;
    - a password session is still refused;
    - the other-sessions rule still holds.
  - Step 2's page must skip the password for such a session.

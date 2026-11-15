# Two-step sign-up: discovery and plan (`docs/two-step-signup-plan`, 2026-11-15)

Phase 1 only: discovery and a proposed design. **No migration file and no code exist yet.** The founder said yes on
2026-11-15 (pre-launch audit H1, part 2); this plan settles how it works and lists what the founder decides (« Questions
for the founder », at the end). Discovery was read-only on production (`execute_sql` SELECTs, 2026-11-15) plus the
Supabase docs. The Supabase MCP cannot read Auth settings, so every dashboard setting below is marked **confirm in the
dashboard**.

**The target, as decided:**
- sign-up asks only for the name and the e-mail;
- the e-mail link opens a « complete your account » step: password, birth date, city, terms;
- the account cannot be used until that step is done;
- Google sign-in will reuse the same step later.

**Why (H1):** today anyone can create an account for someone else's e-mail with a password they choose. If the owner
later confirms that e-mail, the creator's password opens the account. Fix 1 (#361) limits the window to 24 hours by
purging unconfirmed sign-ups; this is fix 2: a password is accepted only from someone who proved they read that inbox.

## 1. Today (live, 2026-11-15)

**The sign-up path** (`src/app/inscription/components/SignupForm.tsx`):
- One form: name, e-mail, password, birth date, city, language. It calls `supabase.auth.signUp` with a Turnstile token,
  `emailRedirectTo` = `/verifier-email`, and the metadata `full_name`, `date_of_birth`, `city`, `language`.
- The link is a **PKCE link** (`/verifier-email?code=…`), exchanged in the browser by `VerifyEmailFlow`. Opened on
  another device it never yields a session; the code says so (« cross-device PKCE » → « lien invalide »). That is
  survivable today because the user still has their password. It would strand a user who has none yet.
- The chosen role and the funnel's `?next=` are kept in `sessionStorage`, so they are lost on another device too.
- Google sign-in is built but disabled (`ENABLE_GOOGLE_OAUTH = false`) because the profile trigger needs a birth date.
  Its `redirectTo` is `/auth/callback`, a route that does not exist.

**Profile creation:**
- `on_auth_user_created` (AFTER INSERT on `auth.users`) runs `handle_new_user()`: SECURITY DEFINER, `search_path`
  `public`.
- It inserts `profiles (id, full_name, email, date_of_birth, city, language)`:
  - `full_name` comes from the metadata, or `''`;
  - `date_of_birth` is the metadata value cast to `date`;
  - `language` is the metadata value, or `'fr'`.
- `profiles.date_of_birth` is **NOT NULL**. A sign-up without a birth date fails that insert and rolls back the whole
  Auth sign-up: no account at all. `city` is nullable. There is no CHECK on the birth date.

**Birth date and age:**
- 16+ to buy and 18+ to sell are checked in the browser only (`src/lib/signup-validation.ts`, which says « not
  DB-enforced »).
- The database checks 18+ when `seller_type` is set (`enforce_seller_type_age_gate`; a null birth date is refused).
- Clients cannot write the birth date. The `profiles` UPDATE grant is `avatar_url, city, full_name, language, phone,
  seller_type`, so it is set once, at sign-up, from the metadata.

**Turnstile:**
- The sign-up form and the resend button send a Turnstile token to Supabase Auth's own CAPTCHA check (ON since
  2026-10-30).
- That check guards `/signup`, `/otp`, `/recover`, `/resend` and the password grant. It does not guard `/verify`.
- There is no app-side Turnstile check in the sign-up path: Supabase does it.

**The 24-hour purge** (`purge_unconfirmed_signups`, pg_cron daily at 03:17 UTC):
- Deletes users whose e-mail is still unconfirmed 24 hours after `created_at` (never `confirmation_sent_at`, which a
  resend refreshes).
- Keeps anonymous, phone-confirmed, **invited** and SSO users, admins, and anyone who owns content or appears in a
  blocking foreign key. An invited account is therefore never purged.

**The account gate today is « not suspended »:**
- `is_active_user()` and `private.is_account_active()` mean « no suspended profile ». Both answer true when there is no
  profile row.
- `trg_enforce_active_user` (statement level) refuses a suspended caller's writes on **28 tables**, `profiles`
  included.
- The middleware reads `profiles.suspended_at` once per matched route. Its matcher skips the auth pages (`/connexion`,
  `/inscription`, `/verifier-email`, `/auth/*`, …).

**Accounts today (counts only):**

| Group | Accounts | E-mail confirmed | Password | Note |
|---|---|---|---|---|
| Seeded demo freelancers | 7 | no | no | never signed in; public profiles; kept by the purge (they own content) |
| Real accounts | 6 | yes | yes | 2 consumers, 1 shop owner, 2 freelancers, 1 admin |
| Freelancer without a password | 1 | yes | no | has signed in |

Every one of the 14 profiles has a birth date, a city and a name; none is under 16 or 18. Only 5 accounts have an
identity row (all `email`).

**Live-test fixtures:**
- 64 test files create users with the admin API.
- Every one passes `email_confirm: true` and the full metadata.
- They sign in through `fixtureSignIn()` (an admin recovery link, then `verifyOtp`), not the password grant.

**Supabase Auth settings the code depends on** (confirm in the dashboard):

| Setting | Needed state | Why |
|---|---|---|
| Confirm email | **ON (hard dependency)** | Public sign-ups stay unconfirmed until the link. Section 4 relies on it. |
| Allow new users to sign up | ON | Option A creates accounts through `/otp` |
| CAPTCHA (Turnstile) | ON | Guards `/otp` and `/signup` |
| Site URL / Redirect URLs | prod origin; add `<origin>/auth/confirm` (prod, localhost, servyou.tn on domain day) | The new link target |
| E-mail templates « Confirm signup » + « Magic Link » | rewritten to a `token_hash` link (section 3) | Links that work on any device |
| Secure password change, Require current password | founder to confirm their state (#358 asked to turn both ON) | The first password is set from the link session (section 6) |
| Minimum password rules | match the app (8+, a letter and a digit) | Audit pass 3 A3 |
| **Custom SMTP** | **needed before launch, for any e-mail sign-up** | The built-in sender delivers only to the project team's own addresses, with a small hourly cap |

## 2. The attack this closes, step by step

1. A squatter calls GoTrue's `/signup` directly with the victim's e-mail and a password the squatter chose. The public
   endpoint stays open whatever our UI shows. A Turnstile token is easy to get by solving the widget once.
2. The account exists, unconfirmed. The victim gets a confirmation e-mail.
3. If the victim clicks it within 24 hours, the account is confirmed **with the squatter's password**. The squatter
   signs in.

So the fix cannot live only in the form: the database must refuse to treat such an account as usable until its real
owner has set the password. Section 4 does that; section 7 says when it takes effect.

## 3. Step 1: three ways to send the link

**Option A (recommended): passwordless e-mail link (`signInWithOtp`).**
- The browser calls `signInWithOtp({ email, options: { shouldCreateUser: true, data: { full_name, language,
  signup_role }, emailRedirectTo: <origin>/auth/confirm?next=…, captchaToken } })`. The account is created with no
  password.
- The link is a `token_hash` link verified on the server at `/auth/confirm` (Supabase's documented SSR pattern). It
  works on any device. The role and `next` travel in the metadata and the link, not in `sessionStorage`.
- **For:**
  - native Supabase: CAPTCHA on `/otp`, Supabase's own e-mail rate limits, no service role in the sign-up path;
  - an account made through our form has no password until its owner sets one in step 2 (a direct `/signup` call
    still can set one; section 4's gate handles that);
  - the session after the link is the same shape a Google session will be (signed in, profile incomplete), so Google
    reuses step 2 unchanged;
  - Supabase's own abuse guidance recommends passwordless e-mail.
- **Against:**
  - `signInWithOtp` is also a sign-in method. Someone who already has an account and types their e-mail on the sign-up
    page receives a sign-in link instead of an error. That is no weaker than today's reset link: the inbox already
    resets the password. It is still a second way in (question 2).
  - The two e-mail templates must change (founder pastes them; strings in section 8).

**Option B: keep `signUp` with a random throwaway password, then replace it in step 2.**
- **For:** the « Confirm signup » mail and `resend()` stay as they are.
- **Against:**
  - Every account starts with a password nobody knows. With « Require current password » ON, replacing it needs that
    unknown password, unless the link session is exempt (unproven).
  - The cross-device link problem stays unless the template changes anyway.
  - It looks exactly like the squatter's request, so the database cannot tell them apart.

**Option C: a server action creates the account with the admin API (`inviteUserByEmail`) after an app-side Turnstile
check.**
- **For:**
  - It is the only option that can turn « Allow new users to sign up » OFF. That closes GoTrue's public `/signup` at
    the source, so the squatter in section 2 has no endpoint at all.
  - The « Invite » template is made for « set your password ».
- **Against:**
  - With sign-ups OFF, a first Google sign-in cannot create an account either. Google would need its own server path.
  - The admin API skips Supabase's CAPTCHA and e-mail rate limits, so the app must build its own per-IP and per-address
    limits.
  - Invited accounts escape the 24-hour purge (`invited_at` is excluded), so the purge changes too.
  - An existing e-mail returns an admin error that must be masked, or it reveals which addresses have accounts.
  - The service role enters the public sign-up path.

**Recommendation: A.** Section 4's database gate closes H1 for every option, so C's extra protection is not needed.

## 4. Step 2 and the gate (in the database)

**Profile state:**
- Add three columns to `profiles`: `completed_at` (null = incomplete), `terms_accepted_at` and `terms_version`.
- `date_of_birth` becomes nullable. A CHECK requires a birth date, a city, a name and the terms once `completed_at` is
  set.
- Backfill all 14 existing profiles as complete (`completed_at = created_at`); terms per question 3.

**`handle_new_user`, rewritten** (and moved to `search_path ''`):
- Every profile is created, even with no birth date.
- It is complete at creation **only if the user row is already e-mail-confirmed at insert and the metadata is full**.
  A public e-mail sign-up is never confirmed at insert while « Confirm email » is ON; a service-role insert with
  `email_confirm: true` is. That covers the 64 fixture files and seeds. Google users are confirmed at insert but carry
  no birth date, so they stay incomplete.
- Alternative if the founder prefers not to depend on that setting: a flag in `raw_app_meta_data`, which only the
  service role can write. It means touching the fixture helper.

**`complete_my_account(full_name, date_of_birth, city, terms_version)`** (SECURITY DEFINER, EXECUTE for
authenticated). It refuses unless:
1. the caller's profile is incomplete;
2. **the caller's session proved control of the e-mail.** That means a confirmation link, a sign-in link, an e-mail
   code or a reset link, read from the JWT's `amr` claim, and later a Google sign-in. A password session never
   qualifies. The exact `amr` strings for each path are **unverified**; DB-1 records them first (section 6);
3. a password was set **during this session**, or the account has a non-email identity (Google, later). An AFTER
   UPDATE OF `encrypted_password` trigger on `auth.users` stores the time. It only reads GoTrue's columns, like
   today's e-mail sync trigger. So a password the squatter set before confirmation can never be the one an account
   completes with;
4. the person is 16 or older, with a plausible date (question 4); the city and name are not blank.

It then:
- sets the fields, `completed_at` and the terms;
- **deletes the user's other `auth.sessions` rows**, keeping the current one. Any session the squatter held stops
  refreshing.

**The write gate:**
- `trg_enforce_active_user` (28 tables) also refuses an incomplete account's writes, with a distinct message and hint
  so the app can send the user to step 2. The RPC's own write to `profiles` gets through.
- Reads are unchanged: an incomplete account sees what a visitor sees.
- **Default:** `deletion_requests` and `data_exports` are blocked too, and the incomplete-account purge removes such
  accounts instead (question 5).
- **Residual window:** an access token the squatter already holds stays valid until it expires (one hour by default).
  DB-2 can close that too: the gate checks that the JWT's `session_id` still exists in `auth.sessions`, one indexed
  lookup per write.

**The app side (UI-1):**
- The middleware's existing profile read also selects `completed_at`, at no extra query. A signed-in incomplete account
  is sent to the step-2 page on every route except that page, the auth pages and sign-out.
- The page asks for the password, birth date, city, terms and the name, prefilled and editable. A squatter's name
  typed in step 1 must not stick.
- One server action runs `updateUser({ password })`, then the RPC.
- **A stuck user:** someone who set a password, then left before the RPC ran, comes back with a password session.
  The RPC refuses it (rule 2), and the page offers « Recevoir un nouveau lien ».

**The same attack after the change:**
1. The squatter creates the account with a password and the victim confirms.
2. The squatter signs in with that password. The account is incomplete, so every write is refused.
3. The squatter cannot complete it: their session is a password session.
4. The victim completes it from the link: a new password, the squatter's sessions deleted, and the old password gone.

**Google, later:** the provider and a `/auth/callback` route. A first sign-in creates an incomplete, confirmed account
with a Google identity. Step 2 then asks for the birth date, city and terms; the password is optional (rule 3).

## 5. What changes for existing accounts

- **All 14 are backfilled as complete:** nobody sees step 2, and password sign-in is unchanged.
- **The 7 demo freelancers** stay as they are: public profiles, no login.
- **The confirmed freelancer without a password** is unchanged too: they sign in through the reset link, as today.
- **Links already in people's inboxes when UI-1 ships** still point at `/verifier-email?code=…`. That page keeps
  working until those links expire (« Email OTP Expiration », 1 hour by default, 24 hours at most; confirm in the
  dashboard). Its removal is logged.
- **Type changes:** `profiles.date_of_birth` becomes `string | null`.
  - `src/lib/marche/mon-compte.ts`, the admin user pages and the seller age-gate cards must handle a null (UI-1).
  - An incomplete account never reaches them, but admins can see incomplete accounts.

## 6. Unverified: DB-1 proves these first

Each is a small live check with fixture accounts, run before the RPC is written:
1. **The `amr` strings** for each path: confirmation link (new account), sign-in link (existing account), e-mail code,
   reset link, password. The RPC lists exactly what is observed.
2. **The squatted case:** an existing unconfirmed account that already has a password. The owner confirms through the
   link, then sets a new password with « Secure password change » and « Require current password » ON.
   - If that session is not exempt from « current password », the owner is locked out. That would reverse the
     recommendation: Option C, or a server-side reset path.
3. **Which template a new account gets** from `signInWithOtp` (« Confirm signup » or « Magic Link »), and that
   `verifyOtp({ type: 'email', token_hash })` accepts both.
4. **A first password set more than 24 hours** after the link session began, under « Secure password change ». The
   page may need to ask for a new link instead.
5. **The RPC can delete the user's other `auth.sessions` rows** as its definer. The purge already deletes `auth.users`
   rows that way; sessions are not yet proven.

## 7. Split, must-tests and order

**DB-1 (db-guardian):**
- The spike (section 6) and the migration: the columns, backfill, CHECK, nullable birth date, `handle_new_user`, the
  RPC and the password-time trigger. Regenerate the types.
- **Transitional:** a sign-up that still carries the full metadata (today's form) stays complete at creation, so
  nothing changes for users yet.
- Must-tests (live):
  - the RPC's refusals: password session, unchanged password, under 16, already complete, blank fields;
  - completion revokes the other sessions;
  - backfill counts;
  - fixtures still complete.

**UI-1 (Agent A, the page builder):**
- Step 1 (name, e-mail, Turnstile), the « check your e-mail » state with resend, and `/auth/confirm`.
- The step-2 page and its server action, the « new link » path, and the middleware redirect.
- Null-safe birth-date display, and the strings in FR, AR and EN.
- Must-tests: the server action (updateUser, then the RPC; mapped errors); `/auth/confirm` (the `next` validation, a
  bad hash).
- **Founder, at deploy time:**
  - paste the two templates;
  - add `/auth/confirm` to Redirect URLs.

**DB-2 (db-guardian), applied the same day UI-1 is live:**
- The write gate for incomplete accounts, and the end of the transitional rule (only confirmed-at-insert accounts are
  complete).
- The purge of confirmed-but-incomplete accounts after N days (question 5), and optionally the `session_id` check.
- Must-tests (live): an incomplete account's writes refused on a sample of the 28 tables; the RPC still passes; the
  purge's rolled-back dry run.

**H1 closes when DB-2 is applied, not before.** Until then today's form, and a direct `/signup` call, still create
complete accounts. That gap is today's, unchanged.

Order: DB-1 → UI-1 → DB-2. That is 3 PRs, plus a later Google PR.

## 8. Strings (FR / AR / EN), proposed

The AR lines are a first draft and need review, as every AR line in this project does. Lock the step-2 title in
design system §6 once chosen.

| Use | FR | AR | EN |
|---|---|---|---|
| Step 1 button | Recevoir le lien | أرسل لي الرابط | Send me the link |
| Check e-mail | Ouvrez le lien envoyé à {email} pour finaliser votre compte. | افتح الرابط المرسل إلى {email} لإكمال حسابك. | Open the link sent to {email} to finish your account. |
| Step 2 title | Finalisez votre compte | أكمل حسابك | Finish your account |
| Terms | J'accepte les {terms} et la {privacy}. | أوافق على {terms} و{privacy}. | I accept the {terms} and the {privacy}. |
| Step 2 button | Terminer | إنهاء | Finish |
| Stuck user | Pour finaliser votre compte, ouvrez le lien reçu par e-mail. | لإكمال حسابك، افتح الرابط الذي وصلك عبر البريد الإلكتروني. | To finish your account, open the link we e-mailed you. |
| New link | Recevoir un nouveau lien | أرسل لي رابطًا جديدًا | Send me a new link |

**E-mail templates (the founder pastes them).** Both send `{{ .RedirectTo }}` with `token_hash={{ .TokenHash }}` and
`type=email` added:
- « Confirm signup »: « Finalisez votre inscription à Servyou ».
- « Magic Link »: « Votre lien de connexion Servyou ».

## 9. Logged, not fixed (one PR, one focus)

- `docs/operations/supabase-auth-config.md` is stale. It still shows the localhost Site URL (fixed 2026-10-29) and no
  `/verifier-email`. Refresh it in UI-1 with the new values.
- `/auth/callback` does not exist, but `SignupForm`'s Google branch points at it. It belongs to the Google PR.
- `enforce_seller_type_age_gate` still uses `search_path` `public` (LOW). `handle_new_user` gets `''` in DB-1.
- `/verifier-email`'s `?code=` path is removed once the last links sent before UI-1 have expired (one day at most).

## Questions for the founder

1. **Step 1:** Option A, a passwordless e-mail link (recommended), B (a throwaway password) or C (the server invites;
   sign-ups OFF at Supabase)?
2. With A, an existing account that types its e-mail on the sign-up page receives a **sign-in link**. Accept, with the
   « Magic Link » mail saying « vous avez déjà un compte » (recommended)?
3. **Terms:**
   - Step 2 has an explicit checkbox, and the version and time are stored (recommended).
   - For the 6 real accounts, record acceptance at their sign-up date under a version « avant 2026-11 » (recommended),
     or ask them to accept at their next sign-in?
4. Enforce **16+ in the database** at completion (recommended; 18+ stays at the seller switch)?
5. **Incomplete accounts** (confirmed, step 2 not done):
   - purge them after N days (recommended: 7, with the same exclusions as today's purge), or keep them;
   - meanwhile, block their deletion and export requests too (recommended: the purge removes the account)?
6. **Step 2 content:** password, birth date, city, terms and the name prefilled and editable (recommended). The
   language follows the interface and stays editable in « Mon compte ».
7. **The step-2 page:** route `/finaliser-mon-compte` and title « Finalisez votre compte » (recommended), or another
   name?
8. The **e-mail templates and Redirect URLs** change when UI-1 deploys (founder action). Agree?
9. **Settings:** please confirm « Confirm email » ON, CAPTCHA ON, « Secure password change » and « Require current
   password » (on or off?), and the minimum password rules. **Custom SMTP** is a launch blocker for any e-mail
   sign-up, this one included. Is it planned with the domain?
10. DB-1's **transitional rule** keeps today's sign-ups working until UI-1 ships, so H1 stays open until DB-2,
    applied the same day as UI-1. Accept that order?

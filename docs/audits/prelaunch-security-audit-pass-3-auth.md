# Pre-launch security audit — pass 3: auth flows (`chore/audit-pass-3-auth`, 2026-10-29)

Scope: OWASP A07:2025 (Identification & Authentication Failures), standards-reference Section 3. Covered:
- sign-in, sign-up, email verification, forgot / new password, sign-out;
- session cookies, the middleware session check;
- `?next=` redirects.

Every sign-in / sign-up / reset / resend call goes from the browser straight to Supabase Auth (GoTrue). The only auth
server action is `changePasswordAction` (Mon compte). Method: a file:line code sweep, plus prod probes that sign in
nobody and create nothing (curl on the auth routes and `/auth/signout`), plus a read-only `auth.users` count.

## Fixed in this PR

### 1. MEDIUM — `/nouveau-mot-de-passe` let ANY signed-in session set a new password, with no re-authentication
- **Before:** `NewPasswordForm` opened the form on `PASSWORD_RECOVERY || session`. Mon compte's `changePasswordAction`
  re-checks the current password; this page did not. Scenario: a walk-up session on a shared phone sets a new
  password and locks the owner out.
- **After:** the form opens only for a recovery session:
  - the `PASSWORD_RECOVERY` event fired by the reset link's PKCE code exchange (auth-js `GoTrueClient.js:347` / `:1538`);
  - or a reload of the same tab, remembered in `sessionStorage` per user id.

  A normal session sees « lien invalide » after the existing 2 s wait. The flag is cleared after a successful reset.
  The `signOut()` after the reset is now checked and logged.
- **Not closed by the app:** any session can still call `auth.updateUser({ password })` against GoTrue directly. Founder
  action **A2** below narrows that server-side; it does not close it.
- **Known limits** (none of them is new):
  - The event fires only when the reset link opens in the same browser that asked for it (the PKCE verifier is
    stored there). Another browser or an in-app email webview shows « lien invalide », as before.
  - If the event fired before the component subscribed, the form would not open. In practice the exchange waits on
    a network round trip first, and nothing else on the page creates the browser client. A `?code=`-based fallback
    was rejected: a signed-in session could append a junk code and reopen the form.
  - The tab flag lives until the tab closes or the reset succeeds.
- Tests: `NewPasswordForm.test.tsx` (5).

### 2. LOW — sign-out could leave the user signed in
- **Before:** `/auth/signout` ignored `signOut()`'s result. On a GoTrue 5xx or network error, auth-js returns before
  removing the session, so the sb-* cookies survived while the user landed on « À bientôt ».
- **After:** the route deletes every `sb-*` cookie on its response whatever `signOut()` answers (the middleware's
  suspended-account sweep), and logs the error. This protects the browser only: when GoTrue is down, the refresh
  token is not revoked server-side.
- Tests: `auth-signout-route.test.ts` (2).

## Founder actions (Supabase dashboard; no code)

**A1. 🔴 Launch blocker — Site URL is still `http://localhost:3000`** (`docs/operations/supabase-auth-config.md`).
- Sign-up and « renvoyer » pass no `emailRedirectTo`, and email verification is link-based (`/verifier-email` exchanges
  a `?code`). So a production sign-up's confirmation link likely lands on localhost.
- The Redirect URLs list has `/nouveau-mot-de-passe` only.
- Live: 8 of the 14 real accounts are unconfirmed (the latest one 2026-07-25).
- Fix:
  - set the Site URL to the production origin;
  - add `<origin>/verifier-email` (and keep `/nouveau-mot-de-passe`) to Redirect URLs;
  - check the « Confirm signup » email template's link.
- Then I can pass `emailRedirectTo: <origin>/verifier-email` in `SignupForm` and `VerifyEmailFlow.resend`. That is a
  small follow-up PR, done after the whitelist exists, otherwise GoTrue falls back to the Site URL anyway.

**A2. Turn ON « Secure password change »** (Auth › Providers › Email).
- GoTrue then requires a recent sign-in (within about 24 h), or a reauthentication nonce, for
  `updateUser({ password })`. That narrows finding 1 to sessions younger than 24 h; it does not close it.
- Fully closing it means every password change goes through `auth.reauthenticate()` (an emailed nonce), or only
  through `changePasswordAction`. That is a product call.
- The recovery flow (a fresh session) and `changePasswordAction` (re-authenticates first) keep working.

**A3. Enable Leaked-password protection (HIBP), and set GoTrue's minimum password rules to match the app**
(≥ 8 characters, a letter and a digit, `isValidPassword`). Today the rule is browser-only: a direct
`POST /auth/v1/signup` gets only GoTrue's own minimum.

**A4. Keep « Confirm email » ON.** With it on, GoTrue answers a sign-up for an existing email with a fake user. The
app's « Cet email est déjà utilisé » branch (`SignupForm.tsx:154`) can never fire, so sign-up does not enumerate
accounts. Turning it off would.

**A5. Review the Auth rate limits** (sign-in / sign-up / OTP emails per hour). The app has no CAPTCHA, lockout or
server-side throttle of its own (Turnstile is not loaded).

## Logged, not fixed (LOW / INFO)

- **Cookies:**
  - `@supabase/ssr` 0.10.3 defaults: `httpOnly: false` is required by the browser client that signs in;
    `sameSite: lax`; 400-day `maxAge`; no `Secure` flag.
  - Mitigations: HSTS with preload (Vercel); XSS exposure shrinks once the CSP is enforced (#234 / #239).
  - Candidate: `cookieOptions: { secure: true }` in production for the server, browser and middleware clients. It
    needs a signed-in end-to-end check, so it gets its own PR.
- **Consumer age:** `date_of_birth` is validated client-side only for consumers. The DB enforces 18+ only for sellers,
  which is what the rule requires.
- **Small differences an observer could use:**
  - `user_banned` shows the « compte suspendu » banner before the password check (intentional, in the code).
  - « renvoyer » shows success vs error text.
  - Sign-in takes longer for existing accounts (GoTrue hashes only for them).
- **Sessions:**
  - The middleware does not persist refreshed tokens (`setAll() {}`), a reliability issue already logged.
  - `/session-expiree` has a weaker second `safeNext`. It is not exploitable: `/connexion` re-validates `next` with
    `isValidInternalPath`.
- **Sign-out:** it is global (every device), and there is no « déconnecter les autres appareils » control.

## Verified OK

- Sign-in answers one generic « E-mail ou mot de passe incorrect. »
- Forgot-password always reaches the same success state.
- No email pre-check query anywhere in `src`.
- `isValidInternalPath` (leading `/`, no `//`, no backslash, no control characters) is the only `next` reader. Prod
  `/connexion?next=//evil.example` and `?next=https://evil.example` render the page; the redirect happens only to a
  validated internal path.
- The middleware validates with `getUser()`; no server code trusts `getSession()`.
- Sign-out is POST-only: prod `GET /auth/signout` answers 405, POST answers 303 to a fixed `/a-bientot`.
- `changePasswordAction`: Zod, re-authentication with the session's own email, other sessions revoked.
- Suspended accounts are refused at sign-in and in the middleware (sb-* cookies cleared).
- No auth error text reaches the UI raw. Every message is an i18n key.

# Cloudflare Turnstile (`feat/turnstile`, 2026-10-30)

## 1. Supabase Auth CAPTCHA toggle — what breaks the day it is switched on (founder decision)
✅ CLOSED (code side) — `feat/captcha-ready`, 2026-10-30: all four flows CAPTCHA-ready; the dashboard toggle is the founder's step.
- **What:** sign-in / sign-up send the Turnstile token to Supabase Auth as `captchaToken`; Supabase verifies it only
  once Authentication → Bot and Abuse Protection → « Enable CAPTCHA protection » (provider Turnstile, the same
  secret) is ON. Until then the token is ignored (probed live 2026-10-30: `invalid_credentials` with or without it).
  It is the ONLY real protection for auth — the browser calls the auth API directly, so an app-side check is bypassable.
- **Why deferred:** once on, EVERY password / sign-up / recovery / OTP call without a valid token is refused:
  1. `src/components/auth/ForgotPasswordForm.tsx` (`resetPasswordForEmail`) — no widget yet;
  2. `src/app/mon-compte/actions.ts:336` — the server-side re-auth (`signInWithPassword`) before a password change;
  3. every live suite that signs fixtures in with `signInWithPassword` + the anon key (dozens) — they would all fail
     against production (the dummy token is refused by a real secret);
  4. `VerifyEmailFlow.tsx:51` (`auth.resend` of the confirmation email) — no widget yet.
- **Where it lives:** Supabase dashboard (founder); code for 1–3.
- **Trigger:** before launch, in one PR: widgets on the reset form and the resend (1, 4), a re-auth path for 2, a fixture sign-in that does
  not go through the password grant for 3 (e.g. admin `generateLink` + `verifyOtp`), then flip the toggle.

## 2. Orders / reports: the action gate is bypassable by a direct PostgREST insert
- **What:** a signed-in user's token can insert into `orders` / `reports` through PostgREST without the server action.
- **Why deferred:** not fixable app-side; the DB caps are the backstop (reports: migration 99; orders: 100; job posts: 101).
- **Trigger:** if abuse appears despite the caps — move the inserts behind a service-role action and revoke the client INSERT.

## 3. Disputes (« Signaler un problème » on an order) are not behind Turnstile
✅ CLOSED — `feat/captcha-ready`, 2026-10-30 (founder: yes).
- **What:** `ReportProblemDialog` → `createDispute` writes `disputes`, not `reports`; out of the brief's « report forms ».
- **Trigger:** founder call; same two-line gate if wanted.

## 4. The browser reset path (second submit on the same widget) was not exercised end-to-end
- **What:** the first submit was verified in a real browser with the dummy keys (token reached the auth request).
  The second-submit `reset → execute` path is code-reviewed only (the check was cut short, see the PR).
- **Trigger:** the founder's preview check with real keys: submit a wrong password twice on /connexion.

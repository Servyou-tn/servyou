# Pre-beta security review (2026-10-31)

Read-only review of `main` at `b88b287` (after #270 / #272) and the live database catalog of project
`xggomcitqrkaylqezjjz`. Nothing was fixed. Production was touched only by catalog SELECTs, the Supabase security
advisors and one GET of the public home page for its headers. No writes, no sign-ins, no live suites.

## Summary

1. **No critical or high finding** (F3 is the closest: MEDIUM, because it needs an already-stolen session). No secret
   anywhere in git history; RLS on every table, with owner-, party- or
   admin-scoped policies; no client upload or overwrite in any bucket; the ID-document bucket is private and empty.
2. **The weakest area is abuse, not access.** No cap on products or service listings per seller, and no cap or rate
   limit on image uploads per account: one signed-in seller can flood the catalogue or the storage buckets.
3. **A stolen session can still become a permanent takeover.** « Secure password change » is OFF (founder,
   2026-10-27), so anyone holding a live session can set a new password straight against Supabase Auth, skipping the
   app's current-password check. Leaked-password protection (HaveIBeenPwned) is also off. Both were logged before
   (audit pass 3, A2 / A3) and are still open.
4. **XSS has no browser backstop.** No XSS sink was found, but the full CSP is still Report-Only with
   `'unsafe-inline'`, and the session cookie is JS-readable by design (@supabase/ssr), so any future XSS = session theft.
5. **Phone numbers are revealed to any counterparty of a real order or mission proposal**, within the existing caps.
   It is the designed rule; a product decision is needed on whether a pending order should be enough.

### Must fix before Nov 13 (proposed — the founder and architect pick)

| # | What a bad actor could do today → what we change | Finding | Effort |
|---|---|---|---|
| M1 | Someone with a stolen session sets a new password and locks the owner out → turn ON « Secure password change » (narrows it to sessions under ~24 h) **and decide** whether password changes go only through the app's re-check (closes it) | F3 | S + decision |
| M2 | One seller account floods the catalogue with thousands of products / services → a database limit per shop and per freelancer | F1 | S |
| M3 | One signed-in account uploads images in a loop and fills the storage → a database limit on uploads per account per day | F2 | M |
| M4 | If one setting goes missing on Vercel, bot protection on orders / reports switches off silently → make it fail closed | F7 | S |
| M5 | Anyone can spam the contact form, and the messages go into our logs → bot check + length limits, **or decide** to hide the form for the beta | F8 | S + decision |

M4 and M5 are LOW findings but take minutes and close a silent failure / an open endpoint, so they are cheap to include.
Recommended before beta, the founder's call: enforce the CSP (F5, MEDIUM), decide the phone-reveal rule (F4, MEDIUM),
enable leaked-password protection (F6).

## Findings

Severity: critical / high / medium / low. Status: **VERIFIED** (query result, traced code path, or production
response) or **UNCONFIRMED** (stated why).

### F1. MEDIUM — no per-seller cap on products or service listings
- **Area:** 6 server actions / 2 DB. **Where:** `createProductAction` (`src/app/actions/products.ts`),
  `saveServiceDraftAction` (`src/app/mes-services/creer/actions.ts`); live triggers on `products` and
  `service_listings` include no count trigger (only `set_updated_at`, `enforce_active_user`, the moderation locks,
  publish requirements).
- **Exploit:** a signed-in seller (or a script holding one seller session — the actions have no Turnstile) creates
  products / drafts in a loop; the public catalogue and admin queues fill with junk. Live today: max 26 products per
  shop, 10 services per freelancer.
- **Fix:** BEFORE INSERT cap triggers per shop / per freelancer profile (e.g. 200 / 50), 23514 + hint, same shape as
  `enforce_job_post_cap`. **Effort:** S. **Status:** VERIFIED (live `pg_trigger`, code path).

### F2. MEDIUM — no cap or rate limit on image uploads per account
- **Area:** 5 storage / 6 server actions. **Where:** `uploadProductImageAction` (`src/app/actions/products.ts`, the
  creation flow passes a product id that does not exist yet) and `uploadPortfolioImageAction`
  (`src/app/mon-profil-freelance/modifier/actions.ts`); no trigger on `public.uploaded_objects` (live).
- **Exploit:** a signed-in seller / freelancer calls the upload action in a loop. Each call decodes up to 4.4 MB with
  sharp (CPU) and stores a new object plus an `uploaded_objects` row through the service role. The 8-image and
  6-item caps (migration 105) count ATTACHED rows only, so they never fire. Fills the public buckets; no orphan sweep
  exists yet (logged in `docs/follow-ups/upload-hardening.md`). Live today: 37 provenance rows, 0 orphans.
- **Fix:** a BEFORE INSERT trigger on `uploaded_objects` capping objects per owner per 24 h (e.g. 60), refused before
  the upload by an in-action count; plus the orphan sweep. **Effort:** M. **Status:** VERIFIED (code path, live
  triggers).

### F3. MEDIUM — a live session can change the password without the current one (setting known OFF)
- **Area:** 7 auth. **Where:** Supabase Auth › Providers › Email: « Secure password change » = OFF and « Require
  current password when updating » = OFF (founder, 2026-10-27, `docs/follow-ups/live-suite-teardown-guard.md`);
  `src/components/auth/NewPasswordForm.tsx:94` (comment `:22`: « UI gate only: the server-side guard is GoTrue's
  « Secure password change » setting »); `src/app/mon-compte/actions.ts:355`.
- **Exploit:** the anon key is public and the session cookie is JS-readable. Whoever holds a live session (a shared
  phone, a stolen cookie, any future XSS) calls `supabase.auth.updateUser({ password })` directly against Auth and
  sets a new password with no current-password check — a temporary session theft becomes a permanent takeover.
- **Why MEDIUM, not HIGH:** it needs an already-stolen live session (no XSS sink found, Secure + SameSite cookies,
  HSTS); the step it enables is the escalation. Email change is protected: « Secure email change » is ON (README,
  migration 78), so the address cannot be swapped silently.
- **Fix:** turn ON « Secure password change » (GoTrue then requires a sign-in within ~24 h or a reauthentication
  nonce — narrows, does not close); to close it, route every password change through `auth.reauthenticate()` or the
  server action only (a product call). **Effort:** S (setting) + decision. **Status:** VERIFIED (recorded setting,
  code path). Previously logged: audit pass 3, A2.

### F4. MEDIUM (design) — phone reveal on any order or proposal, including pending ones
- **Area:** 3 SECURITY DEFINER / 4 PII. **Where:** `public.get_contact_phone(uuid)` (live body): returns the target's
  phone when ANY order links the two accounts (either direction, any status, forever after), or a job response links
  them.
- **Exploit:** a bot account places a pending COD order (Turnstile, ≤ 5 pending per seller, ≤ 20 per 24 h — migration
  100) or a freelancer sends a proposal (≤ 5 active, ≤ 10 per post) and reads the counterparty's phone; cancelling
  keeps it. Account creation is CAPTCHA-gated, so this is a slow harvest, not a dump. `seller_id` cannot be spoofed:
  `enforce_order_insert_integrity` discards any client value (live body).
- **Fix (product decision):** reveal a seller's phone to a buyer only once the order is accepted / not pending, and
  stop revealing after a buyer-side cancellation; or a daily reveal budget. Decide it together with the change already
  ruled for `get_contact_phone` (contact stays visible on existing orders during a suspension —
  `docs/follow-ups/suspension-enforcement.md`, Nov 6–10). **Effort:** M. **Status:** VERIFIED (live function bodies).

### F5. MEDIUM — the Content-Security-Policy is not enforced
- **Area:** 9 headers / 8 XSS. **Where:** `src/lib/security/headers.ts` (`:68` `'unsafe-inline'` in `script-src`,
  `:99-100` Report-Only); production responds `Content-Security-Policy: frame-ancestors 'none'` plus the full policy
  as `Content-Security-Policy-Report-Only`.
- **Exploit:** none today — no XSS sink was found (see « Checked and fine »). But the session cookie is
  `httpOnly: false` (required by the @supabase/ssr browser client), so a future XSS would read the session with no
  browser-side block.
- **Fix:** review the Sentry CSP reports (#239), then enforce the policy; later replace `'unsafe-inline'` with nonces.
  **Effort:** M. **Status:** VERIFIED (production headers, code).

### F6. LOW — leaked-password protection is off
- **Area:** 11 advisors / 7 auth. **Where:** Supabase Auth (advisor `auth_leaked_password_protection`).
- **Exploit:** a user can sign up with a password known from public breaches; credential stuffing then needs no
  guessing (CAPTCHA still slows it).
- **Fix:** enable it in Auth settings, if the plan includes it. **Effort:** S. **Status:** VERIFIED (advisor).
  Previously logged: audit pass 1 (#4), pass 3 (A3).

### F7. LOW — Turnstile verification fails open when the secret is missing
- **Area:** 6. **Where:** `src/lib/security/turnstile.ts:34` `if (!secret) return { ok: true }`.
- **Exploit:** if `TURNSTILE_SECRET_KEY` ever goes missing in the production environment, order requests, disputes
  and reports silently lose bot protection. It was set for Production on 2026-10-30.
- **Fix:** fail closed when `VERCEL_ENV === 'production'`; log loudly. **Effort:** S. **Status:** VERIFIED (code);
  the current env value not checked (read-only rule). Background: « skip only when the key is absent » was the ruled
  rollout behaviour (#247), meant for local and preview.

### F8. LOW — contact form: unauthenticated, unthrottled, logs PII
- **Area:** 6. **Where:** `src/app/(marketing)/contact/actions.ts:13` (`submitContactMessage`), `:19`
  `console.log('[contact] message received', { … })`.
- **Exploit:** anyone can post unlimited messages; name, email and subject land in the Vercel logs, and only the
  message is length-capped (2000, `src/lib/contact/contact-validation.ts`) — name, email and subject are not. It is a
  stub — nothing is stored or sent.
- **Fix:** Turnstile + length caps + drop the email from the log, or hide the form until it is real. **Effort:** S.
  **Status:** VERIFIED.

### F9. LOW — dispute `admin_note` readable by both order parties over the API
- **Area:** 4. **Where:** `public.disputes` SELECT policy « Disputes visible to parties and admin » + table-level
  SELECT on `admin_note`; the app shows it only on `src/app/admin/litiges/[id]/page.tsx:182`.
- **Exploit:** a buyer or seller reads the admin's resolution note (which may discuss the other party) with a direct
  REST select. (`reports.admin_note` is meant for the reporter — migration `20260607142048` — so it is not listed.)
- **Fix:** decide whether the note is public to parties; if not, column-revoke it and read it through an admin RPC.
  **Effort:** S. **Status:** VERIFIED (live policy and grants; intent UNCONFIRMED).

### F10. LOW — two job-post actions skip Zod; no length CHECKs on job_posts
- **Area:** 6. **Where:** `src/app/mes-annonces/nouvelle/actions.ts:15` (`createAnnonce`, no Zod) and
  `src/app/mes-annonces/[id]/actions.ts` (bare `missionId`); `[id]/modifier/actions.ts` does use Zod. Live `job_posts`
  CHECKs cover budget, status and moderation only.
- **Exploit:** a non-string title throws (500); `city` / `categoryId` / `deadline` are unvalidated and uncapped, and a
  direct REST insert bypasses the app's 60 / 500-character limits. Ownership holds (`.eq('consumer_id', user.id)` +
  RLS). Already parked: the `missionId` validation waits for Agent B's PRs.
- **Fix:** a Zod schema (uuid, lengths, governorate list) + DB length CHECKs. **Effort:** S. **Status:** VERIFIED.

### F11. LOW — SECURITY DEFINER functions with `search_path = public` instead of `''`
- **Area:** 3. **Where:** 29 of the 53 DEFINER functions in `public` / `private` (23 use `''`, 1 `pg_catalog`; e.g. `get_contact_phone`, `is_admin`, the `admin_*` RPCs,
  `enforce_order_insert_integrity`).
- **Exploit:** none found — anon / authenticated have no CREATE on `public` (live), and PostgREST gives no way to
  create a shadowing temp object. Hygiene, against a future grant change.
- **Fix:** move them to `search_path = ''` with qualified names when each is next touched. **Effort:** M.
  **Status:** VERIFIED (catalog).

### F12. LOW — `?next=` guard does not normalise dot segments
- **Area:** 7. **Where:** `src/lib/internal-path.ts:9-21`.
- **Exploit:** `/..//evil.com` passes; it resolves to `https://servyou.vercel.app//evil.com`, a same-origin path, so
  no open redirect was shown. Defence in depth.
- **Fix:** resolve with `new URL(path, origin)` and require the same origin and a pathname not starting with `//`.
  **Effort:** S. **Status:** UNCONFIRMED (browser behaviour not run).

### F13. LOW — small hygiene items
- `src/lib/supabase/admin.ts`: no `server-only` guard; today only 3 server modules import it, no client file.
  (S, VERIFIED.)
- `src/lib/marche/data.ts:57` and `:136` log raw error objects (repo rule: log `message` / `code` / `details`);
  `.ilike('title', `%${term}%`)` at `:53` (products) and `:112` (services) does not escape `%` / `_` (wildcards only,
  parameter-bound — not injection). (S, VERIFIED.)
- Sign-in shows a distinct « compte suspendu » banner before the password check (an email probe learns that an
  account is suspended). Accepted earlier (audit pass 3). (S, VERIFIED.)
- Dead OAuth wiring: sign-in / sign-up build `/auth/callback?next=…` but no such route exists and Google OAuth is off;
  whoever enables it must validate `next`. (S, VERIFIED.)
- `changePasswordAction` forwards a Turnstile token only when present; Supabase CAPTCHA on the password grant still
  applies. (S, UNCONFIRMED.)
- `npm audit --omit=dev`: 0 critical, 0 high, 5 moderate (`glob`, `minimatch`) — all through `@sentry/nextjs`'s
  build-time bundler plugin, no runtime request path. (S, VERIFIED.)

## Checked and fine

- **1. Secrets.** Full history of every branch (970 commits) scanned for JWTs, `sb_secret_`, Turnstile / Resend /
  Stripe / AWS / GitHub key shapes, private keys and DB URLs with passwords: three hits, none live (a
  `[YOUR_PASSWORD]` placeholder in `docs/operations.md`, commit `aeeaea9`; a localhost restore container password in
  the same file; Cloudflare's public test secret in `.env.example`, commit `0bf4654`). Only `.env.example` was ever
  committed. The service-role key is read only in `src/lib/supabase/admin.ts`, imported by three server-only modules;
  no non-`NEXT_PUBLIC_` env var is read in a `'use client'` file; the four `NEXT_PUBLIC_` vars are public by nature.
- **2. RLS.** RLS on all 30 public tables. Every policy is owner-, order-party-, poster/responder- or admin-scoped;
  the only `USING (true)` is `categories` SELECT. `profiles` (email, phone, date of birth): own row or admin only.
  `orders` (delivery phone / address): buyer, seller or admin. `favorites`, `notification_preferences`,
  `data_exports`, `deletion_requests`: owner (+ admin). No `messages`, `reviews` or verification table exists.
  Admin markers (`admin_hidden_at` / `_reason`) are locked to admins by `enforce_admin_marker_lock` (live body) on
  shops, freelancer_profiles and job_posts.
- **3. SECURITY DEFINER.** 53 functions in `public` / `private`; 37 are triggers (no client EXECUTE). Every client-callable one checks the
  caller (`auth.uid()` / `is_admin()`), except `get_completed_service_order_count` (a public count by design).
  `client_write_grants` is service-role only.
- **4. Views and column grants.** `public_profiles` exposes id, name, city, language, seller_type, avatar — no phone,
  email or birth date. `buyer_cancellation_history` is `security_invoker`. Client write grants equal the reviewed
  allow-list (#272, 159 entries).
- **5. Storage.** 4 public image buckets (webp only, 256 KB–2 MB) and the private `verifications` bucket (10 MB,
  0 objects, owner-or-admin read). No client INSERT / UPDATE policy on any bucket (uploads go through the server with
  the service role after ownership and suspension checks); DELETE and LIST are own-folder only.
- **6. Server actions.** 67 actions in 30 `'use server'` files + 1 route handler: every one calls `getUser()` (except
  the contact stub); ownership is re-derived from the session or re-checked before every write; all 13 admin actions
  go through `checkAdmin`; the service role never receives a client-supplied id or path; no raw DB error reaches the
  client. Turnstile on order requests, disputes and reports; DB caps on orders, job posts, responses, reports, images.
- **7. Auth.** Both `?next=` sinks use `isValidInternalPath` (rejects `//`, `\`, schemes, control characters).
  Forgot-password always shows the same success; the reset form appears only for a recovery session; sign-out is
  POST-only, global, clears every `sb-` cookie. Cookies: Secure in production, SameSite=Lax; HttpOnly is off by
  @supabase/ssr design.
- **8. XSS / injection.** No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, markdown or JSON-LD in `src`. User URLs
  are http(s)-only in the actions and in the DB (migration 106; job-response links by trigger). WhatsApp links are
  built from digits only. Every `.or()` interpolates UUIDs or constants and search text going into `.or()` is
  escaped (the two `.ilike` wildcard spots are F13); no raw SQL in app code.
- **9. Headers (production).** HSTS 2 years + preload, `X-Frame-Options: DENY` + `frame-ancestors 'none'`
  (enforced), `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a Permissions-Policy, no `X-Powered-By`.
- **11. Advisors.** Beyond F6: `public_profiles` SECURITY DEFINER view (intended — its column list is the protection),
  `unaccent` in `public` (moving it breaks the generated search columns), 3 anon-callable and 12 authenticated-
  callable DEFINER functions (all self-gating, above), `uploaded_objects` RLS without policy (service-role only by
  design).

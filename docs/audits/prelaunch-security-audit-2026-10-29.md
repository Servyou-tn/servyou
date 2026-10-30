# Pre-launch security audit — pass 1 (`chore/prelaunch-security-audit`, 2026-10-29)

Scope: OWASP Top 10:2025 (standards-reference Section 3) over the live database, the production HTTP surface,
dependencies and the public repo. Read-only: no production write, no migration. Earlier passes
(`docs/follow-ups/security-audit-open-findings.md`, `security-followups-batch*.md`, the pre-launch batch, migrations
53–99) are taken as the baseline. This file only records what is new or still open.

## Clean (verified live 2026-10-29)

- **RLS:** enabled on every `public` table. The one table with no policy is `uploaded_objects` (service-role only,
  by design).
- **Grants:**
  - No TRUNCATE / REFERENCES / TRIGGER for anon or authenticated (the sweep logged 2026-10-24 is done).
  - No anon write grant on any table.
  - The column-granted tables still hold no table-level INSERT.
- **Functions:**
  - No `public` function with a mutable `search_path`.
  - Every SECURITY DEFINER RPC that anon or authenticated can execute self-gates:
    - the `admin_*` RPCs and `log_admin_action` check `is_admin()`;
    - `get_contact_phone` checks the caller (null for anon, needs a relationship otherwise);
    - `has_responded`, `is_active_user` and `get_moderation_reason` are keyed on the caller.
  - `get_completed_service_order_count` is a public count by design (D4).
- **Storage:**
  - Every bucket has a size limit and a webp-only MIME list (`verifications`: webp + images, private).
  - No client INSERT on the four public buckets since migration 74.
- **Views:** `public_profiles` is a definer view by design (its column list is the protection, CLAUDE.md), with no
  writes. `buyer_cancellation_history` is `security_invoker`.
- **Dependencies:** `npm audit --omit=dev` finds 0 vulnerabilities.
- **Secrets:**
  - No JWT, `sb_secret_`, service-role assignment, AWS key or private key in the tree or anywhere in git history.
  - Only `.env.example` is tracked.
- **Transport:** HSTS `max-age=63072000; includeSubDomains; preload` (Vercel).

## Findings (ranked)

### 1. MEDIUM — no browser security headers on production (A02:2025 Security Misconfiguration)
- **Observed:** `curl -D -` on `/`, `/connexion` and `/admin` returns no `Content-Security-Policy`, no
  `X-Frame-Options` / `frame-ancestors`, no `X-Content-Type-Options`, no `Referrer-Policy` and no
  `Permissions-Policy`.
- **Also:** `X-Powered-By: Next.js` is sent. Neither `next.config.ts` nor `src/middleware.ts` sets any of these.
- **Impact:** `/connexion` and every signed-in page can be framed, which allows clickjacking of the sign-in form
  and of the seller and admin actions. Nothing limits where an injected script could load from or post to. MIME
  sniffing is allowed.
- **Fix (one app PR):** `headers()` in `next.config.ts` for every route:
  - `X-Frame-Options: DENY` plus `frame-ancestors 'none'`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - a minimal `Permissions-Policy`;
  - `poweredByHeader: false`.
  CSP ships first as `Content-Security-Policy-Report-Only` (Next inline scripts, Supabase REST / storage, Sentry,
  Vercel). It is enforced once a week of reports is clean, and a nonce-based CSP is a later step.

### 2. MEDIUM — no per-user rate limit on COD orders (A06:2025 Insecure Design)
- **Observed:** none of the `orders` triggers counts anything. A buyer can file unlimited `pending` COD orders on
  any seller. Each one is a WhatsApp / phone-unlock relationship (`get_contact_phone` opens on any order) and an
  entry in the seller's queue.
- **Live today:** 16 orders, max 0 per buyer in the last 24 h. A cap rejects no existing row.
- **Fix:** the reports pattern (migration 99) — a BEFORE INSERT trigger capping pending orders per buyer per 24 h,
  and per buyer per seller.
- **Needs a founder number:** the avg cart is 173 TND, and COD buyers often place 2–3 orders.

### 3. LOW — no per-user cap on job posts (A06:2025)
- **Observed:** `enforce_job_post_writes` holds no count. A consumer can open unlimited missions. Responses are
  capped (10 per post, 5 active per freelancer), posts are not.
- **Fix:** same trigger shape. It needs a founder number (active posts per consumer).

### 4. LOW — leaked-password protection still disabled (A07:2025 Authentication Failures)
- **Observed:** the Supabase advisor `auth_leaked_password_protection`, already logged 2026-10-23 and still open.
- **Fix:** a dashboard toggle (Auth → Passwords), the founder's action. No code.

### 5. INFO — advisor noise that stays as is
- **`security_definer_view` on `public_profiles`:** intended.
- **`extension_in_public` (`unaccent`):** moving it touches `f_unaccent` and the search columns. Low value
  pre-launch.

## Not yet covered — proposed passes 2 and 3

- **Pass 2, app layer:**
  - every `'use server'` export: auth, then Zod, then ownership, then the generic error;
  - `?next=` and other redirects (open redirect);
  - upload paths (type sniffing server-side);
  - error pages leaking messages;
  - Sentry PII scrubbing;
  - admin routes behind `requireAdmin()` on every action.
- **Pass 3, auth flows (live, on fixtures):**
  - sign-up / sign-in / reset email enumeration;
  - session cookie flags;
  - sign-out invalidation;
  - Supabase Auth rate limits and OTP expiry (dashboard values).

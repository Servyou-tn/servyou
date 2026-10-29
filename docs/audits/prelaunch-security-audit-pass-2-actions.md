# Pre-launch security audit — pass 2: server actions, redirects, uploads, Sentry PII (`chore/audit-pass-2-actions`, 2026-10-29)

Scope: OWASP A01 / A04 / A05 / A09 / A10:2025, standards-reference Section 3.
- Every `'use server'` file: 29 files, every export.
- Every redirect fed by user input.
- Every upload path.
- The Sentry configuration and scrubber.

Read-only code sweep with file:line evidence, then fixes. No SQL in this PR; the one SQL item is a proposal below.

## Fixed in this PR

### 1. HIGH — the Supabase auth cookie would reach Sentry on every server error
- **Before:** the scrubber deleted `event.request.cookies` but never `event.request.headers`. Next's
  `captureRequestError` (instrumentation.ts) sends the raw request headers, and the SDK keeps `headers.cookie`
  unless `sendDefaultPii` / `dataCollection.cookies` say otherwise. So `sb-<ref>-auth-token` (access + refresh
  token) would ride along.
- **Inert today:** no DSN is configured, see #239. But the founder is about to set one.
- **After:** `cookie`, `authorization` and `x-supabase-*` / `x-sb-*` headers are deleted. Remaining header values
  are pattern-redacted.

### 2. MEDIUM — Sentry PII gaps
- **Console breadcrumbs were never scrubbed.** `console.error('[x]', error.message, error.code, error.details)` puts
  Postgres `details` (row values: a delivery address, a phone) into every later event's breadcrumbs. A console
  breadcrumb now keeps only its first argument, the `[scope] label`. Other breadcrumbs are key- and pattern-redacted.
- **Value patterns, nothing before:** emails (including `%40` in `/verifier-email?email=…`), `+216` / `00216` /
  standalone 8-digit phones, JWTs and bearer tokens are redacted in every string:
  - request data (including a raw string body), url, query string and headers;
  - message, exception values, breadcrumbs, extra, contexts, tags.

  uuids, ids, prices and years are left alone.
- **camelCase keys** (`deliveryName`, `deliveryStreet`, `fullName`, `buyerNote`, `dateOfBirth`) now match: keys are
  compared lower-cased without `_` / `-`. Added `quartier`, `fullname`, `dateofbirth`, `token`, `secret`,
  `authorization`, `cookie`.
- Tests: `sentry-scrubber.test.ts`, 20 (13 new).

### 3. MEDIUM — raw database text returned to the client (the logged leftovers)
- `advanceOrderAction` and `setOrderTrackingAction` returned `updateError.message`. They now return a mapped
  FR + AR key (`lib/orders/order-write-error.ts`, on the live trigger wording + errcode) or the generic error.
- `OrdersList` and `ReceiptConfirmButton` wrote `orders` from the browser. Both now call a new
  `confirmReceiptAction`: Zod, buyer ownership, `arrived` only, `{ status: 'received' }` only.

### 4. LOW — `createDispute` had no Zod
- `.trim()` threw on a non-string, the order id wasn't checked as a uuid, and the description had no cap.
- It now has a Zod schema (uuid, string, ≤ 2000). A bad id answers « not eligible », same as a non-party's order.

### 5. LOW — shop-name pre-check treated the name as a pattern
- `.ilike('name', name)` made `_` / `%` / `*` wildcards. A shop named `_` « collided » with others, or matched
  several rows and errored.
- Now: escape `%` and `_`, fetch ≤ 20 candidates, keep only a case-insensitive equality (`lib/supabase/like.ts`).
  The lower(name) unique index stays the authority.

## SQL — proposal, STOP for review (not written)

**S1. LOW — `verifications` bucket still allows a direct client INSERT** (policy « verifications: owner uploads own
document », kept by migration 74).
- Raw files up to 10 MB, PDF allowed, no normalization.
- No app writer exists (identity verification is not built).
- Proposal: drop the INSERT policy until the feature ships, like migration 74 did for the four public buckets.
  Rollback is re-creating the policy. One PENDING file plus a live test (an upload refused 403).

## Logged, not fixed (LOW unless marked)

- **LOW-MED — no cap on upload count.**
  - `uploadProductImageAction` accepts any owned `productId`; `MAX_PRODUCT_IMAGES` is enforced only when
    `product_images` rows are inserted.
  - Portfolio uploads have no cap.
  - Orphans accumulate, and the orphan-sweep follow-up is already open
    (`open-orphaned-storage-objects-need-a-reconciliation-sweep-before-the.md`).
  - Fix candidates: a per-owner count check in the upload actions, plus the sweep.
- **Missing target-existence check:** `createShopReportAction` / `createFreelancerReportAction` don't check the target
  exists (`listing-reports.ts` does). Any uuid can fill the admin queue with « cible introuvable » rows, capped at
  10 / 24 h by migration 99.
- **'use server' helpers exposed as endpoints:** `applyFreelancerDetailsSave` / `applyProfileSave` are exported from
  'use server' files, against the repo's own rule (`auth-ban.ts:13`). Not exploitable: argument 1 must be a live
  Supabase client. Move them to a plain module.
- **Admin actions skip Zod:** ids, notes and `targetType` in `litiges` / `signalements` are unvalidated (no uuid
  check, no length cap). They are admin-gated.
- **`mes-annonces/[id]` actions:** `missionId` is unvalidated. Every write filters `consumer_id = user.id`.
- **`sharp(input)` has no `limitInputPixels`:** the default is ~268 MP. A tiny PNG with huge dimensions costs CPU and
  memory. Candidate: cap at ~100 MP.
- **Portfolio upload:** no size refine (bounded by `normalize.ts`), and it skips the stored-size integrity check
  the other 4 upload paths do.
- **No `/auth/callback` route:** Google OAuth is behind a disabled flag. Whoever builds the callback must check
  `next` with `isValidInternalPath`.
- **`/session-expiree`:** has a weaker second `safeNext`. It is re-validated by `/connexion`, so not exploitable.

## Verified OK

- **Server actions:** every one runs `getUser` first and validates input before the DB (Zod, or a custom validator
  in two annonce/contact actions), with an owner filter plus RLS. Service role is used only after user,
  `isCallerActive` and a server-derived path. Admin actions all go through `checkAdmin` first. No raw DB text
  reaches the client after this PR.
- **Redirects:** every dynamic `redirect()` / `router.push` builds from server ids or fixed paths.
  `isValidInternalPath` is the only `next` reader. No route reads `referer`, `returnTo` or `redirect`.
- **Uploads:**
  - magic-byte sniff, then a full sharp decode and WebP re-encode (EXIF/GPS stripped);
  - 4 MB cap in the schema and in the normalizer, under the 4.4 MB body limit;
  - bucket and path first segment are server-derived;
  - `uploaded_objects` provenance is written before any reference, with host-anchored triggers;
  - no client INSERT on the four public buckets (migration 74).
- **Sentry:** no `setUser` / `setContext` / `setExtra` anywhere. IP collection is off, replay is off, and
  `reportQueryError` sends message + where + code only.

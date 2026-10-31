# App server guards (`fix/app-server-guards`, 2026-10-23)

Logged-not-fixed by the app-layer PR that closed four of the audit findings above. That PR made no
database change, so everything needing one lands here.

## MEDIUM — no DB CHECK on freelancer URL schemes
✅ CLOSED — migration 106 (`20261030221121_freelancer_url_scheme_checks`, 2026-10-30): `^https?://` CHECKs, NULL
allowed, on all five columns; live suite `freelancer-url-scheme-checks.test.ts`.

- **What:** `freelancer_profiles.portfolio_link`, `freelancer_links.url`,
  `freelancer_portfolio_items.url` / `image_url` and `freelancer_certifications.credential_url` are
  unconstrained text. `HTTP_URL` (`src/lib/freelancer/http-url.ts`) guards the three server actions
  only — the row's owner can still `PATCH` a `javascript:` / `data:` value straight over REST.
- **Fix:** a CHECK `col ~* '^https?://'` (NULL allowed) on all five columns, RLS-neutral. Live
  2026-10-23: all five hold 0 rows, so the constraint validates without a backfill.
- **Trigger:** the next freelancer-tables migration, or the pre-launch security pass.

## LOW — no render-time `href` guard in `FreelancerDetail.tsx`

- **What:** `src/app/freelance/[id]/_components/FreelancerDetail.tsx` renders the stored URLs as
  `href` (`link.url`, `item.url`, `freelancer.portfolioLink`, `row.credentialUrl`) with no scheme
  check. React 19 neutralises `javascript:` hrefs at render; `data:` and anything a non-React
  consumer (OG tags, email) emits is not covered.
- **Fix:** a small `safeHref(url)` that returns the URL only for `http:` / `https:` (else `null`,
  and the row renders as plain text), used at all four sites. Belt to the DB CHECK's braces — it also
  covers rows written before the CHECK exists.

## LOW — E1 request actions show a generic error for the new order-integrity rejections

- **What:** `enforce_order_insert_integrity` (migration 54) raises 23514 "Cet article n'est plus
  disponible." (item went non-live between page load and submit) and 23514 "Vous ne pouvez pas
  commander votre propre article." (self-order). `submitProductRequest` / `submitServiceRequest`
  map every insert error to `common.error_generic`.
- **Fix:** branch on `insErr.code === '23514'` + the message, returning two new FR/AR keys
  (vocabulary-lock skill applies). Do not surface the raw DB message — it is FR-only.

## LOW — single-product writes from an owner's SECOND shop now match zero rows

- **What:** a behaviour change this PR made. `toggleProductStatusAction`, `updateProductAction`,
  `deleteProductAction` and `deleteProductImageAction` now filter by the `shopId` that
  `resolveOwnedShopId` returns, which is the owner's OLDEST shop. Before, RLS alone let an owner
  write a product in any of their shops; now a product in a second shop matches zero rows and the
  action returns the generic error. The bulk actions already behaved this way.
- **Why it is latent:** `shops.owner_id` is not unique (only a non-unique index, see
  `src/lib/shops/owner-shop.ts` and `docs/design/g6-write-path.md` §2), but nobody owns two shops
  today and nothing in the app can create a second one.
- **Fix:** pairs with the `shops.owner_id`-not-unique decision. Either make it unique (one shop per
  owner, the product rule today) or add a shop switcher and resolve the product's own shop
  (`products.shop_id` → `shops.owner_id = auth.uid()`) instead of the oldest one.
- **Trigger:** anything that lets an owner create a second shop.

## LOW — the 13 admin server actions still take unvalidated arguments

- **What:** `admin/{litiges,signalements,utilisateurs,statistiques}/actions.ts` now gate on
  `checkAdmin`, but none parses its input with Zod (CLAUDE.md hard standard). `disputeId` /
  `reportId` / `targetId` / `targetUserId` are not checked as uuids, `targetType` is not checked
  against `ModerationTargetType`, and a non-string note or reason throws a TypeError (a 500, not a
  result) at `.trim()`. Predates this PR; the DB functions and CHECKs still reject bad values.
- **Fix:** one Zod schema per action (uuid ids, `z.enum` target type, trimmed bounded note/reason),
  returning the existing i18n error keys. Only admins can reach these, so it is hygiene, not
  exposure.

## MEDIUM — client forms store translated error TEXT in state, so errors stay in the old language after FR ⇄ AR
⏳ ASSIGNED — Agent B, after mobile batch 1 (architect, 2026-10-30).

- **What:** the founder-gate bug fixed on PR #178, still present everywhere else. `LanguageToggle`
  sets the cookie and calls `router.refresh()`, which re-renders client components with the new
  `lang` but keeps their state. A form that does `setErrors({ x: t(key, lang) })` keeps showing the
  old language (and in AR the RTL page reorders the French punctuation). Fixed in this PR for H3
  `ProfileEditForm` and E1 `ServiceRequestForm`: keys / row ids in state, translated at render (H3's
  `FieldError textKey` was already right).
- **Still affected (grep 2026-10-23, count of `t(…)` stored into state):** `AnnonceForm` (10),
  `ProductRequestForm` (7), `CreateFreelancerProfileForm`, `EditShopForm`, `CreateShopForm`,
  `SignupForm` (6 each), `NewPasswordForm`, `EditProductForm`, `SigninForm` (4 each),
  `CompetencesForm` (3), `VerifyEmailFlow`, `ForgotPasswordForm`, H3 `PortfolioRepeater` (upload
  error), H2 `DetailsForm` (1 each).
- **Also:** server actions return already-translated `error` strings, so any server error shown in a
  form has the same staleness. Narrower fix: return a key (+ vars) or clear the error on a `lang`
  change.
- **Fix:** store `{ key, vars }` and call `t()` at render (the pattern in `ServiceRequestForm`), one
  form per PR, with the jsdom re-render test in `form-errors-retranslate.test.tsx` as the template.

## LOW — `HTTP_URL` accepts `user:pass@host` URLs

- **What:** `http://user:pass@evil.example` passes `.url(HTTP_URL)` and `isHttpUrl`, so
  `https://trusted.tn@evil.example` renders on the public D4 profile as a link that reads like
  `trusted.tn` but goes to `evil.example`.
- **Fix (product call):** reject URLs with a userinfo part (`new URL(u).username || .password`) in
  both `isHttpUrl` and the server schema (a `.refine` next to `.url(HTTP_URL)`), keeping
  freelancer-url-scheme.test.ts's parity check. Pairs with the DB CHECK and `safeHref` entries above.

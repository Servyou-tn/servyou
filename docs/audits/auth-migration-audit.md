# Auth migration audit — `/signup` + `/login` → `/inscription/*` + `/connexion`

**Date:** 2026-06-13
**Scope:** UI migration with **logic + data-layer preservation**. The Supabase
data layer (auth.users, `profiles`, RLS, triggers) stays **fully intact**. Only
the *page files* and the *routes that reference them* change.
**Status:** AUDIT ONLY — no code changed.

> **Headline finding (read first):** The new flow must keep calling the **same**
> Supabase methods with the **same `signUp` metadata**. `profiles.date_of_birth`
> is `NOT NULL` and the auto-create trigger casts
> `raw_user_meta_data->>'date_of_birth'` to `date`. If the new signup form drops
> `date_of_birth` (or `full_name` / `city` / `language`), the trigger INSERT
> fails inside the signUp transaction and **account creation breaks**. The 16+
> age gate and these 4 metadata keys are mandatory to carry over.

---

## A. `/signup` audit — `src/app/signup/page.tsx`

- **Component type:** Client (`'use client'`, line 1). Uses `useState`, the
  browser Supabase client (`@/lib/supabase/client`), `useLang()`.
- **Form fields** (state → DOM id):
  | Field | id | Control | Required | Notes |
  |---|---|---|---|---|
  | `fullName` | `fullName` | text | yes | |
  | `email` | `email` | email | yes | |
  | `password` | `password` | password, `minLength={8}` | yes | |
  | `dateOfBirth` | `dateOfBirth` | date | yes | **16+ gate** |
  | `city` | `city` | select (24 `GOVERNORATES`) | yes | gouvernorat |
  | `language` | `language` | select `fr`/`ar` | no (default `'fr'`) | |
- **Client validation** (in `handleSubmit`, lines 50–66):
  - all of fullName/email/password/dateOfBirth/city present → else `signup.error_all_fields`
  - `password.length < 8` → `signup.error_password_len`
  - `getAge(dateOfBirth) < 16` → `signup.error_min_age` (**16+ to create an account**)
- **Submit handler** (line 68): `supabase.auth.signUp({ email, password, options: { data: {...} } })`
- **`user_metadata` passed** (`options.data`): exactly
  `{ full_name: fullName, date_of_birth: dateOfBirth, city, language }`
  → **these are the exact 4 keys the DB trigger reads** (see §C).
- **DB INSERTs after signUp:** **NONE.** The `profiles` row is created by the DB
  trigger `handle_new_user`, never by the page (per CLAUDE.md: signup pages must
  not insert into `profiles` directly). ✅
- **`emailRedirectTo`:** **NOT configured.** `options` carries only `data`. Email
  confirmation uses the Supabase project's **Site URL / default redirect**.
- **Success behavior:** `setSuccess(true)` → renders a "check your email"
  confirmation screen (`signup.success_title/prefix/suffix`). **No** router
  redirect; the user stays to confirm their email before they can log in.
- **Error handling:** `translateError()` maps Supabase messages →
  `signup.error_email_exists` (already registered), `signup.error_invalid_email`,
  `signup.error_password_len`, `common.rate_limit`, else `common.error_generic`.
- **Role intent:** the page does **NOT** read a `?role=` searchParam. Today every
  signup creates a **consumer-baseline** account (`seller_type = null`); becoming
  a shop/freelancer happens later via `/devenir-vendeur`. So the Hero/Journeys
  `/signup?role=shop|freelancer` links are currently **ignored** by `/signup`.

## B. `/login` audit — `src/app/login/page.tsx`

- **Component type:** Client (`'use client'`). Uses `useRouter`, browser client.
- **Form fields:** `email`, `password` (both required).
- **Submit handler** (line 37): `supabase.auth.signInWithPassword({ email, password })`
- **Success:** `router.push('/')` (homepage).
- **Error handling:** `translateError()` → `login.error_not_confirmed`
  (Email not confirmed), `login.error_invalid_credentials`
  (Invalid login credentials / invalid_credentials), `common.rate_limit`, else
  `common.error_generic`.
- **Forgot-password link:** → `/forgot-password` (line 103).
- **"No account?" link:** → `/signup` (line 109, `login.create_account`).
- **Suspended banner** (`src/app/login/SuspendedBanner.tsx`): reads `?suspended=1`
  → shows generic `auth.suspended_banner`. Wrapped in `<Suspense>` (required so
  `next build` passes with `useSearchParams`). The user is bounced here by
  `middleware.ts` after suspension.

**Adjacent auth surfaces (same system, will need repointing):**
- `src/app/forgot-password/page.tsx` (line 21): `resetPasswordForEmail(email, { redirectTo: \`${origin}/update-password\` })`; links back to `/login`.
- `src/app/update-password/page.tsx` (line 41): `updateUser({ password })` → then `router.push('/login')` (line 49).
- `src/app/auth/signout/route.ts` (line 6–7): `signOut()` → `redirect('/login')`.

## C. Custom auth-related tables — **`public.profiles`** (the only one)

`profiles` is the sole custom user table; it 1:1-links to `auth.users` via `id`.

- **Schema** (after `20260603174720_revise_profiles_table_to_layer4.sql`):
  | Column | Type | Constraint |
  |---|---|---|
  | `id` | uuid | PK = `auth.users.id` |
  | `full_name` | text | (trigger coalesces to `''`) |
  | `email` | text | from `auth.users.email` |
  | `date_of_birth` | date | **NOT NULL** |
  | `city` | text | |
  | `language` | text | check ∈ (`fr`,`ar`) |
  | `seller_type` | text | check ∈ (`freelancer`,`shop_owner`); **null = consumer** |
  | `phone` | text | optional (progressive) |
  | `is_admin` | boolean | NOT NULL default false |
  - later migrations add suspension columns (`20260607145237`) and **lock
    privileged columns** (`is_admin`, `seller_type`, suspension) from client
    writes (`20260609190541`).
- **Auto-create trigger** — `handle_new_user()`
  (`20260603181526_auto_create_profile_on_signup.sql`):
  - `SECURITY DEFINER`, fires `on_auth_user_created` `AFTER INSERT ON auth.users`.
  - Inserts `profiles (id, full_name, email, date_of_birth, city, language)`,
    reading `new.raw_user_meta_data ->> 'full_name' | 'date_of_birth' | 'city' | 'language'`.
  - `seller_type` left null, `is_admin` false.
- **⚠ Hard constraint the new flow MUST honor:** because `date_of_birth` is
  `NOT NULL` and the trigger does `(raw_user_meta_data->>'date_of_birth')::date`,
  a signUp **without** `date_of_birth` makes the trigger INSERT fail → the signUp
  transaction errors → no account is created. The new Step-2 form must still
  collect `full_name`, `date_of_birth` (16+), `city`, `language` and pass them as
  signUp metadata under those exact keys.
- **Age gates:** signup enforces **16+** client-side; **18+ to sell** is enforced
  server-side (`20260609190755_lock_orders_identity_and_seller_age_gate.sql`) —
  separate from signup, unaffected by the UI migration.

## D. Cross-codebase references (the migration ripple)

**Links to `/signup`** (UI + role query params):
- `src/components/layout/Header.tsx:161`
- `src/components/layout/MobileMenu.tsx:157`
- `src/components/landing/FinalCtaFooter.tsx:71`
- `src/app/login/page.tsx:109`
- `src/components/landing/Journeys.tsx:39` (`/signup?role=shop`), `:49` (`/signup?role=freelancer`)
- `src/components/landing/Hero.tsx:32` (`/signup?role=shop`), `:34` (`/signup?role=freelancer`)
- `src/components/landing/HowItWorks.tsx:38,43` (comments only — hrefs fall back to `/`)

**Links / redirects to `/login`:**
- UI links: `Header.tsx:155`, `MobileMenu.tsx:150`, `forgot-password/page.tsx:35,74`, `missions/[id]/page.tsx:98`, `login` self.
- **Auth-guard redirects (~22 protected pages)** — `router.replace('/login')` /
  `router.push('/login')` / `redirect('/login')` in: `profile`, `mes-favoris`,
  `mes-demandes`, `mes-reponses`, `demande/confirmation/[id]`, `poster-mission`,
  `produit/[id]/demande`, `service/[id]/demande`, `mes-missions` (+`[id]/modifier`),
  `devenir-vendeur`, `ma-boutique` (+`creer`/`modifier`/`produits`/`produits/[id]`/`produits/nouveau`/`commandes`),
  `mon-profil-freelance` (+`creer`/`modifier`/`services`/`services/[id]`/`services/nouveau`/`demandes`),
  `admin/layout.tsx`, `components/FavoriteButton.tsx`, `components/RespondForm.tsx`.
- `src/middleware.ts:45` — suspended bounce: `new URL('/login', request.url)` (+`?suspended=1`); `/login` deliberately excluded from the check (line 62).
- `src/app/auth/signout/route.ts:7` — `redirect('/login')` after `signOut()`.

**Routing config:**
- `src/lib/layout/select-variant.ts:17` — `AUTH_ROUTES = ['/login','/signup','/forgot-password','/update-password']` (chromeless). *(The `/inscription` funnel is already chromeless via `249f2f6`.)*

**Middleware protection model — `src/middleware.ts` (no redirect-loop risk ✅):**
- The middleware is a **closed-by-default allowlist** (`config.matcher`, lines
  63–78) listing only authenticated-only prefixes: `/admin`, `/ma-boutique`,
  `/mon-profil-freelance`, `/mes-demandes`, `/mes-favoris`, `/mes-missions`,
  `/mes-reponses`, `/missions`, `/profile`, `/devenir-vendeur`, `/poster-mission`,
  `/demande`, `/produit/:id/demande`, `/service/:id/demande`.
- It does **NOT** force anonymous→login. An unauthenticated request returns
  `NextResponse.next()` (line 32). Its only job is the **suspended** bounce: a
  logged-in *suspended* user is signed out and redirected to
  `/login?suspended=1` (lines 45–47).
- **Implication for the migration:** `/connexion` and `/inscription/*` are not in
  the matcher → middleware never runs on them → they are reachable while logged
  out with **no whitelisting needed and no loop**. The *only* middleware edit
  required is the suspended-bounce target on **line 45** (`/login` → `/connexion`),
  and the `SuspendedBanner` (today in `src/app/login/`) must live on `/connexion`
  to read `?suspended=1`.

## E. Existing tests touching auth

- **Will need updating** when routes rename:
  - `src/components/layout/Header.render.test.ts:41` asserts `href="/signup"`;
    `:69–70` assert the Header is hidden (`''`) on `/login` and `/signup`.
  - `src/lib/layout/select-variant.test.ts:7` asserts `AUTH_ROUTES`
    `['/login','/signup','/forgot-password','/update-password']` are hidden.
- **Unaffected** (data-layer / RLS integration tests; they call
  `client.auth.signInWithPassword` directly against real Supabase, not via the
  UI — they *prove the data layer keeps working* through the migration):
  - `src/__tests__/shop-config-rls.test.ts:49`
  - `src/__tests__/progressive-phone.test.ts:44`
  - `src/__tests__/buyer-cancellation-history.test.ts:48`
  - `src/__tests__/profiles-rls.test.ts:38`
  - `src/__tests__/freelancer-config-rls.test.ts:43`

---

## Migration impact summary (what "replace the page files" entails)

1. **Data layer: ZERO changes.** New `/connexion` calls
   `signInWithPassword({email,password})`; new `/inscription/*` Step-2 calls
   `signUp({email,password,options:{data:{full_name,date_of_birth,city,language}}})`.
   Keep the 16+ gate and all 4 metadata keys (esp. **`date_of_birth`**, §C).
2. **`/inscription/*` Step-2 forms** must collect: full_name, email, password (≥8),
   date_of_birth (16+), city (gouvernorat), language. `seller_type` stays **null**
   at signup today — role cards are intent/routing only; selling is enabled later.
   *(Open question — see below.)*
3. **Repoint ~30 references:** every `/login` → `/connexion`; every `/signup`
   (incl. `?role=`) → `/inscription` (or role-specific child). Includes the
   middleware **suspended-bounce target** (`middleware.ts:45`) + moving
   `SuspendedBanner` to `/connexion`, the signout redirect, ~22 auth guards, the
   Header/Footer/MobileMenu links, and the Hero/Journeys role CTAs. **No
   middleware matcher change and no loop risk** — the new auth routes are
   closed-by-default-excluded already (see §D middleware note).
4. **Chromeless routing** (`select-variant.ts`): add `/connexion`; decide the fate
   of the `'/login'`/`'/signup'` entries (remove if those routes are deleted).
5. **Update tests:** `Header.render.test.ts` + `select-variant.test.ts`. RLS
   integration tests need no change.
6. **Old route fate — recommend thin redirects.** Keep `/signup`→`/inscription`
   and `/login`→`/connexion` as redirects (at least transitionally) so existing
   Supabase confirmation/recovery email links and any bookmarks don't break.
7. **Email flows:** signup has **no** `emailRedirectTo` (uses project Site URL);
   forgot-password redirects to `/update-password`; update-password redirects to
   `/login` (→ `/connexion`). Verify the Supabase Auth **Site URL + redirect
   allowlist** if route names change.

## Open questions for the founder

- **Role at signup:** persist the chosen role (shop_owner/freelancer) at account
  creation, or keep today's consumer-baseline + later upgrade? Persisting would
  need a `seller_type` write — but `seller_type` is a **locked** column
  (`20260609190541`) and would touch the trigger/schema, i.e. **outside** the
  "data layer intact" scope. Recommend: keep consumer-baseline; route role intent
  into Step-2 copy/branding only.
- **Delete vs redirect** the old `/signup` and `/login` routes (see #6).

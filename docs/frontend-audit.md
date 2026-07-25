# Frontend Audit — Servyou

**Scope:** read-only audit of the frontend as it exists on `main`. No file was modified, moved, refactored, or deleted to produce this report; every improvement idea is recorded under [Fix ideas](#fix-ideas-recorded-not-applied), not applied.

- **Branch audited:** `main`
- **HEAD:** `e55a04b9bc8151c65ab89166ec58309703fad830` (clean tracked tree)
- **Date:** 2026-07-25
- **Method:** static analysis (Glob/Grep/Read) + a live headless-Chrome CDP sweep at 380px against a freshly-rebuilt dev server on this exact SHA. Route/component/coupling inventories cross-verified against the import graph.

> **Note on `main` vs the unmerged shell work.** Five commits sit ahead on `chore/page-rebuild-skill` but are **not** on `main`: `c62819e` (topbar region 2), `5060f02` (docs), `2b5e500` (sidebar region 1), `7dfb4a3` (8-delta shell), `7f9912d` (`/marche/services` rebuild). This audit describes **`main`**, which still carries the *older* shell (blue avatar, taller sidebar) and the pre-rebuild `/marche/services`. Where it matters, the text says so.

---

## Counts

| Metric | Value | Denominator / note |
|---|---|---|
| Total routes (`page.tsx` segments) | **51** | public 26 · consumer 11 · freelancer 6 · admin 8 · **shop 0** |
| ComingSoon stub routes | **15** | + `/profil` (bespoke stub) = 16 non-functional |
| Orphan routes (no in-app nav) | **5** | `/design-tokens-verification`, `/mes-commandes/[id]`, `/demander/[id]`, `/statistiques`, `/nouveau-mot-de-passe` |
| Dead data-layer functions | **8** | implemented in `src/lib/marche/*`, 0 import sites |
| Named components (`src/components/**`) | **101** | + 52 icon components (6 files) + ~25 shadcn primitive sub-parts |
| Dead components (0 call sites) | **9** | + ~8 transitively dead; entire `dashboard/**` tree (11) orphaned |
| Duplicate component groups | **10** (~18 pairs) | headline: **3 parallel workspace shells** + 1 marketing shell |
| Client components | **87 / 187** `.tsx` (~47%) | files carrying `'use client'` ÷ all `.tsx` in `src/app`+`src/components` |
| Raw hex color occurrences | **120** | 56 in `globals.css` (token layer, legit); 64 elsewhere (mostly brand/social/logo literals) |
| Untokenised bracket utilities | **381** | 98 `[var(--token)]` + 61 `data-[…]` + 17 `-[#hex]` + **204 raw dimension/shadow** values |
| Genuine color regressions | **3** | `#0F172A` tile (`Problem.tsx:16`), `#9c40ff` ×2 (magicui beams) |
| RTL physical-direction utilities | **23** | `left-/right-` positioning only; **0** `ml-/mr-/pl-/pr-/text-left/text-right` |
| Page DS classification | **pre-v2 12 · mixed 2 · untokenised 0 · v2 37** | on each route's own segment tree; `--brand-*` = v2 alias, not a regression |
| System-state files | loading **0/51** · error **1/51** · not-found **1/51** · global-error **0** | root-only, cascade to children |
| 380px horizontal overflow | **0 / 17** public routes | live-measured; auth-gated routes deferred |
| `seller_type` → role resolution sites | **≥7**, in 3 shapes | **not** centralized — see [Step 7](#step-7--the-shell--seller_type-resolution) |

**Headline findings**

1. **`seller_type` is re-derived at ≥7 independent call sites** in three different shapes — there is no single resolver the app reads. (The founder's most-wanted answer; [Step 7](#step-7--the-shell--seller_type-resolution).)
2. **Split-brain shell:** two full chrome systems run at once — 19 pages on the v2 `AppShell`, 5 surfaces (including the logged-in homepage `/`) still on the legacy `MarcheLayout`. Three parallel workspace-shell implementations exist in code.
3. **The current v2 shell imports `getInitials` at runtime from the *deprecated* shell** (`marche/ProfileAvatarMenu`) — the replacement depends on what it replaces, blocking legacy deletion.
4. **The shop-owner workspace does not exist** (0 routes) though `shop_owner` is a first-class role in the sidebar IA.
5. **~31% of routes are non-functional** (16/51: 15 ComingSoon stubs + bespoke `/profil`), and a fully-built `dashboard/**` component tree (11 components) plus 8 data-layer functions are dead.
6. **Horizontal responsiveness is healthy** where measured: 0 overflow across 17 public routes at 380px.

---

## Step 0 — Repo state

- On `main`, HEAD `e55a04b`, working tree clean for tracked files (untracked docs/scripts exist but are not part of this audit's commit).
- Confirmed `main` serves the **older** shell and pre-rebuild `/marche/services`; the rebuilt versions live only on the unmerged branch listed above.

## Step 1 — Architecture shape

**`src/` shape (depth 3, directories):** `app/` (route tree) · `components/{auth, categories, dashboard/{consumer,shell}, devenir, home, landing, layout, legal, listings, magicui, marche, parametres, recherche, shared, shell, ui}` · `lib/{categories, contact, dashboard, faq, freelance, i18n, layout, legal, marche, search, sentry, supabase, taxonomy, types}`.

**Server/Client split:** **87 of 187** `.tsx` files in `src/app`+`src/components` carry `'use client'` (~47%). High for a "Server Components default" App Router app, but most are genuine interactive leaves (forms, toggles, dropdowns, the `AppShellClient` frame). Worth watching, not alarming.

**Layouts / route groups:**
- `(marketing)/layout.tsx` → `MarketingShell` (Header + Footer), wraps 8 static pages.
- `admin/layout.tsx` → **client** `AdminLayout` with its own chrome + an `is_admin` guard that `router.replace`s.
- `marche/layout.tsx` → a bare `<div className="min-h-screen bg-white">` — **not** chrome, and it *name-collides* with the `MarcheLayout` chrome component.
- root `layout.tsx` → `html`/`body` only; the marketing navbar is no longer mounted here.

**Key architectural note — no persistent workspace layout.** The v2 `AppShell` is imported and mounted **per page** (18–19 pages) rather than once in a route-group `layout.tsx`. The shell therefore re-mounts on every navigation and shell state does not persist across route changes.

## Step 2 — Route inventory

Repo-relative paths. `renders? = yes` unless noted. "guard→/connexion" = renders normally for authed users, `redirect()`s only when logged out. "stub (ComingSoon)" = renders the shared placeholder, not wired to feature data (`getShellUser()` still reads `profiles` for the top bar).

| route | file | workspace | renders? | linked from | Supabase wiring |
|---|---|---|---|---|---|
| `/` | `src/app/page.tsx` | public | yes | Header/Footer/Sidebar | real: `profiles`, `products`/`service_listings`+`public_profiles` |
| `/marche` | `src/app/marche/page.tsx` | public | **no — redirect only** | `sidebar-items.ts:31` | none (redirect helper) |
| `/marche/produits` | `src/app/marche/produits/page.tsx` | public | yes | `MarcheSidebar.tsx:265` | **stub**; `getShellUser`→`profiles` |
| `/marche/services` | `src/app/marche/services/page.tsx` | public | yes | `SearchLanding.tsx:24` | real: `service_listings`+`public_profiles`+`categories` |
| `/produits/[id]` | `src/app/produits/[id]/page.tsx` | public | yes | `ProductListingCard.tsx:31` | **stub**; `getProductDetail` **dead** |
| `/services/[id]` | `src/app/services/[id]/page.tsx` | public | yes | `ServiceListingCard.tsx:61` | **stub**; `getServiceDetail` **dead** |
| `/categories/[slug]` | `src/app/categories/[slug]/page.tsx` | public | yes | `SubcategoryStrip.tsx:25` (dormant) | real: `categories` + `products`/`service_listings` |
| `/recherche` | `src/app/recherche/page.tsx` | public | yes | `TopbarSearch.tsx:24`, Footer | real: `products`/`service_listings`+`public_profiles`+`categories` |
| `/a-propos` | `(marketing)/a-propos` | public | yes | Footer | static |
| `/contact` | `(marketing)/contact` | public | yes | Footer | action `submitContactMessage` (logs only, no table) |
| `/faq` | `(marketing)/faq` | public | yes | Footer, HelpDropdown | static |
| `/accessibilite` | `(marketing)/accessibilite` | public | yes | Footer | static |
| `/conditions` | `(marketing)/conditions` | public | yes | Footer, not-found | static |
| `/confidentialite` | `(marketing)/confidentialite` | public | yes | Footer, ParametresForm | static |
| `/cookies` | `(marketing)/cookies` | public | yes | Footer | static |
| `/connexion` | `src/app/connexion` | public | yes | Header + redirects | auth `signInWithPassword` |
| `/inscription` | `src/app/inscription` | public | yes | Header | static role-picker |
| `/inscription/consumer` | `inscription/consumer` | public | yes | `inscription/page:37` | auth `signUp` |
| `/inscription/freelancer` | `inscription/freelancer` | public | yes | `inscription/page:39` | auth `signUp` |
| `/inscription/shop-owner` | `inscription/shop-owner` | public | yes | `inscription/page:38` | auth `signUp` |
| `/mot-de-passe-oublie` | `mot-de-passe-oublie` | public | yes | `SigninForm.tsx:172` | auth `resetPasswordForEmail` |
| `/nouveau-mot-de-passe` | `nouveau-mot-de-passe` | public | yes | **ORPHAN** (email deep-link only) | auth `updateUser` |
| `/verifier-email` | `verifier-email` | public | yes | `SignupForm.tsx:179` | auth + **writes `profiles`** |
| `/devenir-freelance` | `devenir-freelance` | public | yes | `ProfileAvatarMenu.tsx:121` | real: `profiles` |
| `/devenir-vendeur` | `devenir-vendeur` | public | yes | `Sidebar.tsx:84` | real: `profiles` |
| `/design-tokens-verification` | `design-tokens-verification` | public | yes | **ORPHAN** (dev page) | static |
| `/mes-commandes` | `mes-commandes` | consumer | guard→/connexion | `sidebar-items.ts:32` | **stub**; `getMyOrders` **dead** |
| `/mes-commandes/[id]` | `mes-commandes/[id]` | consumer | guard→/connexion | **ORPHAN** | **stub**; `getOrderDetail` **dead** |
| `/mes-favoris` | `mes-favoris` | consumer | guard→/connexion | `sidebar-items.ts:33` | **stub**; `getMyFavorites` **dead** |
| `/mes-missions` | `mes-missions` | consumer | guard→/connexion | `sidebar-items.ts:37` | real: `job_posts` (+`job_responses`, `categories`) |
| `/mes-missions/[id]` | `mes-missions/[id]` | consumer | guard→/connexion | `MissionCard.tsx:36` | real: `job_posts`, `job_post_skills`, `job_responses`, `public_profiles`, `freelancer_profiles` |
| `/mes-missions/nouvelle` | `mes-missions/nouvelle` | consumer | guard→/connexion | `mes-missions/page:44` | real: `categories`; insert `job_posts` |
| `/demander/[id]` | `demander/[id]` | consumer | guard→/connexion | **ORPHAN** | **stub**; `getRequestTarget` + actions **dead** |
| `/mon-compte` | `mon-compte` | consumer | guard→/connexion | `ProfileAvatarMenu.tsx:94` | **stub**; `mon-compte/actions` **dead here** |
| `/parametres` | `parametres` | consumer | guard→/connexion | `sidebar-items.ts:47` | real: `profiles`; insert `data_exports` |
| `/aide` | `aide` | consumer | guard→/connexion | `sidebar-items.ts:48` | `profiles` (shell only); static FAQ |
| `/profil` | `profil` | consumer | yes | `TopbarUserMenu.tsx:89` | static bespoke "coming soon" card |
| `/tableau-de-bord` | `tableau-de-bord` | freelancer | guard→/connexion | `sidebar-items.ts:57` | **stub** |
| `/mes-services` | `mes-services` | freelancer | guard→/connexion | `sidebar-items.ts:58` | **stub** |
| `/mes-engagements` | `mes-engagements` | freelancer | guard→/connexion | `sidebar-items.ts:59` | **stub** |
| `/mes-propositions` | `mes-propositions` | freelancer | guard→/connexion | `sidebar-items.ts:60` | **stub** |
| `/trouver-des-missions` | `trouver-des-missions` | freelancer | guard→/connexion | `sidebar-items.ts:61` | **stub** |
| `/statistiques` | `statistiques` | freelancer | guard→/connexion | **ORPHAN** (no longer linked) | **stub** |
| `/admin` | `admin` | admin | yes | `AdminSidebar.tsx:18` | real: RPC `admin_overview_stats()` |
| `/admin/utilisateurs` | `admin/utilisateurs` | admin | yes | `AdminSidebar.tsx:19` | real: `profiles` |
| `/admin/utilisateurs/[id]` | `admin/utilisateurs/[id]` | admin | yes | `utilisateurs/page:80` | real: `profiles`+`shops`+`freelancer_profiles`+`orders`+`reports` |
| `/admin/signalements` | `admin/signalements` | admin | yes | `AdminSidebar.tsx:21` | real: `reports`+`public_profiles` |
| `/admin/signalements/[id]` | `admin/signalements/[id]` | admin | yes | `signalements/page:100` | real: `reports`+moderation tables |
| `/admin/litiges` | `admin/litiges` | admin | yes | `AdminSidebar.tsx:22` | real: `disputes` |
| `/admin/litiges/[id]` | `admin/litiges/[id]` | admin | yes | `litiges/page:76` | real: `disputes`+`orders` |
| `/admin/statistiques` | `admin/statistiques` | admin | yes | `AdminSidebar.tsx:23` | real: counts across tables; CSV export |

**Structural facts (evidence-based):**
- **No shop workspace exists** — zero `/ma-boutique`, `/mes-produits`, `/boutique/[slug]`. `ProfileAvatarMenu.tsx:131,140` links `/ma-boutique` + `/mon-profil-freelance` (both 404). `AlreadyHaveRole` in `devenir-vendeur` also targets `/ma-boutique`.
- **15 ComingSoon stubs** wired to no feature data (list above); `/profil` is a bespoke stub.
- **Dead data layer:** `getProductDetail`, `getServiceDetail`, `getRequestTarget`, `getOrderDetail`, `getMyOrders`, `getMyFavorites`, `getRelatedProducts`, `getRelatedServices` — implemented, 0 import sites.
- **5 orphan routes** (no in-app nav): `/design-tokens-verification`, `/mes-commandes/[id]`, `/demander/[id]`, `/statistiques`, `/nouveau-mot-de-passe`.
- **Stale nav configs → 404 targets:** `DashboardSidebar.tsx:26-31` (`/mon-espace`, `/mes-demandes`, `/profile`), `QuickActions.tsx:33` (`/poster-mission`), `CategoriesWidget.tsx:26` (`/categorie/[slug]` singular vs real plural), `ActiveOrdersSnapshot.tsx:68` (`/demande/confirmation/[id]`), `nav-config.ts` (`/missions`).

## Step 3 — Design-system classification

**Read this nuance first.** `--brand-primary` / `--brand-accent` / `--brand-accent-light` are **v2 aliases**, not legacy colors — `globals.css:87-88` maps them to `--brand-blue-800/600/500`, and `:102-104` aliases the `@theme` utilities (the file comments at `:85-86, :126` call them transitional, migrating to primitives in "DS-3b"). **So a route flagged "pre-v2" below is flagged for the `brand-*` _naming_ legacy, NOT a color regression** — the rendered values are already v2. Font is **Cairo** (v2); the only `Tajawal` hit is a comment; `info-purple` = **0** occurrences.

**Genuine color regressions (the only ones anywhere): 3** — raw `#0F172A` decorative tile at `landing/Problem.tsx:16`, and purple `#9c40ff` ×2 in magicui beams (`animated-beam.tsx:44`, `border-beam.tsx:61`).

**Per-route classification** (all 51 `page.tsx`, each judged on its own segment tree):
- **pre-v2 — 12** (own tree contains `--brand-*` naming): the entire auth/inscription funnel — `/inscription` (+`/consumer`, `/freelancer`, `/shop-owner`), `/connexion`, `/mot-de-passe-oublie`, `/verifier-email` — plus `/mes-missions` + `/[id]` (`hover:bg-brand-accent-light`) and 3 marketing pages (`/a-propos`, `/contact`, `/faq`).
- **mixed — 2:** `/` (6 gradient-stop hex literals at `page.tsx:85,89`, and it renders the hex-heavy landing) and `/aide` (WhatsApp brand green `#25D366`/`#1DA851` — a documented exception per `globals.css:34`).
- **untokenised — 0.**
- **v2 — 37** (own `page.tsx` uses token utilities only — zero markers). **Caveat that matters:** most of these 37 are thin wrappers; their rendered UI lives in shared `src/components/**` that DO carry `brand-*`/brackets/hex. "v2 route" means the route file is clean, not that the rendered screen is marker-free. (Also flagged, outside the 51: `not-found.tsx`, `error.tsx` carry `brand-*`; `layout.tsx:14` has the Tajawal comment.)

**Raw hex — 120 total across 19 files:**
- **56 in `globals.css`** — the token-primitive layer; legitimate (hex belongs here).
- **64 elsewhere** — overwhelmingly not drift: social/brand/logo literals (WhatsApp `#25D366`/`#1DA851`, Instagram `#E1306C`, Facebook `#1877F2`, Google 4-color, Tunisia-flag `#E70013`), landing-Hero beam/glow gradient stops, and placeholder fills (`#F4F4F4`). Concentrated in `landing/Hero.tsx` (12), `landing/Problem.tsx` (7), `app/page.tsx` (6), `layout/Header.tsx` (6), `landing/icons.tsx` (5).
- The genuinely-questionable non-brand literals: the 3 regressions above, plus a hardcoded navy set (`#152C6B`/`#15296B`/`#1D4ED8`) in `layout/Header.tsx` + `layout/MobileMenu.tsx` (should be tokenized).

**Tailwind arbitrary brackets — 381 total across 57 files:**
- **98** `[var(--token)]` token references (legit — arbitrary syntax used to reach a CSS var).
- **61** `data-[…]` Radix variant selectors (legit — not styling values).
- **17** `-[#hex]` raw-color brackets.
- **204** raw dimension/shadow/position/font values (`h-[400px]`, `rounded-[32px]`, `max-w-[720px]`, `shadow-[…]`, `text-[10px]`, `tracking-[-0.01em]`) — **the real untokenised-value surface.**
- Bracket-dense files: `landing/HowItWorks.tsx` 42, `ui/dropdown-menu.tsx` 38, `landing/Hero.tsx` 36, `app/inscription/page.tsx` 24, `landing/Categories.tsx` 23. Route-local brackets cluster in the auth/inscription funnel; most are `[var(--token)]` refs, a handful raw dims (`max-w-[560/480/420/720px]`, `w-[140px]`, `text-[22px]`).

**Takeaway:** no route is untokenised. The "pre-v2" tier is **naming-migration debt** (`brand-*` aliases), not a visual regression. The real tokenization gaps are (a) the 3 true color regressions, (b) ~204 raw bracket dimensions concentrated in the landing + auth funnels, and (c) the hardcoded navy set in the marketing `Header`/`MobileMenu`.

## Step 4 — Component inventory

- **101 named components** in `src/components/**` (+52 icon components across 6 `icons.tsx`, +~25 shadcn primitive sub-parts).
- **Dead — 9 components, 0 call sites:** `DirArrow`, `CancelOrderModal`, `DisputeCreateModal`, `ModerationBanner`, `DashboardShellClient`, `DashboardRightRail`, `QuickActions`, `GreetingHeader`, `ActiveOrdersSnapshot`. Plus **~8 transitively dead** — the **entire `dashboard/**` tree (11 components) is orphaned**: no `src/app/**` imports `@/components/dashboard/`; the route that would host it (`/tableau-de-bord`) renders `AppShell`+`ComingSoon`. Dead icons too (`GlobeIcon`, several `landing` icons, all `dashboard/consumer/icons`).
- **Duplicate groups — 10 (~18 pairs). HEADLINE: 3 parallel workspace shells + 1 marketing shell:**
  - **Sidebars ×3:** `MarcheSidebar` (deprecated) / `Sidebar` (current) / `DashboardSidebar` (dead) — plus `AdminSidebar` (arguably distinct).
  - **Topbars ×3:** `MarcheTopBar` / `Topbar` / `DashboardTopBar`.
  - **Avatar menus ×3:** `ProfileAvatarMenu` / `TopbarUserMenu` / `AccountMenu`.
  - **Empty states ×3:** `EmptyState` / `SearchEmptyState` / `CategoryEmptyState`.
  - `PageHeader` ×2 (marche vs shared); marketing pairs ×4 (`HowItWorks`, `FAQ`/`Faq`, `FinalCTA`/`FinalCtaFooter`, `Benefits`/`BenefitGrid` — landing vs devenir); `Devenir{Freelance,Vendeur}Content` soft near-clones.
- **Figma → code:** only **3** counterparts — `Avatar` (exact); `ProductListingCard`≈`ProductCard`, `ServiceListingCard`≈`ServiceCard` (renamed). **No code component for `Button`, `Input`, `StatTile`, `StatusPill`, `ShopCard`, `FreelancerCard`** — these Figma primitives are inlined everywhere, never componentized. (The earlier-hypothesized `ProductCard`-vs-`ProductListingCard` duplication **does not exist**.)
- **Icon duplication:** the same icon names are redefined across ≥2 feature folders (`PackageIcon`, `HeartIcon`, `BriefcaseIcon`, `ChevronRightIcon`, `LogOutIcon`, `ArrowRightIcon`, …). No shared icon module — the root cause of several cross-feature couplings ([Step 11](#step-11--coupling)).
- Call-count anchors: `AppShell` 18–19, `ComingSoon` 14, `MarcheLayout` 5, `Pagination` 4, `ListingResults` 4, `BlurFade` 9.

## Step 5 — Journey coverage

- **Consumer:** `/` (home = marketplace browse, **still on legacy MarcheLayout**) · `/marche/services` · `/marche/produits` (stub) · `/produits/[id]` (stub) · `/services/[id]` (stub) · `/demander/[id]` (stub) · `/categories/[slug]` · `/recherche` · `/mes-commandes` (stub) + `/[id]` · `/mes-favoris` (stub) · `/mes-missions` + `/[id]` + `/nouvelle` (**built, real data** — job-posting) · `/mon-compte` (stub) · `/profil` · `/parametres` · `/aide`.
- **Freelancer:** `/devenir-freelance` · `/tableau-de-bord` (stub) · `/mes-services` (stub) · `/trouver-des-missions` (stub) · `/mes-propositions` (stub) · `/mes-engagements` (stub) · `/statistiques` (stub, orphan). **Every freelancer workspace page is a stub.**
- **Shop-owner:** `/devenir-vendeur` **only**. → **Largest journey gap: the shop-owner workspace is unbuilt** (no product mgmt, no shop mgmt, no received-orders) despite `shop_owner` being a first-class shell role.
- **Admin:** `/admin` + `/utilisateurs` (+`/[id]`) + `/signalements` (+`/[id]`) + `/litiges` (+`/[id]`) + `/statistiques` — **the most complete workspace.**
- **Auth:** `/connexion` · `/inscription` (+3 role variants) · `/mot-de-passe-oublie` · `/nouveau-mot-de-passe` · `/verifier-email` · `/auth/signout`.
- **Marketing:** `/` (logged-out landing) · `/a-propos` · `/contact` · `/faq` · `/conditions` · `/confidentialite` · `/cookies` · `/accessibilite`.

**Observation:** the only non-admin surface wired to real data is **consumer job-posting** (`/mes-missions/*` → `job_posts`) — but it's only half a loop: every freelancer-side page that would respond to those posts (`/trouver-des-missions`, `/mes-propositions`) is a ComingSoon stub. Consumer commerce (orders, favorites, request-to-buy) and the entire shop-owner path are stubs or absent. **Admin is the only fully-wired workspace.**

## Step 7 — The shell + `seller_type` resolution

### 7A — Split-brain shell (two systems live at once)
- **v2 `AppShell`** (`shell/Sidebar` + `shell/Topbar` + `shell/TopbarUserMenu`) — mounted by **19 pages**.
- **Legacy `MarcheLayout`** (`marche/MarcheSidebar` + `marche/MarcheTopBar` + `marche/ProfileAvatarMenu`) — still powers **5 surfaces**: the logged-in consumer **homepage `/`** (via `ConsumerHomepage`), `/categories/[slug]`, `/recherche`, `/devenir-vendeur`, `/devenir-freelance`.
- **Two sidebars, two topbars, two avatar menus coexist** (a third, dead, `Dashboard*` set exists too). The consumer's **first screen after login (`/`) is on the OLD chrome**; rebuilt inner pages are on the NEW chrome, so crossing `/` → `/marche/services` changes the chrome under the user. This is the same old-vs-new split behind the "blue avatar" report earlier this session.

### 7B — `seller_type` resolution (the most-wanted answer)

**It does NOT resolve in one place. `seller_type` → role/label is re-derived at ≥7 independent call sites, in three distinct shapes:**

1. **`roleFromSellerType()`** — `src/components/shell/AppShell.tsx:13` → `ShellRole`. The nearest thing to canonical, **but**: defined inside a component file (not `lib`), **not exported**, and consumed by exactly **one** caller (AppShell itself, line 33).
2. **`roleKey()`** — **duplicated verbatim** in `src/app/admin/utilisateurs/page.tsx:21` **and** `src/app/admin/utilisateurs/[id]/page.tsx:26` → i18n key (with an extra `is_admin` branch the shell resolver lacks).
3. **Inline equality checks**, scattered:
   - `src/components/marche/ProfileAvatarMenu.tsx:112 / 129 / 138` (`=== null` / `=== 'shop_owner'` / `=== 'freelancer'`)
   - `src/app/devenir-freelance/page.tsx:26` (`=== 'freelancer'`), `src/app/devenir-vendeur/page.tsx:26` (`=== 'shop_owner'`)
   - `src/app/page.tsx:42, 45` (raw read + `=== null`; hardcodes `seller_type: null` into the homepage user at line 59)
   - `src/components/auth/VerifyEmailFlow.tsx:117-121` + `src/lib/verify-email.ts` (a separate role-intent-vs-`seller_type` cross-device path)

**The `seller_type` data *fetch* is also scattered** — each site issues its own `.select(...seller_type...)`: `lib/marche/shell-user.ts:18`, `lib/dashboard/data.ts:26`, `lib/marche/mon-compte.ts:28`, `app/page.tsx:37`, `admin/utilisateurs/page.tsx:51`, `admin/utilisateurs/[id]/page.tsx:58`, `VerifyEmailFlow.tsx:117`.

**Plain answer:** re-derived at **multiple** call sites — not one. The nearest-canonical `roleFromSellerType` covers only the shell; every other surface (admin ×2, ProfileAvatarMenu, both `devenir-*`, homepage, verify-email) re-derives with its own string comparisons and no compiler exhaustiveness. Adding or changing a role means editing 7+ places by hand. (Fix idea in [Fix ideas](#fix-ideas-recorded-not-applied).)

## Step 8 — Responsive (380px), live-measured

**Method:** headless Chrome via raw CDP (no Playwright), `Emulation.setDeviceMetricsOverride {width:380, height:820, mobile:true}`, against a dev server freshly rebuilt on `main`@`e55a04b` (killed all node, cleared `.next`, one server, confirmed up). Per route: `documentElement.scrollWidth` vs `window.innerWidth`. Browser-computed, not a source claim. The override took (measured `innerWidth` came back 380, not the default), and served HTML was confirmed to carry real content (e.g. `/marche/services` = 114 KB, 20× "TND", `aside`+`nav`+grid markers; `/` = hero + "Découvrir" markers). **Harness validated by negative control:** injecting a 9999px-wide div into `/marche/services` made the *same* measurement jump to `+8479px` overflow — proving it registers overflow when present, so the uniform zeros are real, not a global-clip artifact (`globals.css` has no `overflow-x`/clip on `html`/`body`).

**Result — 0 horizontal overflow on all 17 public/reachable routes** (`scrollWidth == innerWidth == 380`, `ovf = 0`):
`/`, `/marche/services`, `/marche/produits`, `/recherche`, `/produits/[id]`, `/services/[id]`, `/demander/[id]`, `/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/a-propos`, `/contact`, `/faq`, `/conditions`, `/confidentialite`, `/cookies`, `/accessibilite`. The `/marche/services` card grid — the highest-risk surface — fits 380 cleanly.

**Deferred (auth-gated — need a logged-in session; NOT measured):** the consumer job-posting pages `/mes-missions`, `/mes-missions/[id]`, `/mes-missions/nouvelle` (the only real-content authed screens); `/parametres`, `/mon-compte`, `/aide`, `/profil`, `/tableau-de-bord` + the freelancer stubs; `/admin/*` (note: admin list tables already wrap in `overflow-x-auto`). Also unmeasured: `/categories/[slug]` (needs a valid slug; a bare id 404s to the root not-found). These are the honest gaps in the live sweep.

**Static corroboration:** nearly all `w-[Npx]` matches are `max-w-*` **ceilings** (collapse below the breakpoint) or `md:`-guarded; the only literal fixed box is `Hero.tsx`'s decorative halo (`absolute`, `pointer-events-none`). Admin tables wrap in `overflow-x-auto`. The only unguarded hardcoded multi-col grid is `/design-tokens-verification` (internal dev page). Breakpoint adoption: 269 responsive-prefix occurrences across 57 files (md 161, lg 65, sm 40, xl 3, 2xl 0) — md-centric.

## Step 9 — RTL readiness

**Verdict: near-fully RTL-converted.** Total physical-direction occurrences = **23** (24 raw matches − 1 prose comment).

**Zero debt in the families that matter:**
- Tailwind `ml-`/`mr-`/`pl-`/`pr-` (incl. responsive/hover/negative variants): **0**
- Tailwind `text-left`/`text-right`: **0**
- CSS `margin-left/right`, `padding-left/right`, `text-align: left|right`: **0**
- camelCase CSS-in-JS `marginLeft`/`textAlign`/… : **0** (checked because `Hero.tsx` uses style objects)

**The 23 remaining are all `left-`/`right-` positioning, not spacing/alignment:** 15 true position utilities (absolute-positioned decorative layers) + 6 symmetric `slide-in-from-{left,right}` Radix animations (paired via `data-[side]`, direction-neutral) + 2 CSS lines in `globals.css` that are themselves RTL-aware (`.ph-underline` flip at `:297, :305`).

**Corroboration the conversion is real:** logical utilities dominate — `ms-`/`me-`/`ps-`/`pe-` = **55**, `text-start`/`text-end` = **31**.

**Top files** (only 8 files contain any physical-direction utility): `landing/Hero.tsx` 11 (icon-orbit `left-[20%]…` + `left-1/2` halos), `ui/dropdown-menu.tsx` 4, `ui/popover.tsx` 2, `globals.css` 2 (RTL-aware), then 1 each in `landing/HowItWorks.tsx`, `landing/Problem.tsx`, `marche/ExpandableSearch.tsx`, `magicui/animated-beam.tsx`.

**No physical margin/padding/text-align debt remains** — the only leftover is absolute-positioning in the landing hero/decorative layer plus symmetric Radix animations. RTL correctness elsewhere is a code-review concern (logical props are used consistently), not a bulk-conversion gap.

## Step 10 — System states

Denominator **N = 51** route segments. **No `global-error.tsx` anywhere.**
- **`loading.tsx`: 0/51** — none exist.
- **`error.tsx`: 1/51** — only `src/app/error.tsx` (app root), a `'use client'` boundary that cascades as the default for all 50 children; no segment defines its own.
- **`not-found.tsx`: 1/51** — only `src/app/not-found.tsx` (app root); cascades. `notFound()` is called by `categories/[slug]/page.tsx:38`.

Both root boundaries render full JSX inside `MarketingShell`. **All system-state coverage is at the app root**; there are zero nested or route-group-level (`(marketing)`, `admin`, `marche`) system-state files, and **no loading UI at all** — every navigation shows the previous page until the server component resolves.

## Step 11 — Coupling

### 11A — shared → feature (layering violations)
**One runtime violation; the rest are `import type` (erased at build, but still a shared→feature dependency):**
- **RUNTIME:** `src/components/shared/Pagination.tsx:10 → @/components/recherche/search-url` (`buildSearchQuery`).
- **TYPE-ONLY (10, all in `src/lib/**`):** `search-marketplace.ts`, `marche/data.ts`, `marche/filter-categories.ts`, `marche/shell-user.ts`, `marche/service-detail.ts`, `marche/product-detail.ts`, `marche/my-data.ts` → domain types (`ProductListing`, `ServiceListing`, `FilterCategory`, `TopBarUser`) that are declared **inside feature components**, forcing the data layer to reach up into the UI layer to name them.
- `src/components/ui/**` and `src/components/layout/**` are **clean**.

### 11B — feature → feature
- `marche → recherche` (`ServicesFilterBar`, `ServicesBrowsePage` → `search-url` + `SearchFiltersSheet` + `FilterCategory`)
- `marche → listings` (`ServicesBrowsePage → ListingResults`, `MissionCard → listing-utils`)
- `home → marche` (`ConsumerHomepage → MarcheLayout` + `marche/icons` + `TopBarUser`)
- `home → listings` (`ConsumerHomepage → ListingResults` + card types)
- `listings → dashboard` (icon-only: `ProductListingCard → dashboard/consumer/icons` `PackageIcon`)
- `dashboard → landing` (icon-only: `ActiveMissionsWidget`/`ActiveOrdersSnapshot → landing/icons` `ArrowRightIcon`)
- `dashboard → auth` (style-util: `ActiveOrdersSnapshot → auth/field-styles` `primaryBtn`)

**Synthesis:** `listings→dashboard`, `dashboard→landing`, and part of `home→marche` exist **only because icons live in feature folders**; `dashboard→auth` reuses a button style trapped in a feature folder. A shared `icons`/`styles`/`types` module would erase all of these.

### 11C — ⚑ CRITICAL: current shell couples to the deprecated shell
- `src/components/shell/TopbarUserMenu.tsx:18 → @/components/marche/ProfileAvatarMenu` imports **`getInitials` at RUNTIME** (plus `AppShell.tsx:2`, `AppShellClient.tsx:6`, `Topbar.tsx:12` import the `TopBarUser` type from it).
- **The current v2 shell still depends on the legacy `marche` shell it is meant to replace.** The marche shell cannot be deleted until `getInitials` + `TopBarUser` are lifted into `shell/` or `lib/`. This is the concrete blocker to retiring `MarcheLayout`/`MarcheSidebar`/`MarcheTopBar`/`ProfileAvatarMenu`.

---

## Fix ideas (recorded, not applied)

Read-only audit — nothing below was changed. Ordered by leverage.

1. **Centralize role resolution.** Lift one `resolveRole(profile): Role` + a `ROLE_I18N_KEY` map into `src/lib` (typed `Role` union, exhaustive `switch`). Have `AppShell`, both admin pages, `ProfileAvatarMenu`, and both `devenir-*` pages consume it. Also centralize the `seller_type` **fetch** (one `getProfileRole()` reader). Removes 7+ hand-maintained call sites and gives compiler exhaustiveness on the next role change. *(Step 7B)*
2. **Break the shell→deprecated-shell runtime coupling.** Move `getInitials` + the `TopBarUser` type out of `marche/ProfileAvatarMenu` into `shell/` or `lib/`. Unblocks deleting the entire legacy `marche` shell. *(Step 11C)*
3. **Finish the shell migration.** Move the logged-in homepage `/`, `/categories/[slug]`, `/recherche`, `/devenir-*` off `MarcheLayout` onto `AppShell`, then delete `MarcheLayout`/`MarcheSidebar`/`MarcheTopBar`/`ProfileAvatarMenu`. Consider mounting `AppShell` in a route-group `layout.tsx` so shell state persists and it stops re-mounting per navigation. *(Steps 1, 7A)*
4. **Delete the dead `dashboard/**` tree (11 components) + 8 dead data-layer functions + dead icons/components (9),** or wire them to `/tableau-de-bord`. Decide per feature; today they are pure carrying cost. *(Steps 2, 4)*
5. **Extract a shared `icons` module** (dedupe `PackageIcon`, `HeartIcon`, `ArrowRightIcon`, …) and a shared `styles`/`types` module. Erases most feature→feature and the shared→feature type couplings in one move. *(Steps 4, 11)*
6. **Add system-state coverage:** at minimum a root `loading.tsx` (no loading UI exists anywhere) and a `global-error.tsx`; consider workspace-level `error.tsx`/`not-found.tsx` for `admin` and the marketplace. *(Step 10)*
7. **Fix stale nav configs** pointing at 404 routes (`/mon-espace`, `/mes-demandes`, `/profile`, `/poster-mission`, `/categorie/[slug]`, `/missions`, `/ma-boutique`, `/mon-profil-freelance`) — or build the targets. *(Step 2)*
8. **Componentize the inlined Figma primitives** (`Button`, `Input`, `StatTile`, `StatusPill`) — they are the most-repeated inline patterns and a large source of untokenised drift. *(Steps 3, 4)*
9. **Tokenize the real drift, ignore the false positives.** Fix the 3 genuine color regressions (`#0F172A` tile, `#9c40ff` ×2) and the hardcoded navy set in `Header`/`MobileMenu`; convert the ~204 raw bracket dimensions (concentrated in landing + auth funnels) to tokens. Leave `brand-*` aliases and social/logo hex literals alone — they are not regressions. *(Step 3)*
10. **Remove `/design-tokens-verification`** (throwaway dev page, orphan). *(Steps 2, 8)*
11. **Live 380px sweep of the auth-gated + `/categories/[slug]` routes** to close the Step 8 gap. *(Step 8)*

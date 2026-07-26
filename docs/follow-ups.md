# Follow-ups

Tracked deferrals — work intentionally pushed out of the PR that surfaced it, with
enough context to pick up cold. Each entry: what, why deferred, where it lives, the
trigger to do it.

## Open

### Audit consumer surfaces for `admin_hidden_at` filtering
- **What:** The marketplace browse/search queries do not all filter out admin-hidden
  shops/freelancers consistently. `lib/marche/data.ts` (`getActiveProducts` /
  `getActiveServices`, powering **/marche**) and `lib/search/search-marketplace.ts`
  (powering **/recherche**) filter only on `status='active'` — they do **not** exclude
  rows whose parent shop/freelancer has a non-null `admin_hidden_at`. The detail/order
  paths (`lib/marche/product-detail.ts`, `lib/marche/demander.ts`,
  `app/demander/[id]/actions.ts`) **do** check `admin_hidden_at`. So a moderated seller
  can still appear in browse/search listings while their detail page is blocked.
- **Why deferred:** Fixing only /recherche would create a worse inconsistency between two
  sibling surfaces. The right fix is one moderation PR that aligns **/marche, /recherche,
  and /categories** (once built) together.
- **Trigger:** Before launch (Phase 10 polish), or sooner if moderation goes live. Fold
  in /categories/[slug] when that page lands.

### Remove /marche's dead inline `?q=` search path
- **What:** With the header search repointed to **/recherche** (see
  `components/marche/MarcheTopBar.tsx`), `/marche`'s own inline `?q=` handling in
  `app/marche/page.tsx` (and the `q` plumbing through `getActiveProducts(q)` /
  `getActiveServices(q)`) is no longer reached from the UI.
- **Why deferred:** Kept as a no-op for this PR to keep the search build scoped to adding
  /recherche; deleting browse-page query handling is a separate, reviewable cleanup.
- **Trigger:** A dedicated cleanup commit after /recherche is merged and verified.

### Add category description + nesting columns
- **What:** Two related gaps surfaced building **/categories/[slug]**:
  1. **No description columns.** The `categories` table has no `description_fr` /
     `description_ar`, so the category header renders the name only (no intro copy). A
     migration adding those columns would let the page show a short category blurb.
  2. **Flat taxonomy.** Every category has `parent_id = null` — no parent/child rows
     exist. The sub-category drill-down strip (`SubcategoryStrip`) is built and renders
     correctly, but shows nothing until nesting data exists. The "browse sub-categories"
     UX is unverifiable against current data.
- **Why deferred:** Both need a schema migration (approval-gated) plus admin content
  entry; out of scope for the page build.
- **Trigger:** When the category taxonomy is fleshed out (admin dashboard / Phase 9+).

### In-category type switch on /categories/[slug]
- **What:** On a non-empty category page, there is no always-visible control to switch
  Produits↔Services *within the category*. The shared shell's top toggle navigates to
  /recherche (per the locked "topbar unchanged" rule), and the in-category switch only
  appears as "Voir l'autre type" on the empty state.
- **Why deferred:** Adding an in-content type toggle would reintroduce the kind of
  results-header control just removed from /recherche; needs a design decision.
- **Trigger:** If click-through shows users need to flip type without leaving the category.

### Legal pages: lawyer review + cookie consent + redaction consistency
- **What:** `/conditions`, `/confidentialite`, `/cookies`, `/accessibilite` are honest
  DRAFTS (each carries a prominent draft banner). Before public launch they must be
  reviewed by a qualified Tunisian lawyer (release-blocking gate per engineering-standards
  §7). Three related items:
  1. **Cookie consent banner + preferences modal** are referenced in the cookies/privacy
     text but NOT built (Phase 10).
  2. **Legal entity name + physical address** (required by Tunisian commerce regulation)
     are unknown — not yet rendered anywhere; add when known.
  3. **Redaction consistency:** the legal pages deliberately avoid vendor/region names
     ("serveurs européens", not "Francfort"). The **FAQ** (`faq.confidentialite.q1.a`)
     still says "Francfort, Allemagne" — consider softening it to match the legal pages'
     redaction posture.
- **Why deferred:** Lawyer engagement + cookie-consent infra + the entity registration
  are launch-gate items, not this PR's scope.
- **Trigger:** Phase 10 / pre-launch legal gate.

### Arabic legal/content translations need native Tunisian review
- **What:** All About/Contact/FAQ/legal/system Arabic strings are provisional MSA
  translations (the warm section openers especially may not carry the same tonal warmth).
- **Trigger:** A native Tunisian Arabic review pass before launch.

### Contact form has no backend (stub server action)
- **What:** `/contact`'s form posts to `submitContactMessage`
  (`src/app/(marketing)/contact/actions.ts`), which re-validates, `console.log`s a safe
  summary, and returns success. There is no `contact_messages` table and no transactional
  email — messages are not persisted or delivered anywhere.
- **Why deferred:** No email service (Resend) or table at MVP; the form UI + validation +
  success UX are the deliverable now.
- **Trigger:** Phase 10 — wire to Resend and/or persist to a `contact_messages` table
  (migration). Also confirm the public WhatsApp number (placeholder `+216 XX XXX XXX`)
  and the social-media accounts (currently "Bientôt disponible").

### FavoriteButton fires one auth.getUser() per instance
- **What:** `src/components/FavoriteButton.tsx` calls `supabase.auth.getUser()` in a
  per-instance `useEffect` to decide the heart's filled/empty state. A page with N cards
  fires N independent getUser round-trips on mount. The logged-in consumer homepage shows
  products + services together (~19 hearts), so it fans out ~19 getUser calls at once
  (visible as aborted "TypeError: Failed to fetch" in headless tests when the page closes
  mid-flight; harmless in a real browser, just wasteful).
- **Why deferred:** FavoriteButton is a shared component used on every consumer surface
  (/marche, /recherche, /categories, /mes-favoris, homepage); optimizing it (share auth
  state via context, or pass logged-in + favorited-ids from the server page) is its own
  change with its own test pass. Not introduced by the homepage — just surfaced by it.
- **Trigger:** A consumer-performance pass, or when wiring real auth context.

### Consider a 'Tous' (all) results tab on /recherche
- **What:** /recherche searches one catalog at a time (Produits OR Services). A combined
  "Tous" tab would need a unified card variant or a sectioned layout (the two existing
  cards have incompatible layouts).
- **Why deferred:** No evidence yet that users want cross-type results; avoids a new card
  variant at MVP.
- **Trigger:** Post-launch, if search analytics show users toggling between types on the
  same query.

## Post-MVP scale triggers

### Migrate /recherche to PostgreSQL full-text search (FTS)
- **Audit status:** RESOLVED-NO-FIX. The Audit Fix 3 pass proposed replacing search with
  Postgres FTS; Step 0 discovery showed the current search is already correct for the
  current catalog. `lib/search/search-marketplace.ts` already runs ILIKE on **both**
  `title` and `description`, is case-insensitive, and already returns the expected rows
  (e.g. "premium" → 3 products). The earlier `/recherche` 500 was stale dev-server `.next`
  corruption, not a search bug. Migrating now would add permanent schema surface for 16
  rows, override CLAUDE.md's own posture ("defer FTS until search volume justifies the
  index cost — not before"), and deliver zero user-visible improvement on current data —
  premature optimization.
- **What (when triggered):** Migrate /recherche to Postgres FTS — `unaccent` +
  `websearch_to_tsquery('french', …)` + a `setweight`ed `tsvector` generated column
  (title=A, description=B) + GIN indexes, on `products` and `service_listings` (extend to
  `shops`/`freelancer_profiles` once their cards + `/boutique`·`/freelance` pages exist —
  searching them today has no render path).
- **Trigger:** When the catalog exceeds ~1000 listings OR users start typing accented
  French / multilingual queries at meaningful volume.
- **Reference:** Migration SQL was drafted and validated against temp tables in the Audit
  Fix 3 Step 0 report. Two validated gotchas for whoever implements it: (1) `unaccent` is
  `STABLE`, so it cannot be used directly in a generated column — the raw DDL throws
  `ERROR 42P17: generation expression is not immutable`; wrap it in an `IMMUTABLE` SQL
  function calling the two-arg `extensions.unaccent('extensions.unaccent', $1)`, and
  unaccent the query side too (the `'french'` stemmer alone is not accent-insensitive —
  `élégant` ≠ `elegant` without it). (2) The `'french'` config stems English plurals
  unreliably (`sneaker`→`'sneak'` vs `sneakers`→`'sneaker'`), so reconsider the search
  config (`'simple'` / `pg_trgm`) for a multilingual FR/EN/AR catalog. Ranking via
  `ts_rank` is not expressible through supabase-js — either keep the existing JS weighted
  scorer over a `.textSearch()` filter, or add a `SECURITY INVOKER` RPC.

## DS-3b lint — architectural follow-ups (deferred from chore/fix-lint #75, 2026-07-23)

🔴 **SECURITY (pre-launch) — Admin routes have no server-side guard.** `middleware.ts` matches `/admin/:path*` but enforces only the suspended state, not `is_admin`. A non-admin can load the admin shell before the client-side `useEffect` (`src/app/admin/layout.tsx:36`) redirects them. Data is protected by RLS (admin reads require `is_admin()` per policy), so no records leak — but route access is gated client-side, which `engineering-standards.md` prohibits: "no client-side feature gating as security." Fix: `is_admin` check in `middleware.ts`, or a server-component guard in the admin layout. **Own PR — needs its own review, tested against a non-admin account before merging.**

🟡 Buyer/seller dispute UI removed as teardown orphan (PR #64 deleted its render surfaces). Rebuild prop-based when E3 order surfaces are rebuilt from Figma. Backend and admin dispute flow unaffected.

## Next.js security patch — architectural follow-up (from fix/nextjs-security-16-2-11, 2026-07-23)

🟡 **Re-verify middleware authorization when multi-locale routing lands.** CVE-2026-64642 (middleware/proxy bypass, GHSA-6gpp-xcg3-4w24) targets **single-locale `config.i18n.locales`** specifically. Servyou was **not affected** at `16.2.7`→`16.2.11` because `next.config.ts` has no `i18n` block (FR/AR is handled in `src/lib/i18n`, not Next's built-in i18n routing). When the i18n foundation later adds real multi-locale routing (i18n config and/or locale-prefixed paths), **re-verify that `middleware.ts`'s suspended-state gate — and any auth added to it — cannot be bypassed via locale-prefixed request paths.** Trigger: the i18n multi-locale routing PR.

🟡 **Residual npm-audit advisories after `next@16.2.11` (all transitive; the patch cleared every `next` CVE).** `npm audit` still reports 8, none in `next` itself:
- **`sharp` <0.35.0** (high, GHSA-f88m libvips) — `next`'s **optional** image dep, pinned `0.34.5`; the next bump does not move it. **Verified not imported anywhere in `src`** (grep) and no server-side image-processing path exists — so it is reachable only via `/_next/image`, which Vercel serves on platform infra, **not** the bundled sharp. No app-runtime exposure. Fix = an explicit `sharp` bump or an `overrides` pin (**never** the `next@14.2.35` downgrade npm audit suggests). Low priority given the Vercel path.
- **`@opentelemetry/core`** (moderate, GHSA-8988) — via `@sentry/nextjs` (prod). Bump Sentry / OTel.
- **`brace-expansion` ×2 / `fast-uri` ×2 / `js-yaml`** (high, but **dev-scope** — eslint / typescript-eslint / webpack build chains; not in the production runtime). A plain `npm audit fix` resolves these non-breaking ("changed 8 packages").
- Optional: bump `eslint-config-next` `16.2.7` → `16.2.11` to match `next`.

Trigger: a dependency-hygiene chore, or when the Dependabot PRs land.

## DS-3b-3 font-sizes — follow-ups (from feat/ds-3b-3-font-sizes, 2026-07-24)

🟡 **24 font-size literals (15 sites) intentionally retained** — no clean tier in the v2 ramp, or responsive pairs where half-tokenizing breaks the mobile→desktop ramp. Most live in components scheduled for Figma rebuild (`ServiceListingCard`, `ProductListingCard`, `OrderCard`, `OrderDetail`, consumer dashboard). Re-evaluate after those land rather than forcing a tier now. *(Retained: 2× `text-[10px]` badges, 3× `text-[17px]`, and 11 responsive pairs — `text-[30px] md:text-[40px]` ×6, `text-[22px] md:text-[28px]` ×2, `text-[17px] md:text-[20px]`, `text-xl md:text-[22px]`, `text-2xl md:text-[28px]`. Each commented at its site.)*

🟡 **SharedSearchBar input font 14px — triggers iOS zoom-on-focus.** Standards require 16px minimum on inputs (`servyou-standards-reference.md`, mobile section) because iOS zooms the viewport on focus below 16px. `components/dashboard/shell/SharedSearchBar.tsx:99` is an `<input>` rendering across every consumer page. **Fix in the component audit pass** — it's a behaviour change, not a token swap. *(DS-3b-3 tokenized it to `text-body-sm` (still 14px) as a like-for-like swap; the 16px fix is separate.)*

## /marche/services rebuild — follow-ups (from feat/rebuild-marche-services, 2026-07-24)

🔴 **No `avatar_url` column anywhere — the freelancer world can't ship without real avatars.** Checked all three profile tables (`profiles`, `public_profiles`, `freelancer_profiles`) — none has an avatar/photo column. Every seller surface that shows a person — the v3.7 `ServiceListingCard`, `FreelancerCard`, D4 public profile, D2 service detail's freelancer row — falls back to the initial letter. Acceptable as a stopgap, but a photo-led freelancer marketplace reads as broken without real avatars. **Fix = schema + storage:** an `avatar_url` column on the profile the card reads (must be exposed on the cross-user `public_profiles` view — never leak owner-only columns), a Supabase Storage bucket + RLS for uploads, and upload UI in H3/mon-compte. **Own discovery-first migration PR.** Trigger: before the freelancer world / D4 ship for real.

### Reconcile the services category taxonomy (3 lists disagree)
- **What:** The category filter on `/marche/services` reads the **DB `categories` table** (`lib/marche/filter-categories.ts`, scoped to categories with ≥1 active listing — ~6 today). This does **not** match either (a) the Figma / `docs/design/taxonomy-services.md` **13 parents**, or (b) the untracked `src/lib/taxonomy/service-categories.ts` **10 sectors** (not wired to anything). The DB holds 14 flat, product+service-mixed parents. The rebuild deliberately kept the DB-driven list (restyled into the new single-select dropdown) rather than hardcoding the 13 — because `searchMarketplace` filters via `.in('slug', …)`, so a hardcoded label derives a slug (`"Développement web & mobile"`→`developpement-web-mobile`) matching **no DB row** (`developpement`) → a filter that looks right and returns nothing.
- **Why deferred:** Aligning the DB to the 13 parents is a schema migration (rename/insert/reparent categories + reslug + backfill listing `category_id`s) — approval-gated, discovery-first, out of a frontend rebuild's scope.
- **Trigger:** A dedicated taxonomy-migration PR before the services catalog is seeded for launch.

### Add a Ville (city) filter to the services browse
- **What:** The Figma filter bar (611:45644) includes a **Ville** dropdown; the rebuild **omits** it (a disabled/dead control teaches the wrong thing). No `ville` param exists in `lib/search/search-params.ts` and no city clause exists in `searchMarketplace` — wiring it is genuine data-layer work: a new URL param, a `.eq`/`.in` on `freelancer_profiles.city` (also on `public_profiles.city`), and a city-list source (distinct active-listing cities, or the 7 Tunisia anchor cities).
- **Why deferred:** Out of scope for rebuild #1 (UI replacement); it expands the data layer.
- **Trigger:** When city filtering is prioritized — fold into both `/marche/services` and `/recherche` together (shared search layer).

### Service `tags` are near-empty → card falls back to a category chip
- **What:** The v3.7 card shows up to three **skill chips** sourced from `service_listings.tags`. The column exists but ships mostly empty (7 of 8 active listings today are `[]`), so `ServiceListingCard` falls back to a **single category-name chip** when `tags` is empty — real data (the category) in a slot meant for skills, a stopgap so cards aren't blank (flagged in-code).
- **Why deferred:** Backfilling tags + making them required is a create/edit-flow change, not a browse-page change.
- **Trigger:** Make `tags` required (or strongly prompted) in **H6 (create service) / H7 (edit service)**; once real listings carry tags, **remove the category-chip fallback** in `ServiceListingCard`.

### Sidebar IA drift surfaced by the v2-shell adoption (feat/rebuild-marche-services)
- **"Mes annonces" → /mes-missions vocab drift.** The sidebar item added per Figma `611:45637`
  is labelled "Mes annonces" but routes to `/mes-missions` (the job-posting list). Reconcile the
  vocabulary (annonces vs missions) in a naming pass; not renamed in the shell PR to avoid moving
  a live route. Lives in `sidebar-items.ts`.
- **/statistiques is now nav-orphaned.** "Statistiques" was removed from the shell sidebar (absent
  from the Figma). The `/statistiques` page still exists and builds, but the shell was its only nav
  entry — it's now URL-only until it gets its own IA decision (a freelancer-stats surface). Don't
  delete the route without that decision.

### Scope-A deferrals from the services rebuild (UI parity, no data)
- **Freelances lens:** the Services/Freelances toggle renders with Freelances **disabled ("bientôt")** — the Freelances view + its data layer + cards + `/freelance` pages don't exist yet. Trigger: the freelancer-world build.
- **Grid/list view toggle:** the Figma filter bar has a grid/list display toggle; the rebuild ships **grid only**. Trigger: if a list density is wanted post-launch.
- **AR Phase 8 residue:** `listing.service.{relativeAdded,deliveryTime,by}` (unused by this page) and the broader `/recherche` + `marche.*` French placeholders remain — this PR localized only the keys `/marche/services` renders. Trigger: the Phase 8 AR pass.

### Avatar migration (F2) — one off-scale site + a vestigial prop chain
- **MissionDetail responder avatar is 48px — off the measured scale.** The proposal-responder avatar in `src/components/marche/MissionDetail.tsx` (~L329) is a 48px ad-hoc `bg-brand-blue-800` initials circle using a **local** `initials()` helper (not the deleted `getInitials`). The shared `Avatar` has six Figma-measured sizes — 24/32/40/56/80/120 — and **no 48px**. It was left ad-hoc rather than forced to `md`(40)/`lg`(56): inventing a 7th size violates "measure, don't describe," and MissionDetail is legacy (H10, pre-v2) and does **not** consume the compound API this PR deletes, so nothing forces it. **Why deferred:** no clean size mapping + legacy screen. **Trigger:** the freelancer-missions rebuild — migrate to the shared `Avatar` fallback then (or measure a 48px size into Figma first if the design calls for it).
- **AccountMenu `fullName` prop is now vestigial.** `src/components/layout/AccountMenu.tsx` accepted `fullName` only to derive initials; the trigger now renders the shared `Avatar`'s decorative person-glyph fallback (no image data source). `fullName` was kept in the prop type (still passed by `Header.tsx:184`, type-checks) but is no longer read — removing it would ripple `AccountMenu ← Header ← Header's callers`, out of scope for an avatar migration. **Why deferred:** the prop-chain unwind is a separate refactor. **Trigger:** when the legacy `Header`/`AccountMenu` is retired (blocked on the landing/recherche/categories rebuilds).

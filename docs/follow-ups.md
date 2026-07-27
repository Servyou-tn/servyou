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

## F3 primitives — Button · Input · StatusPill (from feat/f3-primitives-batch-1, 2026-07-26)

F3 was **build-only**: the three primitives were built and brought under the gate; **no call site was migrated**. The bespoke implementations keep working. This section is the F-next migration + the Figma authoring gaps surfaced while reconciling.

### Migrate call sites to the F3 `Button` (~30+ bespoke buttons)
- **What diverges from the primitive** (all measured while mining): **5 ad-hoc variant styles** (primary `bg-brand-blue-600`; danger `bg-red-600`/red-outline; secondary `border-gray-300`; blue-outline admin-claim; green-outline unsuspend); **5 radii** — `rounded`(admin family), `rounded-md`(`CopyableEmail`), `rounded-lg`(menu rows), `rounded-xl`(auth `field-styles.ts:15`), `rounded-full`(marche: `MissionDetail`, `MissionForm`, `ContactForm`, `error.tsx`, `ParametresForm`, `ExportDataModal`) → the primitive standardizes on `rounded-lg`; **3 disabled opacities** (`opacity-50` admin+`Favorite`, `opacity-60` consumer/`MissionDetail`, `opacity-70` auth) → the primitive recolors instead; **5 loading idioms** (label-swap, spinner+label, success-glyph, `useTransition`, `useState`) → the primitive's `loading` prop unifies; **~7 danger sites** (`bg-red-600` → `danger-500`/`700`).
- **The clearest single win:** `aria-busy` was set on **exactly one element repo-wide** (`LanguageToggle`); every bespoke action button (auth submits, admin, modals, `MissionDetail`) spins without announcing busy to assistive tech. Migrating to `<Button loading>` fixes this everywhere.
- **Why deferred:** call-site migration is its own reviewable surface (and each migration is a visible change — e.g. marche's pill buttons become `rounded-lg`). **Trigger:** per-surface rebuilds; do the auth funnel and the admin family as two focused passes.

### Migrate call sites to the F3 `Input`
- Auth funnel (`src/components/auth/field-styles.ts`) is the de-facto Input: `rounded-xl` (primitive is `rounded-lg`) and **navy-context label/helper/error colors** (`text-white` / `brand-blue-200` / `red-300`) that assume the AuthShell navy background. The primitive is built for a light surface (Figma). Migration must pass a context override for the navy labels, OR the AuthShell adopts a light field area. **Trigger:** auth-funnel rebuild. Consumer/admin textareas migrate with their forms.

### Migrate call sites to the F3 `StatusPill`
- Live: `src/app/admin/utilisateurs/page.tsx:34` `StatusBadge` uses raw `bg-green-50 text-green-700` / `bg-red-50 text-red-700` (not the `success`/`danger` tokens) and `px-2 py-0.5 font-medium` (primitive is `px-3 py-1 font-semibold`). Swap to `<StatusPill status={…}>{tr(key)}</StatusPill>`. Most other status renders live in the still-unwired dashboard tree. **Trigger:** admin polish + dashboard wiring.

### Figma authoring gaps surfaced by F3 (owed by design, not code)
- **Button danger hover/pressed render `#808080` grey** while bound to `$danger/500` — a placeholder painted over a live binding; there is no valid darker-red. Code uses `danger-700`. *Owe:* real hover/pressed danger values.
- **Button link variant has no Figma hover treatment.** Code adds `hover:underline`. *Owe:* a hover.
- **Button `badge(bool)` prop** is in the registry but no variant demonstrates it and no call site needs it — **not built**. *Owe:* a demonstrated design, or drop the prop from the registry.
- **Button focus renders `#808080`** (bound `$blue/600`) — cosmetic placeholder; code correctly uses `FOCUS_RING`. *Owe:* repaint the focus stroke to its bound value.
- **Button padding was never encoded** — every variant is a fixed 120px demo width, so the label insets are a centering artifact. Code uses token-scale `px-3/4/6`. *Owe:* real horizontal padding per size.
- **Button label weight — RESOLVED in F3 (Figma source corrected).** The label weight was an unset default: `Inter Regular`/400, with **0 of 42 labels binding a fontWeight/fontStyle variable** (only `fontFamily`), inconsistent with StatusPill (Semi Bold) and the ~40 call sites (medium/semibold). Per founder direction the **Figma source was fixed first** — all 42 labels set to Semi Bold (600) via figma-cli — then the primitive built to `font-semibold`. Not owed; recorded because F3 edited the design source.
- **Input `success` state renders a neutral `border-strong` border** — visually identical to default; success is not distinct. Code follows Figma. *Owe:* a green success border/icon if success should read as distinct.

### VRT capture — Windows-local Storybook-boot flake (observed; not reproduced on CI Linux)
Spot-checking the F3 stories locally on **Windows** headless Chrome, individual stories intermittently screenshot **blank** (~99% diff) — and it hit *different, unrelated* stories each run (e.g. `input-affordances`, which has no touch-target span), so it is a capture race, not a component regression: the large Storybook JS chunk occasionally finishes rendering after `scripts/vrt/capture.mjs`'s post-load settle. **On CI Linux the same push captured all 32 stories cleanly** (F2 also measured a 0.000% floor there), so the shared `capture.mjs` was deliberately **not** changed — a behavioural change to it would force a full re-baseline of every story on Windows-only evidence. **Trigger:** if the flake appears on CI Linux once the F3 baselines exist, add a bounded wait-for-content poll (e.g. `#storybook-root` has rendered children) to `capture.mjs` before the screenshot, then re-baseline. **Why deferred:** no CI evidence yet; changing the shared harness speculatively is the wrong trade.

### The 3 off-token interactive-surface shadows (still owed, carried from F2)
- `src/components/ui/interactive-surface.ts` lines 19/23/29 carry custom off-token shadows with no Figma equivalent (grandfathered with `eslint-disable`). F3 was scoped to the three primitives and did **not** resolve them. Full context + the two resolution paths are in `docs/f2-state.md` §"3 — F3 founder decision owed". **Trigger:** a founder decision on the shadow scale (map to an existing `--shadow-*`, or author new shadow token[s] via the Figma → token pipeline).

## F4a — seller_type resolver (from feat/f4a-seller-type-resolver, 2026-07-26)

### Four separate reads of the SAME current-user profile per render (the real perf item — F4b)
`getShellUser` (`lib/marche/shell-user.ts:18`), `getDashboardProfile` (`lib/dashboard/data.ts:26`), `getCurrentProfile` (`lib/marche/mon-compte.ts:28`), and the homepage (`app/page.tsx:37`) each issue their **own** `.select(…seller_type…)` against `profiles` for the signed-in user — up to **four round-trips for one profile per render**. This is the genuine redundancy F4a did **not** touch: F4a centralized the role *derivation* (9 sites → the `@/lib/roles` resolver), not the *fetch*. Two of the four are `cache()`'d within a request, but across the shell + page + rail they don't dedupe. **Why deferred:** unifying the current-user profile read belongs with the two-shell consolidation. **This is F4b scope** — recorded now so it survives if F4b slips. **Fix idea:** one `cache()`'d current-user profile reader the shell + page + rail all call; and when a role-ONLY need first appears, add `getUserRole()` to `@/lib/roles` (the pattern is documented in that file) rather than an 8th ad-hoc select.

## /marche/services Phase 2 — follow-ups (from feat/marche-services-rebuild, 2026-07-26)

### 🔴 The Figma radius scale is in `:root` but NOT in `@theme` — `rounded-lg` is still 8px
- **What:** `src/styles/tokens.css` (generated from Figma) defines the canonical radius ramp,
  including **`--radius-lg: 10px`**, but it emits them into **`:root`**. Tailwind v4 only turns a
  custom property into a utility when it is declared inside **`@theme`**, and `globals.css`'s
  `@theme inline` block adds only `--radius-card` / `--radius-pill` — its comment says so
  explicitly: *"Semantic spacing/radius/shadow aliases (distinct names; **no built-in scale
  overridden**)"*. So **`rounded-lg` still resolves to Tailwind's built-in 8px**, and the DS token
  at 10px is unreachable from a class name. Same mismatch for `--radius-md` (8px token vs. the
  built-in `rounded-md` 6px).
- **Consequence:** every surface the Figma measures at radius 10 — sidebar nav items, the topbar
  search + icon buttons, the filter-bar controls, the lens-toggle track, the card CTA — must ship
  `rounded-[10px]`. Swapping those to `rounded-lg` looks like a free token cleanup and is actually
  a silent **2px regression**; nothing catches it (the boundary lint gates colour, not dimension,
  and the build stays green). This is the `docs/design/marche-services-measurements.md` gap #1,
  now diagnosed to its root cause.
- **Why deferred:** the fix — wiring the generated radius scale into `@theme` (or adding a
  distinct-name alias such as `--radius-control: 10px`, following the `--radius-card` precedent) —
  **retunes 34 existing `rounded-lg` call sites by +2px**, including the F3 `Button` primitive,
  whose VRT baselines are committed at the 0.05% threshold. That is a guaranteed gate break and a
  full re-baseline: a DS PR, not a page rebuild.
- **Related, check when doing it:** F3's `Button` standardizes on `rounded-lg`. If the Figma
  measured its radius at 10, the merged primitive already carries this same 2px delta.
- **Trigger:** a DS radius/token PR that can afford the re-baseline.

### ServiceCard off-token values with no DS equivalent
- `h-[279px]` (measured card height) and `text-[17px]` (measured price size) in
  `ServiceListingCard.tsx` have **no token to map to** — forcing them onto a near tier would be
  worse than a documented raw value, and neither fails CI. Retained deliberately, commented in
  place. **Trigger:** re-evaluate when the type ramp gets its Figma pass (typography is still the
  documented token gap — see `docs/frontend-audit.md`).

### Consolidate `ServicesLensToggle` into the shared `SegmentedControl`
- **What:** `ServicesLensToggle` is a bespoke parallel toggle. It was deliberately **kept** in
  this PR: the shared `src/components/ui/segmented-control.tsx` supports neither a **disabled
  option** nor a **"Bientôt" badge**, and both are load-bearing while the Freelances lens is
  deferred. Adding them is component work that would block a page build.
- **Trigger:** the F3 Segmented reconciliation batch (see the parked inventory below) — add
  disabled-option + badge + per-option icon support there, then migrate this toggle.

### `service_listings` has no `is_published` column — the publish gate is `status='active'`
- **What:** Verified against the live schema: `service_listings` carries `status text NOT NULL`
  (plus `admin_hidden_at`) and **no `is_published`**. Every consumer surface gates on
  `status = 'active'`. The locked two-CTA **Save / Publish** model assumes an `is_published` flag
  per publishable entity, so draft-vs-published is currently encoded in `status` values rather
  than a dedicated column.
- **Why deferred:** reconciling the two is a **schema migration** (add the column, backfill from
  `status`, update every read path + RLS), approval-gated and discovery-first — not a frontend
  rebuild's scope.
- **Trigger:** before H6/H7 (create/edit service) ship their real two-CTA footer; fold in the
  equivalent `products` gate so both catalogs move together.

### Ville filter — mobile parity + /recherche exposure
- The desktop `ServicesFilterBar` now has a **Ville** dropdown; the mobile `SearchFiltersSheet`
  does **not**. That sheet is **shared with /recherche**, so adding a city control there changes
  two surfaces at once and needs its own pass. The `ville` param itself lives in the shared
  search layer and already applies on /recherche if hand-typed (and now counts in
  `searchHasFilters`), it is simply not exposed in that UI yet.
- **Trigger:** fold Ville into the shared filter sheet when /recherche gets its rebuild.
- **Known ambiguity in the empty state:** the control is hidden when `cities` is empty, and
  `getServiceCities()` also returns `[]` on a **query error** (logged, per the never-a-silent-
  empty-list rule). So a transient failure removes the Ville dropdown while Catégorie and Prix
  still render — it reads as "this page has no city filter" rather than "degraded". Deliberate
  (it beats a dead control), but do not mistake a missing Ville dropdown for a regression:
  check the server log for `[filter-cities]` first.

### Avatar placeholder grey (`#cbd5e1`) has no semantic token
- The Figma topbar avatar fill is **#cbd5e1**; the DS `--surface-placeholder` is **#f4f4f4**. The
  F2 `Avatar` primitive's person-glyph fallback already paints `bg-border-strong`, which **is**
  #cbd5e1 — a *border* token used as a background. It wants a slate/300 primitive, and the slate
  ramp is already logged as missing in the token inventory. **No raw hex was introduced**; the
  topbar avatar keeps the primitive's Figma-measured `initials` variant (brand-blue-100 /
  brand-blue-600) rather than being repainted, because the fill lives inside the F2 primitive and
  changing it would re-baseline the F2 VRT snapshots.
- **Trigger:** the DS pass that adds the slate ramp — then give the fallback a real
  `avatar-placeholder` surface token and drop the border-token-as-background.

## F3 batch 2 — Segmented + Select reconciliation (PARKED; inventory from feat/f3-batch2-select-segmented)

The branch's build stalled on the flaky figma-cli bridge; its Phase-1 inventory is preserved here so it survives the branch deletion. Both primitives exist in `src/components/ui/` but were **never measured against Figma → not reconciled** (F3-style). Reconcile in a later batch; the /marche/services rebuild consumes them as-is and inherits the fix.

- **Segmented** — `src/components/ui/segmented-control.tsx` (`'use client'`). Controlled (`value`+`onChange`); `role="tablist"`/`"tab"` + `aria-selected` + `aria-label`; Motion `layoutId` sliding pill + `useId` instance isolation; reduced-motion snap; `FOCUS_RING`; all tokens (`bg-surface-pill` track, `bg-brand-blue-600` active pill, `text-white`/`text-text-muted`, `rounded-full`, `px-4 py-1.5 text-sm font-medium`, `min-w-20`). **2 real consumers:** `SharedSearchBar.tsx:101`, `ParametresForm.tsx:99`. **Keyboard gap:** native `<button>` gives Tab + Enter/Space, but **no arrow-key roving** (the ARIA tabs pattern owes roving `tabindex` — confirm against accessibility.md when reconciling). **Not a consumer:** `ServicesLensToggle` is a *parallel bespoke* toggle (`rounded-lg`, static white pill, disabled "soon" Freelances + badge, per-option icons). **Figma `93:2707`** (18 variants: count[2,3,4] × state[default,focus] × selected, props label1-4 + **icon1-4**) → the primitive **lacks per-option icons** (in Figma, not code → build on reconcile).
- **Select** — **no reconciled Select primitive exists.** `ServicesFilterBar` builds its 4 triggers ad-hoc on `ui/dropdown-menu` + `ui/popover` (+ `ui/filter-control`), none reconciled. Figma: Select — Trigger `72:1051` / Panel `72:1094` / Option `72:894`; Filter Bar `150:10825`; Range Slider `143:9517`.
- **Node IDs for eventual measurement:** Segmented `93:2707`, Filter Bar `150:10825`, Select Trigger `72:1051` (+ Panel `72:1094`, Option `72:894`), Range Slider `143:9517`, Service Card `124:6200`, Pagination `188:14219`, empty state `611:47916`, frame `611:45637`.
- **Bridge note:** the figma-cli CDP bridge (`connect`) drops after ~1 command and Figma MCP is capped at 6 calls/month on the free Starter plan (not viable). The **Figma REST API** (`GET api.figma.com/v1/files/:key/nodes?ids=…`, `X-Figma-Token`) returns raw `padding`/`itemSpacing`/`absoluteBoundingBox`/`boundVariables` over plain HTTPS with no plugin — the robust path for future measurement (variable *names* still need the CDP bridge or a paid tier; the `/variables/local` name endpoint is Enterprise-gated).

## Visual-gate findings — v2 shell at 375px (from feat/marche-services-rebuild, 2026-07-26)

Surfaced by the 375px gate run over the shell's blast radius. All three are **pre-existing**
(verified against `2a911f5^`), so per Standard G they are logged, not fixed in the shell PR.

### 🔴 12 of the 20 v2-shell routes cannot be gated without an authenticated session
- **What:** `AppShell` is mounted at **20** sites (19 `page.tsx` + `ServicesBrowsePage`). Only
  **/marche/services, /marche/produits, /services/[id]** render it anonymously — the other 12
  workspace routes 307 → `/connexion`. `AppShell` does render logged-out (consumer IA, per its own
  header comment), so the shell *code path* is exercised; what is **not** reachable is the
  **`freelancer` and `shop_owner` sidebar variants** and every workspace page's content reflow.
- **Consequence:** a sidebar regression that only manifests in a seller IA — a wrong section cap, a
  clipped nav on a short viewport, a role-specific item — **cannot be caught by an anonymous gate**,
  and there is no VRT story for any shell component either (the 32 baselines are F2 `Avatar` + F3
  `Button`/`Input`/`StatusPill` only). The shell is the single most-shared surface in the app and is
  currently the least gate-covered.
- **Fix (two options, not exclusive):** (1) a seeded **gate account per `seller_type`** + a scripted
  login so the sweep can reach the workspace routes; (2) **Storybook stories for `Sidebar` /
  `SidebarItem` / `SidebarSection` / `Topbar`** at the three roles × 375/1440, which brings the shell
  under the existing VRT gate and needs no session at all. (2) is cheaper and catches more.
- **Trigger:** before the next shell-touching PR — this gap recurs on every one.

### Topbar language toggle is a 24px touch target
- `src/components/layout/LanguageToggle.tsx:64` renders each FR/AR button at `h-6` (**24px**;
  measured 41×24 and 43×24 at 375px) with **no hit-area expander**. The touch-target rule requires
  ≥44×44. Pre-existing — `h-6` is byte-identical in `2a911f5^`; that commit only changed the
  active/idle colours. The fix is the F3 pattern already used next to it: an
  `absolute -inset-*` `aria-hidden` span (see `TopbarUserMenu.tsx:52`,
  `TopbarNotifications.tsx:34`), which keeps the measured 24px box while giving a 44px hit region.
- **Trigger:** the touch-target code pass, or the next topbar-touching PR.

### `TopbarSearch` input is 14px → iOS zoom-on-focus (second instance)
- `src/components/shell/TopbarSearch.tsx` ships `text-body-sm` (**14px**), below the 16px iOS
  threshold, so focusing it zooms the viewport on iPhone. This is the **same defect already logged
  for `SharedSearchBar.tsx:99`** — now confirmed on the v2 topbar too, i.e. it affects every one of
  the 20 shell routes, not one component. Pre-existing: `text-body-sm` is unchanged across
  `2a911f5` (that commit swapped `cn()` for a plain template precisely to *stop* tailwind-merge
  dropping the size, and to move the radius to `rounded-[10px]`).
- **Note for whoever fixes it:** bumping to 16px is a **visible** change to the topbar and the
  measured Figma value is 14 — so it needs a design call (16px input text, or a 16px override only
  under `max-lg`), not a silent token swap.
- **Trigger:** fold both instances into one pass — the component audit already scoped for
  `SharedSearchBar`.

### `/categories/[slug]` renders empty while the DB has active listings
- `http://localhost:3000/categories/marketing` renders **"Aucune annonce dans cette catégorie"**,
  but the database reports **5 active `service_listings`** for that slug:
  `select c.slug, count(sl.id) from categories c left join service_listings sl on
  sl.category_id = c.id and sl.status = 'active' group by c.slug` → `marketing = 5`. The page
  resolves the slug (it returns 200, not 404), then finds nothing.
- **Pre-existing, not the services-delta branch.** Confirmed by stashing that branch's changes and
  re-requesting the route on clean `main` — same empty state. The only change that branch makes near
  this path is a `className` gap on `ListingResults`, which cannot affect a query.
- **Consequence:** every `/categories/*` landing page is likely dead for services. It also means the
  shared `ListingResults` service grid has **one consumer that cannot be exercised** — the P11 mobile
  gap change was verified live on `/marche/services` and `/recherche` only (the consumer homepage is
  auth-gated).
- **Suspected area:** how `categories/[slug]/page.tsx` resolves the slug to the id(s) it passes to
  `searchMarketplace` — parent-vs-child category id, or a type filter — but this was **not chased**;
  the above is the observation, not a diagnosis.
- **Trigger:** before any `/categories` rebuild, and before anyone relies on that route's numbers.

### Filter-bar search field is 40px where Figma `611:45644` measures 44
- The services filter bar renders its search field at `h-10` (**40px**) while the Figma search
  measures **44**, taller than the 40px selects beside it. Row **P1** of
  `docs/design/marche-services-deltas.md`.
- **Deliberately not fixed.** It was built and then **cut by founder direction**: out of scope for
  the services-delta PR, and 44 makes the search visually inconsistent with the 40px Catégorie /
  Ville / Prix / Trier-par controls sharing its row. Reinstating it should come with a decision about
  whether the *selects* move to 44 too, rather than a lone taller field.
- **Trigger:** whenever the filter row is next revisited as a whole.

### D2 — three deliberate non-builds, so a future pass does not read them as oversights

All three are founder-decided on the D2 build (`feat/d2-service-detail`, Figma `666:55479` /
`668:55920`). None is a defect; each is recorded here because the *absence* is the decision.

- **`revisions_count` is in the data layer with no D2 region — by design.** The column exists and
  is populated on 21/21 active listings, and `getServiceDetail` returns it as `revisionsCount`.
  `666:55479` has **no region for it**, and UI that is not designed does not get invented. It is
  carried for **E1**, where the buyer needs the revision count *before* committing. If you are
  about to surface it on D2, that is a design decision first, not a wiring task.
- **D2 has no gallery region, and the `service_media` fetch was removed.** `service_media` exists
  but holds **zero rows**; the per-service gallery was retired in favour of
  portfolio-per-freelancer, and neither D2 frame has a gallery. The resurrected
  `service-detail.ts` was still selecting it, feeding nothing — dead weight the next reader would
  assume was load-bearing. **If work samples ever return to D2, the Figma design comes first**,
  then the query.
- **The related-services heading diverges from the Figma, deliberately.** The frame reads
  *"Autres services de {freelancer}"*, which assumes a **same-freelancer** rule. The approved rule
  is **category-first** (category → freelancer → newest active, deduped, cap 3), so the set is
  mixed and a freelancer-scoped heading would be factually wrong for most rows. Ships as the
  neutral **"Services similaires"** (`serviceDetail.related`, FR + AR). If the rule ever becomes
  freelancer-only, the Figma heading becomes correct again and this should be revisited.

### `FavoriteButton` is a text glyph where the design wants an icon button
- `src/components/FavoriteButton.tsx` renders a **`p-2 rounded-full text-xl` button containing a
  `♡` / `♥` text glyph** (and a `text-gray-300 ♡` in its loading state). Figma wants a **20px
  stroked icon inside a 44px box**: on D2 the buy box's `icon-heart-btn` is `147×44`, `r=10`,
  stroke `1 #cbd5e1` on white, holding a `20×20` icon at stroke `2 #64748b` (`666:55479`).
- A **text glyph is not a substitute for an icon**: it inherits font metrics rather than a fixed
  box, so it cannot be sized to 20px reliably, its optical weight differs from every other
  `lucide-react` icon in the app, and it renders differently across platforms and fonts.
- **Pre-existing and unrelated** to the D2 width collapse fixed in `fix/d2-panel-deltas` — that
  was a grid-column issue. Confirmed the glyph renders identically in both auth states, so it is
  not an auth-dependent path either.
- **Blast radius — 3 consumers**, so this is not a D2-local fix: `ServiceDetail.tsx` (the D2 buy
  box), `ServiceListingCard.tsx` and `ProductListingCard.tsx` (the card corner hearts, which are
  a different size and treatment again). A per-page patch would fork the component three ways.
- **Fix as part of a proper icon-button pass across the app**, alongside the other two open
  icon-button items already logged here (the `LanguageToggle` 24px touch target, and the F3
  invisible hit-area pattern) — they share a target shape and should land together.
- **Trigger:** the icon-button / touch-target pass, or whenever `FavoriteButton` is next opened.

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

## E1 / E2 — service request + confirmation (`fix/e1-e2-service-request`)

### `submitServiceRequest` validates by hand, not with Zod
- CLAUDE.md requires server actions to validate input with Zod before any mutation.
  `src/app/demander/[id]/actions.ts` predates that call site being built and validates with
  explicit checks (trim + length floor, `isValidPhone`, `Number.isFinite`). The checks are
  correct and now covered by `src/__tests__/service-buyer-note-roundtrip.test.ts`.
- **Deliberately left alone.** Converting it is a rewrite of shipped, working code and collides
  with *once built, stays built*; the founder's call on the E1 discovery was to log the
  divergence rather than fold a refactor into a page rebuild.
- **Trigger:** whenever the product half of that file is opened for the product E1 rebuild —
  convert both actions in one pass, with the round-trip test as the guard rail.

### `Button` size=lg horizontal padding is 24 in code, 20 in Figma
- `src/components/ui/button.tsx` ships `lg: 'h-12 px-6'`. Every authored `lg` instance in E1/E2
  measures `pad:0,20,0,20` → `px-5` (`680:56469`, `682:56920`, `691:57233`, `691:57244`).
  `md` matches (`px-4` ↔ `pad:0,16`); only `lg` diverges.
- This is **new information**, not a contradiction: the primitive's own comment records that the
  Button COMPONENT_SET authored a fixed 120px demo width, so real padding was never encoded
  there. E1/E2 are the first frames to encode it at the instance level.
- **Not fixed here** — it moves every `lg` button in the app and would fight the VRT baseline.
  E1/E2 use the primitive as shipped.
- **Trigger:** the next primitives pass; change `SIZE.lg` to `px-5` and re-baseline VRT.

### The type scale has no tokens for 13 / 15 / 22 / 26 / 30px
- E1/E2 carry ~25 `text-[15px]` / `leading-[22px]` / `text-[13px]`-style bracket values. These
  are **measured, not guessed**, and match what D2 (`ServiceDetail.tsx`) already ships — the two
  pages sit next to each other and must not diverge.
- The real gap is upstream: `@theme` has no token for these steps, so every page re-types them.
- **Trigger:** the typography-token pass deferred out of F1 (token foundation).

### E2 reads the price live, so a historic order's amount can drift
- `orders` stores **no price column**. E2's récap and `getOrderDetail` both read
  `service_listings.starting_price_tnd` at render time, so if a freelancer edits their price
  after a request lands, the buyer's confirmation shows the NEW figure.
- Acceptable at MVP (the price is explicitly a starting point negotiated on WhatsApp, and E2 is
  read within minutes of submitting) but wrong for any later receipt or dispute surface.
- **Trigger:** the first surface that must show what was agreed rather than what is listed —
  likely E3 order history or the dispute flow. Fix is a price snapshot column on `orders`.

### E2 récap shows one chip where Figma shows two
- `690:57171` renders a category chip plus a tag chip. E2 sources its récap from
  `getOrderDetail`, whose `item` exposes `category` but not `tags`. Widening that read — used by
  order views not being rebuilt here — for a cosmetic chip was rejected as scope creep.
- E1's summary panel does render `[category, ...tags]`, so the two screens differ by one chip.
- **Trigger:** whenever `getOrderDetail` is next extended for E3.

### 375px: the shell top bar overflows the viewport by 56px (PRE-EXISTING)
- At a 375 viewport with a **logged-in** user, `document.scrollWidth` is **431** against a 375
  client width on every page measured: E1 (new), **D2, C1 `/marche/services` and `/marche`
  (all untouched and already merged)** — identical offender, identical 56px.
- Offender is the Topbar's right cluster, `div.flex.shrink-0.items-center.gap-4` (left 219 →
  right 431) holding the 48px avatar button. `shrink-0` on a row that has no room to shrink.
- Harness validated with a negative control before reporting (injected a 9999px div → registered
  +8574), so this is a real overflow, not an `overflow-x` artifact.
- **Not introduced here and not fixed here** — it is a shell defect with every rebuilt page as a
  consumer, and `project_frontend_audit` recorded "380px 0-overflow" from a logged-OUT sweep,
  which is why it was missed.
- **Trigger:** the next `components/shell/*` pass. Re-measure logged-IN at 375.

### CDP click harness cannot deliver synthetic mouse input (tooling note)
- `Input.dispatchMouseEvent` (mouseMoved → mousePressed → mouseReleased, correct `buttons`,
  hit-tested on-target) delivered **zero** pointer/mouse/click events to the page — verified with
  a capture-phase listener on `document`, and reproduced on an ordinary untouched breadcrumb
  link, which also failed to navigate.
- The E1 create flow was therefore verified through `button.click()` and `form.requestSubmit()`,
  both of which run the real React submit handler; each produced a real `orders` row and a fully
  rendered E2.
- Contradicts `reference_cdp_visual_gate`, which records real mouse events as the way to open
  Radix menus. Whatever changed, **validate input delivery with a control listener before
  trusting a null click result.**

## VRT harness — diagnosability (found on PR #95, run 30290935264)

### `capture.mjs` discards Chrome's stderr, so a launch failure cannot be diagnosed
- `scripts/vrt/capture.mjs:66` spawns Chrome with `{ stdio: 'ignore' }`. When the DevTools
  endpoint never opens, the only evidence left in the job log is `waitFor exhausted` from the
  `/json/version` poll on line 67 (40 × 250ms = a 10s budget).
- **A crash, a sandbox refusal and a merely-slow cold start against a fresh `--user-data-dir` are
  therefore indistinguishable** — Chrome's own explanation was thrown away.
- Observed once so far: PR #95 died 10.14s after the static server came up, on a runner with
  Chrome 150.0.7871.128 and image 20260720.247.2 — **byte-identical to the previous green run**,
  so the log gave nothing to work with.
- **Fix:** pipe Chrome's stderr into the job log (`stdio: ['ignore', 'ignore', 'pipe']` and echo
  it on the failure path, or `'inherit'`). Consider surfacing a non-zero exit from the child too.
- **Trigger:** next time the VRT harness is opened, or the next unexplained capture failure.

### A Chrome launch timeout is reported as "32 stories were deleted"
- When capture produces zero images, the check step compares an empty current set against the full
  committed baseline and prints
  `ORPHAN BASELINE (32) — a story was deleted/renamed; remove these from scripts/vrt/__baselines__`.
- **That blames the author's branch for a harness fault.** On PR #95 the branch added no story
  file at all, and the suggested remedy — deleting all 32 baselines — would have been actively
  destructive if followed.
- The gate line has the same problem: `0 compared / 0 missing / 32 orphan → FAIL` reads as a
  content change rather than "the browser never started".
- **Fix:** distinguish *zero captures taken* from *genuine orphans* before printing. If the
  current set is empty (or the capture step exited non-zero), fail with a harness error and say
  so; only reach the orphan message when captures exist and a baseline has no counterpart.
- **Trigger:** same pass as the stderr item above — they share a root cause and a test case.

## E3 — Mes commandes, Services tab (`feat/e3-mes-commandes-services`)

### Three things the accordion design drops — all candidates for reviving `/mes-commandes/[id]`
Founder direction: `/mes-commandes/[id]` stays a ComingSoon stub rather than being deleted or
redirected, precisely because these three land there later. Deleting it now would mean rebuilding
the route, its i18n block (`fr.ts` / `ar.ts`, "Order detail page") and its `active-route` entry.

1. **Buyer cancellation has no surface, though the DB permits it.**
   `check_order_status_transition` lets a buyer cancel from any non-terminal state
   (`pending` / `accepted` / `arrived`) with `cancelled_by='buyer'`, plus a
   `cancellation_reason` once the order is at `accepted` or later. The Figma body
   (709:59730) offers only WhatsApp + "Confirmer la réception". `CancelOrderModal.tsx`
   already exists and has **zero importers**.
2. **The buyer's own brief is absent, though it is the substance of a service order.**
   E1 collects description / délai / budget, E2 displays them, and `getOrderDetail`
   already unfolds all three from `buyer_note`. The accordion body shows none of it — the
   buyer cannot re-read what they asked for.
3. **Cancelled rows have no designed body.** row-6 (`annulée`) is collapsed-only in both
   frames, so `cancellation_reason` and `cancelled_by` (already bilingual as
   `common.cancelled_by_buyer` / `_seller`) have nowhere to render, and the 4-stage rail has
   no cancelled representation. This build keeps a body for cancelled orders but renders it
   SUBTRACTIVELY — WhatsApp + reference only, no rail, no confirm — rather than inventing one.

### Order reference is a truncated uuid, not a sequence
- Figma meta (709:59733) reads "Commande #CMD-2024-0318". `orders` has 18 columns and **no
  order-number column** — the PK is a bare uuid, so that string has no data source.
- Founder call: **no migration.** Render the uuid's first 8 chars ("Commande #3cf896e1 · Passée
  le 20 novembre 2024") — unique, stable, already exists, zero DB work for a cosmetic string.
- **Trigger:** if support ever needs a human-quotable reference (phone/WhatsApp support reading an
  order number aloud), add a `CMD-{year}-{seq}` generated column. Until then the short uuid is
  strictly better than a migration.

### Two deliberate divergences from Figma 709:59662 — fix the FIGMA, not the code
1. **Label for `arrived`.** The frame says "Livrée" in the rail and "Livré" in the pill — two
   spellings of the same state, in the same frame. The shipped i18n already has
   `common.status_arrived_service` = "Travail livré" / "العمل مُسلَّم", which is correct for a
   service (work delivered, not a parcel) and exists in both locales. Code uses the shipped
   string. **Changing shipped, bilingual i18n to match a Figma authoring bug is backwards.**
2. **Tone for `arrived`.** The frame uses StatusPill `delivered` → tone `success` (green). But
   `reçue` is ALSO `success`, so two adjacent lifecycle states render identically and the buyer
   cannot see at a glance whether they still owe a confirmation. Code uses `arrivee` → tone
   `info` (blue). **Green means done.**
- **Trigger:** next Figma pass on E3 — fix the gender mismatch and repaint the pill.

### The `received` rail renders all four stages completed — a documented choice
- Figma 709:59662 only ever mocks the `arrived` row, so **there is no frame showing what a
  finished order's rail looks like**. This is a decision, not a measurement, and it is recorded
  here because nothing in the design can be pointed at to justify it.
- **Decision (founder, 2026-07-27): a terminal state owes nothing.** `received` renders every
  stage — including "Reçue" itself — in the `completed` treatment (blue-600 fill + white check),
  and the connectors all read `border-strong`.
- **Why not `current` on stage 4:** the `current` treatment (white circle, 2px blue ring, blue
  dot) is the rail's signal for *"you are here, something is outstanding"*. On a received order
  it would imply an action the buyer still has to take, when `check_order_status_transition` has
  already closed the row — `received` is terminal and raises on any further transition.
- Verified across all four states against 709:59712 / 59717 / 59722 / 59727; the other three
  match the frames exactly. Implemented in `stageState()`
  (`src/app/mes-commandes/_components/order-status.ts`).
- **Trigger:** if E3 ever gets a `received` frame in Figma, reconcile against it — and if the
  design disagrees, this reasoning is what has to be argued with.

### `refresh-registry.js` validation cannot detect a screens-less scan
- The wrapper "REFUSES to overwrite a good registry with an error/empty scan", but its guard only
  checks `variables >= 50`. A transient CDP hiccup mid-scan produced a registry with **0 screen
  frames** and an `ERROR reading components` line, and it was written over the good file anyway
  (recovered by re-running once the bridge settled).
- **Fix:** extend the guard to also require a plausible `screen frames` count and to reject output
  containing `ERROR reading`.
- **Trigger:** next time that script is touched. Note both `scripts/figma/` and
  `docs/design/figma-registry.md` are UNTRACKED, so this is a local-tooling item.

### `globals.css` is shared with Storybook — bare element selectors there hit all 32 VRT baselines
- **What happened:** the E3 expand-reflow fix first landed as `html { scrollbar-gutter: stable }`
  in `src/app/globals.css` (`3f42247`). `.storybook/preview.ts:4` imports that file **by design**
  (stories must render through the real F1 token chain), so the rule also applied to every story
  iframe and shifted **all 16 desktop VRT baselines** — max **0.697%** against a **0.05%** gate.
  Storybook renders isolated components on a centred canvas with no page to scroll: there was no
  shift to prevent there, only 15px narrower snapshots forever, for an app-layout reason.
- **Resolution:** the declaration moved to a `[scrollbar-gutter:stable]` class on the app's root
  element in `src/app/layout.tsx`, which Storybook never renders. Same computed result in the app
  (verified: `getComputedStyle(document.documentElement).scrollbarGutter === 'stable'`), zero
  reach into stories.
- **The general rule:** `globals.css` is not app-only. A bare element selector (`html`, `body`,
  `a`, `ul`…) added there is a **global change to the component gate as well**. App-layout
  concerns belong on an app-owned element/class; only tokens and genuinely universal resets
  belong in the shared file. A `@layer`/`:root`-scoped custom property is safe; a styled element
  selector is not.
- **Fix (optional hardening):** either give Storybook a preview stylesheet that imports only
  `src/styles/tokens.css`, or add a lint/CI check that fails on new bare element selectors in
  `globals.css`. Neither was done here — the one-line placement fix is enough for this defect and
  the split-stylesheet change would need its own re-baseline.
- **Trigger:** next time anything is added to `globals.css` outside `@theme`/`:root`.

## Moderation read paths (`fix/moderation-filter`, 2026-07-28)

### `admin_hide_content` hides by two different mechanisms — consider making it cascade
- **What:** the RPC's behaviour is **not uniform across target types**:
  | Target | sets `status='hidden'` | sets `admin_hidden_at` |
  |---|---|---|
  | `product` | ✅ | ✅ |
  | `service` | ✅ | ✅ |
  | `shop` | ❌ (no status column) | ✅ |
  | `freelancer_profile` | ❌ | ✅ |
  | `job_post` | ❌ (**has** `status`, left untouched) | ✅ |
- **Why it is a trap:** hiding a shop or a freelancer leaves **every child listing at
  `status='active'`**. A reader that filters `status` alone therefore catches a directly-hidden
  product but happily lists a moderated seller's entire catalogue. That is exactly the bug
  `fix/moderation-filter` closed on six read paths, and the asymmetry is invisible unless you
  read the function body — the next person will reasonably assume hiding a shop hides its
  products at the row level. It also means `job_post` moderation is *weaker* than it looks: the
  column exists and is deliberately not set.
- **Filtering the parent is the correct fix either way** (a child row is not itself moderated —
  it is hidden *by consequence*, and it must come back if the parent is unhidden), so this is
  logged rather than fixed. But the option is real:
  - **Option A — leave as is.** Parent predicates on every public read path, which is what now
    ships. Unhide is trivially correct. Cost: every future public reader must remember the join.
  - **Option B — make the RPC cascade**, setting `status='hidden'` on children too. Cost:
    `admin_unhide_content` must then restore the *previous* status per child (draft vs active vs
    paused), which needs a stored prior value — a new column or an audit-log read. Strictly more
    state, and it can un-pause a listing the seller had paused themselves.
  - **Option C — push it into RLS**, so the SELECT policy itself excludes hidden rows and their
    hidden parents. Strongest guarantee, and it would have made this whole class of bug
    impossible, but it changes read semantics for the owner/admin paths that legitimately need
    to see hidden rows.
- **Recommendation:** A (shipped) + revisit C when `freelancer_profiles` gets its column-exposure
  migration, since both touch the same policy.
- **Trigger:** next moderation-touching PR, or when `/trouver-des-missions` ships.

### `job_posts` has no public read path yet — the filter is pre-installed as a test, not code
- The public missions board is a `ComingSoon` stub, and the only `job_posts` readers today are
  owner-scoped (`getMyMissions`, `getMissionDetail`, `DashboardRightRail`) where filtering would
  be the bug. So there was no query to fix.
- Instead `src/__tests__/moderation-read-paths.test.ts` asserts that **no non-owner module under
  `src/lib/marche` or `src/lib/search` reads `job_posts`**, and that any module in those
  directories touching a moderated table filters `admin_hidden_at`. Building the board makes
  that test fail until the filter is added — which is the point.
- **Trigger:** when the board is built, filter `admin_hidden_at` on the listing query and delete
  the now-obsolete assertion.

## G4 — Tableau de bord vendeur (`feat/g4-seller-dashboard`, 2026-07-28)

### 🔴 Topbar overflows 56px at 375 — but only when LOGGED IN, on every AppShell route
- **Measured on G4 and reproduced identically on the already-shipped `/marche/services`** (which has
  its own 375 Figma frame), so this is a shared-shell defect, not a G4 regression:
  `document.documentElement.scrollWidth` 431 vs `clientWidth` 375 → **56px (FR) / 53px (AR)**.
  Desktop 1440 is clean (0). Negative control: injecting a 9999px div moved the probe to 9624, so
  the 0-at-1440 and the 0-when-logged-out results are measurements, not a blind spot.
- **Culprit:** the topbar's trailing cluster `div.flex.shrink-0.items-center.gap-4` — the FR/AR
  `LanguageToggle` plus the user menu — measures 212px and is `shrink-0`, so at 375 it pushes the
  row past the viewport instead of compressing.
- **Why it was never caught:** logged OUT the same page measures **0 overflow** (the topbar renders
  a single "Se connecter" button instead of toggle + menu). The earlier audit's "380px 0-overflow,
  neg-control validated" finding was therefore correct *and* blind to this — it was measured
  anonymously, and 12 of the 20 shell routes cannot even be reached logged out.
- **Fix (own PR — shell-wide, not G4's to make):** let the cluster shrink (drop `shrink-0`, or hide
  the FR/AR toggle behind the mobile drawer below `sm`, which is where the language control already
  lives on mobile). Re-measure logged in at 375 in both locales afterwards.
- **Trigger:** next shell-touching PR, or before any seller page ships to mobile users.

### The ten seller pages have NO mobile Figma frames
- **G1-G9 + D3 are all desktop-only.** The registry holds **13 mobile (375) frames across 160 screen
  frames**, and every one belongs to a consumer/buyer surface: I1, marketplace services (+Freelances
  lens), E1, E2, E3 ×2, D2, F1 produits, K1-K4. D4 and H3 are desktop-only too, so the pattern is
  **the whole seller + profile world has no mobile design**, not a couple of oversights.
- **Consequence:** every below-`lg` value in `app/tableau-de-bord-vendeur/` is DERIVED, not measured,
  and each is flagged `derived:` in-code at its call site (single-column collapse, 1/2/4-up tile
  grid, stacked header, stacked action rows). A later mobile frame will very likely disagree with
  some of them, and that is a re-measure, not a bug report.
- **On a market that is 70%+ mobile**, this is worth sizing as one design batch rather than
  absorbing page-by-page across ten PRs.
- **Trigger:** before the seller world ships to real users.

### Three buyer-side order transitions still write from client components
- `mes-commandes/_components/OrdersList.tsx:279` and `components/ReceiptConfirmButton.tsx:33`
  (both → `received`) and `components/CancelOrderModal.tsx:81` (cancel) call `supabase.update()`
  directly from `'use client'` components. They are **correct** — RLS plus
  `check_order_status_transition` enforce every rule server-side — but they bypass the standard
  that mutations go through a server action with Zod validation.
- **G4 sets the counter-pattern** (`app/tableau-de-bord-vendeur/actions.ts`: Zod parse → auth →
  ownership re-check → derived target status → DB trigger as final authority). Migrate the three to
  match; deliberately NOT touched in the G4 PR, per one-PR-one-focus.
- **Trigger:** the E3/buyer-orders PR that next touches those files.

### G4 diverges from its own specimen on "Bénéfice net" — deliberately
- Specimen `484:24205` mocks **"2 840 TND / Commandes livrées"**. Shipped code renders
  **"Bientôt disponible"** (muted) instead. `products` has no `delivery_fee`, so a true *net* figure
  cannot be computed, and printing revenue under a net-profit label would be a fabricated metric.
- Note this contradicts the older build note that the tile was already authored as a
  "Bientôt disponible" placeholder — the measured specimen shows a mocked number, so the FIGMA is
  what needs updating here, not the code.
- **Trigger:** the schema PR that adds `delivery_fee` (bundled with `shops.is_published` +
  `freelancer_profiles.is_published` + the order tracking number).

### ⚠ Tailwind's `leading-normal` is the ratio 1.5 — NOT CSS `line-height: normal`
- **The trap:** Figma emits `leading-[normal]` (the CSS keyword, ≈1.21 for Inter). Tailwind's
  `leading-normal` utility is the **ratio 1.5**. Same word, different value, no error either way.
- **Evidence (G4 delta P1):** on the 28px Bold glance-tile value, `leading-normal` computed to
  **42px** where Figma's `normal` is **≈34px** — **+8px per tile**, which pushed the measured tile
  from Figma's 196 to 248 and, combined with a wrapping string, stretched the whole 4-up grid row.
  `leading-[normal]` (bracketed) is the one that emits the keyword.
- **Rule:** when a Figma value reads `normal`, write `leading-[normal]`. Reserve bare
  `leading-normal` for when 1.5 is genuinely intended. Grep before copying either into a new
  component — this reads as a no-op diff and is worth 8px a line.
- **Trigger:** any component built from a Figma text style whose line-height is `normal`.

### S4 — topbar is 65px tall against Figma's 64, on every AppShell route
- `Topbar.tsx:35-36` puts `border-b` on the `<header>` *outside* an inner `div.h-16`, so the total
  is 64 + 1. The Figma Topbar instance (`475:21223`) is **64 total**.
- 1px, but it is on ~20 routes and it shifts every page's content down by a pixel against its frame.
- **Founder call (2026-07-28): this rides with the 375px topbar-overflow fix**, since both are the
  same component and re-measuring the topbar twice is waste. See the logged-in overflow item above.
- **Trigger:** the shared-shell PR that fixes the 375 overflow.

### P5 / P6 — the shipped type ramp's line-heights differ from Figma's
- Measured on G4: **H1 40 vs Figma 38**, **H3 28 vs Figma 26**. Both are the shipped `--text-*`
  tokens, so this is platform-wide, not a page defect — every H1 and H3 in the app is 2px taller
  than its frame.
- This is the already-documented "typography token gap": `scripts/tokens/build.mjs` deliberately
  does **not** emit typography (its header says so), because the Figma ramp is incomplete and the
  shipped weights/line-heights diverge. So the fix is not a one-line token edit — it needs the ramp
  reconciled in Figma first, then emitted, then a re-baseline of every VRT story.
- **Trigger:** the typography reconciliation PR. Do not patch per-page.

## G8 — Commandes reçues (`feat/g8-commandes-recues`, 2026-07-28)

### The delivery documents are their own PR, gated on schema
- **What:** `bordereau de ramassage` (Figma `510:27851`) is a multi-order A4 pickup manifest;
  `bon de livraison` (`504:27094`) is its per-order sibling, produced from G9. Both are print
  documents (595×842 = A4 @72dpi, frames named « aperçu impression »).
- **Three of the six money/identity columns cannot be filled today:** `LIVRAISON` (no
  `delivery_fee` — the same gap that blocks G4's Bénéfice net), `TRANSPORTEUR` (no carrier column
  on `orders`; `shops.preferred_carriers` is a shop-level preference, not a per-slip choice), and
  `Réf. RAM-…` (no slip table or reference column). `TOTAL À ENCAISSER (COD)` follows from
  `delivery_fee`.
- **Approved production method (founder, 2026-07-28):** a dedicated route with `@media print` +
  `window.print()`. **No PDF dependency.** Revisit `pdf-lib`/puppeteer only if a bordereau must be
  emailed or archived — which is the same question as whether it is persisted, and that question
  is what decides whether `Réf.` needs a table.
- **Trigger:** after the schema PR (`delivery_fee` + carrier + slip reference).

### Multi-select on G8 is deferred with the documents
- The main frame (`489:25313`) bakes in a checkbox column and a "Tout sélectionner" header
  (`508:27221`), and the `sélection prêtes + bordereau` specimen (`508:27230`) adds a `bulkBar`.
  All of it exists to feed the bordereau.
- **Not built (founder call):** with the documents deferred, multi-select has no destination, and
  building it now would mean defining partial-failure semantics for a bulk transition nothing
  consumes. G8 ships the `filtre` specimen's layout (`490:25690`) — the same list without the
  checkbox column.
- **Trigger:** with the documents PR.

### Migrate the three buyer-side client writes onto `cancelOrderAction` / `advanceOrderAction`
- `mes-commandes/_components/OrdersList.tsx:279`, `components/ReceiptConfirmButton.tsx:33` (both →
  `received`) and `components/CancelOrderModal.tsx:81` (cancel) still write with a direct browser
  `supabase.update()`.
- `cancelOrderAction` was written **role-aware from the start** for exactly this: it derives
  `cancelled_by` from which side of the order the caller is on, so the buyer path needs no new
  action — only the call site changes. `components/CancelOrderModal.tsx` has **zero importers**
  today and can likely be deleted outright once E3's detail page adopts the new button.
- **Trigger:** the next E3/buyer-orders PR.

### `orders` has no per-step timestamps — wait time is `pending`-only
- The row's `waitTime` slot (Figma prop on `OrderActionRow` `488:24951`) wants "waiting since" per
  state, but `orders` carries only `created_at`, `updated_at`, `received_at`, `cancelled_at`.
  `updated_at` is the last touch of *anything* on the row, so deriving a per-state wait from it
  would print a confidently wrong number.
- **Shipped (founder call):** wait shows on `pending` only, computed from `created_at`; every
  other state shows nothing.
- **Fix:** add `accepted_at` / `prepared_at` / `dispatched_at` / `in_delivery_at` / `arrived_at`,
  or a normalised `order_status_events` table (which would also give G9 a real timeline — it
  currently has no source for one). **Trigger:** the schema PR.

### 🔴 Page `<title>` is hardcoded French on every route
- Found while AR-checking G8: the Arabic page serves `<title>Commandes reçues — Servyou</title>`.
  Not a G8 defect — **every** page does this (`export const metadata = { title: '…' }`, e.g.
  `mes-favoris/page.tsx:10`), so the leak is platform-wide and G8 deliberately did not diverge
  from the pattern on one page.
- **Fix:** replace the static `metadata` export with `generateMetadata()` reading `getLang()`, and
  add the titles to both dictionaries. ~20 routes, mechanical.
- **Trigger:** an i18n pass; worth doing in one sweep rather than per page.

### G9 needs a seller-scoped counterpart to `getOrderDetail`
- `lib/marche/order-detail.ts` re-checks `buyer_id === currentUserId` — it is the buyer's view and
  returns null for a seller. G9 needs the same shape scoped on `seller_id` (or the existing one
  taught a role). `parseDeliveryAddress()` and `parseServiceBuyerNote()` in that file are already
  role-neutral and reusable as-is. **Trigger:** the G9 PR (next).

### 🔴 GATE-DESIGN PRINCIPLE: a check that can pass without the feature running is not a gate
- **Three defects in one session all had the same shape** — a verification that stopped short of
  the observable behaviour, and passed:
  1. **`tsc` passed on a server→client boundary violation.** `SortSelect` took a
     `buildHref(value)` callback prop from a Server Component. Types were perfectly valid; a
     function cannot cross the RSC boundary, so the route returned **HTTP 500** at request time.
     Typecheck cannot see runtime serialization.
  2. **Grepping the RSC flight payload instead of loading the page.** `curl | grep` found the
     expected strings in the streamed payload and read as a pass — while the page itself was
     500ing. The flight stream contains content that never renders.
  3. **Measuring a dropdown trigger without opening the panel.** The G8 sort trigger measured
     correct against Figma and was signed off; the panel was a native OS list with **no
     `[role=menu]` in the DOM at all**. A closed dropdown always looks fine.
- **The principle:** if a check can pass while the feature is broken or absent, it is not a gate —
  it is a formality. Ask of every check: *what would have to be true for this to pass while the
  thing is still broken?* If there is an easy answer, the check is aimed at the wrong layer.
- **Concretely, for this codebase:**
  - `tsc` + `build` green is **not** evidence a route renders. Load it and assert the status code.
  - Grepping served bytes is **not** evidence of a render. Check the HTTP status first, and prefer
    a DOM read over a payload grep — the earlier `scrollbar-gutter` and G8 pill findings were only
    trustworthy because they were computed geometry, not string matches.
  - Measuring a control in its default state is **not** evidence about its other states. Open the
    panel, expand the row, seed the missing status. Three separate findings this session
    (`prepared` rendering no pill, the 56px topbar overflow appearing only when logged in, the
    sidebar scroller appearing only below ~616px) were invisible in the default state.
  - A **negative control** is the cheapest way to test the check itself: break the thing on
    purpose and confirm the check fails. Two of this session's controls were themselves broken —
    one injected a `2000px` div that flexbox shrank, one toggled `scrollbar-gutter` in the state
    where both values behave identically — and each returned a **false pass**.
- **Trigger:** when adding any gate, CI step, or "verified" claim to a PR report.

## G9 — Détail de la commande (`feat/g9-order-detail`, 2026-07-28)

### Two G9 panels are omitted until the schema PR — deliberately blank, not placeheld
- **`panel-suivi` (497:26411)** — "Société de livraison" + a tracking-number **Input**. No carrier
  column, no tracking column, so the field would be a dead input.
- **`panel-historique` (504:27042)** — a timeline of EVENTS ("Confirmée sur WhatsApp", "Bon de
  livraison imprimé"). None is derivable: `orders` has no per-step timestamps and nothing records a
  WhatsApp confirmation or a print.
- **Founder call:** omit both entirely rather than render deferred placeholders. *An empty "Suivi"
  panel with a dead input teaches a seller the feature is broken; absence teaches nothing false.*
  **Exception shipped:** the cancellation entry IS rendered — `cancelled_by`,
  `cancellation_reason` and `cancelled_at` all exist, and one real entry beats a panel of nothing.
- Same reasoning drops the price breakdown's **Livraison** and **Total** rows: no `delivery_fee`,
  and a total silently equal to the subtotal is a wrong number on a COD invoice.
- **Trigger:** the schema PR (`delivery_fee` · carrier · tracking · print stamp · `order_events`),
  which is the same one the delivery documents wait on.

### WhatsApp prefill is capped to the ARABIC budget, and the cap is tested
- `WHATSAPP_MESSAGE_MAX = 300` characters, asserted in `src/__tests__/whatsapp-prefill.test.ts`
  against the shipped FR **and** AR templates with deliberately long values.
- **Why 300 and not 2000:** percent-encoding is per UTF-8 byte. A Latin letter costs 1 URL char;
  `é` and every Arabic character cost 6. Measured: 125 French chars → 187 encoded (×1.5); 100
  Arabic chars → 412 (×4.1). wa.me publishes no text limit, so the ceiling is the URL, and ~2000
  is the safe cross-browser figure — which is ~300 Arabic characters, not 2000.
- **A template written to the French budget overflows only in Arabic**, which is precisely the
  defect that ships. Any new prefill template must be added to that test.
- Latin tokens sit inside « » at the END of the Arabic string so the order reference never lands
  mid-RTL — the pattern E3's existing message already uses. Also asserted.
- `orders.whatsapp_order_message` (dead, zero importers) was **deleted** rather than left.

### The WhatsApp button contacts; it does not advance the order
- G8 first shipped `pending`'s wa/brand button as a **skin on the accept transition**. G9's frame
  settles it: the `pending` specimen puts a WhatsApp Button under "Prochaine étape" with the
  helper *"Confirmez la commande avec le client sur WhatsApp **avant** de préparer le colis"*.
- **On COD you confirm before you accept**, and conflating them means a seller accepts an order
  they have never discussed. Both surfaces now render two controls: WhatsApp (contact) and a
  separate "Accepter" (transition). G8's row was corrected in the same PR.
- Row width was measured before the change: the pending cluster was 490 of 1121; a third control
  adds ~104, landing at ~594 with mid at ~480. It fits, but 53% of the row becomes controls, so
  the row uses the SHORT label ("WhatsApp") while G9's rail button carries the full sentence.

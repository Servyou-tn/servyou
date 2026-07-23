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

🔴 **#1 — OrderDisputeSection fetches disputes in a client `useEffect`** (`src/components/OrderDisputeSection.tsx:39`, `react-hooks/set-state-in-effect`). Violates our own "no `useEffect` for data fetching" standard. **Fix:** move the disputes fetch to a Server Component (pass `disputes` as props from the order-detail page) or a server action. Own PR. *(This is the sole remaining committed lint ERROR after chore/fix-lint — the lint gate stays red on it until this lands.)*

🔴 **#2 — Admin route authorization is client-side only (SECURITY)** (`src/app/admin/layout.tsx:36`, `react-hooks/exhaustive-deps`). The layout's `useEffect` reads `profile.is_admin` client-side and `router.replace('/')`s non-admins — **UX, not access control.** `middleware.ts` matches `/admin/:path*` but enforces **only the suspended state, NOT `is_admin`.** **So admin routes ARE reachable before the client check runs:** a non-admin loads the admin shell (sees the loading spinner), then is redirected. The real boundary today is **RLS at the data layer** (admin reads require `is_admin()` per policy), so admin *data* is server-protected — but there is **no server-side route guard.** **Fix:** add a server-side admin gate (a server-component check in the admin layout, or extend `middleware.ts` to gate `/admin` by `is_admin`), so authorization isn't a client redirect. Own PR.

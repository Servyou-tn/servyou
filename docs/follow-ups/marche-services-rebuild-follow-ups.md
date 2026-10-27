# /marche/services rebuild — follow-ups (from feat/rebuild-marche-services, 2026-07-24)

🔴 **No `avatar_url` column anywhere — the freelancer world can't ship without real avatars.** Checked all three profile tables (`profiles`, `public_profiles`, `freelancer_profiles`) — none has an avatar/photo column. Every seller surface that shows a person — the v3.7 `ServiceListingCard`, `FreelancerCard`, D4 public profile, D2 service detail's freelancer row — falls back to the initial letter. Acceptable as a stopgap, but a photo-led freelancer marketplace reads as broken without real avatars. **Fix = schema + storage:** an `avatar_url` column on the profile the card reads (must be exposed on the cross-user `public_profiles` view — never leak owner-only columns), a Supabase Storage bucket + RLS for uploads, and upload UI in H3/mon-compte. **Own discovery-first migration PR.** Trigger: before the freelancer world / D4 ship for real.

## Reconcile the services category taxonomy (3 lists disagree)
- **What:** The category filter on `/marche/services` reads the **DB `categories` table** (`lib/marche/filter-categories.ts`, scoped to categories with ≥1 active listing — ~6 today). This does **not** match either (a) the Figma / `docs/design/taxonomy-services.md` **13 parents**, or (b) the untracked `src/lib/taxonomy/service-categories.ts` **10 sectors** (not wired to anything). The DB holds 14 flat, product+service-mixed parents. The rebuild deliberately kept the DB-driven list (restyled into the new single-select dropdown) rather than hardcoding the 13 — because `searchMarketplace` filters via `.in('slug', …)`, so a hardcoded label derives a slug (`"Développement web & mobile"`→`developpement-web-mobile`) matching **no DB row** (`developpement`) → a filter that looks right and returns nothing.
- **Why deferred:** Aligning the DB to the 13 parents is a schema migration (rename/insert/reparent categories + reslug + backfill listing `category_id`s) — approval-gated, discovery-first, out of a frontend rebuild's scope.
- **Trigger:** A dedicated taxonomy-migration PR before the services catalog is seeded for launch.

## Add a Ville (city) filter to the services browse
- **What:** The Figma filter bar (611:45644) includes a **Ville** dropdown; the rebuild **omits** it (a disabled/dead control teaches the wrong thing). No `ville` param exists in `lib/search/search-params.ts` and no city clause exists in `searchMarketplace` — wiring it is genuine data-layer work: a new URL param, a `.eq`/`.in` on `freelancer_profiles.city` (also on `public_profiles.city`), and a city-list source (distinct active-listing cities, or the 7 Tunisia anchor cities).
- **Why deferred:** Out of scope for rebuild #1 (UI replacement); it expands the data layer.
- **Trigger:** When city filtering is prioritized — fold into both `/marche/services` and `/recherche` together (shared search layer).

## Service `tags` are near-empty → card falls back to a category chip
- **What:** The v3.7 card shows up to three **skill chips** sourced from `service_listings.tags`. The column exists but ships mostly empty (7 of 8 active listings today are `[]`), so `ServiceListingCard` falls back to a **single category-name chip** when `tags` is empty — real data (the category) in a slot meant for skills, a stopgap so cards aren't blank (flagged in-code).
- **Why deferred:** Backfilling tags + making them required is a create/edit-flow change, not a browse-page change.
- **Trigger:** Make `tags` required (or strongly prompted) in **H6 (create service) / H7 (edit service)**; once real listings carry tags, **remove the category-chip fallback** in `ServiceListingCard`.

## Sidebar IA drift surfaced by the v2-shell adoption (feat/rebuild-marche-services)
- **✅ "Mes annonces" → /mes-missions vocab drift — RESOLVED (`feat/annonces-vocab-rename`,
  completed by `fix/annonces-dangling-imports`).** The route moved to `/mes-annonces` (permanent
  redirect from `/mes-missions/:path*` in `next.config.ts`) and every user-visible string on the
  three pages behind it — list, create, detail — now says "annonce" too, matching the sidebar
  label. "mission" stays reserved for the freelancer-facing job board (`job.*` i18n keys,
  unrenamed). ~~The sidebar item added per Figma `611:45637` is labelled "Mes annonces" but routes
  to `/mes-missions` (the job-posting list). Reconcile the vocabulary (annonces vs missions) in a
  naming pass; not renamed in the shell PR to avoid moving a live route. Lives in
  `sidebar-items.ts`.~~
  **Correction (2026-08-18):** the "RESOLVED" claim above was premature. `feat/annonces-vocab-rename`
  only finished the *create* page's dictionary and routing; the **list** (`mes-annonces/page.tsx`)
  and **detail** (`mes-annonces/[id]/page.tsx`, `AnnonceDetail.tsx`, `AnnonceCard.tsx`,
  `annonce-detail.ts`) pages were `git mv`'d but left internally un-renamed — dangling imports
  (`MissionForm`/`MissionDetail`/`MissionCard`/`getMyMissions`, 12 `tsc` errors on `main`) and
  ~35 deleted i18n keys (`mesmissions.*`, `missions.detail.*`, `mission.error.*`,
  `mission.form.*`, `job.my_missions_title`, `job.whatsapp_consumer_to_responder`) rendering raw
  key strings to real users on every field of both pages. `fix/annonces-dangling-imports` is the
  PR that actually finished the rename: renamed the internal identifiers to match, pointed every
  reference at the `annonces.*`/`mesannonces.*`/`annonce.*` keys that PR-A had already created,
  added the one genuinely-missing key (`annonces.detail.modify`), and got `main` back to a clean
  `tsc`. Lesson: a route/file rename is not evidence the code inside was updated — verify with
  `tsc --noEmit`, not just `git status` on the renamed paths.
- **/statistiques is now nav-orphaned.** "Statistiques" was removed from the shell sidebar (absent
  from the Figma). The `/statistiques` page still exists and builds, but the shell was its only nav
  entry — it's now URL-only until it gets its own IA decision (a freelancer-stats surface). Don't
  delete the route without that decision.

## Scope-A deferrals from the services rebuild (UI parity, no data)
- **Freelances lens:** the Services/Freelances toggle renders with Freelances **disabled ("bientôt")** — the Freelances view + its data layer + cards + `/freelance` pages don't exist yet. Trigger: the freelancer-world build.
- **Grid/list view toggle:** the Figma filter bar has a grid/list display toggle; the rebuild ships **grid only**. Trigger: if a list density is wanted post-launch.
- **AR Phase 8 residue:** `listing.service.{deliveryTime,by}` (unused by this page) and the broader `/recherche` + `marche.*` French placeholders remain — this PR localized only the keys `/marche/services` renders. Trigger: the Phase 8 AR pass. (`relativeAdded` — the third key in this original list — was deleted in feat/i18n-plurals: dead code, no caller, French-only value.)

## Avatar migration (F2) — one off-scale site + a vestigial prop chain
- **MissionDetail responder avatar is 48px — off the measured scale.** The proposal-responder avatar in `src/components/marche/MissionDetail.tsx` (~L329) is a 48px ad-hoc `bg-brand-blue-800` initials circle using a **local** `initials()` helper (not the deleted `getInitials`). The shared `Avatar` has six Figma-measured sizes — 24/32/40/56/80/120 — and **no 48px**. It was left ad-hoc rather than forced to `md`(40)/`lg`(56): inventing a 7th size violates "measure, don't describe," and MissionDetail is legacy (H10, pre-v2) and does **not** consume the compound API this PR deletes, so nothing forces it. **Why deferred:** no clean size mapping + legacy screen. **Trigger:** the freelancer-missions rebuild — migrate to the shared `Avatar` fallback then (or measure a 48px size into Figma first if the design calls for it).
- **AccountMenu `fullName` prop is now vestigial.** `src/components/layout/AccountMenu.tsx` accepted `fullName` only to derive initials; the trigger now renders the shared `Avatar`'s decorative person-glyph fallback (no image data source). `fullName` was kept in the prop type (still passed by `Header.tsx:184`, type-checks) but is no longer read — removing it would ripple `AccountMenu ← Header ← Header's callers`, out of scope for an avatar migration. **Why deferred:** the prop-chain unwind is a separate refactor. **Trigger:** when the legacy `Header`/`AccountMenu` is retired (blocked on the landing/recherche/categories rebuilds).

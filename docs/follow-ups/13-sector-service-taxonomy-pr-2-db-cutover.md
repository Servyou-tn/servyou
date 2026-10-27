# 13-sector service taxonomy, PR 2 — DB cutover (`feat/taxonomy-13-sectors-db-migration`, 2026-09-07)

## ✅ Product photography has no home in the 13 sectors — RESOLVED in H6 PR-2

- **Resolved 2026-10-23:** founder ruling — subcategory « Photographie & retouche produit »
  (`photographie-retouche-produit`) under `design-graphique-logo`; migration 20261023212933 inserted it
  and re-filed listing `e5bec0f8-…` into it; the TS taxonomy carries the same entry (92 subcategories).


- The `ugc` sector is retired by the PR 2 cutover, and its one live listing —
  **"Photo produits e-commerce"** (`e5bec0f8-00d7-456a-a89b-39d959a251bc`) — was founder-ruled
  into `design-graphique-logo` as a **placeholder**, not because it belongs there.
- Photography is genuinely absent from the taxonomy: none of `design-graphique-logo`'s 8
  subcategories cover it, and the only `photo-*` slug among all 91 is `photo-de-profil` under
  `personal-branding` (a headshot for a LinkedIn profile — not product shoots). The old
  `retouche-photo` subcategory that would have been the nearest fit was dropped in PR 1.
- **Why it matters:** product photography is a real service Tunisian freelancers sell, and it is
  directly adjacent to the COD e-commerce market Servyou is built around. Once H6 "Créer un
  service" ships, freelancers pick from this list — a photographer either mis-files under
  Design graphique or bounces. Fixing it after freelancers have filed against the list means a
  data migration, not a taxonomy edit.
- **The decision owed:** a photography subcategory under `design-graphique-logo`, or its own
  sector. Not CC's call — it changes the locked 13, which was a founder decision.
- **Not fixed in PR 2** — founder-ruled explicitly: log it, don't hold the migration for it.
- **Trigger:** before H6 ships. Blocking for H6, not for the cutover.

## Symmetric `kind` guard on `products.category_id` — not installed

- PR 2 adds `enforce_service_category_kind()`, a cross-table trigger asserting that
  `service_listings.category_id` and `job_posts.category_id` resolve to a category with
  `kind in ('service','both')`. A CHECK constraint cannot reference another table, hence a trigger.
- The mirror-image guard on `products.category_id` (`kind in ('product','both')`) was **not**
  installed — out of PR 2's focus, which is the service taxonomy.
- **Why it matters:** `20260804132447_categories_kind_discriminator` documented the
  `kind in (...)` read contract for consumers but enforced nothing at the DB layer. Until the
  products half exists, nothing stops a product being filed under a service category — the exact
  hole the service half just closed.
- **Trigger:** next migration that touches `products` or the product taxonomy.

## 🔴 Tests that pass while the feature is broken — a named class, joining twMerge + Turbopack route-index staleness

- **What happened this time:** `src/__tests__/mission-category-picker.test.ts` mocks the Supabase
  query builder and asserts on the `.in('kind', …)` call only. When the 13-sector taxonomy cutover
  (`feat/taxonomy-13-sectors-db-migration`) turned `categories` from flat into a parent/child table,
  `getCategories()` (`src/lib/marche/my-data.ts`) needed a `.is('parent_id', null)` filter or the
  `/mes-annonces/nouvelle` picker would silently grow from ~9 options to 105 (13 sectors + 91
  subcategories + `maison`). Nothing in the test suite would have caught the regression if the
  filter had simply been forgotten: the mocked builder had no `.is()` method at all, so an
  unguarded real fix would have thrown at the mock layer (a false negative in the OTHER
  direction — the suite fails even though the fix is correct), and once the mock is taught the
  method, the suite goes back to green whether or not the real code calls it, because nothing
  asserts the call happened.
- **Why it matters, and why it's the same shape as the other two:** a mocked query-builder test
  proves the code *asks the mock in a way the mock understands* — it does not prove the code asks
  the right question. This is the same class as the twMerge finding above (`cn()` drops a class
  with a green build and no error) and the Turbopack route-index staleness finding: a passing
  green run is being read as "verified," when what it actually verified is narrower than the
  claim. Each instance has looked different (a string-merge utility, a dev-server cache, a mocked
  DB client) but the failure mode is identical: the thing that should fail loudly instead says
  nothing.
- **Not fixed here** — the picker's own bug (item 1, this session) IS fixed
  (`feat/taxonomy-13-sectors-db-migration`); this entry is about the test's blind spot surviving
  the fix, not the bug itself. Adding a real `.is('parent_id', null)` assertion is a small, safe
  follow-up that wasn't in scope for the taxonomy PR.
- **The standing pattern to watch for:** any test that mocks a query builder / cache / string-merge
  utility at the API-shape level (asserts "this method was called with these args") rather than the
  outcome level (asserts "this is what actually got returned/rendered/filtered") will keep passing
  through a regression in ANY clause it doesn't explicitly assert on. Before trusting such a test as
  a regression gate, check whether it asserts the *complete* query shape or only the *one* clause
  the last incident happened to be about.
- **Trigger:** next time `getCategories()`'s test is touched, add the missing `.is()` assertion.
  No urgency — the real code is now correct; only the safety net has a hole.

## Subcategory drill-down strip on `/categories/[slug]` goes live unreviewed for the first time

- **What:** `getSubcategories()` (`src/lib/categories/category-data.ts`) has returned `[]` for
  every category since it was written, because `categories.parent_id` was NULL on every row — its
  own comment says as much ("flat today … returns [] for every category until a nesting migration
  adds parent/child relationships"). The 13-sector taxonomy cutover
  (`feat/taxonomy-13-sectors-db-migration`) IS that nesting migration: all 13 service sectors now
  have real children, so the drill-down strip on `/categories/[slug]` renders actual content for
  the first time on any of those 13 sector pages.
- **Why it matters:** this UI shipped and has sat inert long enough that nobody has reviewed how it
  looks with real data — copy overflow at 7-item sectors (`developpement-web-mobile`) vs 8-item
  ones (`design-graphique-logo`), AR/RTL wrapping on the longer subcategory labels, mobile reflow.
  It was accepted as fallout of the cutover (founder ruling, 2026-09-07) rather than held for
  review, on the grounds that the 8 old flat categories 404 either way and a live-but-unpolished
  strip is strictly better than a 404.
- **Not fixed here** — out of the migration PR's focus; a visual-gate pass, not a schema change.
- **Trigger:** next PR that touches `/categories/[slug]` or the drill-down strip specifically —
  or before considering that route "done," whichever comes first.

## H6 must detect and resume an existing draft, or a freelancer can create one and never reach it again

- **What:** `service_listings.status` now allows `'draft'` (H5 draft-status guard PR). H5 (Mes
  services) deliberately excludes drafts from every tab — Tous included — per founder ruling: a
  draft being invisible in H5 is correct for that PR and is H6's problem to solve, not H5's.
- **Why it matters:** H6 (the service-creation wizard) is the only thing that will ever create a
  draft row. If H6 ships without a way to detect "I already have an in-progress draft" and resume
  it, a freelancer who leaves the wizard partway through has created a row that is invisible
  everywhere (H5 excludes it, every public surface already filters `status='active'`) and
  unreachable — not recoverable, not even visible as "you have unfinished work."
- **Not fixed here** — H6 doesn't exist in code yet; this PR only widens the schema and makes H5's
  read paths handle a third status correctly ahead of H6 shipping.
- **Trigger:** blocking for H6. Must be part of H6's own scope, not discovered after it ships.

## `admin_hide_content`'s failure modes are indistinguishable to the caller and unlogged — a failed moderation cannot be diagnosed after the fact

- **What:** every branch of `admin_hide_content` (product/service/shop/freelancer_profile/job_post)
  returns the same generic "not found or already moderated" exception for at least two distinct
  causes — target genuinely missing, vs. target already moderated — and, as of the H5 draft-status
  guard PR, a third for the service branch: target is a draft. The function returns early via
  `if not found then raise exception ...` before reaching `log_admin_action()`, so none of these
  failure modes leaves any row in `admin_audit_log` — only a *successful* hide is logged.
- **Why it matters:** the uniform error text is deliberate and correct for the caller (founder
  ruling on the H5 draft-status guard PR — do not make it more specific, it would leak which guard
  tripped). But that same uniformity means an admin who reports "I tried to hide X and nothing
  happened" cannot be diagnosed from the audit log after the fact — there is no record a moderation
  attempt was even made, let alone why it failed. This gap existed for the original two causes
  before this PR; the draft guard adds a third cause to the same blind spot rather than creating it.
- **Not fixed here** — restructuring `admin_hide_content` to log failed attempts (a different
  transaction shape than "log only after the mutation succeeds") is a real change to all five
  target types, out of scope for a PR that only added one guard clause to one branch.
- **Trigger:** next time a failed moderation attempt needs to be debugged and the audit log has
  nothing to show for it — or proactively, before `admin_hide_content` grows a 4th or 5th silent
  failure cause.

## ✅ `freelance.services.form.error.{required,title_too_long,description_too_long,price_invalid}` have no fr/ar translations — RESOLVED in H6 PR-4

- **Resolved 2026-10-24 in H6 PR-4 (`feat/h6-publish-step5`):** translated in both locales, with the new G4-rule keys (title_too_short,
  description_too_short, short_description_too_long, delivery_too_long) and the tag messages rewritten for
  the 1–5 skills rule. History below.

- **What:** `service-validation.ts`'s `ERR` object has two i18n-key namespaces for the same form:
  `freelance.services.form.<field>.errors.<kind>` (deliverables/revisions/tags/briefing — all
  translated) and `freelance.services.form.error.<kind>` (required/title_too_long/
  description_too_long/price_invalid — none translated in fr.ts or ar.ts). `t()` falls back to the
  raw key on a miss, so any of these four, if surfaced, would render the literal key string to a
  user instead of a message.
- **Why it matters:** discovered while adding the fifth key in this namespace,
  `freelance.services.form.error.status_invalid` (H5 draft-status guard PR — now translated in
  both locales). Currently low-severity: `validateServiceInput` has zero callers in production
  code today (no add/edit-service form is wired to it yet — H6/H7's accordion bodies are mostly
  unbuilt per project memory), so none of these five keys can reach a real user yet. That changes
  the moment a form starts calling this function.
- **Not fixed here** — the four missing keys predate this PR and are outside a PR scoped to the
  draft-status guard; fixing them means picking real FR/AR copy for four messages nobody has
  reviewed yet.
- **Trigger:** blocking before whichever PR first wires an add/edit-service form to
  `validateServiceInput` (expected: H6 and/or H7) — translate all five `form.error.*` keys as part
  of that PR's own scope, not discovered after it ships.

## Production has no `service_listings` fixture in a paused or admin-moderated state — seller-side visual verification cannot exercise those states live

- **What:** raised during pre-merge review of the H5 draft-status guard PR. Production currently
  has zero `service_listings` rows with `status='hidden'` (neither self-paused nor
  admin-moderated), and the seed freelancer used for manual click-through has no corresponding
  `auth.users` row — it cannot sign in. Together, that means a real signed-in session can neither
  view an existing paused/moderated service row nor moderate one into existence to look at it.
- **Why it matters:** every seller-side PR that touches `StatusPill`, `ServiceRow`, or any paused/
  moderated read path (H5, H7, admin moderation surfaces) has to fall back to DB-level live tests
  and synthetic fixtures for that state instead of an actual signed-in walkthrough — the visual
  gate cannot cover it. This is a standing gap, not specific to this PR; it will recur on every
  future PR that touches those states until a real fixture exists.
- **Not fixed here** — creating a persistent paused/moderated seed fixture (and an
  `auth.users` row for the seed freelancer) is a data/ops change, not something this PR's scope
  (widening `service_listings.status`) should smuggle in.
- **Trigger:** before the next seller-side PR that needs to visually verify a paused or
  admin-moderated service/product row — or proactively, the first time this blocks a visual gate
  badly enough to be worth fixing on its own.

# Follow-ups

Tracked deferrals — work intentionally pushed out of the PR that surfaced it, with enough context to pick up cold.
Each entry: what, why deferred, where it lives, the trigger to do it.

## How to add one

**Add a NEW file in this folder. Never append to a shared file, and never edit this index in a feature PR** — two
branches that touch the same file conflict, and a prose conflict is resolved by guessing which entry belongs to which PR.

- Name: `<topic-or-pr-slug>.md` (lowercase, hyphens) — e.g. `h11-mes-propositions.md`. One file per PR or topic; several
  entries for the same PR go in that PR's one file as `##` headings.
- First line: `# <Title> (`<branch>`, <date>)`. Then, per entry: **What**, **Why deferred**, **Where it lives**, **Trigger**.
- Closing an entry: edit its own file (add `✅ CLOSED — <PR/date>` under the title). Do not delete the file: a closed
  decision that says "do NOT fix this" is still load-bearing (see `closed-*`).
- This `README.md` is regenerated from the files' first lines when the folder is tidied (a dedicated chore PR); feature PRs
  do not touch it. An entry that is not listed here is still valid — `ls docs/follow-ups/` is the source of truth.

The old single file `docs/follow-ups.md` is now a stub (many source comments cite that path).

## Closed decisions

- [Closed decisions — do NOT "fix" these](closed-decisions.md)

## Open items

- [docs/follow-ups.md conflicts on every concurrent branch — it needs an append convention](closed-follow-ups-file-conflicts.md)
- [Revisit image hosting after the Supabase Pro / Vercel Pro upgrades](open-revisit-image-hosting-after-the-supabase-pro-vercel-pro-upgrades.md)
- [Orphaned storage objects need a reconciliation sweep before the first deletable image surface](open-orphaned-storage-objects-need-a-reconciliation-sweep-before-the.md)
- [🔴 Uploads are capped at 4 MB by Vercel's payload limit — many phone photos cannot be uploaded](open-uploads-are-capped-at-4-mb-by-vercel-s-payload-limit-many-phone.md)
- [HEIC uploads are rejected, not converted — client-side conversion is the real fix](open-heic-uploads-are-rejected-not-converted-client-side-conversion-i.md)
- [orders.carrier is seller-writable in the schema with NO surface that can write it](open-orders-carrier-is-seller-writable-in-the-schema-with-no-surface.md)
- [G9 stepper connector colours diverge from Figma, held because OrderRail has two consumers](open-g9-stepper-connector-colours-diverge-from-figma-held-because-ord.md)
- [🔴 tailwind-merge cannot classify our custom text-* SIZE tokens, so cn() silently drops them](open-tailwind-merge-cannot-classify-our-custom-text-size-tokens-so-cn.md)
- [OrderRail overflows its container at 375 (pre-existing, and it bounds the desktop fix)](open-orderrail-overflows-its-container-at-375.md)
- [✅ CLOSED (DB side) — 🔴 received_at is stamped in app code only — nothing in the database enforces it](open-closed-receivedat-is-stamped-in-app-code-only-nothing-in-the-dat.md)
- [Audit consumer surfaces for admin_hidden_at filtering](open-audit-consumer-surfaces-for-adminhiddenat-filtering.md)
- [Remove /marche's dead inline ?q= search path](open-remove-marche-s-dead-inline-q-search-path.md)
- [Add category description + nesting columns](open-add-category-description-nesting-columns.md)
- [In-category type switch on /categories/[slug]](open-in-category-type-switch-on-categories-slug.md)
- [Legal pages: lawyer review + cookie consent + redaction consistency](open-legal-pages-lawyer-review-cookie-consent-redaction-consistency.md)
- [Arabic legal/content translations need native Tunisian review](open-arabic-legal-content-translations-need-native-tunisian-review.md)
- [Contact form has no backend (stub server action)](open-contact-form-has-no-backend.md)
- [FavoriteButton fires one auth.getUser() per instance](open-favoritebutton-fires-one-auth-getuser-per-instance.md)
- [Consider a 'Tous' (all) results tab on /recherche](open-consider-a-tous-results-tab-on-recherche.md)
- [Button's single disabled treatment conflates two different meanings — ruled OUT of scope for G7 (fix/g7-header-and-dirty-state, 2026-08-18)](open-button-s-single-disabled-treatment-conflates-two-different-meani.md)
- [G7's 536:32841 "produit en brouillon" specimen stays logged as blocked-on-schema — not deleted (fix/g7-header-and-dirty-state, 2026-08-18)](open-g7-s-536-32841-produit-en-brouillon-specimen-stays-logged-as-blo.md)
- [DashboardSidebar.tsx has a stale /mes-missions href — left alone, dead code](open-dashboardsidebar-tsx-has-a-stale-mes-missions-href-left-alone-de.md)
- [Staged-rename-shadows-unstaged-content — the class of bug that broke #148, now a named rule](open-staged-rename-shadows-unstaged-content-the-class-of-bug-that-bro.md)
- [Junctioning node_modules into a scratch worktree destroys the real one](open-junctioning-nodemodules-into-a-scratch-worktree-destroys-the-rea.md)
- [Select-field consolidation still owed — one shared constant, three copies, no real component (PR-D, feat/annonces-form-ds, 2026-08-19)](open-select-field-consolidation-still-owed-one-shared-constant-three.md)
- [Input/Textarea's required prop couples the visual asterisk to aria-required — blocks the HYBRID no-asterisk rule on a majority-required form](open-input-textarea-s-required-prop-couples-the-visual-asterisk-to-ar.md)
- [Native type="date" renders in the OS/Chromium locale, not the app's lang — mm/dd/yyyy on an AR page](open-native-type-date-renders-in-the-os-chromium-locale-not-the-app-s.md)
- [🔴 Storage RLS content-gate gap (chore/deps-lockfile-refresh, 2026-08-24)](open-storage-rls-content-gate-gap.md)

## Per-PR / per-topic sections

- [Post-MVP scale triggers](post-mvp-scale-triggers.md)
- [DS-3b lint — architectural follow-ups (deferred from chore/fix-lint #75, 2026-07-23)](ds-3b-lint-architectural-follow-ups.md)
- [Next.js security patch — architectural follow-up (from fix/nextjs-security-16-2-11, 2026-07-23)](next-js-security-patch-architectural-follow-up.md)
- [DS-3b-3 font-sizes — follow-ups (from feat/ds-3b-3-font-sizes, 2026-07-24)](ds-3b-3-font-sizes-follow-ups.md)
- [/marche/services rebuild — follow-ups (from feat/rebuild-marche-services, 2026-07-24)](marche-services-rebuild-follow-ups.md)
- [F3 primitives — Button · Input · StatusPill (from feat/f3-primitives-batch-1, 2026-07-26)](f3-primitives-button-input-statuspill.md)
- [F4a — seller_type resolver (from feat/f4a-seller-type-resolver, 2026-07-26)](f4a-sellertype-resolver.md)
- [/marche/services Phase 2 — follow-ups (from feat/marche-services-rebuild, 2026-07-26)](marche-services-phase-2-follow-ups.md)
- [F3 batch 2 — Segmented + Select reconciliation (PARKED; inventory from feat/f3-batch2-select-segmented)](f3-batch-2-segmented-select-reconciliation.md)
- [Visual-gate findings — v2 shell at 375px (from feat/marche-services-rebuild, 2026-07-26)](visual-gate-findings-v2-shell-at-375px.md)
- [E1 / E2 — service request + confirmation (fix/e1-e2-service-request)](e1-e2-service-request-confirmation.md)
- [VRT harness — diagnosability (found on PR #95, run 30290935264)](vrt-harness-diagnosability.md)
- [E3 — Mes commandes, Services tab (feat/e3-mes-commandes-services)](e3-mes-commandes-services-tab.md)
- [Moderation read paths (fix/moderation-filter, 2026-07-28)](moderation-read-paths.md)
- [G4 — Tableau de bord vendeur (feat/g4-seller-dashboard, 2026-07-28)](g4-tableau-de-bord-vendeur.md)
- [G8 — Commandes reçues (feat/g8-commandes-recues, 2026-07-28)](g8-commandes-recues.md)
- [G9 — Détail de la commande (feat/g9-order-detail, 2026-07-28)](g9-detail-de-la-commande.md)
- [delivery_fee (discovery/delivery-fee, 2026-08-01)](delivery-fee.md)
- [G6 image rendering (fix/g6-figma-fidelity, 2026-08-06)](g6-image-rendering.md)
- [C1 — Marketplace produits (feat/c1-marketplace-produits, 2026-08-07)](c1-marketplace-produits.md)
- [Purging corrupt storage objects (chore/purge-corrupt-product-images, 2026-08-07)](purging-corrupt-storage-objects.md)
- [AppShell Topbar 375px fix + first MarcheLayout→AppShell migration step (fix/appshell-topbar-and-pitch-pages, 2026-08-13)](appshell-topbar-375px-fix-first-marchelayoutappshell-migration-s.md)
- [/devenir-vendeur/boutique rebuild (feat/devenir-boutique-rebuild, 2026-08-13)](devenir-vendeur-boutique-rebuild.md)
- [H2 step 1 "Bases" (feat/h2-step1-bases, 2026-08-14)](h2-step-1-bases.md)
- [H2 step 2 "Compétences & langues" (feat/h2-step2-competences, 2026-08-14)](h2-step-2-competences-langues.md)
- [Sidebar Marketplace + legacy shell retirement (feat/sidebar-marketplace-and-shell-migration, 2026-08-15)](sidebar-marketplace-legacy-shell-retirement.md)
- [G3 — Modifier ma boutique (feat/g3-shop-edit, 2026-08-15)](g3-modifier-ma-boutique.md)
- [D3 fidelity re-audit — sparse live data, and the standing rule it forces (fix/d3, 2026-08-13)](d3-fidelity-re-audit-sparse-live-data-and-the-standing-rule-it-f.md)
- [D3 banner-fix recovery (fix/d3-banner-recovery, 2026-08-16)](d3-banner-fix-recovery.md)
- [F1 Mes favoris (feat/f1-favoris, 2026-08-16)](f1-mes-favoris.md)
- [G7 — Modifier un produit (feat/g7-modifier-produit, 2026-08-17)](g7-modifier-un-produit.md)
- [PR-C — Mes annonces list rebuild (feat/annonces-list-ds, 2026-08-22)](pr-c-mes-annonces-list-rebuild.md)
- [Pluralization helper + AR fixes (feat/i18n-plurals, 2026-08-23)](pluralization-helper-ar-fixes.md)
- [Paramètres part 2 — Confidentialité tab + role conditionality (feat/parametres-tabs, 2026-08-24)](parametres-part-2-confidentialite-tab-role-conditionality.md)
- [Dependency audit PR-2 — Sentry SDK bump (chore/deps-sentry, 2026-08-24)](dependency-audit-pr-2-sentry-sdk-bump.md)
- [Fix the four raw-color values + gate lint locally (chore/lint-raw-colors, 2026-08-25)](fix-the-four-raw-color-values-gate-lint-locally.md)
- [Pre-public security audit follow-ups (chore/pre-public-scrub, 2026-08-26)](pre-public-security-audit-follow-ups.md)
- [Production sign-in outage — Supabase free-tier auto-pause (diagnosed 2026-09-01)](production-sign-in-outage-supabase-free-tier-auto-pause.md)
- [Pre-existing integration-test fixture collision — buyer-cancellation-history.test.ts / order-delivery-fee-snapshot.test.ts (found 2026-09-03](pre-existing-integration-test-fixture-collision-buyer-cancellati.md)
- [H4 — Tableau de bord freelance (feat/h4-dashboard-freelancer, 2026-09-03)](h4-tableau-de-bord-freelance.md)
- [Shared-shell content column is wider than every frame in the file above 1440px (found 2026-09-04, feat/h4-dashboard-freelancer)](shared-shell-content-column-is-wider-than-every-frame-in-the-fil.md)
- [Tailwind v4 silently drops utilities that reference an undefined token — passed tsc/lint/build while visibly broken (found 2026-09-04, feat/](tailwind-v4-silently-drops-utilities-that-reference-an-undefined.md)
- [service_listings has no honest "published" timestamp (found 2026-09-04, fix/h4-dashboard-fidelity)](servicelistings-has-no-honest-published-timestamp.md)
- [D4 — Profil freelance public (feat/d4-public-profile, 2026-09-05)](d4-profil-freelance-public.md)
- [H5 — Mes services (feat/h5-mes-services, 2026-09-05)](h5-mes-services.md)
- [13-sector service taxonomy reconciliation, PR 1 (feat/taxonomy-13-sectors, 2026-09-07)](13-sector-service-taxonomy-reconciliation-pr-1.md)
- [13-sector service taxonomy, PR 2 — DB cutover (feat/taxonomy-13-sectors-db-migration, 2026-09-07)](13-sector-service-taxonomy-pr-2-db-cutover.md)
- [H6 PR-1 — service_listings hardening (feat/h6-data-foundation, 2026-10-23)](h6-pr-1-servicelistings-hardening.md)
- [Security audit — open findings (fix/orders-insert-integrity, 2026-10-23)](security-audit-open-findings.md)
- [App server guards (fix/app-server-guards, 2026-10-23)](app-server-guards.md)
- [job_responses integrity (fix/job-responses-integrity, 2026-10-23)](jobresponses-integrity.md)
- [H6 PR-2 — wizard shell + steps 1–2 (feat/h6-wizard-steps-1-2, 2026-10-23)](h6-pr-2-wizard-shell-steps-12.md)
- [Suspension enforcement (fix/suspension-enforcement, 2026-10-24)](suspension-enforcement.md)
- [Found while gating fix/suspension-enforcement (2026-10-24) — not suspension](found-while-gating-fix-suspension-enforcement-not-suspension.md)
- [H6 PR-3 — steps 3 « Tarif » / 4 « Prestation » (feat/h6-wizard-steps-3-4, 2026-10-24)](h6-pr-3-steps-3-tarif-4-prestation.md)
- [H6 PR-4 — step 5 « Publication », publish, entry points (feat/h6-publish-step5, 2026-10-24)](h6-pr-4-step-5-publication-publish-entry-points.md)
- [Africa/Tunis — remaining date sites (fix/ui-polish-1, 2026-10-26)](africa-tunis-remaining-date-sites.md)
- [H8 PR-1 — « Mes engagements » list (feat/h8-mes-engagements, 2026-10-25)](h8-pr-1-mes-engagements-list.md)
- [H8 PR-2 — engagement detail (feat/h8-engagement-detail, 2026-10-25)](h8-pr-2-engagement-detail.md)
- [S-3 — uploads through the service role (fix/storage-uploads-service-role, 2026-10-26)](s-3-uploads-through-the-service-role.md)
- [Pre-launch security batch PR-2 — grants (fix/prelaunch-acl-hardening, 2026-10-26)](pre-launch-security-batch-pr-2-grants.md)
- [Missions M-C — proposal fields, typed response errors (feat/missions-m-c, 2026-10-26)](missions-m-c-proposal-fields-typed-response-errors.md)
- [Missions M-A — job_posts.response_count + write lock (feat/missions-m-a, 2026-10-26)](missions-m-a-jobposts-responsecount-write-lock.md)
- [Pre-launch security batch PR-1 — shop-side read RLS (fix/prelaunch-shop-read-rls, 2026-10-25)](pre-launch-security-batch-pr-1-shop-side-read-rls.md)
- [Pre-launch security batch PR-3 E1 — orders lifecycle columns (fix/prelaunch-order-lifecycle, 2026-10-25)](pre-launch-security-batch-pr-3-e1-orders-lifecycle-columns.md)
- [Live-suite teardown guard (fix/rls-suite-teardown-guard, 2026-10-26)](live-suite-teardown-guard.md)

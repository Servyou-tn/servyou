# 13-sector service taxonomy reconciliation, PR 1 (`feat/taxonomy-13-sectors`, 2026-09-07)

## Skills pools for the 5 new service sectors — FOUNDER-UNREVIEWED, feed H6's type-ahead — ON SCREEN in H6 PR-2

- **2026-10-23:** the picker is live on `/mes-services/creer` (unlinked); per-sector screenshots and the
  full lists are in the H6 PR-2 body for the founder's verdict. Each skill now has a stable `id`, so
  rewording a label after review no longer splits a skill in two. Close this entry on the verdict.


- The 5 sectors added in the 13-sector reconciliation (`community-management`,
  `voix-off-doublage`, `personal-branding`, `coaching-meta-ads`, `coaching-ecommerce`) each carry
  a first-pass skills pool written by CC — not sourced from a measured Figma frame, the locked
  doc (which has no skills content at all), or prior art. Flagged `FOUNDER-UNREVIEWED` inline on
  each `skills:` array in `src/lib/taxonomy/service-categories.ts`.
- **Why it matters:** `skills` is the exact pool H6's type-ahead suggests from as a freelancer
  types — these strings render verbatim on screen. Skills are matched BY STRING (no skill
  entity/slug yet), so a wording change made after H6 ships would split one skill into two on
  the `/marche/services` filter instead of cleanly renaming it.
- **Founder's instruction (2026-09-07):** review these 5 pools when H6 "Créer un service" is
  actually built and the picker is on screen — not before, and not from reading the file in the
  abstract.
- **Not fixed here** — a starter list is exactly what was asked for at this stage; the point of
  this entry is only to make sure the review actually happens.
- **Trigger:** H6 reaches a reviewable state (wizard + skill-combo on screen).

## ✅ `coaching-ecommerce` sector id — hyphenation mismatch against the doc — RESOLVED: staying, founder-ruled

- The reconciliation pass in this PR renamed 5 sector ids to match the locked doc's naming
  exactly (`dev-web-mobile` → `developpement-web-mobile`, `design-graphique` →
  `design-graphique-logo`, `traduction-langues` → `traduction`, `video-animation` →
  `montage-video-motion`, `conseil-assistance` → `consulting-assistanat`).
- **Not renamed:** `coaching-ecommerce`. The doc's heading is "Coaching e-commerce" (hyphenated);
  the file's own stated slug rule would derive `coaching-e-commerce`. Left alone because this is
  a hyphenation variant of the same name, not a naming mismatch like the five above, and it
  wasn't part of the founder's explicit rename instruction.
- **Founder ruling (2026-09-07, `feat/taxonomy-13-sectors-db-migration`):** stays as
  `coaching-ecommerce`. Reasoning: slugs drop punctuation consistently across the whole file
  (`e-commerce` under `developpement-web-mobile` is the one counterexample that keeps its hyphen
  because it's already the standalone word "e-commerce," not a punctuation-glued compound like
  "Coaching e-commerce" would be) — closing this as resolved rather than a standing offer, now
  that `coaching-ecommerce` is persisted as real `category_id` values (this PR's cutover
  migration) and a rename is a migration, not a diff.
- **Trigger:** none — closed.

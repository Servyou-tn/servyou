# Dashboard « Force du profil » fixes (`fix/dashboard-force-du-profil`, 2026-11-01)

## Inert links audit — the two dashboards

Founder brief item 4: every link on `/tableau-de-bord` (freelancer) and `/tableau-de-bord-vendeur` (shop) that was inert because its route did not exist yet.

| Dashboard | Link | Was | Now |
|---|---|---|---|
| Freelancer | « Compléter mon profil → » (Force du profil footer) | inert `<span aria-disabled>` (H3 did not exist) | link → `/mon-profil-freelance/modifier` |
| Freelancer | the 5 checklist items | plain text | each item NOT done is a link → H3 on its section (`?section=photo / bio / competences / realisations / liens`) |
| Freelancer | header « Créer un service » | already live since H6 PR-4 → `/mes-services/creer` | — |
| Freelancer | quick actions (Créer un service · Trouver des missions · Acheter des produits · Voir mes commandes) | all real routes | — |
| Freelancer | tiles / « Missions récentes pour vous » link | real routes (`/mes-engagements`, `/mes-services`, `/marche/produits`, `/trouver-des-missions`) | — |
| Shop | every link (`/mes-produits/ajouter`, `/commandes-recues`, `/ma-boutique/modifier`, `/boutique/{id}`, `/devenir-vendeur`) | all real routes, nothing inert | — |

## « Voir tout » on Activité récente — hidden until a page lists the feed

**What** The freelancer dashboard's « Activité récente » panel (Figma 167:12377) draws a « Voir tout → » header link. No route lists the whole feed (it merges seller-order requests, status changes and mission proposals via `buildActivityFeed`; `/mes-engagements` = orders only, `/mes-propositions` = proposals only). Architect ruling 2026-11-01: no inert links — the link is **not rendered**, and the dead `activite.view_all` keys are removed. `Panel`'s header `link` now only accepts a real `href`.

**Where it lives** `src/app/tableau-de-bord/_components/ActiviteRecente.tsx` (comment where the link was), `Panel.tsx`.

**Trigger** A page that lists the merged feed exists (or the founder points it at an existing page). Then restore the `link` prop and re-add `activite.view_all` (FR « Voir tout → », AR « عرض الكل ← ») in fr.ts and ar.ts.

## H3's « Portfolio » pill says « Complet » at 1 item, the dashboard asks for 2

**What** « Ajoutez 2 réalisations » on the dashboard is done at ≥ 2 portfolio items, but H3's « Portfolio » accordion shows « Complet » as soon as there is 1 (`complete={portfolioRows.length > 0}`, like every H3 section). A freelancer with one item follows the dashboard's to-do link to a section that reads « Complet ».

**Why deferred** The H3 pill is a measured, founder-ruled element (« Vide » / « Complet », no per-section thresholds); changing it is a design decision.

**Where it lives** `src/app/mon-profil-freelance/modifier/_components/ProfileEditForm.tsx` (Portfolio `AccordionSection`), `src/lib/marche/freelancer-dashboard.ts` (`PORTFOLIO_ITEMS_GOAL`).

**Trigger** The founder decides whether the goal is 1 or 2, or whether H3 should show « 1 / 2 ».

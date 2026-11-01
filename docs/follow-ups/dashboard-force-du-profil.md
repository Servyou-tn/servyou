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

## « Voir tout » on Activité récente has no destination

**What** The freelancer dashboard's « Activité récente » panel draws a « Voir tout → » header link (Figma 167:12377). It stays an inert muted label (`href: null`): there is no route that lists the whole feed. The feed merges seller-order requests, status changes and mission proposals (`buildActivityFeed`), which no existing page shows together (`/mes-engagements` = orders only, `/mes-propositions` = proposals only).

**Why deferred** Needs a product decision (a dedicated « Activité » page, or point it at `/mes-engagements`) — not a wiring fix.

**Where it lives** `src/app/tableau-de-bord/_components/ActiviteRecente.tsx` (`link={{ href: null, … }}`), `Panel.tsx` (inert branch).

**Trigger** The founder decides what « Voir tout » should open.

## H3's « Portfolio » pill says « Complet » at 1 item, the dashboard asks for 2

**What** « Ajoutez 2 réalisations » on the dashboard is done at ≥ 2 portfolio items, but H3's « Portfolio » accordion shows « Complet » as soon as there is 1 (`complete={portfolioRows.length > 0}`, like every H3 section). A freelancer with one item follows the dashboard's to-do link to a section that reads « Complet ».

**Why deferred** The H3 pill is a measured, founder-ruled element (« Vide » / « Complet », no per-section thresholds); changing it is a design decision.

**Where it lives** `src/app/mon-profil-freelance/modifier/_components/ProfileEditForm.tsx` (Portfolio `AccordionSection`), `src/lib/marche/freelancer-dashboard.ts` (`PORTFOLIO_ITEMS_GOAL`).

**Trigger** The founder decides whether the goal is 1 or 2, or whether H3 should show « 1 / 2 ».

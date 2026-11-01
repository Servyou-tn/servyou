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

## H3 « Portfolio » pill now follows the dashboard goal (resolved)

**What** Architect ruling 2026-11-01: the H3 « Portfolio » pill reads « Complet » at ≥ 2 réalisations, like « Ajoutez 2 réalisations » on the dashboard. Both read ONE constant, `PORTFOLIO_ITEMS_GOAL` / `isPortfolioComplete` in `src/lib/freelancer/profile-sections.ts` (unit-tested, plus a render test of the pill at 1 and 2 items).

**Side effect to know** With exactly 1 item the pill reads « Vide » (H3 has only « Vide » / « Complet », no « 1 / 2 » state — measured 408:14559), although the section has content. The dashboard link to that section is therefore consistent, but the word « Vide » at 1 item is slightly off.

**Trigger** The founder wants a third state (e.g. « 1 / 2 ») — a design addition.

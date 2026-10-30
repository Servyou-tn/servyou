# Freelances lens (`feat/freelances-lens`, 2026-10-30)

## Four near-identical marketplace filter bars
**What:** `ServicesFilterBar`, `ProduitsFilterBar`, `BoutiquesFilterBar` and now `FreelancesFilterBar` are forks of one another (same triggers, chips, URL writes; different option lists and keys).
**Why deferred:** each fork was measured against its own frame; merging is a refactor of three shipped surfaces.
**Trigger:** the next change to any of them — one `MarketplaceFilterBar` taking its controls as config.

## The search is capped at 500 published profiles and runs on the server in JS
**What:** `searchFreelancers` fetches up to `FREELANCER_FETCH_CAP` (500) published profiles, then filters (name / skills / sector) and sorts in memory, like `searchMarketplace`. Fine for the pre-launch catalogue (10 today).
**Trigger:** the published-freelancer count approaches a few hundred — DB-side search (a name column or view) and range pagination.

## Freelancer skills are empty in the current data
**What:** none of the 10 published profiles has a `freelancer_skills` row, so no card shows skill chips and a skill search finds nothing. The card and the search are ready for them.
**Trigger:** real profiles filled through the H3 form — nothing to do in code.

## Catégorie = sectors of active services, not a freelancer attribute
**What:** a freelancer has no sector of their own; the filter derives it from their active services (category or sub-category). A freelancer who offers services in two sectors appears under both — intended.
**Trigger:** if a « main specialty » is ever stored on the profile, switch the filter to it.

## Signed-in heart state on the lens
**What:** `getFavoritedIds('freelancer', …)` seeds the hearts; verified only for a guest here.
**Trigger:** the founder's visual check while signed in.

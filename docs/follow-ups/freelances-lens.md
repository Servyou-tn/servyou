# Freelances lens (`feat/freelances-lens`, 2026-10-30)

## The search filters and sorts on the server in JS
**What:** `searchFreelancers` reads every visible active service (with its starting price), then the profiles (by id, 80 per request) and — for a name / skill search — their names and skills, and filters / sorts in memory. Every lookup pages past PostgREST's 1000-row limit, so nothing is silently dropped, but the cost grows with the catalogue (10 published freelancers today).
**Trigger:** a few hundred published freelancers — DB-side search (a name column or a search view, a materialised « lowest price » per freelancer) and range pagination.

## Chips come mostly from service tags until profiles fill in their skills
**What:** only 3 `freelancer_skills` rows exist, so today's chips are the tags of each freelancer's own active services (profile skills win when present; architect ruling 2026-10-31). The card's `+N` counts every distinct skill + tag.
**Trigger:** none — as profiles are completed through the H3 form their own skills lead. If the tags are judged too noisy (free text), cap how many service tags may fill.

## Catégorie = sectors of active services, not a freelancer attribute
**What:** a freelancer has no sector of their own; the filter derives it from their active services (category or sub-category). A freelancer who offers services in two sectors appears under both — intended. With a sector AND a price range chosen, the service must satisfy both.
**Trigger:** if a « main specialty » is ever stored on the profile, switch the filter to it.

## The Boutiques lens still remounts its filter bar on every `q` change
**What:** `BoutiquesLens` keys its bar on `q`, so submitting a search drops the input focus and closes an open menu. `ServicesFilterBar` (now also the Freelances bar) adjusts its state during render instead.
**Trigger:** the next change to `BoutiquesFilterBar` — port the render-time sync (or reuse the shared bar).

## Signed-in heart state on the lens
**What:** `getFavoritedIds('freelancer', …)` seeds the hearts; verified only for a guest here.
**Trigger:** the founder's visual check while signed in.

## Open design questions are in the deltas doc
See « OPEN QUESTIONS for the founder » in `docs/design/freelances-lens-deltas.md` (toggle state in the 1440 frame, no in-page filter at 375, mobile header, shell chrome, Filter Bar rhythm, sort options, /mes-favoris).

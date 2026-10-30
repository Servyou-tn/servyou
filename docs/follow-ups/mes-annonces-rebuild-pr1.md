# Mes annonces rebuild — F3 list + F2 publish (`feat/mes-annonces-rebuild`, 2026-10-30)

## SortSelect is h40, the F3 frame draws the Select at 44
**What:** the filter bar's Select in F3 (1476:27992) is h 44 like the search input; the shared `SortSelect` (G8 / H11) is `h-10`. F3 ships with the shared 40 so the bar stays identical to H11's.
**Why deferred:** changing it moves H11 and the orders pages too.
**Where it lives:** `src/components/orders/SortSelect.tsx`.
**Trigger:** the next pass over the filter-bar atoms — measure once and move every consumer together.

## Date input shows the OS locale, not the page language
**What:** the native `type="date"` renders `mm/dd/yyyy` on an en-US host even in FR/AR (the frame draws « jj / mm / aaaa »). Same as `SignupForm`.
**Why deferred:** no DS DatePicker exists.
**Trigger:** a DatePicker primitive.

## No edit route for an annonce
**What:** F4 draws « Modifier l’annonce » but `/mes-annonces/[id]/modifier` does not exist. `validateJobPost(input, now, original)` already length-checks title / description only when they changed, ready for it.
**Trigger:** PR-2 (F4) — build the route or ship the button disabled with a founder ruling.

## Measured values without a token
**What:** a few measured sizes have no token and ship as arbitrary values copied from the H11 precedent: 13 px relative-time line (`text-[13px]`), 0.24 px header tracking, the tips card's 15 px titles, the 13 px breadcrumb.
**Trigger:** a type-ramp pass that adds `--text-13` / `--text-15` or rounds them to the ramp.

## Old annonces keep a min–max range, new ones a single budget
**What:** new posts write `budget_max` only; posts created before keep `budget_min` + `budget_max`. Display handles both (`formatJobBudget`); a max-only budget now reads « 800 TND » (it read « Jusqu'à 800 TND » on H9/H10 before), so an old post that really meant « up to » reads as a figure.
**Trigger:** if the difference matters, backfill nothing — add a `budget_kind` later, or accept.

## AR copy is a draft
**What:** every new `mesannonces.*` / `annonce.form.*` Arabic string is marked `REVIEW_AR_TRANSLATION`.
**Trigger:** the founder's Arabic review pass.

## The 60 / 500 limits are app-level only
**What:** a browser client with the anon key can still INSERT through RLS with a longer title / description; only `createAnnonce` enforces them. `validateJobPost(..., original)` must be fed the STORED row by a future edit action, never client input.
**Trigger:** the founder asks for a DB CHECK (it needs a migration that tolerates existing long rows, e.g. `NOT VALID`).

## SkillsPicker commit-on-close heuristic
**What:** typed text is committed on close only when it matches no pool option (otherwise it was a filter) and not on Escape. A user who types a word that happens to be a substring of a pool option and means it as a NEW skill must press Enter / « Ajouter ». A typed list longer than the room left under `max` keeps the first parts and drops the rest without a message (same as the add row).
**Trigger:** user feedback.

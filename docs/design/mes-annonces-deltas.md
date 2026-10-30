# Mes annonces rebuild — diff + decisions (for the founder's scope call)

Frames: F3 list `1476:27949` · F2 publish `1478:29808` · F4 detail `1477:29190` (+ the three 375 frames). Measurements: `docs/design/mes-annonces-measurements.md`.
Branch `feat/mes-annonces-rebuild` (from origin/main 4231a6d). Nothing built yet — this is the DIFF step.

## 0. What the brief asks for that is ALREADY on main (verified by reading the code, not assumed)

| Brief item | State on main |
|---|---|
| Caps from migration 101 → FR + AR | **Done.** `lib/marche/cap-refusal.ts` maps `job_post_cap_open` / `job_post_cap_daily` to `annonce.error.cap_open` / `cap_daily` (FR + AR keys exist). Both `createAnnonce` AND `reopenMissionAction` call it (reopen also hits the open cap). Nothing to build; I will only make sure the new form shows these two messages (they render in the form banner today). |
| Skills must save as separate tags | **Partly done, by design.** The form already uses `SkillsPicker` (PR-4 787bb79, 03194ce). Typed text splits on `,` `;` newline and the Arabic `،` `؛`. A **space never splits** (tested on purpose: « Motion design » stays one skill). So « figma claude adobe » + Enter is still ONE tag. See D1. |
| "The category default" in F2 | **Not found as a bug.** The create form has no default: the select shows the placeholder, same as the frame. Real defect seen while reading: the select (and the list rows) print `name_fr` in Arabic mode because `getCategories` / `getMyAnnonces` do not load `name_ar` (vocabulary lock). See D2. |

## 1. F3 — list (`/mes-annonces`)

| # | Class | Frame | Current build |
|---|---|---|---|
| 1 | DIFFERENT | H1 32 Bold + subtitle + primary button, always shown (full-width on 375) | `PageHeader` title + count; button only when ≥ 1 annonce |
| 2 | MISSING | 4 stat tiles (Publiées · Ouvertes N / total · Propositions · Pourvues) — real counts from the loaded list, no fake data | none |
| 3 | MISSING | Tabs Toutes / Actives / Fermées + search + « Trier par » | none |
| 4 | DIFFERENT | table card, one row per annonce (icon tile, title, category, « N propositions » + sub-line, budget, status pill, date, « Voir les propositions » + kebab); stacked rows at 375 | 3-up `AnnonceCard` grid |
| 5 | EXTRA (kept) | not drawn: moderation banner (`admin_hidden_at`), expiry countdown, skill chips, city/remote | on `AnnonceCard` |
| 6 | DEFERRED | pagination not drawn | `Pagination` — stays |
| 7 | DATA | « Expirée » row shows « aucune retenue » | status is computed (`resolveAnnonceStatus`) — already exists |

## 2. F2 — publish (`/mes-annonces/nouvelle`)

| # | Class | Frame | Current build |
|---|---|---|---|
| 8 | DIFFERENT | breadcrumb only; card H2 « Décrivez votre mission » | breadcrumb + H1 + subtitle, no card H2 |
| 9 | MISSING | tips card at the right (2px blue border), stacked below the form at 375 | none |
| 10 | DIFFERENT | order: titre · catégorie · description · budget · ville · distance switch · date limite · compétences | titre · description · compétences · catégorie/ville · budget · date + checkbox |
| 11 | DIFFERENT | one « Budget approximatif » field with TND suffix | two fields (min / max) |
| 12 | MISSING | helpers (60 caractères maximum · 0/500 counter · « Optionnel… » · date helper · « 3 à 5 compétences… ») and the 30-day / 10-proposals note | partial |
| 13 | DIFFERENT | remote = Toggle switch row (« Mission réalisable à distance » + helper) | checkbox |
| 14 | DIFFERENT | primary « Publier l’annonce » is **lg** (h48); Annuler secondary md | lg already; cancel is a link styled like secondary |

## 3. F4 — detail (PR-2) — summary only
Back link + header (category chip, status pill, 32 H1, meta row with « Expire dans N jours ») · left: description panel, then « Propositions reçues (N) » with the first 3 cards (price, délai, excerpt, **WhatsApp** + « Voir le profil ») and « + N autres propositions » · right 376: budget 32 Bold, competition pill « N / 10 · encore K places », skills chips, localisation, « Expire dans », then Marquer comme pourvue / Modifier / Supprimer. The F4 375 frame is not read yet (held for PR-2).

## 4. Decisions I need (numbered; recommendation first)

- **D1 Skills splitting.** Recommend: keep SkillsPicker (once built, stays built) and **do not split on spaces** (breaks « Design UI/UX », « Motion design »). Add: text typed but not confirmed is added on submit (it is silently lost today because the input lives inside the popover). Alternative: also split on spaces — your call, it changes the product rule. Also: the frame draws a plain tag input with « tapez puis Entrée »; SkillsPicker's trigger/popover stays visually.
- **D2 "Category default".** I cannot find a default-category bug. Options: (a) the placeholder stays the default (as drawn) and I fix the AR category name — recommended; (b) tell me what you saw. Either way I load `name_ar` for the form select and the list row category.
- **D3 Budget.** Frame has one field; DB and `validateJobPost` have min/max (no schema change allowed). Options: (a) keep two fields inside one « Budget approximatif » group — recommended, nothing lost, existing annonces keep ranges; (b) one field → `budget_max` only (min = null).
- **D4 Title 60 / description 500.** The frame shows « 60 caractères maximum » and « 0/500 ». The DB has no length limit; `validateJobPost` has none. Options: (a) enforce both in `validateJobPost` + `maxLength` (only affects new posts) — recommended; (b) show the counters only.
- **D5 Page title on F2.** Frame has no H1 above the card. Follow the frame (breadcrumb + card H2) — recommended — or keep the old H1.
- **D6 F3 budget sub-line.** « délai 1 mois » / « mensuel » have no data source. Recommend: show the deadline (« avant le 12 août ») when set, else nothing; « Selon budget » when there is no budget at all (as drawn).
- **D7 Kebab.** Not drawn. Recommend: wire only existing actions (Marquer comme pourvue / Rouvrir / Supprimer, same server actions, same confirm modal) — or drop the kebab and keep « Voir les propositions » only.
- **D8 Tabs / search / sort.** Tabs: Toutes · Actives (open) · Fermées (filled + expired). Sort options undrawn — I propose « Plus récentes » (default) · « Plus anciennes » · « Plus de propositions ». All three live in the URL (`?tab=&q=&sort=&page=`), so the page stays a Server Component; the search box is a small client leaf.
- **D9 Kept from the old card.** ModerationBanner and the expiry countdown go on the new row (not drawn). `AnnonceCard` is deleted in the same PR (only `page.tsx` renders it — other grep hits are comments).
- **D10 F4 « Voir le profil ».** There is no public freelancer profile route, so no destination. Recommend: omit the button in PR-2 and log it. WhatsApp keeps going through the existing `WhatsAppContactButton` / `get_contact_phone` path.
- **D11 PR split.** PR-1 = F3 + F2 (this brief's first half), PR-2 = F4. Agreed as written.
- **D12 Stat « Propositions reçues au total ».** = sum of `response_count` over non-deleted annonces. « Ouvertes N / total » where total = Publiées.
- **D13 Relative dates** (« il y a 2h ») via the existing `lib/relative-time.ts`; absolute « 14 juil » via a locale-aware formatter (AR digits stay LTR).

## 5. Reads / hygiene
Figma reads this task: 7 of ~20/month (3 desktop frames, 2 mobile frames, 2 get_metadata). F4 mobile still to read. No production writes; the form check will stop before submit (submit path covered by mocked tests).

## 6. Founder rulings (2026-10-30) — applied in PR-1
1. Skills: keep `SkillsPicker`, never split on a space; text typed but not confirmed becomes a tag (trimmed, de-duplicated, never past the max) — built as commit-on-close of the picker, so a submit never loses it.
2. Category: placeholder stays; `name_ar` loaded in `getCategories` and `getMyAnnonces` (AR select + AR row category).
3. Budget: ONE field, saved as `budget_max` (`budget_min` null for new posts); old posts keep their range and still display « min – max TND »; a max-only budget now displays as a figure (`formatJobBudget`, also H9/H10).
4. Limits: 60 (title) / 500 (description) in `validateJobPost` + `maxLength` + counter; `validateJobPost(input, now, original)` checks a field on edit only when its text changed. No DB constraint.
5. F2: breadcrumb + card H2, no H1. 6–8: as recommended (deadline sub-line, kebab = existing close / reopen / delete, sort Plus récentes / Plus anciennes / Plus de propositions in `?tri=`).
9. « Voir le profil » → `/freelance/[freelancer_id]` in PR-2 (the public profile route exists).
Also fixed on the way: form/error state now holds i18n keys (re-translates on a language switch).

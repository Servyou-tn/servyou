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

## 7. PR-2 — F4 detail (`/mes-annonces/[id]`) — branch `feat/mes-annonces-f4-detail` (from origin/main 8593877)

Measurements: `docs/design/mes-annonces-measurements.md` §F4 (1440, READ 3). **375 frame `1488:65602` is NOT measured** — the Figma MCP hit its Starter-plan call limit; the founder reads it through the figma-cli bridge into `docs/design/f4-375-dump.json` + `f4-375.png`. Until those are applied, 375 is a single column in the F2/F3 mobile order and **mobile is not called done**.

### Diff (F4 vs the current page)
| # | Class | Frame | Current build |
|---|---|---|---|
| 14 | DIFFERENT | back link (arrow + « Retour à mes annonces », 14 Semi Bold `blue/600`) then header: category chip + status pill, H1 32/40, meta row (Publiée le · ville · Expire dans N jours) | 3/5 grid, uppercase « Annonce » eyebrow, H1, pill · date · « N/10 réponses » badge |
| 15 | DIFFERENT | columns: left flex-1, right **376 fixed** (`xl`), stacked below | `lg:grid-cols-5` 3/2 |
| 16 | DIFFERENT | left = « Description du projet » panel, then « Propositions reçues (N) » panel (first 3 cards, « + N autres propositions ») | « Détails de l'annonce » card (description + budget/category/location/deadline/skills grid), then all responses |
| 17 | DIFFERENT | proposal card: received-ago · avatar+name · headline · city · price + délai · excerpt · WhatsApp + « Voir le profil » | name · city · headline · full message · terms · links · skills · « Répondu il y a N j » · small Contacter button |
| 18 | MISSING | decision card (right): budget 32 Bold · competition pill « N proposition(s) reçue(s) » + « N / 10 · encore K places » · skills chips · Localisation · Expire dans · 3 actions | « Actions » card: Fermer / Rouvrir / Supprimer + two helper notes |
| 19 | MISSING | « Modifier l'annonce » (ghost) | removed in PR-D (no edit route) |
| 20 | EXTRA (kept) | not drawn: moderation banner (`admin_hidden_at`), deadline (« Échéance »), proposal links + skills (M-C), « Rouvrir l'annonce » | on the current page |
| 21 | DATA | `Expire dans 12 jours` only means something while open | filled → no expiry item; expired → « Expirée » |

### Decisions (D14+) — founder rulings in italics where given
- **D14 Mobile.** *Build 1440 now; 375 as one column in the F2/F3 mobile order (header → description → proposals → decision card); the founder supplies the 375 dump; mobile not done until applied.*
- **D15 « Voir le profil ».** *Approved.* `job_responses.freelancer_id` is a `profiles.id`, but `/freelance/[id]` resolves `freelancer_profiles.id` (`getFreelancerDetail .eq('id')`). `getAnnonceDetail` now also returns `freelancerProfileId` (from the existing `freelancer_profiles` lookup by `profile_id`); the link is hidden when there is no row (moderated / not live). WhatsApp keeps using `freelancerId` (profiles.id → `get_contact_phone`).
- **D16 « Modifier l'annonce ».** *Rendered DISABLED with a « Bientôt disponible » hint; PR-3 (`/mes-annonces/[id]/modifier`, reusing the F2 form + `validateJobPost(..., original)`) follows immediately.*
- **D17 « + N autres propositions ».** *A button that expands the list inline (aria-expanded), « Afficher moins » to collapse; no new page.* Same recipe on a long message (see D19).
- **D18 Status pill.** The frame draws a bespoke blue/50 « nouveau » chip for « Ouverte »; the list (F3) uses the shared `StatusPill` (`ouverte` = blue/100 · blue/700, Pourvue indigo, Expirée grey). Using the shared pill so one status reads one way on both pages (the PR-E rule in `annonce-status.ts`); only the open pill differs from the frame by one tint step.
- **D19 Message excerpt.** The frame clamps the message to an excerpt with an ellipsis; the owner must still be able to read the whole proposal. Clamp at 3 lines and show « Lire la suite / Réduire » only when the text is long (> 240 characters).
- **D20 Kept from the old page** (not drawn): moderation banner; deadline as a third meta row « Échéance » in the decision card when set; each proposal's portfolio links + skills under the message; Rouvrir (filled, not expired). **Dropped:** the two helper paragraphs (`close_helper`, `expiry_note`) — the confirm modal explains Close and « Expire dans N jours » + the `N / 10` line carry the 30-day / 10-proposal facts. Their keys are removed.
- **D21 Competition pill states.** 0 proposals → neutral « Aucune proposition » · 1…9 → green « N proposition(s) reçue(s) » + « N / 10 · encore K place(s) » · 10 → amber + « 10 / 10 · complet ».
- **D22 Time.** « Expire dans N jours » and « il y a 3 h » come from ONE server clock (`fetchedAt` on the detail data) — the client component never reads `Date.now()` during render (SSR/hydration mismatch, per the header of `AnnonceDetail`).
- **D23 Category.** `name_ar` is loaded for the chip (vocabulary lock), same as PR-1.
- **D24 WhatsApp label** is the frame's « Contacter sur WhatsApp » (new key; the old « Contacter » key goes). Width 252 from `sm`.

- **D25 One label for one action.** F4 says « Marquer comme pourvue » for `closeMissionAction` (status → Pourvue); the list kebab and the confirm modal said « Fermer ». One key (`annonces.detail.close`) now reads « Marquer comme pourvue » on the page, the kebab and the modal title / success toast — the same word as the resulting status.
- **D26 Proposal price currency.** « Prix proposé » read a hard-coded « TND » in Arabic; it now uses `annonce.form.budget_currency` (TND / د.ت) inside `<bdi dir="ltr">`.
- **D27 Frame oddities not copied.** The frame draws a clock icon on the price and a map-pin on the délai; the build uses a wallet and a clock. « Voir le profil » is h40 beside a WhatsApp button at the shared `md` size (h44) — centred, not stretched.
- **D28 Empty proposals** renders inline inside the panel (no card inside the card) and now says « Aucune proposition pour l'instant ».
- **D29 « Modifier l'annonce »** disabled: the « Bientôt disponible » reason is visible text tied with `aria-describedby` (a disabled button can't take focus and its title is unreliable).

Figma reads this task: 0 (the cap was hit on the first call of this PR).

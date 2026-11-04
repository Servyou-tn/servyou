# F2 « Publier une annonce » + F3 « Mes annonces » — mobile 375 (`m375-f2-f3`)

Mobile batch 1, PR-A2 (two pages, one PR), plus two answers from #306: E3's search spacing (Q2) and E4's « ‹ Mes commandes » back link
(Q7). Frames: `docs/design/m375-f2-publier-dump.json` + `.png` (375 × 1647) and `docs/design/m375-f3-annonces-dump.json` + `.png`
(375 × 3018). No Figma MCP read was used. Routes `/mes-annonces/nouvelle` (and `/mes-annonces/[id]/modifier`, the same form) and
`/mes-annonces`; components `src/app/mes-annonces/nouvelle/page.tsx`, `src/components/marche/AnnonceForm.tsx`, `src/app/mes-annonces/page.tsx`,
`src/app/mes-annonces/_components/AnnonceRow.tsx`.

Same method as #306: geometry read from the DOM at 375 (FR + AR, scrollbar hidden) on temporary fixture routes (deleted before commit) —
copies of the real pages with only auth + data reads swapped (F3: the frame's six annonces). The mobile shell stays: it starts the content
24 down where the frame starts at 20, so every « Now » y below is the frame's + 4. `max-lg:` overrides only (AnnonceForm's own mobile padding
is its base class, which `sm:p-8` already overrides from 640).

**From `lg` everything is unchanged**: stash + recapture against `main` (after merging #307) on the same dev server — F2, the edit page, F3, E3,
E4 « Arrivée », each at 1440 and 1100, FR + AR: **20 pairs, 0 differing pixels in all 20.** Two captures flaked on the first run and were
re-run, each to 0 (see « Desktop proof » below).

## F2 — what changed, measured against the frame

| Frame node | Frame | Now (375) |
|---|---|---|
| `breadcrumb` | 13 Regular muted, gap 8, chevron 14, **16 tall** | ✓ 343 × 16 (was 19.5); « Mes annonces » has a 44 px tap target (52 in AR) |
| `MAIN` | 343, pad 20 / 16, r12, **1 px stroke inside**, gap 24, at y56 | ✓ at y60, content **311** (was 309: the CSS border sat outside the padding) |
| `heading` | 20 Semi Bold **/ 26** | ✓ 26 (was 28) |
| `F3-budget` | label 14 Semi Bold **/ 17**, gap 6, 44 field, TND 56, helper 12 **/ 17** | ✓ label 17 (was 20), helper 17 (was 16.8) |
| `codeNote` | 12 / **18** muted, 36 tall | ✓ 311 × 36 (was 33.6) |
| `actions` | Annuler secondary 40 · Publier primary 48, space-between | ✓ unchanged |
| `SIDEBAR` | 343 × 333, pad 24 / 16, **2 px blue/600 stroke inside**, gap 16; tips 12 / 18 | ✓ 343 × 333, content **311** (was 307) |
| titre / catégorie / ville / date | labels 14 Medium / 21, 44 fields, helpers 14 / 21; catégorie + ville carry an empty 16 helper row | unchanged: shared `Input` (lines 20). The empty helper rows are an instance artefact — not reproduced (founder, #306 Q2 / this PR's Q5) |
| `F1-description` | field hugs its 2-line placeholder (76) | unchanged: shared `Textarea`, 120 (primitives kept as built) |
| `F5-distance` | label 16 Semi Bold / 19, description 14 / 17 | unchanged: shared `SettingRow` (24 / 20) |
| `F6-competences` | label 14 Semi Bold / 17, an inline chip field (48), helper 12 under it | unchanged: the shared `SkillsPicker` (label 14 Medium / 20, helper above, a picker button + chips — decision D4) |

The edit page `/mes-annonces/[id]/modifier` renders the same `AnnonceForm`, so it takes the same padding and line changes (it has no frame of
its own): measured at 375 FR + AR, content 311, heading 26, no overflow; desktop 0 px at 1440 + 1100, FR + AR.

## F3 — what changed, measured against the frame

| Frame node | Frame | Now (375) |
|---|---|---|
| `content` | every block **20** apart | ✓ 20 (was 24) |
| `page-header` | H1 32 Bold, subtitle 16 / 26, the button **12** under it, full width | ✓ 12 (was 16). Button stays 40 tall (the frame's 26 is a Figma hug slip — kept, founder) |
| `stats` | 2 × 2 tiles, **165 + 12 + 165**, gap 12 | ✓ 2 × 2 in FR **and AR**, 165.5 wide. In AR it was **3 × 106 + one 343**: with `flex-wrap`, the shorter Arabic labels let three tiles share a row — the wrapper is now a 2-column grid below lg. Tile insides: Q1 |
| `Tabs` | 3 tabs (86 / 89 / 98), the 1 px rule across **343** | ✓ rule 343 (was under the tabs only, 272) |
| search | 343 × 44, 16 under the tabs; the frame's empty label / helper rows not reproduced | ✓ unchanged (already 16 under, 44 tall) |
| « Trier par » | 343 × 44 select, 12 under the search | 12 under ✓; the shared `SortSelect` stays 160 × 40 with the selected value — kept (founder) |
| count « 6 annonces » | — | kept (founder) |
| `propositions-table` | r12, 1 px stroke inside; rows 367, pad 20 / 16 → content **311**, gap 16 | ✓ rows 366.8, content **311** (was 309; rows were 375.4) |
| row `serviceIcon` | 32, **r8**, blue/50 | ✓ r8 (was 10) |
| row captions | « sur 10 maximum » 12 Medium **/ 15**; « Annonce » 12 Medium **/ 15**, **2** above the pill | ✓ 15 / 15, gap 2 (were 16.8 / 16.8, gap 4) |
| row deadline | 14 **/ 17** muted | ✓ 17 (was 20) |
| row actions | « Voir les propositions » 163 × 32 · kebab, end-aligned, gap 8 | ✓ kebab 36 with a 44 px hit area (the frame's 20 is kept off for the touch rule — founder) |
| StatusPill | 25 tall | 24 (shared `StatusPill`, as on E3) |

No horizontal overflow at 375 (FR + AR, F2, the edit page, F3: `scrollWidth` 375).

## E3 + E4 — the two #306 answers

| Item | Ruling | Now (375) |
|---|---|---|
| E3 search spacing (Q2) | « tighten to 16 / 12 (instance artefact) » | ✓ the field 16 under the tabs (y128), the selects 12 under it (y184). The `mt 29 / mb 28` that reproduced the empty rows are gone |
| E4 back link (Q7) | « mobile-only « ‹ Mes commandes », E1 / E2 pattern » | ✓ « ‹ Mes commandes » / « ‹ مشترياتي » 13 / 16 muted with a 16 chevron (flipped in AR), 16 tall, 44 px tap area (127 × 44 FR, 73 × 44 AR), 16 above the H1. → `/mes-commandes`. The desktop breadcrumb is untouched |

## Every control at 375 (FR + AR)

| Page | Control | Goes to |
|---|---|---|
| F2 | « Mes annonces » crumb | `/mes-annonces` |
| F2 | « Mission réalisable à distance » switch | toggles (`aria-checked` false → true) |
| F2 | Compétences picker | opens its list |
| F2 | Publier l'annonce, empty form | stays on the page: 4 fields flagged + « Veuillez corriger les erreurs du formulaire. » / « يرجى تصحيح أخطاء النموذج. » (a valid submit was not sent — it would write) |
| F2 | Annuler | `/mes-annonces` |
| F3 | Publier une annonce | `/mes-annonces/nouvelle` |
| F3 | Toutes / Actives / Fermées | `/mes-annonces`, `?statut=active`, `?statut=closed` |
| F3 | Rechercher (Enter) | `/mes-annonces?q=logo` |
| F3 | Plus récentes | 3 sorts (FR « Plus récentes / Plus anciennes / Plus de propositions », AR « الأحدث / الأقدم / الأكثر عروضًا ») |
| F3 | Voir les propositions | `/mes-annonces/{id}` |
| F3 | kebab | « Marquer comme pourvue / Supprimer l'annonce » (not clicked — they write) |
| E4 | ‹ Mes commandes | `/mes-commandes` |
| all | the routes, logged out | `/mes-annonces`, `/mes-annonces/nouvelle` → `/connexion`; `/mes-annonces/{id}/modifier` → `/connexion?next=…` (307) |

## Desktop proof — the two flakes

Each pair is the same fixture captured with the change and with `main` stashed back, on the same dev server.

- **E3 AR 1440 — 58 px on the first run (2026-11-03).** Re-run today: `after` vs `main` = 0. Three `after` captures match each other and the
  first run's `after` exactly; today's `main` differs from the first run's `main` by exactly those 58 px, so the odd capture was that baseline
  (anti-aliasing on the Arabic H1 glyphs and a thumbnail edge — same code, different raster).
- **E3 AR 1100 — 5 px on today's batch.** Re-run: `after` vs `main` = 0. The 5 px (x 833–835, y 17–20) are the rounded corner of the shell
  top bar's search field in the batch's own `after` shot; a second capture of the same code does not reproduce them.

## Questions for the founder

None open: the six from the handoff were answered (keep `SortSelect`, `StatTile`, the count line, the 40 px button, the 44 px kebab, every
primitive as built; don't reproduce the empty helper rows; the edit page takes the form's changes). `SortSelect` and `StatTile` are logged in
`docs/follow-ups/m375-f2-f3.md`.

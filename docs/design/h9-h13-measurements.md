# H9–H13 — freelancer outbound mission flow: Figma measurements + discovery

> Branch `feat/h9-missions` (from origin/main 3d4bc32). **Phase 1 = discovery only — no code.**
> File `jDNjJ8D1gnXiW7Ry3GkN4U`. Budget: 5 `get_design_context` reads for the whole series.
> Reads used so far: **5/5 (budget exhausted)** — H9 `311:10534`, H10 `322:11550`, H12 `350:12007`, H13 `376:10511`, H11 `298:9129`.
> Any further Figma read (the 12 specimen nodes marked NOT READ below) needs an explicit architect go-ahead.
> Conventions: tokens by Figma name (`text/muted` = `--text-muted`…); px values are Figma-measured;
> "FIXED" = fixed in the frame, "FILL" = grows. Nothing here is guessed — anything not read is marked ⚠ NOT READ.

---

## 0. Frame map

| Screen | Route (proposed) | 1440 frame | Size | Sub-nodes |
|---|---|---|---|---|
| H9 Trouver des missions | `/trouver-des-missions` | `311:10534` | 1440×1265 | MissionCard `311:10264`, Competition Pill `310:10162` |
| H10 Mission detail | `/missions/[id]` | `322:11550` | 1440×923 | state A `323:11896`, B `324:11928`, specs `331:11979` (blocked), `331:12001` (answered) |
| H12 Proposition | `/missions/[id]/proposer` | `350:12007` | 1440×1145 | specs `356:12458/12519` (liens), `369:2696/2756`, `374:10479` (compétences), `378:10917/10929/10947` (inline) |
| H13 Proposition envoyée | `/missions/[id]/proposition-envoyee` | `376:10511` | 1440×1248 | failures `378:10814/10842/10862/10882` |
| H11 Mes propositions | `/mes-propositions` | `298:9129` | 1440×1153 | PropositionRow `296:9022` |

Shared chrome on every frame: Sidebar 240 (`blue/950`) + Topbar 64 + `content` pad 32 gap 24 on `surface/subtle`. These are already
built (`AppShell`); the only per-screen fact is the active nav item (H9/H10/H12/H13 → « Trouver des missions », H11 → « Mes propositions »).

---

## 1. H9 — Trouver des missions (`311:10534`) — READ 1/5

Frame 1440×1265. content `311:10538` = page-header · awareness-bar · filter-bar · sort-row · mission-grid · pagination-wrap.

### 1.1 Section table

| # | Node | Element | Measured |
|---|---|---|---|
| 1 | `311:10539` page-header | row, space-between, centered | — |
| 1a | `311:10541` | H1 « Trouver des missions » | Inter Bold 32, `text/primary` |
| 1b | `311:10542` | subtitle « Trouvez des projets qui correspondent à vos compétences » | Regular 16 / 26, `text/muted`; gap 4 under H1 |
| 1c | `311:10811` | count « 142 missions disponibles » (right) | Semi Bold 16, `blue/600`, no create CTA |
| 2 | `311:10812` awareness-bar | slim info bar | `blue/50`, radius `md` 8, pad 16/12, space-between |
| 2a | `311:10814` | `icon-info` | 20, `blue/600` |
| 2b | `311:10818` | « Vous avez 3 propositions actives sur 5 » | Medium 14, `text/secondary`, gap 8 from icon |
| 2c | `311:10819` | « Gérer mes propositions → » (right) | Semi Bold 14, `blue/600` → `/mes-propositions` |
| 3 | `311:10820` filter-bar | row, gap 16, FILL | 4 Select triggers + 1 toggle control |
| 3a | `311:10821/10832/10843/10854` | Selects « Catégorie » · « Ville » · « Budget » · « Compétences » | each FILL (`flex 1`), field h **44**, `surface/base`, 1px `border/strong`, radius `lg` 10, px 16, placeholder body 16/26 `text/muted`, chevron 18 |
| 3b | `311:10865` teletravail | bordered toggle control « Télétravail accepté » | `surface/base`, 1px `border/strong`, radius `lg` 10, pad 14/10, gap 8; Toggle 44×24 (off) + Medium 14 `text/secondary` |
| 4 | `311:10871` sort-row | space-between | — |
| 4a | `311:10872` | active-filter chips (« Catégorie : Design ✕ », « Ville : Tunis ✕ ») | `blue/50` pill (`radius/full`), pad L12 R8 / V4, gap 4; Medium 14 `blue/600`; ✕ icon 14 |
| 4b | `311:10883` | « Trier par » Select | FIXED 200, same trigger as 3a |
| 5 | `311:10894` mission-grid | **wrap**, gap 16 (both axes) | cards FIXED 368 → 3 across in 1136 content; 6 per page |
| 6 | `311:11282` pagination-wrap | centered | existing Pagination `188:14219` |
| 6a | `311:11283` | « ‹ 1 2 3 … 8 › » + caption « Affichage 1 à 6 sur 142 » | 36×36 cells radius `md`; active `blue/600` + inverse text; others `surface/base` + 1px `border/subtle`; caption Regular 13 `text/muted`; gap 10 |

### 1.2 MissionCard (`311:10264`; instances `311:10895…`) — FIXED 368 × 369

`surface/base`, 1px `border/subtle`, radius `xl` 12, pad 20, gap 12, **no shadow**. Hover variant (memory, not re-read): border → `blue/600` 1.5px + `shadow/xs`-class drop shadow.

| Slot | Node (in instance) | Measured | Data source |
|---|---|---|---|
| top-strip | `…311:10174` | row, FILL; `justify-between` when « Nouveau » shown | — |
| cat-chip | `…311:10175` | `blue/50`, radius `md` 8, px 12 / py 4, gap 4; icon 14 (`blue/600`) + Medium 14 `blue/700` | `job_posts.category_id → categories.name_fr/name_ar` (+ category icon map) |
| nouveau | `…311:10183` | pill `blue/50`, pad L12 R8 / V4, Medium 14 `blue/600`; **no ✕** (hidden) | **rule undefined** → DECISION (derive: created < 48 h) |
| title | `…311:10188` | Semi Bold 18 / 26, `text/primary`, **FIXED h 52** (2 lines reserved), ellipsis | `job_posts.title` |
| excerpt | `…311:10189` | Regular 14 / 21, `text/muted`, **FIXED h 42** (2 lines), ellipsis | `job_posts.description` (truncate) |
| key-row | `…311:10190` | row, `justify-between`, `items-start` | — |
| budget | `…311:10191` | Bold 18 `text/primary` | `budget_min/max` → « 800 TND » · « 200 – 400 TND » · « 500 TND/mois » ⚠ |
| competition | `…311:10192` | column, gap 4, right-aligned | — |
| comp-pill | `…311:10193` (Competition Pill `310:10162`) | pill `radius/full`, pad 10/4, gap 6; 8px dot + Semi Bold 12 | count of `job_responses` (**not readable under RLS today**) |
| count caption | `…311:10196` | « 2/10 réponses » Regular 12 `text/muted` right | same |
| meta-row | `…311:10197` | row, gap 16 | — |
| loc | `…311:10198` | `icon-map-pin` 16 + Medium 12 `text/muted` (or `icon-globe` + « Télétravail accepté ») | `city` / `is_remote` |
| exp | `…311:10203` | `icon-clock` 16 + « Expire dans 12j » Medium 12 `text/muted` | `created_at + 30 d − now` |
| skills-row | `…311:10208` | row gap 6, ≤ 3 chips: `surface/sunken`, radius `md`, px 12 / py 4, Medium 14 `text/secondary` (grey = contrast with the blue category chip) | `job_post_skills.skill` (first 3) |
| spacer | `…311:10227` | grow 1 (pins footer) | — |
| footer | `…311:10228` | top border 1px `border/subtle`, pt 12, `justify-between` | — |
| client | `…311:10229` | `icon-user` 16 + « Karim · Tunis » Medium 12 `text/muted` | `public_profiles.full_name` (first name) · `.city` |
| link | `…311:10234` | « Voir la mission → » Semi Bold 14 `blue/600` | → `/missions/[id]` |

### 1.3 Competition Pill (`310:10162`) levels

| level | bg | text | label | examples in frame |
|---|---|---|---|---|
| low | `success/100` `#dcfce7` | `success/700` `#166534` | « Peu de concurrence » | 2/10, 1/10, 3/10 |
| med | `warning/100` `#fef3c7` | `warning/700` `#92400e` | « Concurrence moyenne » | 5/10, 6/10 |
| high | `danger/100` `#fde5e5` | `danger/700` `#a51f24` | « Forte concurrence » | 9/10 |

Thresholds are **not in the frame** — the earlier design note says 0–3 / 4–7 / 8–10 (consistent with all six examples: 1,2,3 low; 5,6 med; 9 high). Dot 8px, same colour as the label token's `/500` family.

### 1.4 Frame-vs-brief / frame-vs-data observations (H9)

1. **Cards without « Nouveau » centre the category chip** (`top-strip` = `justify-center` on cards 2, 4, 5 — `justify-between` on 1, 3, 6). Almost certainly a Figma artefact of hiding the pill; build start-aligned. → decision D-H9-1.
2. « **500 TND/mois** » (card 6) — `job_posts` has no pricing-period column. → drop the suffix; D-H9-2.
3. « **142 missions disponibles** », « **Affichage 1 à 6 sur 142** » — needs an exact count of open+visible+unexpired posts. The live DB has **5 open posts, all > 30 days old** (§ data) → the real board is empty on today's data. → D-H9-3.
4. « **Vous avez 3 propositions actives sur 5** » — real data: count of my `job_responses` whose post is still open and < 30 days (mirrors `check_job_response_limits`). Needs the RLS widening to count correctly (§ data, gap G2).
5. Select option lists are **not drawn** (triggers only). Option sets for Budget / Compétences / Trier par are an architect call (D-H9-4).
6. « Compétences » filter is a **Select**, not a multi-select chip field; with free-text skills (`job_post_skills.skill` is free text, exact-match) the option pool is « my profile skills ». → D-H9-5.
7. Mobile: no frame. 3-across → 1-across is derived (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
8. Awareness-bar shows « 3 sur 5 » even for a freelancer with 0 active — at 0 the bar is still informative (« 0 sur 5 »); at 5 it must flip to the warning treatment (spec `331:11979` shows the wording for the blocked CTA).

## 2. H10 — Mission detail (`322:11550`) — READ 2/5

Frame 1440×923. Order inside content `322:11554` (pad 32, gap 24): back-link → **post-header (full width)** → **columns** (gap 24) = left-col FILL · right-col FIXED **376**.
Because the header spans both columns, both column tops start at the same Y (structural, survives a 2-line title).

### 2.1 Elements

| Node | Element | Measured | Data source |
|---|---|---|---|
| `322:11726` back-link | `icon-arrow-left` 20 + « Retour aux missions » | Semi Bold 14 `blue/600`, gap 6 | → `/trouver-des-missions` (keep filters via `?` if cheap) |
| `322:11734` post-header | column gap 12, FILL | — | — |
| `322:11735` top | cat-chip + « Nouveau », gap 8 | same two chips as MissionCard | category · derived « Nouveau » |
| `322:11749` H1 | title | Inter Bold 32 / **40**, `text/primary` | `job_posts.title` |
| `322:11750` meta | row gap 16; 3 items icon 16 + Medium 14 `text/muted`, icon↔text gap 6 | `icon-clock` « Publié il y a 2h » · `icon-map-pin` « Tunis » · `icon-calendar` « Expire dans 12 jours » | `created_at` · `city`/`is_remote` · `created_at+30d` |
| `322:11768` description-panel | left-col only child | `surface/base`, 1px `border/subtle`, radius `xl` 12, pad 24, gap 12 | — |
| `322:11769` | label « Description du projet » | Semi Bold 14 `text/secondary` | — |
| `322:11770` | body | Regular 16 / **27** `text/primary`, **width capped 640**, paragraphs + a real bullet list (`ms-[24px]`) | `job_posts.description` (plain text → `whitespace-pre-line`) |
| `323:11873` client-card | **first** in right-col | `surface/base`, 1px `border/subtle`, radius `xl`, pad 20, gap 12 | — |
| `323:11874` | « Publié par » | Medium 12 `text/muted` | — |
| `323:11876` avatar | 40, initials « K » on `blue/100`, Semi Bold 16 `blue/600` | existing `Avatar` md | `public_profiles.full_name` (initial) |
| `323:11890` | first name « Karim » | Semi Bold 16 `text/primary` | `public_profiles.full_name` → first token |
| `323:11891` | `icon-user` 16 + « Tunis · Consommateur » | Medium 14 `text/muted`, gap 4 | `public_profiles.city` · constant « Consommateur » |
| `323:11838` decision-card | **second** in right-col | `surface/base`, 1px `border/subtle`, radius `xl`, pad 24, gap 16 | — |
| `323:11839` budget | label « Budget » Medium 12 `text/muted`; value « 800 TND » Bold **32** `text/primary`; gap 2 | `budget_min/max` | ⚠ range / single / none formatting — see D-H10-2 |
| Divider ×3 | 1px `border/subtle` | — | — |
| `323:11844` competition | pill (low) + « 2 / 10 réponses » Medium 12 `text/muted`, gap 6 | (same Competition Pill) | response count — **RLS gap G3** |
| `333:12006` skills | label « Compétences requises » Medium 12 `text/muted` + chips (wrap, gap 8, `surface/sunken`, radius `md`, px12 py4, Medium 14 `text/secondary`) | `job_post_skills.skill` | — |
| `323:11851` meta | 2 rows `justify-between`: `icon-map-pin` « Localisation » ⟷ « Tunis » ; `icon-clock` « Expire dans » ⟷ « 12 jours » | label Medium 14 `text/secondary`, value Semi Bold 14 `text/primary`, row gap 12 | `city`; `created_at+30d` |
| `323:11866` CTA | Button primary md, FULL width, 40 h, radius `lg` 10, « Envoyer ma proposition » (Semi Bold 16 inverse) | → `/missions/[id]/proposer` | — |

Sticky: right-col is the sticky track (WCAG 2.2: must not cover focus — `top` offset = topbar 64 + 24).

### 2.2 H10 states (⚠ specimens NOT READ — taken from the design notes, flagged for the architect)

The page is a **read-and-decide** page: the CTA must reflect the freelancer's standing *before* the form. Design notes list 6 on-load blocked states and ship two specimens:

| State | Specimen | What it shows (from notes) |
|---|---|---|
| can respond | the frame itself | primary « Envoyer ma proposition » |
| already responded | `spec-cta-answered` `331:12001` | `icon-check-circle` `success/500` 16 + « Vous avez déjà répondu à cette offre » `success/700` + secondary « Voir ma proposition » + « Envoyée il y a 2h » `text/muted` |
| 5 active reached | `spec-cta-blocked` `331:11979` | disabled primary (`surface/sunken` + `text/muted`) + `icon-alert-circle` `warning/700` + « Limite de 5 propositions actives atteinte » + « Gérer mes propositions → » `blue/600` |
| 10 responses reached / filled / expired / own post | **no specimen** | same pattern as « blocked » with a different reason line — D-H10-3 (copy to be ruled) |

`323:11896` (A) and `324:11928` (B) are the **H13** success / limit panels (re-parked), not H10.

### 2.3 Frame-vs-data observations (H10)

1. Right column order is **client-card, then decision-card** (the CTA sits ~534 px down — below the fold at 1440×900; sticky keeps it reachable).
2. Description is a **plain-text textarea** on the consumer side (`annonce.form`); the frame draws a real bullet list. Code renders `whitespace-pre-line` (no markdown, no `dangerouslySetInnerHTML`) → bullets appear as typed. D-H10-1.
3. « Publié il y a 2h » needs the existing `relativeTimeLabel` (`tableau-de-bord/_components/relative-time.ts`).
4. « Expire dans 12 jours » = `JOB_POST_EXPIRY_DAYS (30) − age`; the consumer-entered `deadline` column is a *different* concept and is not in the frame → D-H10-4.
5. Single budget value « 800 TND » only; budget is `budget_min`/`budget_max` (both nullable) → formatting rule D-H10-2.
6. Competition caption here is « 2 / 10 réponses » (spaces) vs « 2/10 réponses » on the card — keep both literal; both need `dir="ltr"` in AR (numeric-run reversal).

## 3. H12 — Proposition form (`350:12007`) — READ 3/5

Frame 1440×1145. Same skeleton as H10: back-link → full-width header → columns (left FILL = **form-panel**, right FIXED 376 = recap-card + client-card).

### 3.1 Header

| Node | Element | Measured |
|---|---|---|
| `350:12012` | back-link « Retour à la mission » | `icon-arrow-left` 20 + Semi Bold 14 `blue/600` → `/missions/[id]` |
| `350:12019` | H1 « Envoyer ma proposition » | Bold 32 / 40 `text/primary` |
| `350:12223` | subtitle « Expliquez à Karim pourquoi vous êtes le bon choix » | Regular 16 / 26 `text/muted`; header gap 8; « Karim » = consumer first name |

### 3.2 form-panel `350:12032` — `surface/base`, 1px `border/subtle`, radius `xl`, pad 24, **gap 20**

Field order (top → bottom) — the order is a design decision (pitch = message + links + skills; terms = price + délai):

| # | Node | Field | Marked | Measured | Persists to |
|---|---|---|---|---|---|
| 1 | `351:12249` Textarea | « Votre message » | required (unmarked — majority-required rule) | label Medium 14 `text/secondary`; field **min-h 120**, `surface/base`, 1px `border/strong`, radius `lg`, pad 16/12, value body 16/26, placeholder `text/muted` « Expliquez votre approche : ce que vous avez compris du besoin, comment vous le feriez, et pourquoi vous êtes le bon choix. »; helper row: helper body-sm `text/muted` « Les propositions courtes et précises reçoivent plus de réponses. » ⟷ counter « 0 / 1000 » (overline 12, uppercase, `text/muted`) | `job_responses.proposal_message` (**no length cap in DB**, see data section) |
| 2 | `356:12341` links-field | « Liens vers vos réalisations (optionnel) » | optional | label Medium 14 `text/secondary`; helper Regular 12/17 `text/muted` « Ajoutez jusqu'à 3 liens … reçoivent **40% plus de réponses**. » ; rows `link-row` gap 8: label Input **FIXED 272** (« Ex: Site e-commerce artisan ») + URL Input FILL (« https://… »), each h 44, `border/strong`, radius `lg`; `add-row` = secondary/sm Button « + Ajouter un lien » (h 32, px 12) ⟷ counter « 1 / 3 » Regular 12 `text/muted` | **no column** (gap G4) |
| 3 | `368:2682` skills-field | « Vos compétences pour cette mission (optionnel) » | optional | helper Regular 12/17 « Sélectionnez les compétences qui correspondent à cette mission. »; trigger = multi Select h 44 showing « 3 compétences sélectionnées » (`text/primary`) + chevron 18; below: `chips-row` (wrap gap 8) of **dismissible chips**: `blue/50` pill, pl12 pr8 py4, Medium 14 `blue/600`, ✕ 14 | **no table** (gap G4) |
| 4 | `351:12261` price-group | « Prix proposé (optionnel) » | optional | PriceInput: label **Semi Bold** 14 `text/secondary` (differs from the Medium on every other label), field h 44 + `TND` suffix cell (`surface/sunken`, left border `border/subtle`, Medium 14 `text/muted`, pl 12 pr 14); caption Regular 12/17 `text/muted` « Le budget indiqué est 800 TND. Laissez vide pour en discuter. » | **no column** (gap G4) |
| 5 | `351:12270` Input | « Délai proposé (optionnel) » | optional | h 44, placeholder « Ex: 10 jours »; helper body-sm `text/muted` « Vous pourrez ajuster le délai avec le client. » | **no column** (gap G4) |
| 6 | button | « Envoyer ma réponse » | — | Button primary md, FULL width, h 40, radius `lg` | INSERT `job_responses` |
| 7 | `351:12286` | caption | — | Regular 12/17 `text/muted`, centered « Karim verra votre proposition dans ses offres. Vous pourrez ensuite le contacter directement. » | — |

The frame ships the **auto-selected default**: the skills trigger reads « 3 compétences sélectionnées » with 3 chips (React · Next.js · UI/UX) = `freelancer_skills ∩ job_post_skills`; the mission requires 4 (Responsive is the unmatched one). The empty exception (specimen `374:10479`) shows the placeholder « Choisir mes compétences ».

### 3.3 right-col (sticky) — recap-card `350:12045` then client-card `350:12036`

recap-card: `surface/base`, 1px `border/subtle`, radius `xl`, pad 24, gap 16. Blocks: **mission-id** (« LA MISSION » Semi Bold 12 / 17, tracking 0.48, `text/muted` · cat-chip · title Semi Bold 18/26) · Divider · **budget** (« Budget » Medium 12 + « 800 TND » Bold 32) · Divider · **competition** (pill + « 2 / 10 réponses ») · Divider · **skills** (« Compétences requises » + grey chips) · Divider · **meta** (Localisation / Expire dans rows, as H10) · link « Voir la mission complète → » Medium 12 `blue/600` → H10.
client-card: identical to H10 (« Publié par », avatar K, « Karim », « Tunis · Consommateur »).
→ the recap is the **same data as H10's decision-card minus the CTA**; build one `MissionFacts` server component used by both.

### 3.4 Specimens (NOT READ — described from the design notes; each is a top-level sibling, not a child of this frame)

| Node | State | What it is (notes) |
|---|---|---|
| `356:12458` | liens — 3 remplis | 3 filled rows, « + Ajouter un lien » **disabled** (real `secondary/sm/disabled`), « 3 / 3 », « Maximum atteint… » note; rows 2–3 carry a **delete icon-button 32×32** (`icon-trash`, `text/muted`; hover `danger/500`; code needs ≥ 44 touch target) |
| `356:12519` | liens — 2 remplis | 2 filled, add enabled, « 2 / 3 » |
| `369:2696` | compétences — liste ouverte | panel (surface/base, `border/subtle`, radius 10, `shadow/md`, pad 8, FIXED 280 clip): search row, section « Demandées pour cette mission » (React ✓ · Next.js ✓ · UI/UX ✓ · Responsive ☐) · Divider · section « Vos autres compétences » (TS · Tailwind · Figma · Node ☐); real `Select Option multi=on` rows |
| `369:2756` | compétences — 3 sélectionnées | closed state (= the frame) |
| `374:10479` | compétences — aucune correspondance | placeholder « Choisir mes compétences », no chips |
| `378:10917` | inline — limite 5 actives | amber (`warning/50` + `warning/500` border) panel with link « Gérer mes propositions » |
| `378:10929` | inline — erreur technique | amber panel with a real secondary « Réessayer » Button |
| `378:10947` | bannière — offre fermée pendant l'écriture | amber banner « pourvue pendant votre absence » + composed copy button (« copier mon message ») + link; form goes read-only, input preserved |

### 3.5 Frame-vs-data observations (H12) — the important ones

1. **`job_responses` stores only `proposal_message`.** The frame asks for message + ≤ 3 labelled links + skills + price + délai → **4 of 5 fields have no column** (gap G4, see data section). This is the PR-2 blocker; PR-1 (read side) is unaffected.
2. **« 40% plus de réponses »** is an Upwork research statistic presented as Servyou fact. No such data exists on Servyou, and `servyou-phase-aware-features` forbids invented metrics. Recommend neutral copy (D-H12-1).
3. **Button label mismatch:** H10 CTA « Envoyer ma proposition », H12 submit « Envoyer ma réponse ». The vocabulary lock is « propositions » (Mes propositions). D-H12-2: use « Envoyer ma proposition » on both.
4. **Counter format:** frame « 0 / 1000 » overline-uppercase; existing `Textarea` prints `{n}/{max}` caption. Use the component, pin `dir="ltr"`.
5. **No multi-select Select / combobox component exists in code** (only `TagInput` with free-text + suggestions, and Radix `DropdownMenu`). The picker needs a new client component (`SkillsPicker`) built on `popover.tsx` + `FilterControl`. D-H12-3.
6. **Pre-check semantics:** auto-selected = `freelancer_skills ∩ job_post_skills`, matched **case/accent-sensitive on free text** (same caveat as the dashboard's `matchingPostIds`). A near-miss (« Next.js » vs « NextJS ») silently drops out. D-H12-4.
7. Price caption variants needed: with budget (« Le budget indiqué est 800 TND… ») · range · none (« Aucun budget indiqué… »).
8. **Server-action form reset trap** (design notes): a failed server action resets an uncontrolled form → controlled state + `useActionState` / client submit with i18n **keys** in error state.
9. The delete control on rows 2–3 and the row-1 ragged edge (row 1 has no delete) are known flags in the notes; recommend a transparent spacer on row 1.

## 4. H13 — Proposition envoyée (`376:10511`) — READ 4/5

Frame 1440×1248. No columns: content `376:10515` (pad 32) holds ONE centered **confirm-column** `376:10733` — FIXED **640**, gap **32**, `items-center`. Active nav « Trouver des missions ».

### 4.1 Elements (success state — the 95 % case)

| Node | Element | Measured | Data source |
|---|---|---|---|
| `376:10734` hero | column, gap 16, centered | — | — |
| `376:10735` icon-badge | circle **96**, radius 48, `success/50` | — | — |
| `376:10736` | `icon-check-circle` **56**, stroke `success/500` | — | — |
| `376:10740` | H1 « Votre proposition a été envoyée » | Bold 32 / 38 `text/primary`, centered, nowrap | — |
| `376:10741` | « Karim la verra dans ses offres sur Servyou. » | Regular 18 / 28 `text/muted`, centered; text-group gap 8 | consumer first name |
| `377:10742` recap-panel | `surface/base`, 1px `border/subtle`, radius 12, pad 24, gap 16, FILL | — | — |
| `377:10743` | « CE QUE VOUS AVEZ ENVOYÉ » | Semi Bold 12 / 17 `text/muted` (frame: no tracking set, unlike « LA MISSION ») | — |
| `377:10744` mission-row | cat-icon box **32** (`blue/50`, radius 8, icon 18) + title | title Semi Bold 16 / 24 `text/primary` | `job_posts.title` + category icon |
| Divider | 1px `border/subtle` | — | — |
| `377:10752` msg-group | label « Votre message » Medium 12/17 `text/muted`; **msg-inset** `surface/sunken`, radius 8, pad 12, text Regular 14/21 `text/secondary` | **preview truncated with « … »** (≈ 3 lines) | `job_responses.proposal_message` |
| `377:10756` links-group | label « Vos liens »; each link = one line Regular 14/21 `blue/600`, format « Label — domain » | — | links (**gap G4**) |
| `377:10760` skills-group | label « Vos compétences » + grey chips (`surface/sunken`, radius `md`, Medium 14 `text/secondary`) | — | skills (**gap G4**) |
| `377:10781` price-delai | row gap 32: « Prix proposé — **800 TND** » · « Délai proposé — **10 jours** » (label Regular 14 `text/muted`, value Semi Bold 14 `text/primary`, gap 4) | each cell **FIXED h 100** (⚠ layout artefact — leaves a ~80 px void above/below, see obs. 3) | price/délai (**gap G4**) |
| `377:10788` | « Envoyée le 16 juillet à 14h32 » | Regular 12/17 `text/muted` | `job_responses.created_at` |
| `377:10789` next-steps | `blue/50`, radius 12, pad 24, gap 16 | — | — |
| `377:10790` | « ET MAINTENANT ? » | Semi Bold 12/17 `text/muted` | — |
| `377:10792/10797/10801` step ×3 | icon 20 + Regular 14/21 `text/secondary`, gap 12; steps gap 12 | `icon-inbox` « Karim voit votre proposition dans ses offres. » · `icon-whatsapp` « Vous pouvez le contacter directement sur WhatsApp — c'est souvent ce qui fait la différence. » · `icon-users` « 2 autres freelances ont répondu à cette offre. » | step 3 = response count − mine (**RLS gap G3**); hide at 0 |
| `377:10808` cta-group | column gap 16, centered | — | — |
| `134:8027` WhatsApp Button | full-width, h **44**, radius `lg` 10, `wa/brand` `#25D366`, glyph 20 + Semi Bold 16 `text/primary` « Contacter Karim via WhatsApp » | — | `get_contact_phone(consumer)` via `WhatsAppContactButton` |
| `377:10813` | « Voir mes propositions → » | Medium 14 `blue/600`, centered | → `/mes-propositions` |

### 4.2 Failure pages (NOT READ — design notes; 4 × 640×704, each a `page` node; all **amber, never red**)

`378:10814` 10 réponses atteintes · `378:10842` offre pourvue · `378:10862` expirée · `378:10882` supprimée (676 h). Same anatomy: `icon-alert-circle` 56 `warning/700` in a `warning/50` circle · H1 (reason) · body · **PRESERVED-MESSAGE panel** (« VOTRE MESSAGE EST CONSERVÉ » + `surface/sunken` inset + composed copy button) · primary « Voir d'autres missions » · secondary « Mes propositions → ». Design intent: a failed insert must never lose what the freelancer wrote.

### 4.3 Frame-vs-data observations (H13)

1. The page must be **server-rendered from the persisted response** (refresh-safe, deep-linkable), not from transient client state: it reads `job_responses` by `(job_post_id, auth.uid())`. A freelancer with no response for that post is redirected to H10.
2. **Four fields shown here have no column** (links, skills, price, délai) — same gap G4 as H12. If PR-2 ships before the migration the recap must degrade to message + timestamp only (D-PR split).
3. `price-delai` cells are **FIXED h 100** in Figma (clone artefact: a hug row would be 21 px). Build hug; do not reproduce the 80 px void. D-H13-1.
4. « 2 autres freelances ont répondu » needs a count of *other* responders; RLS lets a freelancer read only their own rows → needs the aggregate RPC (gap G3). Hide the row at 0.
5. WhatsApp CTA is **44 h**; `WhatsAppContactButton size="lg"` is **48 h** (G9's measured value). Either add a 44 size or accept `lg`. D-H13-2.
6. « c'est souvent ce qui fait la différence » is an unsupported effectiveness claim (same class as H12's « 40% »). Recommend dropping the clause. D-H12-1 covers both.
7. Failure states: the notes' preferred architecture is **prevention-first** — H10 blocks on load, H12 re-checks on load, the DB trigger is the last line. Failure boxes render **in place in H12** from the action's typed result (message preserved in client state); they are not separate routes. D-H13-3.
8. Date format « 16 juillet à 14h32 » needs a locale-aware formatter (`Intl.DateTimeFormat` fr/ar-TN-u-nu-latn?) — AR digits decision follows the project's existing rule; check `relative-time.ts` / existing date helpers.

## 5. H11 — Mes propositions (`298:9129`) — READ 5/5

Frame 1440×1153. Cloned from H8 « Mes engagements » (same chrome / tile / tab / table scaffold). Active nav « Mes propositions ». content `298:9133` pad 32 gap 24 = page-header · stats · filter-bar · propositions-table.

### 5.1 Elements

| Node | Element | Measured | Data source |
|---|---|---|---|
| `298:9134` page-header | space-between | — | — |
| `298:9136` / `298:9137` | H1 « Mes propositions » / subtitle « Suivez les propositions que vous avez envoyées » | Bold 32 `text/primary` / Regular 16/26 `text/muted`, gap 4 | — |
| right | Button **ghost md** « Trouver des missions → » | h 40, px 16, Semi Bold 16 `blue/600`, no create CTA | → `/trouver-des-missions` |
| `298:9139` stats | 4 tiles, gap 16, each FILL | tile `surface/base`, 1px `border/subtle`, radius `xl`, pad 20, gap 8; iconCircle 44 radius full + icon 20; label Medium 14 `text/secondary`; value Bold 28 `text/primary`; caption Medium 12 | see below |
| tile 1 `298:9140` | **Envoyées** « 18 » · « propositions envoyées » | circle `blue/100`, icon `icon-send` | `count(job_responses where freelancer_id = me)` |
| tile 2 `298:9147` | **Actives** « 3 / 5 » · « en attente de réponse » | circle `warning/100`, icon `icon-inbox`; **caption Semi Bold 12 `warning/700`** (the only coloured caption) | my responses whose post is open and < 30 d (= the DB cap rule) / `MAX_ACTIVE_RESPONSES_PER_FREELANCER` |
| tile 3 `298:9154` | **Fermées** « 13 » · « offres pourvues ou expirées » | circle **`surface/sunken`** (grey-recede, not green), icon `icon-check-circle` `text/secondary` | my responses whose post is filled / expired / deleted |
| tile 4 `298:9161` | **Ce mois** « 6 » · « envoyées ce mois » | circle `blue/100`, icon `icon-trending-up` | responses with `created_at` in the current month |
| `298:9168` filter-bar | space-between | — | — |
| `298:9169` Tabs | « Toutes » (active) · « Actives » · « Fermées » | tab h 44, px 16; active Semi Bold 16 `blue/600` + 2px indicator, others Medium 16 `text/muted`; bottom hairline `border/subtle`; bar bg `surface/base` | filter by post state |
| `298:9170` filter-right | gap 12 | — | — |
| search | Input search variant, **w 372**, h 44, icon-search 18, placeholder « Rechercher une mission ou un client... » | — | title / client first name |
| sort | Select « Trier par », **w 180**, h 44 (frame leaves a stray empty label + helper row — ignore) | options **not drawn** | D-H11-3 |
| `298:9173` propositions-table | `surface/base`, 1px `border/subtle`, radius `xl`, overflow clip | — | — |
| `298:9174` table-header | `surface/subtle`, bottom border, px 24, py 12, gap 16 | « MISSION » FILL · « CLIENT » **170** · « MA PROPOSITION » **120** · « STATUT » **120** · « ENVOYÉE LE » **120** · actions spacer **207**; Medium 12 / 17, tracking 0.24, uppercase, `text/muted` | — |

### 5.2 PropositionRow (`296:9022`; instances `299:9761…`) — FIXED h 96, px 24, py 20, gap 16, bottom border `border/subtle`

| Cell | Measured | Data source |
|---|---|---|
| mission (FILL) | icon box 32 (`blue/50`, radius `md`) + category icon 20; title **Regular 16/24** `text/primary` (ellipsis); category Medium 12 `text/muted`; gap 2 | `job_posts.title` · `categories.name_*` — **needs gap G2** for closed posts |
| client (170) | « Karim · Tunis » Semi Bold 16/24 `text/primary` + `icon-user` 16 + « Consommateur » Medium 12 `text/secondary` | `public_profiles.full_name` (first token) · `.city` |
| maProposition (120) | price Bold 16/24 `text/primary` + délai Regular 14 `text/muted` (« 10 jours » · « mensuel »); **no price → « Selon budget » Regular 14 `text/muted`, no délai line** | `job_responses.price` / `.timeframe` — **gap G4** |
| statut (120) | caption « Envoyée » Medium 12 `text/muted` above a **StatusPill of the POST state**: « Ouverte » (`blue/100` + `blue/700`) · « Pourvue » (`indigo/100` + `indigo/500`) · « Expirée » (`surface/sunken` + `text/secondary`) | `resolveAnnonceStatus(post.status, post.created_at)` — the existing `ANNONCE_STATUS_PILL` map already yields exactly these three |
| envoyeeLe (120) | « 14 juil » Regular 14/20 `text/muted` + « il y a 2h » Regular **13**/20 `text/muted` | `job_responses.created_at` |
| actions (HUG) | secondary/sm « Voir la mission » (h 32, px 12) + **WhatsApp icon button 36** (green glyph; **closed rows: `surface/sunken` circle radius 18 + muted glyph, = disabled**) + **kebab 36** (`icon-more-vertical` 20) | → `/missions/[id]` · `get_contact_phone(consumer)` · kebab menu **undefined** |

No pagination, no empty state, no loading/skeleton frame, no mobile frame.

### 5.3 Frame-vs-data observations (H11)

1. **`job_posts` RLS hides non-open posts from the responder** (live policy: `(status='open' AND admin_hidden_at IS NULL) OR consumer_id = uid`). Every « Pourvue » / « Expirée » row — 3 of the 6 in the frame — would load with a null mission/client. Already logged in `docs/follow-ups.md` (H4 section) and showing up as a null title in the dashboard's Activité récente. **Blocks the Fermées tab and 2 stat tiles.** Gap G2.
2. **Expired is computed, never stored** (`resolveAnnonceStatus`): « Actives » vs « Fermées » must be computed per row from `status` + `created_at`, in the loader (server clock), then filtered/counted in the same pass.
3. Price / délai have no column (gap G4); until then the « MA PROPOSITION » column shows « — » (or is dropped).
4. The kebab has no menu in the frame. The only legal write on a response is **DELETE own** (RLS "Freelancer deletes own response"; UPDATE is revoked) → natural item « Retirer ma proposition » with a confirm modal; frees one active slot. D-H11-2.
5. Disabled WhatsApp on closed rows is a **product choice** (follow up only on live pitches), not a DB limit (`get_contact_phone` keeps working for any responder).
6. « Ce mois » boundary: calendar month in which timezone? Tunis (UTC+1, no DST) vs UTC differs near midnight on the 1st. D-H11-4.
7. Search « mission ou client »: client name lives in `public_profiles`; search must either filter after join in app code or be limited to title. D-H11-5.
8. The existing H8 `EngagementRow` / `EngagementSearch` / `SortSelect` / `Pagination` / `StatTile` are the direct ancestors (frame was cloned from H8) — see § reuse.

---

## 6. Data layer — live DB (project `xggomcitqrkaylqezjjz`, read-only SQL, 2026-10-25)

### 6.1 Tables

| Table | Columns (type · null · default) | Constraints / indexes |
|---|---|---|
| `job_posts` | `id` uuid pk · `consumer_id` uuid → `profiles` (cascade) · `title` text NN · `description` text NN · `budget_min` numeric null · `budget_max` numeric null · `category_id` uuid null → `categories` (set null) · `city` text null · `is_remote` bool NN false · `deadline` date null · `status` text NN `'open'` · `created_at` · `updated_at` · `admin_hidden_at` null · `admin_hidden_reason` null | CHECK `status in (open, filled, expired, deleted)`; CHECK budgets ≥ 0 (**no `min ≤ max`**, no length caps); CHECK `admin_hidden_at is null or reason is not null`; idx on category / consumer / status |
| `job_post_skills` | `id` · `job_post_id` → `job_posts` (cascade) · `skill` text NN · `created_at` | free text, no length cap, no uniqueness; idx on `job_post_id` |
| `job_responses` | `id` · `job_post_id` → `job_posts` (cascade) · `freelancer_id` → `profiles` (cascade) · `proposal_message` text **null** · `created_at` | `UNIQUE (job_post_id, freelancer_id)`; idx on freelancer / post. **No price, délai, links, skills, status, updated_at.** |

Live volume: 6 posts (5 `open`, 1 `filled`), 3 responses, 2 post-skill rows, 3 freelancer-skill rows.
**All 5 `open` posts are older than 30 days → `resolveAnnonceStatus` reads them as « Expirée ». The board is empty on today's data** (needs fresh posts for QA — D7).

### 6.2 What the DB enforces on a response (BEFORE INSERT triggers on `job_responses`)

| Trigger | Rule | Error text |
|---|---|---|
| `check_job_response_limits` (SECURITY DEFINER) | post exists · `status = 'open'` · `created_at ≥ now − 30 d` · not own post · not already answered · **< 10 responses on the post** · **< 5 active responses for the freelancer** (active = post open AND < 30 d) | plain `RAISE EXCEPTION` (P0001), French prose only — « Cette annonce n'est plus ouverte. » is used for filled **and** deleted; no HINT / code |
| `enforce_job_responder_capability` (SECURITY DEFINER; skipped for `auth.uid() is null` / admin) | `freelancer_id = auth.uid()` · `seller_type = 'freelancer'` · date_of_birth set and ≥ 18 · not suspended · has a `freelancer_profiles` row · that row not `admin_hidden_at` | 42501, French prose |
| `trg_enforce_active_user` (statement-level, INSERT/UPDATE/DELETE) | suspended account → blocked | « Ce compte est suspendu. » 42501 |

Not enforced in the DB: message present / length (column is nullable, no CHECK), `admin_hidden_at` of the **post** (gap G5), `deadline`, anything about the fields H12 adds.

### 6.3 RLS and grants — what a freelancer can read / write

| Object | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `job_posts` | `(status = 'open' AND admin_hidden_at IS NULL) OR consumer_id = auth.uid()`; admins read all. The `admin_hidden_at IS NULL` half is live since migration `20261025213214`. **Expiry (30 d) is NOT in RLS** → the app must filter `created_at` itself | consumer own | consumer own | consumer own |
| `job_post_skills` | readable iff its post is readable | post owner | — | post owner |
| `job_responses` | own rows **or** the post owner | own (`freelancer_id = auth.uid()`; `anon` has no INSERT grant) | **none** (policy absent, privilege revoked by migration 59 → a response is immutable) | own |
| `public_profiles` view | `id, full_name, city, language, seller_type, avatar_url` for any signed-in user (no phone / email / DOB — never add them) | — | — | — |
| `get_contact_phone(target)` | returns the **consumer's phone to a freelancer who has a `job_responses` row on one of that consumer's posts** (any post state) and vice-versa | — | — | — |

Consequences:
* a freelancer **cannot see others' responses** → the competition count (`2/10`) cannot be computed client-side;
* a freelancer **cannot see a post once it is no longer open** — even one they answered (already logged: `docs/follow-ups.md` H4 section; `freelancer-dashboard.ts` returns `title: null`);
* withdrawing a proposal = `DELETE` own row; editing one is impossible by design;
* WhatsApp unlock = « a response row exists » → works from H13, H11 and H10-answered with the existing `WhatsAppContactButton`.

Moderation: hidden posts (`admin_hidden_at`) are invisible to non-owners on the board/detail since tonight. The response trigger does **not** refuse a response on a hidden post when called directly (G5, already a MEDIUM follow-up). Consumer soft-delete = `status = 'deleted'` (still a row; RLS hides it from freelancers).

### 6.4 Migration gaps (the DB role writes migrations — nothing written here)

| ID | Gap | Blocks | Proposed shape |
|---|---|---|---|
| **G3** | Response count unreadable under RLS | H9 pill + caption + « moins de concurrence » sort · H10/H12 caption · H13 « N autres » · H10 « 10 / 10 » blocked state | **`job_posts.response_count int NOT NULL DEFAULT 0`**, maintained by an AFTER INSERT/DELETE trigger on `job_responses` (SECURITY DEFINER) + a guard so clients cannot write it (`enforce_admin_marker_lock`-style BEFORE UPDATE, or column-level REVOKE) + backfill + index `(status, response_count)`. Rejected: aggregate view/RPC — PostgREST cannot ORDER a table by an aggregate of another, so the board could not sort / paginate in SQL |
| **G2** | Responder cannot read a non-open post they answered | H11 closed rows + tiles · H13 refresh after the post closes · H10 « already answered » deep link · dashboard Activité récente (null titles today) | new SELECT policy on `job_posts`: `status <> 'deleted' AND admin_hidden_at IS NULL AND public.has_responded(id)` where `has_responded` is a SECURITY DEFINER STABLE helper (a naive policy that selects `job_responses` **recurses**: the `job_responses` policy already selects `job_posts`). `job_post_skills` follows automatically |
| **G4** | `job_responses` stores only the message | H12 (4 of 5 fields) · H13 recap · H11 « MA PROPOSITION » column | `proposed_price_tnd numeric(10,2) CHECK (≥ 0)` · `proposed_timeframe text CHECK (char_length ≤ 60)` · `portfolio_links jsonb NOT NULL DEFAULT '[]'` with `CHECK` array ≤ 3 **and a validation trigger** (http(s) only, label ≤ 60, url ≤ 500 — the consumer renders these as `href`, so DB-side per CLAUDE.md « every business rule in the DB ») · new table `job_response_skills(id, job_response_id → cascade, skill, created_at)` mirroring `job_post_skills`, RLS: responder INSERT/DELETE own, SELECT responder + post owner · `CHECK (char_length(proposal_message) BETWEEN <floor> AND 1000)` (NOT VALID if a legacy row violates) — **`<floor>` = whatever D-H12-5 is ruled (I propose 20); the DB role must not ship 1 while the app enforces 20** |
| **G5** | Response trigger ignores `job_posts.admin_hidden_at` | H12 (direct-REST bypass of a moderated post) · awareness bar / H10 « N sur 5 » | add `admin_hidden_at IS NULL` to the post guard **and exclude moderated posts from the active-count** (today the trigger counts a moderated-but-open post toward the 5 cap while RLS hides it from the freelancer → UI can say « 4 sur 5 » while the DB blocks at 5). If you prefer to leave the cap as is, L4 (typed failure in place) catches the edge |
| **G9** | **Confirmed live:** `authenticated` holds UPDATE on **every** `job_posts` column incl. `created_at`; the owner policy checks only `consumer_id`; the 4 triggers on `job_posts` (`updated_at`, `enforce_active_user`, `enforce_admin_marker_lock`, `enforce_service_category_kind`) guard none of it. A consumer can PATCH `created_at` → escape the 30-day rule the response trigger relies on, re-earn « Nouveau », jump to the top of « Plus récentes » | H9 (sort / « Nouveau » / « Expire dans » all trust `created_at`) | same guard shape as `response_count`: BEFORE UPDATE refuses a change of `created_at` (and `consumer_id`) for non-admins — fold into **M-A** since the board ships with it |
| **G7** | Trigger failures are untyped prose | H13 failure variants (10 réponses / pourvue / expirée / supprimée) + H12 inline limit | give each rule a stable `HINT` / `DETAIL` code (`job_full`, `job_closed`, `job_expired`, `own_post`, `duplicate`, `cap_active`, …) so the action maps codes, not French sentences. `filled` vs `deleted` are indistinguishable by message today |
| **G8** | Types | all | regenerate `src/lib/supabase/database.types.ts` after each applied migration (`job_responses`, `job_posts`, new table) |

Not a gap, for the record: `categories` kind is enforced on `job_posts.category_id` (service / both only); `get_contact_phone` already covers job responders; `deadline` (consumer's wish date) is never enforced and is **not** the « Expire dans » of the frames (that is `created_at + 30 d`).

---

## 7. Existing code to reuse — and what is missing

### 7.1 Reuse

| Need | Existing | Note |
|---|---|---|
| Shell + guard | `AppShell`, `requireFreelancer(route)` (`lib/auth/require-seller.ts`) → `{ userId, topBarUser, freelancerProfile }` | logged-out → `/connexion?next=`, non-freelancer → `/devenir-vendeur`. `freelancerProfile === null` (H2 not finished) is a real H10 state |
| List-page scaffold (H11) | `app/mes-engagements/page.tsx` (header · `StatTile` ×4 · tab `<nav>` of Links · `EngagementSearch` · `SortSelect` · table · `Pagination` with `totalItems/perPage`) + pure `lib/marche/engagements.ts` + `engagements-query.ts` (fetch-all, filter/sort/page in JS, throws on error) | H11 was cloned from H8 in Figma — same shape in code. `ENGAGEMENTS_PER_PAGE = 10` |
| Stat tile | `app/mes-services/_components/StatTile.tsx` (accents blue / warning / success; H8 already imports it cross-route) | needs `neutral` accent (« Fermées ») and a coloured subtitle (« Actives ») → small extension |
| Post-state pill | `StatusPill` (`ouverte` blue, `pourvue` indigo, `expiree` grey) + `ANNONCE_STATUS_PILL` + `resolveAnnonceStatus` / `isAnnoncePastExpiry` (`lib/marche/annonce-status.ts`) + keys `mesannonces.status.*` | exactly the 3 H11 pills — no new status |
| Constants | `lib/job-constants.ts` (`MAX_RESPONSES_PER_POST 10`, `MAX_ACTIVE_RESPONSES_PER_FREELANCER 5`, `JOB_POST_EXPIRY_DAYS 30`) | add competition thresholds, message / links / skills caps |
| Relative time | `relativeTimeLabel` → « À l'instant » · « il y a 2h » · « Hier » · « il y a N jours » (spelled out) | H11's « ENVOYÉE LE » cell draws the **compact** form « il y a 1j / 5j / 12j » (and H10 « Publié il y a 2h »): hours match, days do not → either add a short-days variant or accept « il y a 5 jours » (D-H11-10, default: accept the existing helper; frame wins only if you say so) |
| Expiry | `getExpiryCountdownDays` (`lib/marche/annonce-expiry-countdown.ts`) | **only returns a value in the last 7 days**; « Expire dans 12 jours » needs a full `daysLeft()` |
| Budget text | private `budgetValue` in `tableau-de-bord/_components/MissionRow.tsx`; legacy keys `missions.budget_from/to` | extract a shared `formatJobBudget` (do not edit MissionRow now) |
| Consumer-side loaders | `getAnnonceDetail` / `getMyAnnonces` (owner-scoped; show `proposal_message` only) | copy the select shape, not the function; `job_posts` has **one** FK to `categories`, so no PGRST201 hint is required (the rule is for 2+ FKs) |
| Validation | `validateJobPost` (consumer), `ANNONCE_SKILLS_MAX = 8`; `HTTP_URL` + `isHttpUrl` (`lib/freelancer/http-url.ts`, scheme-restricted, tested by `freelancer-url-scheme.test.ts`); Zod 4 already used by `app/actions/*` | links validation = `HTTP_URL`; server action = Zod first |
| WhatsApp | `components/orders/WhatsAppContactButton` (full `sm` 36 / `lg` 48 and `iconOnly` 36) + `lib/orders/whatsapp.ts` (`buildWhatsAppUrl`, 300-char cap) | add: 44 h size (H13), `disabled` for the icon variant (H11 closed rows); message template for freelancer → consumer |
| Forms | `Textarea` (counter), `Input` (suffix supported — `input-suffix.test.tsx`), `Button` (primary / secondary / ghost, sm / md), `TagInput` (chips + suggestions), `FilterControl`, `Popover`, `Toggle`, `ConfirmModal`, `sonner` toasts | links rows = 2 × `Input` + icon button |
| Other | `Avatar` + `initials.ts`, `Pagination`, `EmptyState`, `service-category-icons.ts`, `SortSelect` (Radix menu), `tunisia-governorates.ts`, `category-scope.ts`, `resolveOwnedFreelancerProfileId` | — |
| Sidebar | `sidebar-items.ts` already links `/trouver-des-missions` and `/mes-propositions` | `isActiveRoute` is href-prefix only → `/missions/[id]` would **not** light « Trouver des missions » (frames H10/H12/H13 do) → add `activeOn` (D6) |
| Routing | `next.config.ts` has only `/mes-missions → /mes-annonces`; no `/missions` route exists | no conflict |

`components/orders/` (what the brief asked about): only `SortSelect` and `WhatsAppContactButton` are reusable here; `AdvanceOrderButton`, `CancelOrderButton`, `OrderRail` are order-lifecycle specific. **`components/ui/stepper.tsx` is not used** — none of the five frames has a stepper.

### 7.2 Missing (to build)

`MissionCard` + `CompetitionPill` · `MissionFilters` (client; menu selects like `SortSelect` + télétravail toggle) · active-filter chips · awareness bar · `MissionFacts` (decision-card / recap-card, shared by H10 + H12) · `ClientCard` · H10 CTA state machine · `ProposalForm` (client, controlled, `useActionState`) · `LinksField` · `SkillsPicker` (no multi-select component exists) · amber `InlineNotice` / failure box · `SentRecap` + `NextSteps` · `PropositionRow` · pure libs (`missions`, `mission-detail`, `proposition-validation`, `proposition-errors`, `propositions`) + queries + server actions · a full-range `daysLeft()` and a short absolute date formatter.

Out-of-scope but implied: **`AnnonceResponseCard` / `getAnnonceDetail` (consumer side) show the message only and say so in a comment — once G4 lands the consumer cannot see price / links / skills**, so the extras would be write-only (D8).

---

## 8. Frame inventory — element → data source → disposition

`MVP` = real data now · `MVP·G#` = real once that migration is applied · `PH` = honest placeholder · `DROP` = not built.

### H9
| Element | Source | Disposition |
|---|---|---|
| Title / subtitle | i18n | MVP |
| « N missions disponibles » | exact count of the visible, unexpired, unfiltered set (mine excluded) | MVP (frame's 142 is demo) |
| Awareness bar « N sur 5 » + link | my responses ⨝ open posts < 30 d | MVP; at 5 flips to the warning wording of `331:11979` |
| Filters Catégorie / Ville / Budget / Compétences / Télétravail | categories · `city` · budget buckets · my skills (exact match) · `is_remote` | MVP (option sets: D-H9-4) |
| Active-filter chips | URL params | MVP |
| Sort select | URL param | MVP (options: D-H9-5) |
| Card: category chip · title · excerpt · budget · meta · skills ≤ 3 · client first name · city | `job_posts` + `categories` + `job_post_skills` + `public_profiles` | MVP |
| Card: « Nouveau » | derived (D-H9-6) | MVP |
| Card: competition pill + « n/10 » | `job_posts.response_count` | MVP·G3 |
| Card: « Expire dans Nj » | `created_at + 30 d` | MVP (new `daysLeft`) |
| « /mois » suffix on budget | — | DROP |
| Pagination | `Pagination` | MVP (page size: D-H9-7) |
| Empty / error / skeleton | no frame | PH (`EmptyState`; throw on query error) |
| Mobile | no frame | derived grid 1 → 2 → 3 |

### H10
| Element | Source | Disposition |
|---|---|---|
| Back-link · title · chips · meta | `job_posts` | MVP |
| Description | `description` (plain text) | MVP (D-H10-1) |
| client-card (initial · first name · city · « Consommateur ») | `public_profiles` | MVP (first name + city only; no contact) |
| decision-card: budget · competition · skills · localisation · expire | as above | MVP (competition MVP·G3) |
| CTA: can respond | — | MVP |
| CTA: already answered (`331:12001`) · 5 actives (`331:11979`) | own responses | MVP (specimens not read — copy from notes) |
| CTA: 10 / 10 · filled · expired · no freelancer profile · under 18 · moderated · deleted | post + profile state | PH — no specimen, copy proposed (D-H10-3) |
| Sticky right column | CSS | MVP (WCAG 2.2 offset) |

### H12
| Element | Source | Disposition |
|---|---|---|
| Message + counter | `proposal_message` | MVP |
| Links ≤ 3 | `portfolio_links` | MVP·G4 |
| Skills picker (auto-selected = my skills ∩ post skills) | `job_response_skills` | MVP·G4 |
| Price + TND · délai | `proposed_price_tnd` · `proposed_timeframe` | MVP·G4 |
| Recap card + client card | `MissionFacts` | MVP |
| Inline: limite 5 · erreur technique | typed failure (G7) | MVP·G7 |
| Banner « offre fermée pendant l'écriture » | `visibilitychange` re-check | PH — defer (D-H12-6) |
| « 40 % plus de réponses » | — | DROP (D-H12-1) |

### H13
| Element | Source | Disposition |
|---|---|---|
| Hero · H1 · subhead | i18n + consumer first name | MVP |
| Recap: mission · message (3-line clamp) · timestamp | response + post | MVP (post readable after G2 once closed) |
| Recap: links · skills · price · délai | G4 columns | MVP·G4 (hide rows with no value) |
| Next-steps ① ② | static | MVP (② without the effectiveness claim) |
| Next-steps ③ « N autres freelances » | `response_count − 1` | MVP·G3 (hidden at 0) |
| WhatsApp CTA + « Voir mes propositions » | `get_contact_phone` | MVP |
| 4 failure boxes (A–D) | typed result of the insert | MVP·G7, rendered **in place** in H12 (D-H13-3) |

### H11
| Element | Source | Disposition |
|---|---|---|
| Header + ghost CTA | i18n | MVP |
| Tiles Envoyées · Actives n / 5 · Ce mois | own responses (+ post state for Actives) | MVP |
| Tile Fermées | own responses ⨝ non-open posts | MVP·G2 |
| Tabs · search · sort | URL params | MVP |
| Row: mission · category · client · statut pill · envoyée le · « Voir la mission » | response ⨝ post ⨝ `public_profiles` | MVP for open posts; closed posts MVP·G2 |
| Row: « MA PROPOSITION » (price + délai, « Selon budget » when none) | G4 columns | MVP·G4 (until then « — ») |
| Row: WhatsApp icon (disabled on closed) | `get_contact_phone` | MVP |
| Row: kebab | — | MVP = « Retirer ma proposition » (D-H11-2) |
| Pagination · empty states · mobile | no frame | PH / derived |

---

## 9. Proposed PR split

**PR #191 (`feat/h8-engagement-detail`) is untouched.** All code PRs below branch from `origin/main` and are mock-tested only (the two live suites `job-limits.test.ts` / `job-responses-integrity.test.ts` are not run).

**Migrations (DB role, architect applies) — blockers, not part of any page PR**

| Id | Content | Needed by |
|---|---|---|
| M-A | G3 `response_count` (+ guard, backfill, index) **+ G9 `created_at` / `consumer_id` guard**. Note for the DB role: a counter UPDATE on `job_posts` also fires `job_posts_set_updated_at` (→ `updated_at` bumps on every response) and the statement-level `trg_enforce_active_user` — decide whether the counter trigger should bypass both | PR-1 |
| M-B | G2 responder-read policy + `has_responded()` | PR-3 (and PR-2's refresh case) |
| M-C | G4 columns + `job_response_skills` + CHECKs + G5 guard + G7 typed errors | PR-2 (PR-3 for the price column) |

After each applied migration I regenerate `database.types.ts` and rename/README the file per CLAUDE.md.

**PR-1 — H9 board + H10 detail (read side)** — needs M-A
* Routes: `app/trouver-des-missions/page.tsx` (+ `_components/MissionCard`, `CompetitionPill`, `MissionFilters`, `ActiveFilters`, `AwarenessBar`), `app/missions/[id]/page.tsx` (+ `_components/MissionFacts`, `ClientCard`, `MissionCta`).
* Libs: `lib/marche/missions.ts` (pure: budget buckets, competition level, `isNew`, `daysLeft`, sort/filter param parsing), `missions-query.ts` (board: **DB-side** filter / sort / `.range()` + exact count — the set can reach thousands), `mission-detail.ts` (+ pure `resolveMissionCta` state machine), `format-job-budget.ts`.
* Small extensions: `sidebar-items.ts` `activeOn`, `job-constants.ts`.
* i18n: `missionboard.*`, `missiondetail.*` (FR + AR together; AR marked `REVIEW_AR_TRANSLATION`).
* Tests (mock / unit): `missions.test.ts` (buckets incl. null min/max, thresholds 0–3 / 4–7 / 8–10, new = < 48 h, `daysLeft` at 0/1/30), `missions-query.test.ts` (mock client: status open + `admin_hidden_at is null` + 30-day cutoff + own/answered excluded + error thrown, never `[]`), `mission-detail.test.ts` (every CTA state incl. precedence), render test for `MissionCard` / `CompetitionPill` in FR + AR (`dir="ltr"` numeric runs), `i18n-parity` (existing).

**PR-2 — H12 form + H13 result** — needs M-C (+ M-B so H13 survives the post closing)
* Routes: `app/missions/[id]/proposer/{page.tsx, actions.ts, _components/ProposalForm, LinksField, SkillsPicker, InlineNotice}`, `app/missions/[id]/proposition-envoyee/{page.tsx, _components/SentRecap, NextSteps}`.
* Libs: `lib/marche/proposition-validation.ts` (Zod; reuses `HTTP_URL`), `proposition-errors.ts` (typed DB error → reason), `skills-match.ts` (accent/case-insensitive intersection).
* Action contract: Zod first · `freelancer_id` **always** `auth.uid()` (never from input) · job id validated as uuid · re-check state server-side · map typed reason · log `message/code/details` only · return the input on failure (form state is controlled; error state stores i18n **keys**) · `revalidatePath` + `redirect` on success · **`duplicate` (« Vous avez déjà répondu ») is an idempotent SUCCESS → redirect to H13, not a failure box** (the first insert succeeded; per the design notes).
* Extensions: `WhatsAppContactButton` (44 h size + `disabled`), shared `MissionFacts` from PR-1.
* i18n: `proposition.form.*`, `proposition.sent.*`, `proposition.fail.*`.
* Tests: `proposition-validation.test.ts` (message 1–1000 after trim, links ≤ 3 / scheme / dedupe, price numeric(10,2) / negative / NaN, délai length, skills ⊆ allowed), `proposition-action.test.ts` (mock client: unauthenticated, wrong role, forged `freelancer_id` ignored, each typed failure → reason + input preserved, success → revalidate + redirect), `skills-match.test.ts`, `SentRecap` render (rows hidden when empty).
* Recommended companion: **PR-4** — consumer-side display of price / links / skills in `AnnonceResponseCard` + `getAnnonceDetail` (D8); merge with PR-2.

**PR-3 — H11 Mes propositions** — needs M-B (+ M-C for « MA PROPOSITION »)
* `app/mes-propositions/{page.tsx, actions.ts (withdraw), _components/PropositionRow, PropositionSearch}`, `lib/marche/propositions.ts` (pure: tab / sort / page / stats / « ce mois »), `propositions-query.ts` (fetch-all + JS, as H8), `StatTile` `neutral` accent + subtitle tone.
* i18n: `mespropositions.*`.
* Tests: `propositions.test.ts` (tab partition uses `resolveAnnonceStatus`; stats; month boundary in Africa/Tunis; sort; page clamp), `propositions-query.test.ts`, `withdraw-action.test.ts` (own row only, error surfaced), row render (closed → disabled WhatsApp).

Order: M-A → PR-1 → M-C → PR-2 (+PR-4) → M-B → PR-3. If M-B lands earlier, PR-3 can move ahead of PR-2 (it shares nothing with the form).

---

## 10. Decisions

### 10.1 Need a ruling before I write code

| # | Decision | Recommendation |
|---|---|---|
| D1 | Three migrations (M-A / M-B / M-C) written by the DB role, applied before the PR that needs each | Yes — M-A first (unblocks PR-1) |
| D2 | Competition count mechanism (G3) | Trigger-maintained `job_posts.response_count` + write guard; **not** a view/RPC (cannot sort/paginate by it) |
| D3 | Responder read of closed posts (G2) | Policy via a SECURITY DEFINER `has_responded()` helper (avoids RLS recursion); exclude `deleted` and moderated; otherwise H11's Fermées tab and 2 tiles are blank |
| D4 | Where the H12 extras live (G4) | Scalar columns for price / délai, `jsonb` links with a DB validation trigger, `job_response_skills` join table; skills insert is non-fatal exactly like `createAnnonce` |
| D5 | If M-C is late | **Hold PR-2** — do not ship a message-only form that the frames contradict; PR-1 and PR-3 are unaffected |
| D6 | Routes + nav highlight | `/missions/[id]`, `/missions/[id]/proposer`, `/missions/[id]/proposition-envoyee` (brief + design notes) and an `activeOn` prefix list on the « Trouver des missions » sidebar item |
| D7 | QA data: every open post is past 30 days, so the board is empty | A test consumer creates 6+ varied posts through `/mes-annonces/nouvelle`, **or** the DB role seeds fixtures with a unique prefix — your call; I will not write to prod |
| D8 | Consumer side shows the message only | Companion PR-4 merged with PR-2, otherwise the freelancer's price / links / skills are write-only |
| D9 | **PR-1 would ship CTAs to routes that 404 until PR-2 merges** (« Envoyer ma proposition » → `/proposer`; « Voir ma proposition » → H13), and `main` deploys to production | Render those two CTAs disabled with the existing « Bientôt » pattern in PR-1 and enable them in PR-2 — **or** merge PR-1 and PR-2 together. My lean: disabled CTA. Founder's call |
| D10 | **`/missions` 404s today** and is linked from the public header (`nav-config.ts`), footer, landing `HowItWorks`, and the admin report page links `job_post` targets to **`/missions/{id}`** | PR-1 adds `/missions → /trouver-des-missions` (next.config redirect, like `/mes-missions`). H10 `/missions/[id]` lets an **admin** open it read-only (no CTA) so the moderation link works; non-freelancer non-admins follow `requireFreelancer`'s redirect |

### 10.2 I will apply these unless you object

**H9**
* D-H9-1 Category chip start-aligned on cards without « Nouveau » (the frame centres it — hidden-pill artefact).
* D-H9-2 Drop « /mois » (no period column).
* D-H9-3 Board hides: own posts, posts I already answered, posts at 10 / 10, expired, moderated. They stay reachable from H10 / H11.
* D-H9-4 Option sets — Catégorie: service categories (sector scope via `category-scope`); Ville: governorates; Budget: < 200 · 200–500 · 500–1 000 · 1 000+ (a post matches when its range intersects the bucket; budget-less posts only under « Tous »); Compétences: single select from **my** profile skills (exact match, same caveat as the dashboard).
* D-H9-5 Sort: Plus récentes (default) · Moins de concurrence · Budget décroissant · Expire bientôt.
* D-H9-6 « Nouveau » = published < 48 h ago.
* D-H9-7 Page size 12 (3 × 4): the frame's « 1 à 6 sur 142 » with pages « 1 2 3 … 8 » is arithmetically inconsistent (142 / 6 = 24).

**H10**
* D-H10-1 Description rendered as plain text with line breaks (`whitespace-pre-line`); no markdown, no raw HTML.
* D-H10-2 Budget text: both → « 200 – 400 TND » · equal → « 800 TND » · min only → « Dès 200 TND » · max only → « Jusqu'à 400 TND » · none → « Budget à discuter » (same rule feeds the H12 caption).
* D-H10-3 CTA states with a specimen use the frame's copy; for 10 / 10, pourvue, expirée, supprimée / modérée, no freelancer profile (→ « Compléter mon profil »), under 18 / no birth date I will write FR copy in the same pattern (disabled primary + reason + way forward) and list it for approval; AR drafts marked `REVIEW_AR_TRANSLATION`.
* D-H10-4 « Expire dans » = the 30-day platform window; the consumer's optional `deadline` is not shown (not in any frame) — logged as a follow-up.

**H12**
* D-H12-1 Drop the borrowed statistics: links helper → « Ajoutez jusqu'à 3 liens vers des travaux similaires. » ; H13 step 2 → « Vous pouvez le contacter directement sur WhatsApp. » (`servyou-phase-aware-features`: no invented metrics).
* D-H12-2 Submit label « Envoyer ma proposition » on H10 and H12.
* D-H12-3 New `SkillsPicker` (Popover + `FilterControl` checkboxes + search, sections « Demandées pour cette mission » / « Vos autres compétences »); `TagInput` stays for free text.
* D-H12-4 Pre-selection = my skills ∩ post skills compared accent/case-insensitively (stored with the post's spelling); empty intersection → placeholder « Choisir mes compétences ».
* D-H12-5 Validation: message 1–1 000 after trim — **I propose a 20-character floor** (frame has none; one-word proposals are spam, but it is a product call); links ≤ 3, URL required / label optional (falls back to hostname), `http(s)` only, ≤ 500, de-duplicated; price ≥ 0, < 1 000 000, 2 decimals; délai ≤ 60; skills ⊆ (post skills ∪ my skills), ≤ 8.
* D-H12-6 Prevention layers: ship L1 (H10 blocks on load), L2 (server re-check on load → back to H10), L4 (typed trigger failure rendered in place, input kept, copy-message button); **defer** L3 (`visibilitychange` stale-tab banner).
* D-H12-7 Price label uses the same Medium 14 as the other labels (frame's Semi Bold is a PriceInput component default).
* D-H12-8 Row 1 of the links field gets a transparent spacer so the ragged right edge disappears; delete control ≥ 44 px hit area.

**H13**
* D-H13-1 Price / délai row sized to content (frame's FIXED 100 px cells are a clone artefact).
* D-H13-2 Add a 44 px size to `WhatsAppContactButton` (frame 44 vs its `lg` 48).
* D-H13-3 Failure boxes are **in-place states of H12** (message preserved in client state), not routes.
* D-H13-4 Message preview = 3-line clamp.
* D-H13-5 Date « 16 juillet à 14h32 » via `Intl.DateTimeFormat` with `fr-TN` / `ar-TN` (the pattern already used in `admin/signalements/[id]/page.tsx`; `date-fns` is **not** installed, so the i18n skill's date-fns example does not apply). `ar-TN` yields Latin digits, matching the « numbers stay LTR » convention. Currency: « TND » (FR) / « د.ت » (AR).

**H11**
* D-H11-1 « Voir la mission » on a closed row opens H10 in its read-only closed state (needs M-B).
* D-H11-2 Kebab = « Retirer ma proposition » with `ConfirmModal` (the only legal write on a response; frees an active slot; the consumer loses the phone link).
* D-H11-3 Sort: Plus récentes (default) · Plus anciennes (mirrors H8).
* D-H11-4 « Ce mois » = calendar month in `Africa/Tunis`, computed server-side.
* D-H11-5 Search = mission title + client first name, filtered in JS (all rows fetched, as H8).
* D-H11-6 `StatTile`: add `neutral` accent and an optional `subtitleTone`.
* D-H11-7 Default tab « Toutes » (frame) — not H8's « À traiter ».
* D-H11-8 10 per page; three empty states (none at all / empty tab / no search hit), CTA « Trouver des missions ».
* D-H11-9 Until M-C, the « MA PROPOSITION » cell shows « — ».
* D-H11-10 « ENVOYÉE LE » relative line: accept the existing `relativeTimeLabel` (« il y a 5 jours ») rather than the frame's compact « il y a 5j »; add a short variant only if you want the frame literally.

**Skills cross-check (loaded after the first pass):** `servyou-phase-aware-features` confirms D-H12-1 (no invented metrics) — none of the five screens needs a `ComingSoonCard` (reviews / earnings / ratings appear nowhere); `servyou-i18n-vocabulary-lock` confirms « Mes propositions / عروضي » and the `ar-TN` formatting above; `servyou-design-system-compliance`: `MissionCard`, `CompetitionPill`, `SkillsPicker` and the amber failure box are Figma-measured components with no code twin — I will cite them as new (not off-system), and flag `SkillsPicker` as the one with no Figma component (specimen `369:2696` is a drawn panel only).

**Cross-cutting**
* Vocabulary: freelancers say **mission**, consumers say **annonce** (already the case); « Mes propositions » / « Trouver des missions » are locked.
* Every numeric run (`2/10`, `2 / 10`, `0 / 1000`, `1 / 3`, `3 / 5`, price ranges) gets `dir="ltr"` (RTL numeric-run reversal).
* No `useEffect` data fetching; Server Components by default; client leaves = `MissionFilters`, `ProposalForm`, `SkillsPicker`, `LinksField`, search, kebab.
* Not touched: PR #191, `AppShell`, the existing consumer annonce flow (PR-4 aside).

### 10.3 Not read in Figma (budget spent) — copy taken from the design notes, to verify at build time if you allow reads

`323:11896`, `324:11928` (these are H13 panels, superseded by `376:10511`) · `331:11979`, `331:12001` (H10 blocked / answered CTAs) · `356:12458`, `356:12519` (liens) · `369:2696`, `369:2756`, `374:10479` (compétences) · `378:10917`, `378:10929`, `378:10947` (H12 inline / banner) · `378:10814`, `378:10842` (H13 failures) · `311:10264` / `296:9022` (components — their instances were read inside H9 / H11, so measurements above are complete).

# Mes annonces — Figma measurements (F3 list · F2 publish · F4 detail)

File `jDNjJ8D1gnXiW7Ry3GkN4U`. One `get_design_context` read per frame; reads used are logged at the bottom.
Tokens named as Figma variables (`space/N`, `blue/600`…) map to the repo's `@theme` tokens.

## F2 — Publier une annonce (1440) · node 1478:29808 · READ 1

### Page frame
| Part | Value |
|---|---|
| Frame | 1440 wide, `surface/subtle` bg, flex row |
| Sidebar | 240 wide, `blue/950`; active item « Mes annonces » = `blue/600` (Semi Bold) — shell already built |
| Topbar | 64 high, `surface/base`, border-b `border/subtle`, px `space/6` — shell already built |
| Content | col, gap 24, pt 32, pb 48, px 32 |
| Breadcrumb | gap 8, 13px Regular `text/muted`: « Mes annonces » › chevron-right 14 › « Publier une annonce » (both muted, last NOT bolder) |
| Split | row, gap 32, items-start |

### MAIN card (form)
| Part | Value |
|---|---|
| Card | 750 wide (FIXED), `surface/base`, border 1 `border/subtle`, radius 12, p 32, col gap 24 |
| Section stack | col gap 20 |
| H2 | « Décrivez votre mission » 20 / 26 Semi Bold `text/primary` |
| Label | 14 / 21 Medium `text/secondary`, gap 2 before red `*` (`danger/500`); label→field gap 8 |
| Field | h 44, `surface/base`, border 1 `border/strong`, radius `lg` 10, px `space/4` 16; value 16/26 Regular; placeholder `text/muted` |
| Helper | 14/21 Regular `text/muted` |

Field order and copy (FR):

| # | Node | Label | Required | Placeholder / content | Helper |
|---|---|---|---|---|---|
| 1 | F0-titre | Titre de l’annonce | * | « Ex : Logo pour ma pâtisserie » | « 60 caractères maximum » (centered row) |
| 2 | F0-categorie | Catégorie | * | select, « Sélectionner une catégorie », chevron 18 | none (helperRow h16 empty) |
| 3 | F1-description | Description de la mission | * | textarea h120, py 12, « Expliquez ce que vous attendez, le contexte et le résultat souhaité… », resize grip 12 | left « Plus vous êtes précis, mieux le freelance peut répondre »; right counter « 0/500 » Overline 12/17 Medium uppercase tracking .48 |
| 4 | F3-budget | Budget approximatif (14 Semi Bold, no asterisk) | optional | ONE price input h44, value « 1500 » + suffix cell « TND » (bg `surface/sunken`, border-l `border/subtle`, px 12/14, 14 Medium muted) | 12/17 « Optionnel — un budget indicatif attire des propositions plus précises. » |
| 5 | F4-ville | Ville | * | select, « Sélectionner une ville » | none |
| 6 | F5-distance | Switch row: « Mission réalisable à distance » (16 Semi Bold) / « Les freelances de toute la Tunisie pourront vous répondre. » (14 muted) | — | min-h 72, py 16, border-b `border/subtle`, control = Toggle track 44×24 (ON in frame) | — |
| 7 | F2-timeframe | Date limite (optionnel) | optional | date field h44 « jj / mm / aaaa » | « Les freelances voient la date sur votre annonce » |
| 8 | label | Compétences recherchées (14 Semi Bold) | optional | Tag Input: h48, border `border/strong`, radius 10, px 10, py 8, gap 6; chips = `blue/50` pill, pl 12 pr 8 py 4, 14 Medium `blue/600`, × icon 14; trailing text « Ajouter une compétence… » 14 muted | 12/17 « 3 à 5 compétences suffisent — tapez puis Entrée. » |

Below fields: note 12/18 muted « 💬 Votre annonce reste ouverte 30 jours et peut recevoir jusqu’à 10 propositions de freelances. »
Actions row: space-between. « Annuler » = secondary md (h40, px 16, border `border/strong`); « Publier l’annonce » = primary **lg** (h48, px 20, `blue/600`).

### SIDEBAR card (tips) — right of the split
`surface/base`, **border 2 `blue/600`**, radius 12, p 24, col gap 16, flex-1 (≈ 346 at 1440).
1. « Conseils pour une bonne annonce » 15/20 Semi Bold `text/primary`
2. « Une annonce claire reçoit de meilleures propositions » 15/22 Semi Bold `blue/800`
3. divider 1 `border/subtle`
4. five lines 12/18 Regular muted, each prefixed « ✓ »: Un titre précis : ce que vous voulez obtenir · Le contexte, le résultat attendu et le délai · Un budget indicatif, même approximatif · 3 à 5 compétences clés · Vous restez libre de choisir — ou de ne choisir personne

### Observations vs. the repo (feed the deltas)
- Frame has NO « Mon profil / Mes services » sections: shell is « DÉCOUVRIR & ACHATS » (Marketplace, Mes commandes, Mes favoris, **Mes annonces**) + CTA Devenir vendeur + « OUTILS & COMPTE » (Paramètres, Aide).
- Budget is ONE field in the frame; the DB + current form carry `budget_min` / `budget_max`.
- No default category or city: both selects show the placeholder.

## Reads log
| # | Node | Tool |
|---|---|---|
| 1 | 1478:29808 (F2 1440) | get_design_context |
| 2 | 1476:27949 (F3 1440) | get_design_context |
| 3 | 1477:29190 (F4 1440) | get_design_context |
| 4 | 1488:65880 (F2 375) | get_design_context |
| 5 | 1488:64945 (F3 375) | get_design_context |
| 6 | file page list | get_metadata (no node) — found the Screens page id |
| 7 | Screens page 166:12085 | get_metadata — only to find the 375 ids; output kept in tool-results, not the repo |

Total this task: **7 reads** (get_metadata counts against the monthly cap). F4 mobile `1488:65602` is NOT read yet — held for PR-2.

## F3 — Mes annonces (1440) · node 1476:27949 · READ 2

Same shell as F2 (« Mes annonces » active). Content: col, gap 24, **p 32**, `surface/subtle` page bg.

| Part | Value |
|---|---|
| Page header | row space-between. Left: H1 « Mes annonces » 32 Bold `text/primary`; sub 16/26 Regular `text/muted` « Suivez les missions que vous avez publiées et les propositions reçues » (gap 4). Right: primary **md** button « Publier une annonce » (h40, px 16) |
| Stats | row gap 16, 4 equal tiles (flex-1). Tile: `surface/base`, border 1 `border/subtle`, radius `xl` 12, p `space/5` 20, col gap 8. Icon circle 44 (icon 20) · label 14 Medium `text/secondary` · value 28 Bold `text/primary` (gap 2) · caption 12/17 |
| Tile 1 | circle `blue/100` · « Publiées » · **8** · « annonces publiées » (muted Medium) |
| Tile 2 | circle `warning/100` · « Ouvertes » · **3 / 8** · « reçoivent des propositions » 12 Semi Bold `warning/700` |
| Tile 3 | circle `surface/sunken` · « Propositions » · **20** · « reçues au total » |
| Tile 4 | circle `blue/100` · « Pourvues » · **3** · « missions attribuées » |
| Filter bar | row space-between. Left: Tabs (h44 items, px 16, 16/26; active Semi Bold `blue/600` + 2px indicator, others Medium `text/muted`, 1px bottom border `border/subtle`): **Toutes · Actives · Fermées**. Right: gap 12 — search input w 372 h44 (icon-search 18, « Rechercher une annonce… ») + Select w 180 h44 « Trier par » chevron 18 |
| Table card | `surface/base`, border 1 `border/subtle`, radius `xl`, overflow clip |
| Header row | `surface/subtle`, border-b, px `space/6` 24, py 12, gap 16; 12/17 Medium uppercase tracking .24 `text/muted`: MISSION (flex) · PROPOSITIONS (170) · BUDGET (120) · STATUT (120) · PUBLIÉE LE (120) · actions spacer 207 |
| Row | h 96, px 24, py 20, gap 16, border-b `border/subtle`, `surface/base` |
| Row · mission | flex-1: icon tile 32 (`blue/50`, radius `md` 8, icon 20) + gap 12 + text col gap 2: title 16/24 Regular `text/primary` (ellipsis); category 12/17 Medium `text/muted` |
| Row · propositions (170) | « N propositions » 16/24 Semi Bold; sub 12 Medium `text/secondary`: « sur 10 maximum » (open) · « freelance choisi » (filled) · « en attente » (0 on open) · « aucune retenue » (expired) ; « 0 proposition » singular |
| Row · budget (120) | amount 16/24 Bold « 800 TND »; sub 14 Regular `text/muted` « délai 1 mois » ; **no budget → single line « Selon budget » 14 muted** |
| Row · statut (120) | caption 12 Medium muted « Annonce » + pill: **Ouverte** (`blue/100` / `blue/700`) · **Pourvue** (`indigo/100` / `indigo/500`) · **Expirée** (`surface/sunken` / `text/secondary`); pill px 12 py 4, 12/17 Semi Bold, full radius |
| Row · publiée le (120) | 14/20 muted « 14 juil » + 13/20 « il y a 2h » |
| Row · actions | gap 8, end: secondary button h32 px 12 14 Semi Bold « Voir les propositions » + kebab 36×36 (more-vertical 20) |
| Pagination | not drawn |

Frame data is mock. No empty / error state drawn (existing EmptyState/ErrorState stay).


## F4 — Détail de mon annonce (1440) · node 1477:29190 · READ 3

Same shell (« Mes annonces » active). Content: col gap 24, p 32, `surface/subtle`.

| Part | Value |
|---|---|
| Back link | arrow-left 20 + « Retour à mes annonces » 14 Semi Bold `blue/600`, gap 6 |
| Post header | col gap 12. Top row gap 8: **category chip** (`blue/50`, radius `md`, px 12 py 4, chip-icon 14, 14/21 Medium `blue/700`, « Développement ») + **status pill** (`blue/50`, full radius, pl 12 pr 8, 14/21 Medium `blue/600`, « Ouverte »). H1 32/40 Bold `text/primary`. Meta row gap 16: clock « Publiée le 14 juillet » · map-pin « Tunis » · calendar « Expire dans 12 jours » (each icon 16 + gap 6, 14 Medium `text/muted`) |
| Columns | row gap 24: left flex-1 (col gap 24) · right **376 FIXED** (col gap 16) |
| Panel (both left cards) | `surface/base`, border 1 `border/subtle`, radius `xl` 12, p 24, col gap 12; panel title 14 Semi Bold `text/secondary` |
| Description panel | title « Description du projet »; body 16 / 27 Regular `text/primary`, paragraphs + bullet list (`ms` 24) — user text, rendered as plain text with line breaks |
| Proposals panel | title « Propositions reçues (5) » (count = real total); shows **first 3**, then 16/27 line « + 2 autres propositions » (not a link in the frame) |
| Proposal card | `surface/base`, border 1 `border/subtle`, radius `xl`, **p 20**, col gap 12: (1) « Proposition reçue il y a 3 h » 12 Medium muted · (2) client-row gap 12: Avatar 40 (`blue/100` circle, initial 16 Semi Bold `blue/600`) + name 16 Semi Bold + type row (icon-user 16 + « Développeuse web · Sfax » 14 Medium muted) · (3) meta row gap 16: clock « Prix proposé : 750 TND » · map-pin(!) « Délai : 3 semaines » 14 Medium muted · (4) message excerpt 16/27 Regular, ellipsis « … » · (5) actions row gap 8: **WhatsApp button** (`wa/brand`, w 252, radius `lg`, glyph 20, label 16 Semi Bold **`text/primary`**) + secondary « Voir le profil » h40 |
| Decision card (right) | `surface/base`, border 1 `border/subtle`, radius `xl`, p 24, col gap 16. Budget label 12 Medium muted + value **32 Bold « 800 TND »**; divider; competition pill (`success/100`, px 10 py 4, dot 8 + « 5 propositions reçues » 12 Semi Bold `success/700`) + « 5 / 10 · encore 5 places » 12 Medium muted; divider; « Compétences requises » 12 muted + chips (`surface/sunken`, radius `md`, px 12 py 4, 14 Medium `text/secondary`, gap 8 wrap); divider; meta rows (space-between, 14: label Medium `text/secondary` with icon 16, value Semi Bold `text/primary`) « Localisation / Tunis » · « Expire dans / 12 jours »; then 3 full-width h40 buttons: secondary « Marquer comme pourvue » · ghost (`blue/600` text, no border) « Modifier l’annonce » · **danger** (`danger/500` bg, white label) « Supprimer l’annonce » |


## 375 mobile frames (node ids from the Screens page metadata)
F3 mobile `1488:64945` · F4 mobile `1488:65602` · F2 mobile `1488:65880`. Mobile frames are CONTENT ONLY (no sidebar/topbar drawn — the real mobile shell stays). Page bg `surface/base` white, **px 16, pt 20, pb 32**, content col gap 20.

### F2 mobile · READ 4
| Part | Value |
|---|---|
| Layout | single column: breadcrumb → MAIN form card → tips card (stacked BELOW, same order as desktop split) |
| MAIN card | w full, border 1 `border/subtle`, radius 12, **px 16 py 20**, gap 24 (desktop was p 32) |
| Fields | same as 1440 (h44 fields, gap 8 label→field, section gap 20); full width |
| Switch row | label + helper wrap beside the toggle (pr 40 on text), min-h 72 |
| Tag input | h48 frame at 360 wide with wrap — chips wrap (frame shows 2 lines); real component must grow in height |
| Actions | row space-between: Annuler (md secondary) + Publier l’annonce (lg primary) — stay on ONE row at 375 |
| Tips card | px 16 py 24, border 2 `blue/600`, radius 12, same copy |
| Frame bug (don't copy) | the description helper row has a negative end margin that pushes the text under the « 0/500 » counter — the real build wraps the helper instead |

### F3 mobile · READ 5
| Part | Value |
|---|---|
| Header | col: H1 32 Bold, sub 16/26 muted (wraps 2 lines), then **full-width** primary md button « Publier une annonce » (h40) |
| Stats | flex-wrap gap 12, tiles **165 wide → 2 × 2** (375 − 32 = 343 = 165 + 12 + 165), tile px 16 py 20 gap 8, circle 44 |
| Filter bar | col: Tabs full width (same 3 tabs) → search input full width h44 → « Trier par » select full width h44 (gap 12) |
| Table | no header row; card `surface/base`, border 1, radius `xl`; each row becomes a **stacked card-row**: px 16 py 20, gap 16, border-b: mission (icon tile + title/category) → « N propositions » + sub → budget block → « Annonce » + pill → date block (14 / 13) → actions row end-aligned: « Voir les propositions » (sm secondary h32) + kebab 36 |

### F4 mobile · `1488:65602` · read by the founder through the figma-cli bridge (0 MCP reads) — `docs/design/f4-375-dump.json` + `f4-375.png` (kept local, not committed)
Frame 375 × 3169, `surface/base`, **px 16, pt 20, pb 32**; content col gap 20. Order: back link → post-header (gap 12) → description panel → proposals panel → « + N autres propositions » → decision card. **Same content as 1440, one column.**

| Part | Value |
|---|---|
| Post header | `top` row gap 8: category chip + status chip (29 high each) · H1 32 Bold, 2 lines (80) · meta row gap 16, **wraps** to 2 lines (icons 16, gap 6, 14 Medium muted) |
| Left col | col gap **24** (columns block col gap 20 between left and right) |
| Panels (description / proposals) | border 1, radius `xl`, gap 12, **px 16 py 24** (desktop p 24); title 14 Semi Bold `text/secondary` |
| Proposal card | radius `xl`, border 1, **px 16 py 20** (desktop p 20), gap 12; received-ago 12 Medium · client-row gap 12 (Avatar 40 + name 16 Semi Bold + type row gap 4, icon 16) info gap 2 · meta row gap 16 (**overflows in the frame — the build wraps**) · message 16 Regular · actions row gap 8, **wraps**: WhatsApp **252 wide** (radius `lg`, label 16 Semi Bold) then « Voir le profil » hug (125 × 40) on the next line, left-aligned |
| « + N autres propositions » | 16 Regular `text/primary`, full width line (27) |
| Decision card | border 1, radius `xl`, **px 16 py 24**, col gap 16: budget (label 12 Medium + value 32 Bold, gap 2) · divider · competition (pill `success/100`, px 10 py 4, gap 6 to « 5 / 10 · encore 5 places » 12 Medium) · divider · skills (label 12 Medium, chips wrap gap 8) · divider · meta rows (gap 12; label with icon 16 gap 6 `text/secondary` Medium · value Semi Bold `text/primary`) « Localisation » + « Expire dans » · 3 full-width h40 buttons directly in the card gap 16: secondary / ghost / danger |

DOM check against the dump at 375 (FR + AR): panel padding 24/16, proposal-card padding 20/16, aside 24/16, WhatsApp 252 wide with « Voir le profil » wrapped below, H1 80 high, buttons 40 high at a 16 gap, meta-row icons present.


# H6 « Créer un service » — Figma measurements (PR-2: shell + steps 1–2)

Figma file `jDNjJ8D1gnXiW7Ry3GkN4U`, official Figma MCP (`get_design_context`, screenshot included),
Starter/View seat (~20 reads/month). **Every frame is read once; this file is the source for the build
AND for the final comparison — do not re-read a frame that is recorded here.**

| # | Date | Node | What | Result |
|---|---|---|---|---|
| 1 | 2026-10-23 | `459:18610` | Step 1 « Métier » — 1440 frame (includes stepper `459:18609`, footer `459:18873`, SelectTrigger ×2, skills combo) | ✅ success |
| 2 | 2026-10-23 | `461:19405` | « H6 — Box 2 Description » — a SPECIMEN board (stepper + card), not a 1440 page frame | ✅ success |
| 3 | 2026-10-24 | `459:18966` | « H6 — Box 3 Tarif & délai » — SPECIMEN board (stepper + card) | ✅ success |
| 4 | 2026-10-24 | `459:19023` | « H6 — Box 4 Prestation » — SPECIMEN board (stepper + card) | ✅ success |
| 5 | 2026-10-24 | `654:53743` | « H6 spécimen — délai renseigné » — read to settle whether Délai is composed | ✅ success |

Not read: `654:53794` (délai empty) — read 5 settled the structure, and its empty state is the read-3
placeholder. PR-3 used 3 reads (3–5); 5 this month.

Screenshots: `docs/design/h6-figma/459-18610-step1-metier.png` (1024-wide render of the 1440 frame),
`docs/design/h6-figma/461-19405-step2-description.png`, `docs/design/h6-figma/459-18966-step3-tarif.png`,
`docs/design/h6-figma/459-19023-step4-prestation.png`, `docs/design/h6-figma/654-53743-delai-renseigne.png`
(gitignored — local only).

Not read (and why): `459:18609` stepper and `459:18873` footer are both instances INSIDE read 1 — fully
measured there. `653:53676` cascade and `459:19238` skills combo are open-state specimens (dropdown
panel / suggestion list); see « Unmeasured » at the end.

---

## Read 1 — `459:18610` « Créer un service — 1440 » (step 1 Métier)

### Inventory (top → bottom)

Shell (built already: `src/components/shell/*`) — sidebar MES ACTIVITÉS active item = **Mes services**;
topbar = search, FR/AR toggle, bell, user. Not re-measured here.

Main column `right` (1200 wide) → `content` (`459:18744`) → `wizard-footer` (`459:18873`, a sibling of
content, NOT inside the card).

1. `page-header` (`459:18746`, flex-col gap 8)
   - Breadcrumb (`459:18747`): « Mes services » › « Créer un service » — Inter Medium 14, text/muted,
     chevron-right 14px, gap 8. **Neither crumb is styled as a link in the frame** (both muted).
   - H1 « Créer un service » (`459:18755`) — H1 style: size/h1 32, weight/h1 700, leading/h1 38,
     tracking/h1 -0.64, text/primary.
   - Subtitle (`459:18756`) « Décrivez votre service en quelques étapes. Vous pouvez enregistrer et revenir
     à tout moment. » — Body Small (14/21/400), text/secondary.
2. `HorizontalStepper` (`459:18609`) — full width (`w-full`, 1136 here), h 61, items-start.
   - 5 steps, each `w-[100px]` flex-col gap 8 items-center: circle 36 (radius/full) + label.
   - Active (1 Métier): circle bg blue/600, number Inter SemiBold 16 text/inverse; label Inter **SemiBold** 14 /
     leading body-sm 21, text/primary.
   - Upcoming (2 Description, 3 Tarif, 4 Prestation, 5 Publication): circle bg surface/base +
     **border-2** border/subtle, number SemiBold 16 text/muted; label Body Small **Regular** 14/21, text/muted.
   - Connectors (`conn`): **flex-1** (stretch between columns, not fixed 40px), h 36 box, centred line
     h 2 bg border/subtle. No "done" state drawn (step 1 frame).
   - Labels: Métier · Description · Tarif · Prestation · Publication.
   - **No mobile variant in this frame.**
3. Card `Box 1 — Métier` (`459:18795`) — bg surface/base, border border/subtle 1px, radius/xl 12,
   p 24, flex-col gap 20, full width.
   - **Titre du service** — F3 `Input` (`22:512`) with `counter`, `required` (danger/500 asterisk).
     Label Inter Medium 14/21 text/secondary; field h 44, px 16, radius/lg 10, border/strong, bg
     surface/base; placeholder « Ex: Je crée votre boutique en ligne clé en main » Body 16/26
     text/muted. helperRow h16 justify-between: helper « Commencez par un verbe d'action. C'est la
     première chose que voient les clients. » Body Small text/muted + counter « 0/80 » **Overline**
     style (12 / leading 17 / weight 500 / tracking 0.48 / uppercase) text/muted.
   - `two-col` (`459:18805`) — flex gap 20, h 100, two `flex-1` columns:
     - **Catégorie** — `SelectTrigger` variant=**searchable**, state=default, required. Label 14/21
       Medium text/secondary + danger asterisk (gap 2); field h 44 px 16 gap 8 radius/lg, bg
       surface/base, border/strong; placeholder « Choisissez votre domaine » Body 16 text/muted;
       chevron 18px at the end; helper « Le domaine principal de votre service. » Body Small
       text/muted (helperRow is a fixed-280 centred box in the component — authoring artefact, see diff).
     - **Sous-catégorie** — `SelectTrigger` variant=single, **state=disabled**, required. Disabled field
       = bg surface/subtle + border/subtle; placeholder « Choisissez d'abord une catégorie »; helper
       « Affine votre domaine. »
   - `field-competences` (`459:18828`) — flex-col gap 8:
     - Label « Compétences * » — **Inter Medium 16 / leading body 26, text/primary**, asterisk is part of
       the text run (not danger-coloured). Differs from the Input/Select label style (14/21 secondary).
     - `combo-input` (`459:18830`) — h 44, **px 12** (not 16), gap 8, radius/lg, border/strong, bg
       surface/base; search icon 18px; placeholder « Tapez pour rechercher — ex: React » Body 16 muted.
     - `chips` (`459:18835`) — flex-wrap gap 8. Badge: bg blue/50, ps 12 / pe 8 / py 4, gap 4,
       radius/full; text Inter Medium 14/21 blue/600; × icon 14px. Seeded: React, Next.js, TypeScript.
     - Helper (`459:18851`) « Jusqu'à 5. Elles aident les clients à vous trouver. Tapez et
       sélectionnez, ou ajoutez les vôtres. » Body Small, **text/secondary** (not muted).
     - **No counter** on the skills field (unlike TagInput's N/M). No suggestion dropdown drawn (closed
       state only).
4. `wizard-footer` (`459:18873`) — full width of the main column, bg surface/base, **border-t**
   border/subtle, px 32, py 20, flex justify-between items-center.
   - left (gap 12): Button secondary default « Enregistrer le brouillon » (h 40, px 16, radius/lg,
     border/strong, bg surface/base, label SemiBold 16/26 text/primary) + caption « Enregistré
     automatiquement » Body Small text/muted.
   - nav (gap 12): Button primary **state=disabled** « Suivant » (bg surface/sunken, label text/muted).
     **No « Précédent » on step 1.**

### Layout values

| Element | Value | Token |
|---|---|---|
| content padding | pt 32 / px 32 / pb 40 | space-8 / space-8 / space-10 |
| content gap (top block ↔ card) | 32 | space-8 |
| top block gap (header ↔ stepper) | 24 | space-6 |
| page-header gap | 8 | space-2 |
| card padding / gap / radius | 24 / 20 / 12 | space-6 / space-5 / radius-xl |
| two-col gap | 20 | space-5 |
| field label→field→helper gap | 8 | space-2 |
| stepper step column | 100 | (w-25 = 100px in v4 spacing) |
| stepper circle | 36 | h-9 w-9 |
| stepper connector | flex-1, line h 2 | h-0.5 |
| footer padding | px 32 / py 20 | space-8 / space-5 |
| footer groups gap | 12 | space-3 |
| button | h 40, px 16, radius 10 | h-10 px-4 rounded-lg |
| chip | ps 12 pe 8 py 4 gap 4 radius full | ps-3 pe-2 py-1 gap-1 |

### Raw `get_design_context` output

Not kept in the repo — not even gitignored — because Tailwind v4 scans
`docs/` for class names, and the raw Figma arbitrary-value classes (var() with escaped token names)
compile to invalid CSS that 500s every page. Every value above was taken from that output.

Text styles declared by the frame: H1 (size/h1, weight/h1, leading/h1, tracking/h1), Body Small,
Body, Overline (size/overline, weight 500, leading/overline, tracking/overline).

---

## Read 2 — `461:19405` « H6 — Box 2 Description » (step 2)

**This node is a specimen board, not a page frame.** Board: bg surface/subtle, border border/subtle,
radius/xl, p 32, gap 24, board title « H6 — Box 2 Description » (H3 — documentation label, not UI).
It draws only the stepper and the step-2 card. **No page header, no footer** — step 2's page chrome is
taken from read 1 (same route, same header). Step 2's footer (« Précédent »?) is NOT drawn anywhere
read so far — see « Unmeasured ».

### Stepper in the specimen (`461:19407`) — differs from read 1

| | Read 1 `459:18609` (page frame) | Read 2 `461:19407` (specimen) |
|---|---|---|
| height | 61 | 100 (box; content same) |
| step column | w 100 | w 100 |
| connector | **flex-1** (fills the row) | **fixed w 40**, line w 40 h 2 |
| done step | — | circle bg blue/600 + **check icon 18px** (text/inverse); label **Body Small Regular, text/secondary** |
| done→active connector | — | line bg **blue/600** |
| active step | blue/600 circle, number SemiBold 16 inverse; label SemiBold 14/21 primary | same |
| upcoming | surface/base + border-2 border/subtle, number SemiBold 16 muted; label Regular 14/21 muted | same |

Reading: the specimen is the component at its intrinsic width (5×100 + 4×40 = 660); the page frame
stretches the connectors to fill 1136. Both agree on every per-step value. The **done** state is
measured only here.

### Card `box` (`461:19437`) — identical shell to step 1's card

bg surface/base, border border/subtle, radius/xl 12, p 24, flex-col gap 20.

1. **Description courte** — F3 `Input` instance (`461:19438`), required (danger asterisk), counter.
   - Label « Description courte » Medium 14/21 text/secondary.
   - Field h 44, px 16, radius/lg, border/strong, bg surface/base. Placeholder « Ex: Boutique en ligne
     complète avec paiement à la livraison, prête en 7 jours » Body 16/26 muted. **Single-line input,
     not a textarea.**
   - helperRow: « Le résumé qui apparaît dans les résultats de recherche. » Body Small muted + counter
     « 0/160 » Overline (12/17/500/0.48 uppercase) muted.
2. **Description détaillée** — F3 `Textarea` instance (`461:19447`, component `86:2300…`), required, counter.
   - Label « Description détaillée » Medium 14/21 text/secondary + danger asterisk.
   - Field **h 120**, px 16, **py 12**, items-start, radius/lg, border/strong, bg surface/base; resize grip
     12px bottom-end (native textarea resize handle). Placeholder « Décrivez ce que vous livrez, votre
     méthode, ce qui vous distingue. Soyez concret. » Body 16/26 muted.
   - helperRow: « Minimum 100 caractères. C'est votre argumentaire de vente. » Body Small muted +
     counter « 0/2000 » Overline muted.

### Raw `get_design_context` output

Not kept in the repo — not even gitignored — because Tailwind v4 scans
`docs/` for class names, and the raw Figma arbitrary-value classes (var() with escaped token names)
compile to invalid CSS that 500s every page. Every value above was taken from that output.

Text styles declared: H3 (board title only), Body Small, Body, Overline.

---

## Read 3 — `459:18966` « H6 — Box 3 Tarif & délai » (step 3)

**Specimen board again** (same shell as read 2: bg surface/subtle, border/subtle, radius/xl, p 32, gap 24,
H3 board title). Draws the stepper and the step-3 card only — **no page header, no footer**.

### Stepper (`461:19459`) — matches read 2

Fixed-40 connectors (specimen width). Steps 1–2 **done** (blue/600 circle + check 18, label Body Small
Regular text/secondary), done→done and done→active connectors **blue/600**; step 3 **active** (blue/600,
« 3 » SemiBold 16 inverse, label SemiBold 14/21 primary); 4–5 upcoming (surface/base + border-2
border/subtle, number SemiBold 16 muted, label Regular 14/21 muted); connectors after the active step
border/subtle. Identical per-state values to read 2 — nothing new for `ui/stepper.tsx`.

### Card `box` (`459:18992`) — same shell as steps 1–2

bg surface/base, border/subtle 1px, radius/xl 12, p 24, flex-col gap **20**.

1. **`field-prix`** (`459:18993`) — flex-col **gap 6** (not 8), wraps a **Price Input** instance
   (`459:18994`, component `202:15487`) + a helper.
   - Label « Prix de départ * » — **Inter SemiBold 14**, leading normal, text/secondary; the asterisk is
     part of the text run (not danger-coloured). Differs from the F3 Input label (Medium 14/21 + danger
     asterisk) and from the Unité label below.
   - Price Input internal gap label→field **6**.
   - Field: h 44, bg surface/base, border 1px border/strong, radius/lg 10, **ps 16, no pe** (the suffix
     sits flush on the end edge, clipped by the radius).
     - `value` box: flex-1, full height, items-center, pe 12. Value « 800 » Inter Regular 16, leading
       normal, **text/primary** — a FILLED value, not a placeholder (no placeholder text is drawn).
     - `suffix`: full height, bg **surface/sunken**, **border on the start-side edge** (left in LTR) 1px
       border/subtle, ps 12 / pe 14, centred; « TND » Inter Medium 14 text/muted.
   - Helper (`459:19001`) « Le prix de départ. Le prix final se négocie avec le client sur WhatsApp. » —
     Body Small (14/21/400) **text/secondary** (not muted).
2. **`field-unite`** (`459:19002`) — flex-col gap 8.
   - Label « Unité * » — **Inter Medium 16 / leading body 26, text/primary**, plain asterisk in the run
     (same style as step 1's « Compétences * » label).
   - `segmented` (`459:19004`) — **full width**, bg surface/sunken, radius/lg 10, p 4, gap 4, items-start.
     Four options, each **flex-1** (equal width), px 16 / py 8, radius/md 8, centred:
     - selected « **Fixe** » — bg surface/base, shadow 0 1 2 rgba(0,0,0,.06), label **Inter Medium 14/21
       text/primary**;
     - « Par heure », « Par jour », « Par projet » — no fill, label **Body Small Regular 14/21
       text/secondary**.
     - Each option box is **h 100** — a fixed-height authoring artefact (Figma `createFrame` default;
       the content is one 21px line + py 8 = 37). See the PR-3 diff.
   - Helper (`459:19013`) « Comment vous facturez ce service. » — Body Small **text/secondary**.
3. **Délai** — a plain **F3 `Input` instance** (`22:512`), **not a composed field**, not required.
   - Label « Délai de réalisation estimé » (Medium 14/21 text/secondary, no asterisk).
   - Placeholder « Ex: 5-7 jours » Body 16 text/muted.
   - Helper « Optionnel — précisez si votre prestation a un délai type (ex: 5-7 jours, 2 semaines,
     1 mois) » Body Small text/muted (F3 default). No counter. The screenshot centres it — the same
     fixed-280 helperRow authoring artefact noted in read 1; built `text-start`.

### Values

| Element | Value | Token |
|---|---|---|
| card padding / gap / radius | 24 / 20 / 12 | space-6 / space-5 / radius-xl |
| field-prix gap (input↔helper) and label↔field | 6 | space-1.5 |
| field-unite gap | 8 | space-2 |
| price field | h 44, ps 16, radius 10, border/strong | h-11 ps-4 rounded-lg |
| price value box end padding | 12 | pe-3 |
| suffix | ps 12 / pe 14, bg surface/sunken, start border border/subtle | ps-3 pe-3.5 |
| segmented track | p 4, gap 4, radius 10, surface/sunken, full width | p-1 gap-1 rounded-lg |
| segment | flex-1, px 16, py 8, radius 8 | flex-1 px-4 py-2 rounded-md |
| selected segment shadow | 0 1 2 rgba(0,0,0,.06) | (shadow-xs is .04 — see diff) |

Raw output kept out of the repo (see read 1). Text styles declared: H3 (board title), Body Small, Body.

---

## Read 4 — `459:19023` « H6 — Box 4 Prestation » (step 4)

**Specimen board** (same shell as reads 2–3). Stepper + step-4 card only — **no page header, no footer**.

### Stepper (`461:19490`)

Steps 1–3 done, step 4 « Prestation » active, step 5 upcoming; connectors blue/600 up to the active step,
border/subtle after it. Same per-state values as reads 2–3.

### Card `box` (`459:19050`) — same shell (surface/base, border/subtle, radius/xl, p 24, gap 20)

1. **« Ce qui est inclus »** — F3 **`Textarea`** instance (`86:2299`), **required** (danger asterisk),
   **no counter**.
   - Label Medium 14/21 text/secondary + danger « * » (gap 2).
   - Field h 120, px 16, py 12, items-start, radius/lg, border/strong, bg surface/base, resize grip 12
     bottom-end.
   - Placeholder « Ex: Design UI iOS/Android · 3 écrans · 1 révision · Fichiers sources » Body 16/26 muted.
   - Helper « Une ligne par élément. Ex: Design UI iOS/Android » Body Small text/muted (screenshot centres
     it — same helperRow artefact).
2. **`field-mode`** (`459:19051`) — flex-col gap 8. Same composition as step 3's `field-unite`.
   - Label « Mode de prestation * » Medium 16/26 text/primary, plain asterisk.
   - `segmented` (`459:19053`) — full width, surface/sunken, radius/lg, p 4, gap 4; **two** flex-1 options:
     - selected « **À distance** » — surface/base, shadow 0 1 2 rgba(0,0,0,.06), Medium 14/21 primary;
     - « **Sur site possible** » — Body Small Regular 14/21 text/secondary.
     - Option boxes again h 100 (same fixed-height artefact).
   - Helper (`459:19058`) « La plupart des services sont à distance. « Sur site possible » si vous pouvez
     vous déplacer chez le client. » Body Small **text/secondary**.
   - « À distance » is drawn selected on a card whose two textareas are EMPTY (placeholders) — reads as
     the default value, not a filled state.
3. **« Ce qu'il faut me fournir (optionnel) »** — F3 `Textarea`, **not required** (the word « optionnel »
   is part of the label text), **counter « 0/500 »** (Overline 12/17/500/0.48 uppercase muted).
   - Placeholder « Ex: votre logo, vos textes, vos couleurs de marque, des exemples que vous aimez ».
   - Helper « Ce que le client doit préparer pour que vous commenciez. Réduit les allers-retours. » Body
     Small text/muted.
   - The counter cap drawn is **500**; the DB CHECK on `buyer_briefing` is **1000** (see the PR-3 diff).

Raw output kept out of the repo. Text styles declared: H3 (board title), Body Small, Body, Overline.

---

## Read 5 — `654:53743` « H6 spécimen — délai renseigné »

A white specimen card (border/subtle, radius 16, p 28, gap 20), title « Spécimen H6 — Coaching Meta Ads
(délai renseigné) » SemiBold 16. Three fields, each 534 wide:

- Catégorie — SelectTrigger searchable, value « Coaching Meta Ads », helper « Le domaine principal de votre
  service. »
- Sous-catégorie — SelectTrigger single, **state=filled**, value « Formation dropshipping avec Meta »,
  helper « Affine votre domaine. »
- **Délai de réalisation estimé** — F3 `Input` (`22:531`), **state=filled**, value « 5-7 jours » Body 16
  **text/primary**; helper unchanged from read 3 (« Optionnel — précisez… »).

**Finding: Délai is a single free-text Input in its filled state too — there is no composed number +
unit control anywhere in reads 3 or 5.** The specimen's purpose is the sector context (a coaching service
with a délai), not a different control.

---

## Unmeasured (🧠 not in any read) — founder call before building

- **Mobile (375).** Neither read has a mobile variant. 5 columns × 100 = 500 > 343 content width even
  with zero-width connectors.
- **Step 2 footer.** Whether « Précédent » appears, and where, is not drawn (read 2 has no footer).
- **Open states:** Catégorie searchable panel (`653:53676` cascade specimen), skills suggestion list
  (`459:19238` combo specimen), error states, saving/saved transitions of « Enregistré automatiquement ».
- **AR.** No AR frame (as for every H-series screen) — mirrored by logical properties.
- **Steps 3–4 (reads 3–5):** no footer drawn (PR-2's footer carries over); no mobile variant (four flex-1
  segments at 343 wide do not fit « Par heure » / « Par projet »); no error, focus or hover state for the
  segmented fields or the Price Input inside the H6 boards (Price Input `202:15487` has a 4-state set on
  the Components page — not read); no specimen for « Ce qui est inclus » filled.

# H6 « Créer un service » — Figma measurements (PR-2: shell + steps 1–2)

Figma file `jDNjJ8D1gnXiW7Ry3GkN4U`, official Figma MCP (`get_design_context`, screenshot included),
Starter/View seat (~20 reads/month). **Every frame is read once; this file is the source for the build
AND for the final comparison — do not re-read a frame that is recorded here.**

| # | Date | Node | What | Result |
|---|---|---|---|---|
| 1 | 2026-10-23 | `459:18610` | Step 1 « Métier » — 1440 frame (includes stepper `459:18609`, footer `459:18873`, SelectTrigger ×2, skills combo) | ✅ success |
| 2 | 2026-10-23 | `461:19405` | « H6 — Box 2 Description » — a SPECIMEN board (stepper + card), not a 1440 page frame | ✅ success |

Screenshots: `docs/design/h6-figma/459-18610-step1-metier.png` (1024-wide render of the 1440 frame),
`docs/design/h6-figma/461-19405-step2-description.png`.

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

## Unmeasured (🧠 not in any read) — founder call before building

- **Mobile (375).** Neither read has a mobile variant. 5 columns × 100 = 500 > 343 content width even
  with zero-width connectors.
- **Step 2 footer.** Whether « Précédent » appears, and where, is not drawn (read 2 has no footer).
- **Open states:** Catégorie searchable panel (`653:53676` cascade specimen), skills suggestion list
  (`459:19238` combo specimen), error states, saving/saved transitions of « Enregistré automatiquement ».
- **AR.** No AR frame (as for every H-series screen) — mirrored by logical properties.

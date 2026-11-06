# H3 Modifier mon profil at 375 — diff, kept, questions

Export in this folder: `m375-h3-profil-modifier` (375 × 5261). Route `/mon-profil-freelance/modifier`.

## Built (below lg; `max-sm:` where the built class already switches at sm, so 640–1023 keeps its sm value)

| Part | Before → frame | File |
|---|---|---|
| Header | breadcrumb 14 Regular → Medium · H1 32 / 40 → 32 / 38 | `page.tsx` |
| Identity panel | pad 20 → 24 / 16 · gap 24 → 20 · info-row label 14 → 12 Medium · value Medium → Regular | `ProfileEditForm.tsx` |
| Accordions | 16 → 24 apart · in-section dividers 20 / 16 → 16 / 16 from the content · helpers 14 → 12 | `ProfileEditForm.tsx` |
| Accordion header / body | title 16 → 20 Semi Bold / 26 · no divider under the header · body pad 16 → 4 / 16 / 24 | `AccordionSection.tsx` (route-local) |
| Footer bar | pad 16 → 20 / 16 · buttons start-aligned, wrapping under the status line | `StickyFooter.tsx` (route-local) |

## Kept as built (standing defaults)

- **Text:** the breadcrumb « Tableau de bord » (frame « Mon profil › Modifier »). No « Voir ma page publique → » link: it would be new text, and there is no public freelancer page route.
- **Features:** no banner upload. The photo stays AvatarField. The years of experience stay a number input (the frame draws a stepper). No « Note et projets livrés » block, because reviews are Phase 3+.
- **Shared components:** the links field stays the links-kit LinksEditor, with platform chips and a cap of 5. The frame draws label + URL rows with a cap of 3.
- **Behaviour:** Formation & certifications stays collapsed by default; the frame draws it open.
- **Figma slips:**
  - The frame's panels are 311 wide because the frame pads 16 twice, so the panels keep the shell's 16.
  - The multi-line headline and the « Modifier dans Paramètres » link beside « Tunis » are hug slips.

## Questions

1. Open Formation & certifications by default, as the frame draws it?
2. The banner upload, the years stepper and the « Note et projets livrés » block — design pass / after the beta?

Controls: tsc · eslint · desktop sentinel 1440 FR + AR (max-* only, frozen fixture data): only the known top-bar capture band y 16–50 differs · probed at 375: H1 32/38, panel 24/16 gap 20, accordions 24 apart, header 66 with title 20/26, body 4/16/24, footer 20/16 — all equal to the frame · 375 FR side by side · AR spot check.

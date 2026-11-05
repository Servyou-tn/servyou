# H7 Modifier un service + H1 Devenir freelance at 375 — diff, kept, questions

Exports in this folder: `m375-h7-service-modifier`, `m375-h1-devenir-freelance`. `/devenir-freelance` is a 308 to
`/devenir-vendeur/freelance` (DevenirFreelanceContent).

## Built (below lg only)

| Screen | Change | File |
|---|---|---|
| H1 | Eyebrow as plain blue caps (no pill) · H1 32 Bold / 38 at every width below lg (tablets too, review fix) · subline secondary · card icons 20 | `src/components/devenir/DevenirFreelanceContent.tsx` |
| H1 | Benefit cards in the boutique-375 look via BenefitGrid's existing `mobileLook="outline"` (#319, unchanged) | same |
| H7 | — (nothing: see Q1) | — |

## Kept as built (standing defaults)

H1: the hero CTAs (« Créer mon profil freelance », « Voir des freelances ») and the terms line · no « Avant de commencer »
age block on this page (the age check runs once upstream, on /devenir-vendeur — documented in the component).
H7: the 5-step wizard (shared with Créer un service, aligned at 375 in #307) · the pill under the title · texts.

## Questions

1. H7: the frame draws the edit page as collapsible sections (« Métier & description », « Tarif & délai », « Prestation »,
   « Statut & visibilité », each with a « Complété » pill) with a « Voir le service » link — not the stepper. That is a
   rebuild of the shared wizard's edit mode, out of a 375 pass: plan it as its own PR?
2. H1: the frame ends with the « Avant de commencer » age block (date of birth + « Continuer ») and has no hero CTAs. Bring
   the age check back onto this page?

Controls: tsc · eslint · desktop sentinel 1440 FR + AR on H1 (max-lg only): identical, before and after the review fix · H1 32/38 + icons 20 measured at 375 and 1023, 48/60 + 24 at 1440 · 375 FR side by side · AR spot check.

## Founder answers (2026-11-05, after #324)

1. H7 stays the aligned 5-step wizard. The collapsible edit-page redesign is logged for after the beta, not now.
2. The age check stays upstream on /devenir-vendeur — no change to H1.

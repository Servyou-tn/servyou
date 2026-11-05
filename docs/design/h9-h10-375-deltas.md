# H9 Trouver des missions + H10 Détail de mission at 375 — diff, kept, questions

Exports in this folder: `m375-h9-missions`, `m375-h10-mission`.

## Built (below lg / sm only)

| Screen | Change | File |
|---|---|---|
| H9 | The title block becomes the frame's white full-bleed « mobile-header » band (border-bottom, title 20 Semi Bold; the built subtitle stays) | `trouver-des-missions/page.tsx` |
| H9 | Filters 2 × 2 at gap 12; « Télétravail accepté » spans both columns | `page.tsx`, `_components/RemoteToggle.tsx` |
| H9 | « Trier par » hugs and starts at the content edge (the empty chips list takes no gap) | `page.tsx` |
| H10 | Content + columns gap 20 · description panel pad 24/16 · right column gap 16 | `missions/[id]/page.tsx` |

## Kept as built (standing defaults)

H9: the subtitle « Trouvez des projets… » · the sort's built label (« Plus récentes ») · the cards as built (they already
match). H10: the shared `ClientCard` (frame pad 20/16) and `MissionFacts` (frame 24/16) keep their 20 / 24 padding.

## Questions

1. H9: the frame's band carries a « Rechercher une mission… » field — missions have no text search today (category, city,
   budget, skill, remote, sort). Add a `?q=` search?
2. H10: pad the shared `ClientCard` / `MissionFacts` 16 at the sides below lg (they are also used by /missions/[id]/proposer)?

Controls: tsc · eslint · desktop sentinel 1440 FR + AR (max-* only; same frozen fixture; only the known top-bar noise band
differs) · 375 FR side by side · AR + 768 spot check of the H9 band.

## Founder answer (2026-11-05, after #320)

Standing defaults accepted: Q1 (missions text search) and Q2 (shared mission-card padding) stay as built; tablet → design pass.

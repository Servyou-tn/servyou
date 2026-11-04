# G6 « Ajouter un produit » + G7 « Modifier le produit » — mobile 375 (`m375-g6-g7`)

Batch 2, PR-A6 — plus the G5 kebab's 44 px hit area (#315 Q3).
- **Frames:** `m375-g6-ajouter` (375 × 1804) and `m375-g7-modifier` (375 × 2694), dump + png each. No Figma MCP read was used.
- **Fixture:** one temporary route (`fixture-m375/[which]`: g6 / g7 / g5) with the frames' content, deleted before the commit. Shell offset: the frame's y + 4.
- **Desktop:** stash-compared against `main` — **0 differing pixels in all 10 pairs.**
  - G6: sentinel 1440 FR + AR (class-only changes).
  - G7: full 1440 / 1100 FR + AR (an icon element is added, `lg:hidden`).
  - G5: full 1440 / 1100 FR + AR (the hit-area span is added).
- **Overflow:** none at 375 in FR or AR.

## Diff

| Block | Frame | Now (375) |
|---|---|---|
| Header (G6 + G7) | crumb 14 Medium / 17 (blue link, chevron 14, gap 8); 8 → H1 32 Bold / **38**; 8 → subline 14 / 21 secondary; 24 → form | ✓ crumb y24, H1 y49, subline y95 (frame + 4); was an H1 24 Semi Bold with a 20 crumb and a muted subline |
| Sections | **no cards** — on the page, 32 apart; title 20 Semi Bold / **26**, 16 above the fields; fields 20 apart | ✓ the white cards dissolve below lg, tablets included (`max-lg:sm:p-0` beats `sm:p-8`); sections were rounded white cards with p-6 and a shadow, 20 apart; fields span 343 |
| Footer | a card: r12, 1 px border/subtle, pad 20 / 16 | ✓ r12, border, pad 19 / 15 + border, no shadow (was r16 + shadow) |
| G7 « Statut & visibilité » | the label (16 Medium / 26) + description (14 / 21 secondary) beside the segmented switch; no divider; 24 → danger zone | ✓ 170 + 157 side by side (frame 182 + 161) |
| G7 danger zone | transparent card, 1 px danger/500 stroke inside pad 24 / 16; alert icon + 20 Semi Bold title; body 14 secondary 8 under; the button 24 under | ✓ all (was a danger/50 box with a 14 Semi Bold danger title) |
| G5 « ⋮ » (#315 Q3) | — | ✓ an invisible `absolute -inset-1` span: 36 px button, **44 × 44 hit area**; paints nothing |

## Kept (standing defaults)

- **« Sous-catégorie »:** the frames' second select is not built. Product categories are flat, so it would need taxonomy + data.
- **Built text:** the « Images » helper (« Jusqu'à 8 photos… ») and the danger-zone body are kept where the frames have « Photos du produit * » and another sentence. No text changes.
- **G7 footer stays stacked:** the frame's 141 + 254 buttons in a 311 row wrap anyway. The dirty indicator shows only when there are unsaved changes, as built.
- **Hug slips ignored:** G6's 120 px fixed footer buttons clip their own labels in the frame.
- **Page background:** the shell's grey page stays under the card-less sections, as on every batch page.

## Questions

1. **« Sous-catégorie » on G6 / G7:** the product taxonomy has no sub-level. Add it (data + UI) after the beta?

Controls (375, FR + AR):
- **G6:** crumb → `/mes-produits`, footer (Enregistrer le brouillon / Publier disabled until valid), stock switch toggles.
- **G7:** crumb, « Voir le produit » → `/produits/{id}`, delete modal opens.
- **G5:** kebab 36 × 36 with a 44 × 44 hit area, menu unchanged.

# G9 « Détail de la commande » + G5 « Mes produits » — mobile 375 (`m375-g9-g5`)

Batch 2, PR-A5.
- **Frames:** `m375-g9-commande` (375 × 2610) and `m375-g5-produits` (375 × 2916), dump + png each. No Figma MCP read was used.
- **Fixture:** one temporary route (`fixture-m375/[which]`) with the frames' content, deleted before the commit. Shell offset: the frame's y + 4.
- **Desktop:** 8 pairs (G9 + G5 × 1440 / 1100 × FR / AR), stash-compared against `main`: **0 differing pixels in all 8.** It was the full set, because G9 adds wrapper elements.
- **Overflow:** none at 375 in FR or AR. **G9 scrolled 58 px sideways before (433 wide)**; it is fixed. At 320 the only overflow left is the shared shell's top bar (16 px, every page — pre-existing, out of scope).

## Diff

| Block | Frame | Now (375) |
|---|---|---|
| G9 / G5 root | blocks 20 apart | ✓ 20 (were 24) |
| G9 header | crumb 14 Medium (link blue/600, current text/primary, chevron 14); 12 → H1 32 / **38**; 12 → pill **full width**; 12 → date; 24 → stepper | ✓ all (the pill sat beside a 2-line H1) |
| G9 stepper | vertical, centred | **the horizontal rail (7 × 56) was 392 wide in 295 → the page overflowed by 58**; below lg it is the shared rail's existing vertical look (E4's), centred; panel content 311 |
| G9 panels | stroke inside pad 24 / 16 → 311; titles 26 | ✓ all six |
| G9 Livraison | fields gap 12; the client note r8, blue/200 start bar, 12 Medium caption, text secondary, 12 under the fields | ✓ |
| G9 Client | name 16 Semi Bold / 25; WhatsApp lg with a 20 glyph | ✓ (glyph via the button's `glyphClassName`) |
| G5 header | H1 / 38; the add button full width, 12 under | ✓ |
| G5 rows | card stroke inside pad 16, gap 16, list gap 16; thumb r8 above the title; the title wraps with its pill beside it; Prix / Stock / Vendus start-packed 24 apart, labels 12 Medium / 17, 4 above the value; « Modifier » a full-width secondary (border-strong, 14 Semi Bold) beside the kebab | ✓ rows 258 / 232 (frame 255 / 229); the columns hug their values (auto tracks, shrinkable — the built 70 / 120 / 56 minimums plus the gap overflowed cards under ~358 px). « Modifier » rendered **16 Medium** at every width (`cn()` evicted its size); now a plain class string, 14 / 21 Semi Bold below lg; desktop keeps 16 (logged) |

## Kept (standing defaults)

- **G9 stepper.** The frame draws the label under each circle with no connector. That needs a change inside the shared `OrderRail`. Below lg we use its vertical look; desktop keeps its horizontal rail.
- **G9 « Imprimer le bon de livraison »** + « Bon imprimé ✓ » are the deferred delivery documents, so they are not built.
- **G9 extras kept:** the tracking « Enregistrer » button and the « Quartier » row (real fields). The crumb shows the order ref (« #A4F729 »), the built text, where the frame has « Commande #A4F729 ».
- **G5 checkbox inside the card.** The frame puts it in a 68 px column outside. G5's bulk select is built, so the box stays inside, beside the thumb.
- **G5 frame-only controls are not built:** the « Toutes les catégories » filter, « Plus récents » sort, « 28 produits » count line and « Tout sélectionner ». They are new controls / text.
- **The frame's 26 px buttons and 20 px thumbs** are Figma hug slips, ignored.

## Questions

1. **G9 stepper:** change the shared `OrderRail` to the frame's circle-over-label nodes without connectors (G9, then maybe E4), or keep E4's look?
2. **G5 filters:** the category filter + sort + count + « Tout sélectionner » are new controls. Build them in their own PR?
3. **G5 kebab:** 36 × 36 with no 44 px hit area (pre-existing). Add the hit area?
4. **Desktop « Modifier » size:** 16 instead of 14 (the `cn()` eviction). Fix it in the design pass, like F4's back link?

Controls (375, FR + AR):
- **G9:** crumb → `/commandes-recues`, tracking save, WhatsApp, « Marquer préparée », cancel modal opens.
- **G5:** 4 tabs, 10 « Modifier » links, one check shows the bulk bar (Désélectionner / Activer / Supprimer), kebab menu (Masquer / Supprimer).

## Founder answers (2026-11-04)

1 no change to the shared tracker · 2 G5 filters / sort / count / select-all after the beta (logged in `docs/follow-ups/m375-g9-g5.md`) ·
3 yes — the « ⋮ » button gets an invisible 44 px hit area → **done in PR-A6** (`docs/design/m375-g6-g7-deltas.md`) · 4 the desktop
« Modifier » size waits for the design pass.

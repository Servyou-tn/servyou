# G1 « Devenir vendeur » + « Devenir vendeur boutique » — mobile 375 (`m375-g1`)

Batch 2, PR-A7. It also records the #317 answer (sub-categories after the beta) in `m375-g6-g7-deltas.md`.
- **Frames:** `m375-g1-devenir-vendeur` (375 × 1137) and `m375-g1-boutique` (375 × 1292), dump + png each. No Figma MCP read was used.
- **Fixture:** one temporary route (`fixture-m375/[which]`: g1 / g1b) showing a consumer born 12/05/1995, as in the frames. It is deleted before the commit. Shell offset: the frame's y + 4.
- **Desktop:** class-only changes (`max-lg:` / `max-sm:`; nothing added, removed or moved), so these are sentinel shots, stash-compared against `main`: **0 differing pixels in all 6 pairs.** The pairs are G1 + G1 boutique at 1440 FR + AR, plus `/devenir-vendeur/freelance` at 375 and 1440 FR, which shares `BenefitGrid` and does not opt in.
- **Overflow:** none at 375 in FR or AR.

## Diff

| Block | Frame | Now (375) |
|---|---|---|
| Column (both) | 343 wide (page pad 16), blocks 32 apart | ✓ was 311: the page's own px-4 plus the shell's; py-10 dropped below lg |
| G1 hero | eyebrow 12 **Medium**; 8 → H1 32 Bold / **38**; 8 → sub **18 / 28** secondary | ✓ y 24 / 49 / 133 (frame + 4). It was Semi Bold 12, H1 / 40, a 16 / 26 sub, gaps 12 |
| G1 role cards | r12, 2 px stroke inside pad 20 / 16, gap 16; a **round** 56 icon; title 20 **Semi Bold / 26**; desc 14 / **21**; points 4 lower, text/**primary**; cards 20 apart | ✓ 343 × 316 each, same as the frame (was r24, p-8, a rounded-square icon, Bold / 28 title, 24 lead, secondary points) |
| G1 age gate | r10, surface/subtle, **no stroke**, pad 24 / 16, gap 16; the DOB row on the card (check 8 away) | ✓ (was r24 with a border, 311 wide, the DOB in a white box) |
| G1B hero | **plain** eyebrow (no pill) 12 Medium; 8 → H1 32 / 38; 8 → sub 18 / 28 secondary | ✓ y 24 / 49 / 133 (was the pill, a 36 / 45 H1, a 29 lead and a muted sub) |
| G1B value cards | r12, 1 px border/subtle, **no shadow**, pad 24 / 16, gap 12; a round 48 blue/50 icon, 20 glyph; title 20 Semi Bold / 26; desc 14 / 21 secondary; 16 apart | ✓ 343 × 209 each, same as the frame. This uses a new opt-in `mobileLook="outline"` on `BenefitGrid`; the freelance page leaves it out and is pixel-identical |

## Kept (standing defaults)

- **G1 « Continuer » button:** not built. Each role card is the link, as built; the frame's disabled button implies a select-then-continue flow.
- **G1B bottom card** (« Avant de commencer » + 18+ line + DOB + « Créer ma boutique » + terms): not built. The age gate on this page was cut by an earlier ruling (`DevenirVendeurContent.tsx` header: `/devenir-vendeur` already checks the age), and « Avant de commencer » is new text. The CTAs and the terms line stay in the hero.
- **G1B « Voir des boutiques »:** the secondary CTA stays (built; the frame has none).
- **Terms line:** kept as built (« conditions d'utilisation » → `/conditions`). The frame's uppercase « … vendeur » wording refers to a document that does not exist (TermsLine ruling).
- **Hug slips ignored:** the frames' icon circles hug to 24 / 20 wide; we render 56 / 48 circles.
- **Page background:** the shell's grey page stays, so G1's surface/subtle age gate reads flat (as on every batch page).

## Questions

1. **G1 « Continuer »:** switch the role cards to select-then-continue (a radio choice + a disabled button until picked), or keep the whole-card links?
2. **G1B bottom card:** bring back an age-gate card at the bottom (new title « Avant de commencer », DOB, the CTA moved into it), or keep the CTAs in the hero as ruled?
3. **G1B « Voir des boutiques »:** hide it on mobile to match the frame, or keep it?

Controls (375, FR + AR): G1 cards → `/devenir-vendeur/freelance` · `/devenir-vendeur/boutique`, DOB row LTR date ✓ · G1B « Créer ma boutique » → `/ma-boutique/creer`, « Voir des boutiques » → `/marche?type=product`, terms → `/conditions`.

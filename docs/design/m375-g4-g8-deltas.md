# G4 « Tableau de bord vendeur » + G8 « Commandes reçues » — mobile 375 (`m375-g4-g8`)

Batch 2, PR-A4.
- **Frames:** `m375-g4-dashboard` (Figma 1488:60277, 375 × 3597) and `m375-g8-commandes` (1488:61161, 375 × 2911), dump + png each. No Figma MCP read was used.
- **Fixtures:** two temporary routes with the frames' own content, deleted before the commit.
- **Shell offset:** the shell starts the content 24 down where the frame starts at 20, so every y is the frame's + 4.
- **Desktop:** 8 pairs (G4 + G8 × 1440 / 1100 × FR / AR), stash-compared against `main`: **0 differing pixels in all 8.**
- **Overflow:** none at 375 in FR or AR.

## Diff

| Block | Frame | Now (375) |
|---|---|---|
| G4 / G8 root | blocks 20 apart | ✓ 20 (were 24) |
| G4 / G8 H1 | 32 Bold / **38** | ✓ 38 (were 40) |
| G4 « + Ajouter un produit » | full width | ✓ 343 × 40 (was 196; the frame's 26 tall is a hug slip — kept 40) |
| G4 action centre | blue/50, 1.5 px blue/200 **inside** pad 24 / 16 → content 311; title line 26 | ✓ content 311 (was 292), title 26 — measured 312 at device pixel ratio 1, where Chrome floors the 1.5 px border to 1 (the rows inside measure 280 for the same reason) |
| G4 action rows (OAR) | card r10, 1 px border/subtle inside pad 16 → 279, gap 16: thumb 48 r8 · title 16 Semi Bold + pin · buyer · pill (pending: full width) + the action · « Voir détails » | ✓ the card below 640 (was a borderless 2-line row); 280 content; « Voir détails » → `/commandes-recues/{id}` (existing text). Tablet / desktop rows unchanged |
| G4 panels (Commandes en cours, Stock faible, Actions rapides) | stroke inside pad 24 / 16 → 311; title line 26; the header link under the title | ✓ 311, 26, link on its own line — **Stock faible 267, Actions rapides 310: equal to the frame** |
| G4 « Commandes en cours » rows | pad 16; title Semi Bold with the pill beside it; buyer 8 under | ✓ |
| G4 low-stock thumb, quick-action chip | r8 | ✓ (were 10) |
| G8 cards | the frame's 100 px checkbox column = the **deferred multi-select** (page comment) → not drawn, so the card is 343, content 311 | ✓ 343 × content 311 (the frame's 231-wide cards overflow their own buttons and wrap « En attente de confirmation acheteur » one syllable per line) |
| G8 card anatomy | gap 16; thumb 48 r8 on its own line above the title; pending pill full width; « Voir détails » on its own line; WhatsApp with an 18 glyph | ✓ all; WhatsApp glyph via the button's existing `glyphClassName` (no change inside the shared button) |

## Kept (standing defaults)

- **Pending actions.** Both frames give a pending order « Confirmer sur WhatsApp » + « Annuler », with no « Accepter ». The G9-pass ruling recorded in `OrderActionRow.tsx` keeps WhatsApp (contact) **and** « Accepter » (transition), because on COD the seller confirms before accepting. G8 keeps WhatsApp · Accepter · Annuler; G4 keeps « Accepter ».
- **Built text.** G8's WhatsApp label stays « WhatsApp »: there is no « Confirmer sur WhatsApp » string, and no text changes.
- **G4 stat tiles stay one column.** At 2 × 2 with pad 24 a tile has 117 px of content, and « 2 840 TND » at 28 Bold needs about 148. The frame itself clips it (and « Commandes à tra… »). Q2.
- **Non-pending G4 rows wrap « Voir détails »** to a second line. Pill + button + link = 324 in 280; the frame clips « Voir » instead.
- **Shared components untouched:** `StatusPill` (only its `className` used for the full-width pending pill), the three order buttons, `SortSelect`, `Pagination`. The existing « Annuler » already matches the frame's ghost button (77 × 32 vs 78 × 32).

## Questions

1. **Pending rows:** keep WhatsApp + « Accepter » (the G9 ruling), or drop « Accepter » as both frames do? Dropping it removes the only place a seller accepts an order.
2. **G4 stat tiles in 2 × 2:** with what? Options: pad 16 and a 24 px value; the profit tile on its own full row; or keep one column (current).
3. **« Commandes en cours » rows:** the frame adds a thumb, « N° de suivi » + the number and a « Voir » button. That needs `tracking_number` in the dashboard loader plus new text. Build it in its own PR?
4. **G4 row wait time** (« il y a 8h »): `ActionableOrder` only has `createdAt`; G8 shows the time in the current state (`waitingHours`). Which one, if any?
5. **G8 « Refusée »** pill on the last card is not one of our statuses (cancelled = « Annulée »). Treated as a frame slip. OK?
6. **Multi-select** (the checkbox column): still deferred?

Controls (375, FR + AR):
- **G4:** every link resolves (add product, 4 « Voir détails », « Voir toutes les commandes », edit shop, public shop).
- **G8:** the 5 tabs, sort (2 options), 10 detail links, page 2, and the cancel modal opens (Escape doesn't close it — pre-existing, logged).

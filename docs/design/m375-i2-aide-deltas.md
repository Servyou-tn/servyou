# I2 « Paramètres » + « Aide » — mobile 375 (`m375-i2-aide`)

Batch 2, PR-A9. It also records the #321 answers in `m375-f1-e1-deltas.md`.
- **Frames:** `m375-i2-parametres` (375 × 2075) and `m375-aide` (375 × 3150), dump + png each. No Figma MCP read was used.
- **Fixture:** one temporary route (`fixture-m375/[which]`: i2 / aide) showing a freelancer, as in the frames, with the frame's e-mail toggles. It is deleted before the commit, and nothing was saved.
- Both pages already had a mobile build (Paramètres from frame 1488:59777), so this PR closes the remaining gaps. Shell offset: the frame's y + 4.
- **Desktop:** stash-compared against `main`: **0 differing pixels in all 6 pairs.**
  - Paramètres: sentinel 1440 FR + AR (`max-lg:` classes only).
  - Aide: the full 1440 / 1100 FR + AR, because the caption's base classes were rewritten (see below).
  - A 375 probe proved the swap: caption 16 on `main`, 12 on the branch.
- **Overflow:** none at 375 in FR or AR.

## Diff

| Block | Frame | Now (375) |
|---|---|---|
| Crumb (both) | 14 **Medium / 17** | ✓ (was 14 Regular / 20); H1 8 under it |
| Subline (both) | 14 / **21** | ✓ (was 20) |
| I2 tabs → panels | 20 | ✓ (was 32) |
| I2 panels | r12, 1 px stroke inside pad 24 / 16; titles 20 / **26**; text 14 / 21; « Bientôt disponible » 29 tall | ✓ pad 23 / 15 + the border (content was inset 17), titles 26 (were 28), text 21, badge 29 |
| Aide search caption | 12 **Medium / 17** | ✓. It rendered **16 / 24 at every width**: `cn()` drops `text-caption` beside a text colour. It is now a plain class string with the size below lg; desktop keeps exactly what `cn()` produced (logged) |
| Aide caption → groups, last group → contact panel | 20, 20 | ✓ (were 32, 32) |
| Aide group titles | 20 Semi Bold / **26** | ✓ (were 28) |
| Aide contact panel | r12, stroke inside pad 24 / 16 (content 311); title 26 | ✓ 343 × 507 (frame 508); content 311 (was 293) |

## Kept (standing defaults)

- **I2 page inset:** the frame nests the page in a second 16 px padding: content 311 at x 32, breadcrumb at y 40, the footer content at x 32. Every other 375 page (and the 1488:59777 build) uses the full 343, so we keep 343 — Q1.
- **I2 setting rows** are the shared `SettingRow` primitive (also the cookie modal and AnnonceForm): label 16 / 24 and description 14 / 20, where the frame has 16 / 19, 14 / 17 and a 40 px end pad. The rows keep their built look.
- **I2 hug slips ignored:** the active sub-tab's accent fills half the row in the frame (ours is the 2 px bar); the footer buttons stack as built. The frame shows the dirty footer state; ours shows it once a toggle changes (checked).
- **Aide accordions:** the question line stays 16 / 24, with 16 between text and chevron, so long questions wrap; in the frame they run past the card (hug slip). « Nous écrire » stays beside the H1 (ruling 6, #227).
- **Page background:** the shell's grey page stays, as on every batch page.

## Questions

1. **I2 inset:** keep the full-width 343 column (as every other mobile page), or follow the frame's 311 with 32 px sides?
2. **Aide desktop caption:** the search caption is 16 instead of 12 on desktop too (the `cn()` eviction). Fix it in the design pass, like F4's back link and G5's « Modifier »?

Controls (375, FR + AR):
- **I2:** a toggle shows « Modifications non enregistrées » / « تعديلات غير محفوظة », and « Annuler les modifications » restores it (nothing saved). The 4 tabs switch.
- **Aide:** an accordion expands; « Nous écrire » → `#aide-contact`; search filters (1 group, 1 item for « mot de passe » in FR); contact links (WhatsApp, `mailto:`, `/conditions`, `/confidentialite`, `/cookies`, `/accessibilite`) unchanged.

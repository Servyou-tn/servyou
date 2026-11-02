# Shop social links — measurements (D3 · D1 · G3)

Frames approved 2026-10-31 (Screens page, section « APPROUVÉ 31 oct — Réseaux sociaux boutique (D3 · D1 · G3) »):
D3 1440 `1549:40649` · D3 375 `1549:40814` · D1 1440 `1549:40874` · D1 375 `1549:41101` · G3 1440 `1549:41210` · G3 375 `1549:41725` ·
G3 open accordion `1549:42120` · icon-tiktok `1549:40645` (beside icon-facebook `135:8061`, icon-instagram `135:8058`).

Figma MCP reads, 2026-11-01: **1 succeeded** (D3 375). The next call returned « tool call limit on the Starter plan » (team on Starter, View
seat). The other frames are **not measured yet**.

## D3 375 — `1549:40814` (read 1, measured)

The new block sits in the hero's `top` stack (vertical, gap 16), **between the header block (name + meta rows) and the description**.

| Node | Value |
|---|---|
| `socials` (1549:40865) | vertical, gap 6, hug |
| caption « Réseaux sociaux » (1549:40866) | Inter Medium 12, line 17, tracking 0.48, UPPERCASE, `text/muted` (#64748b), the Overline style |
| `social-icons` (1549:40867) | horizontal, gap 14, items start |
| `link-facebook` / `link-instagram` / `link-tiktok` | 20 × 20 each, in that order |
| neighbours | header-block (name 32 Bold + metaWrap, gap 8) above · description 16 / 26 `text/secondary` below · chips (« Paiement », « Catégories ») after it |

Kit fit: SocialLinks' 34 × 34 targets with a 20 glyph and no gap give a 34 px centre-to-centre step = 20 + 14 ✓ (the same trick D4's « Liens »
segment uses: negative start/vertical margin hands back the 7 px padding so the glyphs sit flush with the caption).

## The other frames — FigCli dumps (founder export, 2026-11-01)

`docs/design/sl-*-dump.json` + `.png` (untracked): sl-d3-1440, sl-d1-1440, sl-d1-375, sl-g3-1440, sl-g3-375, sl-g3-open.

| Frame | Measured | Built |
|---|---|---|
| sl-d3-1440 | same `socials` block as 375 (V gap 6, caption 12 Medium muted, icons 20 gap 14), in `top` (gap 16) between header-block and description | ✓ caption→glyphs 6, step 34, glyphs flush under the caption |
| sl-d1-1440 | `shopPanel` › `col` (V gap 4): name · city · description · **`socials` (H gap 10, items center: « Suivez la boutique » 12 Medium muted + icons 20 gap 14)** · « Voir tous les produits de cette boutique → » | ✓ in the panel, caption→first glyph 10, row 20 tall |
| sl-d1-375 | page stack gap 20; `socials` (H gap 10, **ps 12**) right after the shop row, before the COD note | ✓ under the shop row (`lg:hidden`), 16 + 12 from the edge; the panel copy is `max-lg:hidden` so it never shows twice. The rest of D1 at 375 is page 6 |
| sl-g3-1440 (closed) | last accordion, header p 20 / 24, title « Réseaux sociaux (optionnel) » 20 Semi Bold, StatusPill « Optionnel » (grey) + chevron 20 | ✓ |
| sl-g3-375 (closed) | header stacks: p 20 / 16, title, then the pill + chevron row (gap 12) | ✓ |
| sl-g3-open | body p 4 / 24 / 24, gap 16: intro 14 / 21 secondary; per field: labelRow (icon 18 + label 14 Semi Bold primary, gap 8), Input 44, 8 apart; pill « Complété » (green) when filled | ✓ (labels 21 tall from the 14/21 type; inputs 44, LTR) |

## Decisions (not drawn, or drawn differently)

1. **Placeholders** (`facebook.com/votreboutique`, …): the frame shows filled values only. Same in both languages (addresses).
2. **G3 section opens by itself** when one of its fields has an error (a refused link is never hidden in a closed accordion).
3. **Not G2's AccordionSection**: title 16 vs the frame's 20, body divider and padding differ. A route-local `SocialLinksSection` built to the frame.
4. **TikTok glyph**: the links kit's (simple-icons) — `icon-tiktok` 1549:40645 was not read (Figma quota); same 20 px, `text-secondary`, as Facebook / Instagram.
5. **Pill text « Complété »** (frame) — G2's sections say « Complet ». New key `shop.edit.social.badge_complete`.

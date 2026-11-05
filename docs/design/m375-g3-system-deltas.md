# G3 « Modifier ma boutique » + system pages check — mobile 375 (`m375-g3-system`)

Batch 2, PR-A10 (the last of the batch). It also records the #323 answers in `m375-i2-aide-deltas.md`.
- **Frame:** `m375-g3-boutique-modifier` (375 × 1952), dump + png. No Figma MCP read was used.
- **Fixture:** one temporary route (`fixture-m375/[which]`), deleted before the commit; nothing was read or written.
  - `g3`: the real `EditShopForm` with the frame's shop.
  - `e500`: the real `app/error.tsx` with a fake digest, for the 500 check.
- **Desktop:** class-only changes (`max-lg:` / `max-sm:`; no element added, removed or moved). Stash-compared against `main`: **0 differing pixels in all 4 pairs** (1440 + 1100 × FR / AR). A 375 probe proved the swap (H1 24 on `main`, 32 on the branch).
- **Overflow:** none at 375 in FR or AR.

## G3 diff

| Block | Frame | Now (375) |
|---|---|---|
| Header | crumb 14 **Medium / 17**, gap 8, chevron 14, « Ma boutique » **blue/600**; 8 → H1 32 **Bold / 38**; subline 14 / 21 **secondary** | ✓ crumb y 24, H1 y 49 (frame + 4). It was a 20 tall muted crumb, H1 24 Semi Bold / 32 (12 under the crumb), and a 6-under muted 20-line subline |
| Identity panel | r12, 1 px stroke inside pad 24 / 16 (content 311) | ✓ pad 23 / 15 + the border (was 16 / 16 + border, content 309) |
| « Réseaux sociaux » accordion | pad 20 / 16 stroke inside; the pill and the chevron **12 apart, start-packed** under the title | ✓ (the chevron sat at the far end, 1 px further in) |
| Footer | a **white r12 card**, 1 px border/subtle inside pad 20 / 16; « Voir ma boutique » **above** « Enregistrer les modifications » | ✓ a card at 343 × 148; it was a top rule with « Enregistrer » first. The order is the DOM order below 640, so the tab order follows. Both buttons stay 48 full width (frame: 40, hugging) |

## G3 kept (standing defaults)

- **The « Publiée » pill** under the H1 and the header « Voir ma boutique » link: `shops.is_published` does not exist (the form's header note). « Voir ma boutique » stays in the footer.
- **The six optional accordions** (type, livraison, horaires, adresse, paiement, catégories): their edit surface is `/ma-boutique/creer/configuration` (#129). This page keeps its link there and its « Réseaux sociaux » accordion.
- **Media block:** the frame puts the banner first, with the logo overlapping it. Ours stacks the shared `LogoField` then `BannerField` (reused unmodified with CreateShopForm).
- **Field rules and text:** the name counter stays « 15 / 100 » (frame « 15 / 60 »), and the helpers stay as built. The description field is the `Textarea` primitive's 120 (the frame's hugs its 7-line specimen).
- **No dirty indicator:** the form has no unsaved-changes tracking; the frame draws « Modifications non enregistrées ».
- **Page background:** the shell's grey page, as on every batch page.

## System pages — check-only at 375 (FR + AR)

K1 `/a-bientot`, K2 `/session-expiree`, K3 `/compte-suspendu`, K4 `/maintenance`, A9 404, A10 500 (the boundary rendered with a digest) and C2 `/categories/design-graphique-logo`:
- No horizontal overflow and no clipped text on any of the 14 screens.
- The K / A cards are 343 wide, pad 32, with a 1 px border (2 px danger on K3 and A10). The H1 is 22 / 27 and centred.
- Arabic titles and the « خطأ 404 » eyebrow read correctly.

**No real layout gap was found, so nothing was changed.** Listed (not fixed — shared components, or frame-sized):

| # | Where | Finding |
|---|---|---|
| 1 | K1, K2, K3, A9, A10 (`SystemStateScreen`) | The secondary action (« Retour à l'accueil », « Se déconnecter », « Parcourir la marketplace ») is **40 tall**, under the 44 px touch rule. The primary is 48. It's the frame's md size |
| 2 | C2 sub-category strip (`SubcategoryStrip`) | Chips are **35 tall**, in a horizontal scroller |
| 3 | C2 breadcrumb | « Marketplace › Services » links are **21 tall** (the same item as D1 / D2's crumbs, already logged in `docs/follow-ups/m375-e1-e2.md`) |
| 4 | C2 service cards (`FavoriteButton` icon variant) | The heart is a **20 × 20** button |
| 5 | C2 in AR | French service descriptions put their final period at the start of the line (« .Logos mémorables… »). It's the `dir="auto"` user-text item already queued after F4 |

## Questions

1. **G3 six accordions + « Publiée » pill:** keep this page identity-only with the link to `/ma-boutique/creer/configuration` (as built), or bring the six sections onto this page as the frame draws?
2. **G3 dirty indicator:** add « Modifications non enregistrées » tracking to the form (it exists on Paramètres), or keep it out?
3. **Touch targets 1–4:** give the K / A secondary action, the C2 chips, crumbs and the card heart a 44 px hit area (invisible, like G5's kebab — shared components, desktop pixels unchanged), in one small PR after the beta?

Controls (375, FR + AR):
- **G3:** crumb → `/tableau-de-bord-vendeur`; `/ma-boutique/creer/configuration`; `/boutique/{id}`. The footer and tab order run « Voir ma boutique » → « Enregistrer les modifications ». « Réseaux sociaux » opens. An empty name blocks the save with « Veuillez corriger les champs en rouge. » / « يرجى تصحيح الحقول باللون الأحمر. » (nothing sent).

## Founder answers (2026-11-05)

1 keep the identity-only page with the link to configuration · 2 no unsaved-changes line for now · 3 yes — one small PR for invisible
44 px hit areas (no pixel change) before the beta, when the founder says so.

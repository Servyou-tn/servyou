# F1 « Mes favoris » + E1 « Demander ce produit » — mobile 375 (`m375-f1-e1`)

Batch 2, PR-A8. E1 service was done in `m375-e1-e2`; its Q4 (the product breadcrumb) was already shipped, so this PR does the rest of the product page.
- **Frames:** `m375-f1-favoris` (375 × 1688) and `m375-e1-produit` (375 × 1572), dump + png each. No Figma MCP read was used.
- **Fixture:** one temporary route (`fixture-m375/[which]`: f1 / e1) with the frames' content (4 favourite products; the « Coussin brodé main » product at 45 + 7 TND, 3 in stock). It is deleted before the commit, and no live data was read or written. Shell offset: the frame's y + 4 (F1 + 8: its header starts at 16).
- **Desktop:** the full set, because E1's summary moves in the DOM. Stash-compared against `main`: **0 differing pixels in all 8 pairs** (F1 + E1 × 1440 / 1100 × FR / AR). F1 AR 1100 differed on the first `main` capture: the cards were caught mid BlurFade stagger. Two fresh captures came out at 0.
- **Overflow:** none at 375 in FR or AR.

## Diff

| Block | Frame | Now (375) |
|---|---|---|
| F1 header | « Mes favoris » 20 Semi Bold / 24 in a 56 header with a full-width rule; the tab bar 4 under it | ✓ title 20 / 24 (was 24 Bold / 32); a border/subtle rule full-bleed under it, the tabs 4 below. `marche/PageHeader` has one caller, /mes-favoris |
| F1 tabs → cards | the cards 20 under the track (bar 4 + list 16), 16 apart | ✓ 20 (was 24); cards 343 × 373, same as the frame (C1's card, unchanged) |
| E1 header | crumb; 8 → H1 32 **Bold / 38 text/primary**; the form 20 under | ✓ H1 y 48 (frame 49); it was 24 Semi Bold / 32 blue/800 with 24 gaps. Our H1 text is longer, so it takes 2 lines |
| E1 sections | **no cards**: « Coordonnées de livraison » then « Quantité » on the page, 32 apart; titles 20 Semi Bold / **26** | ✓ the two white cards dissolve below lg (border, fill, padding); fields span 343 (were 309) |
| E1 summary | **last**, under the quantity, 20 apart; r12, **1 px** border/subtle inside pad 24 / 16; title 14 Semi Bold primary, seller 14 secondary, 4 apart; rows **16 / 26** Regular, total 16 **Bold**; the COD note in a blue/50 r8 box, pad 12, 14 / 21 secondary; CTA 48 full width | ✓ all of it. The summary now comes after the form in the DOM, so reading and tab order follow the screen; `lg:max-xl:order-first` keeps it above the form from 1024 to 1279 and xl still places it in column 2. It was first, with a 2 px blue border, 14 rows and a 12 muted note |

## Kept (standing defaults)

- **E1 built text:** the H1 « Confirmer votre demande » (frame « Demander ce produit »), the crumb « ‹ Produits › Demander » (your E1 / E2 Q4 ruling; the frame has « Produit › Demander »), and no 💵 in the COD note.
- **E1 frame-only text, not built:** the subline under the H1 and the « Adresse * » sub-heading (both have no i18n key).
- **E1 « Ville »** stays a free-text field, by the earlier ruling (no reference list). The frame draws a select.
- **E1 primitives:** helper lines 20 (frame 21), the 120 textarea (frame 50), the 64 thumb (the frame's 24 is a hug slip).
- **F1 « 4 favoris » count pill** stays (built; the frame has none). F1 hearts: the fixture shows outlines because its product ids aren't real favourites; on a real account FavoriteButton loads the red filled state.
- **Page background:** the shell's grey page stays under the card-less sections, as on every batch page.

## Questions

1. **E1 H1:** use the frame's « Demander ce produit » (one line at 375) instead of « Confirmer votre demande » (two lines)?
2. **E1 subline:** add « Renseignez vos coordonnées de livraison. Vous payez à la réception. » under the H1 (new FR + AR text)?
3. **E1 « Adresse * » sub-heading:** add it above Rue / Quartier / Ville / Gouvernorat, now that the frame names it?
4. **F1 count pill:** keep « 4 favoris » beside the title, or drop it on mobile to match the frame?

Controls (375, FR + AR): E1 tab order fields → stepper → « Confirmer la demande »; an empty submit stays on the page with « Veuillez corriger les erreurs du formulaire » / « يرجى تصحيح أخطاء النموذج. » and 5 invalid fields (not submitted, so no order is written); links `/marche/produits`, `/produits/{id}` · F1 four tabs switch (products → 4 cards; empty Services / Boutiques / Freelances → their CTAs `/marche/services`, `/marche/produits?vue=boutiques`).

## Founder answers (2026-11-05)

1 keep « Confirmer votre demande » · 2 + 3 no new text before the beta — the subline and the « Adresse » sub-heading are logged for the
design pass (`docs/follow-ups/m375-f1-e1.md`) · 4 keep the « 4 favoris » counter.

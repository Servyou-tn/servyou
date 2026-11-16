# Mobile shell + contrast — low-contrast TEXT outside the badges (`fix/mobile-shell-contrast`, 2026-11-15)

## The palette's 500 steps are used as text colours in many places, under WCAG AA

- **What:** this PR fixed the badges (every StatusPill tone), the danger Button and the two « Annuler la commande » links.
  The same 500-step colours are still used as TEXT elsewhere, each under 4.5:1 for normal-size text:
  - `text-danger-500` on white, **3.91:1**: 94 uses in 62 files (form errors, inline warnings, links). The
    heart of `FavoriteButton` is an icon (needs 3:1) and is fine;
  - `src/components/produits/ProductDetail.tsx:204`: the low-stock line on desktop, `text-warning-500` on white,
    **2.15:1** (the 375 layout already uses `warning-700`);
  - `src/app/admin/_components/KpiTile.tsx` tones and `src/app/tableau-de-bord/_components/ActiviteRecente.tsx` chips:
    `success-500` on `success-100` **3.00**, `brand-indigo-500` on `brand-indigo-100` **3.85**;
  - `src/components/shared/StatTile.tsx`: the « up » delta in `success-500` on white, **3.30**.
  Icons in these colours (success ticks, warning glyphs) are graphics and only need 3:1: they are fine.
- **Why deferred:** outside the walk's S2 list (badges + the red cancel action), and fixing them one by one is the
  « per page » approach the founder ruled out. The token-level options both need a decision:
  1. darken `danger-500` / `warning-500` / `success-500` in the Figma variables (then `tokens:pull` + `tokens:build`):
     one change, but every red / amber / green fill and icon moves too;
  2. a codemod PR that moves TEXT uses to the 700 step (`text-danger-700` etc.) and leaves fills and icons alone, with
     a lint rule so the 500 step can't come back as a text colour.
- **Where it lives:** the files above; `src/styles/tokens.css` / `tokens/tokens.json` for option 1.
- **Trigger:** the founder's choice between options 1 and 2.

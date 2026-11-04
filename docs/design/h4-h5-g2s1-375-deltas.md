# H4 Tableau de bord + H5 Mes services + G2 step 1 at 375 — diff, kept, questions

Exports in this folder: `m375-h4-dashboard`, `m375-h5-services`, `m375-g2-step1` (1488:64715).

## Built (below lg / sm only)

| Screen | Change | File |
|---|---|---|
| H4 | Content gap 20 · « Créer un service » full width · tiles 2-up, gap 12, pad 20/16, value text/primary | `tableau-de-bord/page.tsx`, `_components/StatTile.tsx` |
| H4 | Ecosystem pad 20/16, cards pad 20/16, the dashed « ‹- - -› » connectors shown between the stacked cards (24 tall, row gap 12) | `tableau-de-bord/page.tsx` |
| H4 | Panels pad 24/16; the header link wraps under the title (gap 12) | `_components/Panel.tsx` |
| H4 | Mission rows: title on its own line (Semi Bold, not truncated), Budget / Publié under it, start-aligned | `_components/MissionRow.tsx` |
| H5 | Content gap 20 · tiles a 2 × 2 grid, gap 12 (AR labels are shorter and let 3 wrap onto one row) · the tab bar full width (`SegmentedControl` className, primitive unchanged) | `mes-services/page.tsx`, `_components/ServiceFiltersBar.tsx` |
| H5 | Service rows stacked at gap 20: thumb, title/description, status, price, orders, then « Voir » + ⋮ at the end; in AR the LTR price / orders values align under their labels (`rtl:text-end`) | `_components/ServiceRow.tsx` |
| G2 step 1 | The wizard header of step 2 (breadcrumb 14 Medium muted, H1 32 Bold, subtitle secondary), box pad 24/16, logo and its CTA side by side | `_components/CreateShopForm.tsx`, `_components/LogoField.tsx` |

## Kept as built (standing defaults)

H4: « Vues du profil » 0 and no « Votre parcours » (Ruling 1, vues is 0) · the frame's 2-col section with a 1 px left
column (Figma slip — Activité récente + Actions rapides stay, in our order) · the H1 wraps the 👋 (our Inter is wider) ·
the CTA stays 40. H5: the shared `StatTile` look (frame: small square icon) · the subtitle « Gérez vos services… » ·
« Voir » 36 · native sort select · the 24×48 thumb (hug slip; ours 48). G2 step 1: texts (« Choisir un logo », placeholders,
helpers) · the empty-banner placeholder (the frame draws a filled default banner) · the user-icon logo placeholder (frame: initials).

## Questions

1. H5 tiles: adopt the frame's tile (small square icon, label/value stacked tighter)? It is the shared `StatTile`.
2. G2 step 1: show the shop-name initials in the logo placeholder (frame « AS ») instead of the user icon?
3. H4 missions: a mission saved with both budget bounds equal prints « 800 – 800 TND » (`budgetValue`); show one figure?
4. Tablet (640–1023): per the « max-lg: » rule the H5 stacked rows, the H4 value colour and the G2 32 px header also apply on tablets (sparse rows at ~800 px). Narrow them to below sm?

Review fixes: G2 logo row wraps on a 320 screen (CTA column ≥ 160 px; beside the logo at 375) · H4 « Voir toutes les missions » gets a 44 px hit area below sm.

Controls: tsc · eslint · desktop 0 px (full set — one base-class change, the connectors `hidden … sm:flex` → `flex …`) ·
375 FR side by side · AR spot check (H4, H5) · H4 desktop: only the fixture's budget data and top-bar capture noise (two "after" shots differ there too); H5 + G2 step 1 8/8 identical.

## Founder answers (2026-11-04, after #316)

Q1 keep the shared `StatTile` · Q2 logo initials wait for the design pass · Q3 « 800 – 800 TND » logged as a follow-up
(`docs/follow-ups/mission-budget-equal-bounds.md`), not now · Q4 tablets keep the max-lg rule; tablet polish in the design pass.

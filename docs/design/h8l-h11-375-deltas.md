# H8 Mes engagements + H11 Mes propositions at 375 — diff, kept, questions

Exports in this folder: `m375-h8-engagements`, `m375-h11-propositions`.

## Built (below lg only — the rows' table layout starts at xl, so 1100 keeps its card layout)

| Screen | Change | File |
|---|---|---|
| H8 + H11 | Stat tiles 2 × 2, gap 12 (the page's container; shared `StatTile` unchanged) | both `page.tsx` |
| H8 row | Client · service · **status** · price · date · actions: the pill leaves the client line for the « statut » column (already after the service in the DOM); Budget / Délai stack | `_components/EngagementRow.tsx` |
| H11 row | Title · client · terms · **« Envoyée » + state** · sent date · actions: the pill leaves the title line; the « statut » column moves between terms and date (`contents` + flex `order`, no DOM move) | `_components/ProposalRow.tsx` |

Review notes: below lg a status without a pill leaves no empty gap (`max-lg:empty:hidden`); in H11 a screen reader meets the sent date before the status (DOM order), as the xl table already does — actions stay last, tab order unchanged.

## Kept as built (standing defaults)

Built texts (« Budget », « Délai souhaité », « Dès … », « Ma proposition », « Envoyée le », the « 6 engagements » caption) ·
H8's default tab « À traiter » (ruling) · the sort control's hug width (shared `SortSelect`, no className) · the WhatsApp
button only where the row's logic shows it.

## Questions

1. H11 in AR: the free-text timeframe (« 10 jours ») is `dir="auto"`, so Latin text aligns left in an Arabic row
   (pre-existing; more visible now the rows stack). A `<bdi>` fixes it but also moves AR desktop pixels — do it?
2. Sort: full width as drawn would need a `className` on the shared `SortSelect`. Add it?

Controls: tsc · eslint · desktop sentinel 1440 FR + AR (max-lg only; same frozen fixture data; only the known top-bar
capture-noise band differs) · 375 FR side by side · AR spot check.

## Founder answer (2026-11-05, after #318)

Standing defaults accepted: Q1 (AR timeframe alignment) and Q2 (full-width sort) stay as built.

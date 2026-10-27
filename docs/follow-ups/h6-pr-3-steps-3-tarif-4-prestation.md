# H6 PR-3 — steps 3 « Tarif » / 4 « Prestation » (`feat/h6-wizard-steps-3-4`, 2026-10-24)

Rulings D13–D22 in `docs/design/h6-pr3-deltas.md`.

## ✅ `price_unit` is stored but shown nowhere — « À partir de 800 TND » misleads for hourly/monthly — RESOLVED in H6 PR-4

- **Resolved 2026-10-24 in H6 PR-4 (`feat/h6-publish-step5`):** D2, the card (all 5 producers) and E1 print « 450 TND / mois » via
  `servicePriceLabel` (D32); `fixed` and NULL print no unit. The publish rules require a unit; the 21 legacy
  rows stay NULL (no backfill — the DB gate only checks rows leaving draft). H5 rows and order screens: see
  the H6 PR-4 section. History below.

- H6 writes `service_listings.price_unit` (migration `20261024195134`); D2, `ServiceListingCard`, E1 and
  the D4 cards still print a bare « À partir de {price} TND ». For « Par heure » / « Par mois » that reads
  as a total. The 21 pre-H6 listings are NULL (not stated).
- **Trigger:** PR-4 (publish) — show the unit wherever the price shows, and rule the publish requirement
  + backfill for the 21 (founder ruling D13 deferred both to PR-4).

## ✅ D2 labels `hybrid` « Hybride » / « مختلط »; the wizard writes it as « Sur site possible » — RESOLVED in H6 PR-4

- **Resolved 2026-10-24 in H6 PR-4 (`feat/h6-publish-step5`):** `serviceDetail.mode.hybrid` = « À distance ou sur site » / « عن بُعد أو في الموقع » (D32).

- Ruling D15 maps « Sur site possible » → `hybrid`. D2's `serviceDetail.mode.hybrid` says « Hybride », so a
  published H6 service would describe itself in a word the freelancer never chose. Drafts never reach D2.
- **Trigger:** PR-4 — align D2's wording (e.g. « À distance ou sur site ») with the founder.

## `delivery_time` is free text, so French « N jours » shows on Arabic pages

- `serviceDetail.deliveredIn` / `demander.recap.delai` interpolate the raw string: the 21 seeded rows read
  « التسليم خلال 7 jours » in AR, and an AR freelancer's text will show on FR pages. Ruling D14 kept free
  text because the frames draw it (459:18966, 654:53743).
- **Trigger:** a design for a structured délai (number + unit); then a migration with a backfill of the
  21 « N jours ».

## ✅ `validateServiceInput` must change before « Publier » can call it on an H6 draft — RESOLVED in H6 PR-4

- **Resolved 2026-10-24 in H6 PR-4 (`feat/h6-publish-step5`):** it now checks the G4 publish rules (docs/design/h6-pr4-deltas.md §2), counts code
  points, and is pinned against the step gates by a matrix test. History below.

- `deliveryTime` is required there but optional in H6 (D14); briefing cap 1000 vs H6's 500 (D17 — H6 is
  stricter, so no failure); it knows nothing of `price_unit`, `delivery_mode`, `short_description`,
  `subcategory_id`; its tags rule (`^[a-z0-9-]{2,30}$`, min 3) rejects H6 skills (pool ids like
  `next-js` pass, custom « Google Analytics 4 » and a 1–2 skill draft do not). Deliverables match (D16).
- **Trigger:** PR-4, before wiring « Publier mon service ».

## `marche.sidebar.coming_soon` is French in `ar.ts`

- Its AR value is « Bientôt disponible », so every remaining consumer (sidebar badges, PR-2's old footer
  tooltip) leaks French in AR. H6 now has its own `service.wizard.footer.coming_soon` (« قريباً »); the
  shared key was not touched (other consumers).
- **Trigger:** the next i18n pass over the sidebar.

## G6/G7 product price uses `iconEnd`, not the flush Price Input

- `ui/input.tsx` now has a `suffix` prop drawing Figma « Price Input » 202:15487 (flush surface-sunken
  segment). `EditProductForm` / `ProductForm` still put « TND » inside the field padding via `iconEnd`.
- **Trigger:** the next G6/G7 pass — migrate to `suffix` (visual change → VRT).

## A resumed H6 price comes back as « 1200.5 », not as typed

- The draft stores `numeric(10,2)`; the form reads it back with `String(Number(…))`, so « 1 200,50 »
  returns as « 1200.5 ». It parses either way; only the formatting differs. A price that didn't parse is
  saved NULL and comes back empty (ruling D18).
- **Trigger:** if the founder gate finds it jarring — format per language on read.

## Segmented / tab selection is invisible in Windows forced-colors mode

- H6's `SegmentedRadio` (and the shared `SegmentedControl`, the tab bars) mark the selected option by
  background + shadow + colour only; forced-colors mode drops all three, so only the 500 vs 400 weight
  remains. Found by the H6 PR-3 review. Fix once, everywhere: a `forced-colors:` outline (or a transparent
  border, which forced colors paints) on the selected option.
- **Trigger:** the next a11y pass over the segmented/tab primitives.

## H6 price parser accepts ASCII digits only

- `parsePrice` reads « 800 », not « ٨٠٠ » / « ٨٠٠٫٥ »; an Arabic keyboard that emits Arabic-Indic digits gets
  « montant invalide » and the draft saves NULL. Unlikely in Tunisia (Western digits are the norm).
- **Fix:** map U+0660–0669 / U+06F0–06F9 → 0–9 and U+066B (٫) → `.` before the regex; add tests.
- **Trigger:** a founder-gate or real-user report of it.

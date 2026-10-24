# H6 PR-3 — steps 3 « Tarif » and 4 « Prestation »: diff, proposed rulings, file list

Branch `feat/h6-wizard-steps-3-4` (worktree `servyou-wt-app`, cut from main `fa554fb`). Extends PR-2's
wizard (#182) — nothing in it is rebuilt. Measurements: `docs/design/h6-measurements.md` reads 3–5
(2026-10-24): `459:18966` step 3, `459:19023` step 4, `654:53743` délai specimen. `654:53794` not read.
**3 reads spent on this PR, 5 this month.**

**Rulings (founder + architect, 2026-10-24) — D13 + D14 close G5, D15 closes G6:**
- **D13** — 4 values **Fixe · Par heure · Par jour · Par mois**, stored `fixed | hour | day | month`.
  ⚑ **Founder-approved Figma deviation:** « Par mois » REPLACES the frame's « Par projet » (monthly packages
  for community managers, coaches, assistants). Nullable `price_unit`, CHECK on the 4 values, no default,
  the 21 live services stay NULL; backfill + publish requirement = PR-4. Migration finalised with these
  values (§4) — **architect reviews + applies before anything is built on it.**
- **D14** — free text ≤ 50, empty = NULL, as drawn. AR-shows-French délai logged (needs a design for a
  structured field).
- **D15** — « À distance » → `remote`, « Sur site possible » → `hybrid`; CHECK unchanged. D2 « Hybride »
  mismatch logged.
- **D16** recommended (3–8 lines × 5–150 chars; autosave keeps max 8) · **D17** 500 · **D18** `Input`
  `suffix` prop · **D19** page-local radio control, 2 × 2 at 375 · **D20** standard field labels ·
  **D21** yes, incl. the wizard's own « Bientôt disponible » key (AR « قريباً ») · **D22** Fixe + À distance
  pre-selected and saved from the first autosave.

The proposals below are kept as written for the record; where a ruling differs (D13's fourth value), the
ruling wins.

Legend: **MISSING** (nothing in code) · **DIFFERENT** (exists, differs from the frame) · **REUSE** (exists
and matches) · **🧠** (not in any read — needs a founder call).

## 0. Where the frames contradict the brief

1. **Délai is not a composed field.** Read 3 draws a plain optional F3 `Input` (« Ex: 5-7 jours »); read 5
   (the filled specimen) is the same Input holding « 5-7 jours ». No number + unit control exists in any
   read. → D14.
2. **« Ce qu'il faut me fournir » counter is 0/500**; the DB CHECK and `validateServiceInput` both allow
   1000. → D17.
3. **The PR-4 publish gate already disagrees with the frames.** `validateServiceInput` (the only planned
   caller is « Publier mon service ») requires a non-empty `deliveryTime` (frame: « Optionnel »), 3–8
   deliverables of 5–150 chars (frame: required, « une ligne par élément »), briefing ≤ 1000 (frame: 500).
   Each step-3/4 gate below either matches it or names the validator change PR-4 needs (§3).

## 1. Diff — frames vs code

Steps 3–4 don't exist; PR-2's shell, stepper, card and footer are REUSE.

| # | Element (node) | Status | Detail |
|---|---|---|---|
| 1 | Stepper on steps 3–4 (`461:19459`, `461:19490`) | REUSE | `ui/stepper.tsx` already draws done/active/upcoming exactly as reads 3–4 measure. |
| 2 | Card shell (`459:18992`, `459:19050`) | REUSE | Same `section` as steps 1–2 (border-subtle, radius-xl, p-6, gap-5). |
| 3 | Prix de départ — Price Input (`459:18994`, comp. `202:15487`) | MISSING | `Input` has no flush suffix: `iconEnd` sits inside the field's `px-4`. Frame: field ps 16, no end padding, suffix full-height surface-sunken + start border border-subtle, ps 12 / pe 14, « TND » Medium 14 muted. G6/G7 product price uses `iconEnd` (not flush). → D18. |
| 4 | Prix label « Prix de départ * » | DIFFERENT | Frame: SemiBold 14 secondary, plain asterisk, gap 6. F3 label: Medium 14/21 + danger asterisk, gap 8. → D20. |
| 5 | Prix helper | DIFFERENT | Frame text/secondary; F3 helper text-muted. → D20. |
| 6 | Unité segmented (`459:19004`) | MISSING | `ui/segmented-control.tsx` is `role="tablist"` (wrong for a form value), content-sized by founder ruling (2026-09-06, "do not restore flex-1"), same weight for both states, py-1.5. Frame: full width, 4 × flex-1, py 8, selected Medium 14 primary + shadow .06, others Regular 14 secondary. Option boxes h 100 = authoring artefact (one 21px line + py 8 = 37). → D19. |
| 7 | Unité label/helper | DIFFERENT | Frame label Medium 16/26 primary (like step 1's Compétences, ruled to F3 by D5). → D20. |
| 8 | Unité at 375 | 🧠 | No mobile frame. 4 × flex-1 in 343 ≈ 80px each; « Par heure » + px 16 ≈ 94 → overflow. → D19. |
| 9 | Délai (`22:512` Input) | REUSE | Plain F3 `Input`, optional, placeholder « Ex: 5-7 jours », helper « Optionnel — … ». Writes `delivery_time`. → D14. |
| 10 | « Ce qui est inclus » (`86:2299` Textarea) | REUSE | F3 `Textarea`, required, no counter, h 120. Writes `deliverables[]`. → D16. |
| 11 | Mode de prestation segmented (`459:19053`) | MISSING | Same composition as Unité, 2 options « À distance » (drawn selected on an empty card) / « Sur site possible ». DB CHECK has 3 values. → D15, D19. |
| 12 | « Ce qu'il faut me fournir (optionnel) » (`86:2299`) | REUSE | F3 `Textarea`, counter 0/500, not required. Writes `buyer_briefing`. → D17. |
| 13 | Footer on steps 3–4 | 🧠 | Not drawn. PR-2's footer carries over. → D21. |
| 14 | Error / focus states for steps 3–4 | 🧠 | Not drawn in the H6 boards. F3 `error` state as in PR-2 (D9/row 17). |

## 2. Proposed rulings (the brief's G5/G6) — each blocks part of the build

**D13 — Unité (new column).**
- Values = the frame's four, stored `price_unit text` + CHECK `fixed | hour | day | project` (migration
  below). text + CHECK follows `delivery_mode` / `status` / `seller_type`.
- **Nullable, no default, no backfill.** A default would silently make all 21 active listings « Fixe »; a
  "required unless draft" CHECK fails on those same 21 rows — and a `NOT VALID` one would still fire on every
  later UPDATE of them (H5 pause/publish toggles). Publish-required + the backfill decision → PR-4.
- **Question for you: are « Fixe » and « Par projet » different?** Both read as "one price for the job". If
  « Fixe » means a fixed package and « Par projet » means "quoted per project", the labels/helpers should
  say so; if they're the same, drop one before the CHECK locks the values in.
- Labels: FR as drawn; AR proposed « سعر ثابت · بالساعة · باليوم · للمشروع » (`REVIEW_AR_TRANSLATION`).
- No surface displays a unit today: « À partir de 800 TND » on D2/cards becomes misleading for an hourly
  service once real units exist → logged for PR-4 (§6).

**D14 — Délai: keep `delivery_time` free text, as drawn (recommended).**
- The frames draw free text with mixed units (« 5-7 jours, 2 semaines, 1 mois »). Store trimmed, empty →
  NULL, app cap **50** chars (no DB change), optional, no counter (none drawn).
- The real cost: `serviceDetail.deliveredIn` / `demander.recap.delai` interpolate the raw string, so French
  text already leaks into AR pages today (« التسليم خلال 7 jours » for the 21 seeded rows), and an AR
  freelancer's text will show on FR pages. That's the argument for structure — logged, not solved here.
- Alternative: structured (`delivery_min_days`/`delivery_max_days` int or amount + unit enum, rendered
  per language; backfill the 21 « N jours »). It needs a control no frame draws (number + unit), so it
  needs a design first.

**D15 — Mode de prestation: « À distance » → `remote`, « Sur site possible » → `hybrid`.**
- « Sur site possible » = remote *or* on-site, which is `hybrid`, not `onsite`. No CHECK change; H6 never
  writes `onsite` (still valid for a future editor).
- D2 labels `hybrid` « Hybride » / « مختلط » — wording mismatch with the wizard; drafts never reach D2,
  logged for PR-4.
- Default `remote` (drawn selected on an otherwise empty card). AR: « عن بُعد » (reuses D2's) /
  « ممكن في الموقع » (`REVIEW_AR_TRANSLATION`).

**D16 — « Ce qui est inclus » textarea ↔ `deliverables text[]`.**
- Form state keeps the **raw text** (re-rendering from an array would eat blank lines while typing). Split
  only at save: split on newlines, trim, drop empty lines, de-duplicate case-insensitively, keep order.
- Draft save keeps the **first 8** (DB CHECK `cardinality ≤ 8` would otherwise reject the whole autosave and
  lose the title/description edits with it); a 9th line shows the gate error and is not saved. Textarea
  `maxLength` 1500 = the Zod cap, so the payload can't be refused for length. Resume joins with `\n`.
- **Gate (recommended): match the existing publish rule — 3–8 lines, each 5–150 chars** (PR-F2.3,
  spec §11.1), so a wizard-passed draft doesn't fail at « Publier ». Note « Logo » (4 chars) fails it.
  Alternative: 1–8 lines, any length ≤ 150, and PR-4 relaxes `validateServiceInput` to match.
- The drawn placeholder lists four items on one line separated by « · », while the helper says one per line.
  Proposal: same four items, one per line (multi-line placeholder). Or keep it verbatim.

**D17 — Briefing cap: 500 as drawn (recommended).** Stricter than the DB (1000) and the validator
(1000), so nothing breaks; no migration. Alternative: 1000 to match the DB, the legacy edit form's
counter and E1.

**D18 — Price field.**
- Component: add an additive `suffix` prop to `ui/input.tsx` (flush segment, field drops its end padding
  only when `suffix` is set — 19 existing consumers unchanged, pinned by a test). Price Input `202:15487`
  is a design-system component, so it belongs in `ui/`, not route-local. G6/G7 not migrated (logged).
  Alternative: route-local `PriceField`.
- Value: `type="text" inputMode="decimal" dir="ltr"` (not `type=number`: FR users type « 800,50 »).
  Accept digits, optional spaces as thousands separators, one `,` or `.` decimal separator, ≤ 2 decimals.
  Gate: required, > 0, ≤ 99 999 999.99 (numeric(10,2)). Suffix « TND » / « د.ت » reuses
  `product.form.currency_suffix`.
- Draft: an unparseable or out-of-range price is saved as NULL — never a failed autosave. Cost: on resume,
  that field comes back empty (the typed text is not kept). The parser also accepts U+00A0/U+202F as
  thousands separators (what `fr-FR` `toLocaleString` emits), in case a formatted price is ever pasted.
- No placeholder (the frame draws a filled value « 800 », no placeholder).

**D19 — Unité and Mode controls: a route-local `SegmentedRadio`, not the shared `SegmentedControl`.**
- Native radios in a `fieldset` + `legend` (keyboard arrows and screen-reader semantics for free),
  visually as drawn: track surface-sunken p-1 gap-1 rounded-lg; options `flex-1` px-4 py-2 rounded-md;
  selected bg surface-base + `shadow-xs` (frame .06 — no token; `shadow-xs` is .04) + Medium 14 primary;
  others Regular 14 secondary. Height ≈ 45 (matches the 44 fields), not the artefact 100.
- 375: Unité becomes a 2 × 2 grid below `sm`; Mode stays 2 columns (« Sur site possible » fits).
- Route-local (2 consumers in one route); promote when H7 makes it a third.

**D20 — Labels/helpers on steps 3–4 follow the F3 field style (D5 precedent).** The frame uses three
label styles on one card (SemiBold 14 for Prix, Medium 16 primary for Unité/Mode, F3 for the rest).
Proposal: all F3 (Medium 14/21 secondary + danger asterisk; helper text-muted), as D5 ruled for Compétences.
Alternative: as drawn.

**D21 — Gates and navigation.**
- Step 3 « Suivant »: price valid (D18) + unit set + délai ≤ 50. Step 4 « Suivant »: disabled with
  « Bientôt disponible » (step 5 = PR-4, D6 pattern). Step 4's gate still drives the resume step: deliverables
  (D16) + mode set + briefing ≤ cap.
- The « Bientôt disponible » tooltip currently reuses `marche.sidebar.coming_soon`, whose **`ar.ts` value is
  French** — step 4 would fail the AR gate (zero French in AR). Proposal: a wizard-owned
  `service.wizard.footer.coming_soon` (FR « Bientôt disponible » / AR « قريباً », the phase-aware skill's
  locked AR) used by the footer; the sidebar key stays as is and is logged (§6).
- Step 2 « Suivant » becomes live (→ step 3). « Précédent » goes to the previous step (PR-2's goes to 1,
  correct only while there were 2 steps).
- Resume = first failing step, capped at 4 (`BUILT_STEPS` 2 → 4). The 2 drafts in the DB today have NULL
  unit/mode/price → they resume on step 3 at the latest.

**D22 — Defaults are real values (confirm).** `EMPTY_DRAFT` starts with `priceUnit: 'fixed'` and
`deliveryMode: 'remote'`, so what the control shows is what's stored, from the first autosave on (even
before the freelancer reaches step 3/4). Drafts are private, so nothing public changes. A NULL read back
(PR-2 drafts) maps to the same defaults. Alternative: no preselection (departs from the frames).

## 3. PR-4 dependencies (not built here)

`validateServiceInput` must change before « Publier » can call it on a wizard draft: `deliveryTime`
optional (D14); briefing cap per D17; deliverables per D16 if relaxed; add `price_unit`, `delivery_mode`,
`short_description`, `subcategory_id`; and `tags` — its `^[a-z0-9-]{2,30}$` rule + min 3 rejects custom
skills like « Google Analytics 4 » and the wizard's 1–5 skills (PR-2 D1/D9). Also: display units on D2 and
cards, D2's `hybrid` label, and the publish-required/backfill decision for `price_unit` (D13).

## 4. Migration (written, NOT applied — architect applies)

`db/migrations/20261024203000_service_listings_price_unit.sql` — adds `price_unit text` + CHECK
`service_listings_price_unit_check` (`fixed | hour | day | month`, per D13), column comment, rollback as a
trailing comment. Discovery (read-only,
2026-10-24): no `price_unit`/unit column anywhere in `public`; table-level grants only (no column grants to
extend); no view depends on `service_listings`; no trigger enumerates its columns; 21 active + 2 draft rows.
After apply: rename to the recorded version and add the README entry. Live `schema_migrations` already has
`20261023231434_public_profiles_revoke_writes` and `20261024191215_suspension_enforcement`, not yet on main
— so this is README **#62** if those land first (renumber at merge).

Draft README entry: « **N. <version>_service_listings_price_unit** — Adds `service_listings.price_unit`
(text + CHECK fixed | hour | day | month) for H6 step 3 « Unité » (Figma 459:18966; « Par mois »
replaces the frame's « Par projet » — founder ruling D13). Nullable, no default, no backfill: NULL = not
stated; the 21 pre-H6 listings keep NULL. Publish-required + backfill = PR-4. No RLS/grant change.
Rollback in the file. »

## 5. Exact file list

New
- `src/app/mes-services/creer/_components/StepTarif.tsx` — Prix (Input + suffix), Unité, Délai.
- `src/app/mes-services/creer/_components/StepPrestation.tsx` — Ce qui est inclus, Mode, briefing.
- `src/app/mes-services/creer/_components/SegmentedRadio.tsx` — D19.
- `db/migrations/20261024203000_service_listings_price_unit.sql` (written; renamed after apply).
- `docs/design/h6-pr3-deltas.md` (this file).

Edited
- `src/lib/freelance/service-draft.ts` — `ServiceWizardStep` 1–4, `BUILT_STEPS` 4, limits, `PRICE_UNITS`,
  `DraftForm` (+ `price`, `priceUnit`, `deliveryTime`, `deliverablesText`, `deliveryMode`, `buyerBriefing`),
  `EMPTY_DRAFT` defaults, `DraftInputSchema`, `parsePrice`, `deliverablesFromText`, `step3Errors`,
  `step4Errors`, `resumeStep`, `DraftRow` + `draftRowToForm`.
- `src/lib/freelance/service-draft-query.ts` — select list (+ 6 columns).
- `src/app/mes-services/creer/actions.ts` — writes the 6 columns (price parsed or NULL, deliverables
  normalised and capped, status still always 'draft', still no `validateServiceInput`).
- `src/app/mes-services/creer/_components/ServiceWizard.tsx` — steps 3–4, per-step gate on « Suivant »,
  « Précédent » → previous step.
- `src/app/mes-services/creer/_components/WizardFooter.tsx` — « Bientôt disponible » moves from step ≥ 2 to
  step ≥ 4, through the new `service.wizard.footer.coming_soon` key (D21).
- `src/app/mes-services/creer/page.tsx` — header comment only (steps 3–4 frames).
- `src/components/ui/input.tsx` — additive `suffix` prop (D18).
- `src/lib/i18n/fr.ts`, `src/lib/i18n/ar.ts` — `service.wizard.price|unit|delivery_time|deliverables|mode|briefing.*`
  + new `service.wizard.error.*` keys, FR + AR together.
- `db/migrations/README.md` — entry after apply. `docs/follow-ups.md` — §6.
- Tests (mock-only): `src/__tests__/service-draft.test.ts` (gates 3–4, `parsePrice`, deliverables split +
  cap, resume to 3/4, row ↔ form incl. NULL defaults), `service-draft-action.test.ts` (6 columns written,
  bad price → NULL, 9 lines → 8, status 'draft', mode values), `service-draft-query.test.ts` (select list),
  `service-wizard.test.tsx` (step 2 « Suivant » now advances — the PR-2 test pinning it disabled is
  updated; step 4 shows « Bientôt disponible »; « Précédent » goes back one), `input.test.tsx` or similar
  (suffix renders; no-suffix markup unchanged).

Not touched: `ui/segmented-control.tsx`, `validateServiceInput`, D2/E1/cards, H5, `search_vector`.

## 6. Out-of-scope findings → `docs/follow-ups.md`

1. No surface shows `price_unit` (D2, cards, E1) — PR-4 / D2 mirror.
2. D2 `hybrid` = « Hybride » vs wizard « Sur site possible ».
3. `delivery_time` interpolated raw → French « N jours » on AR pages (21 rows, pre-existing).
4. `marche.sidebar.coming_soon` is French in `ar.ts` (« Bientôt disponible ») — every remaining consumer
   (sidebar etc.) leaks French in AR. The wizard stops using it here (D21); the key itself is not changed.
5. G6/G7 product price uses `iconEnd`, not the flush Price Input — migrate once `suffix` exists.
6. `SegmentedControl` is `role="tablist"` in places that set a value (e.g. product status) — a11y review.

## 7. Proposed strings (FR from the frames; AR mine → `REVIEW_AR_TRANSLATION`)

| Key (`service.wizard.…`) | FR | AR |
|---|---|---|
| `price.label` | Prix de départ | السعر الابتدائي |
| `price.helper` | Le prix de départ. Le prix final se négocie avec le client sur WhatsApp. | السعر الذي تبدأ منه. يُتفاوض على السعر النهائي مع العميل عبر واتساب. |
| `unit.label` | Unité | وحدة التسعير |
| `unit.fixed / hour / day / month` | Fixe / Par heure / Par jour / Par mois (D13) | سعر ثابت / بالساعة / باليوم / بالشهر |
| `unit.helper` | Comment vous facturez ce service. | طريقة احتساب سعر هذه الخدمة. |
| `delivery_time.label` | Délai de réalisation estimé | المدة التقديرية للإنجاز |
| `delivery_time.placeholder` | Ex: 5-7 jours | مثال: 5-7 أيام |
| `delivery_time.helper` | Optionnel — précisez si votre prestation a un délai type (ex: 5-7 jours, 2 semaines, 1 mois) | اختياري — حدّد إن كانت لخدمتك مدة معتادة (مثال: 5-7 أيام، أسبوعان، شهر) |
| `deliverables.label` | Ce qui est inclus | ما تتضمنه الخدمة |
| `deliverables.placeholder` | Ex: Design UI iOS/Android · 3 écrans · 1 révision · Fichiers sources (see D16) | مثال: تصميم واجهات iOS/Android · 3 شاشات · تعديل واحد · الملفات المصدرية |
| `deliverables.helper` | Une ligne par élément. Ex: Design UI iOS/Android | عنصر واحد في كل سطر. مثال: تصميم واجهات iOS/Android |
| `mode.label` | Mode de prestation | طريقة تقديم الخدمة (D2's key) |
| `mode.remote / hybrid` | À distance / Sur site possible | عن بُعد / ممكن في الموقع |
| `mode.helper` | La plupart des services sont à distance. « Sur site possible » si vous pouvez vous déplacer chez le client. | معظم الخدمات تُقدَّم عن بُعد. اختر « ممكن في الموقع » إن كان بإمكانك التنقل إلى العميل. |
| `briefing.label` | Ce qu'il faut me fournir (optionnel) | ما يجب أن تزوّدني به (اختياري) |
| `briefing.placeholder` | Ex: votre logo, vos textes, vos couleurs de marque, des exemples que vous aimez | مثال: شعارك، نصوصك، ألوان علامتك، أمثلة تعجبك |
| `briefing.helper` | Ce que le client doit préparer pour que vous commenciez. Réduit les allers-retours. | ما يجب أن يحضّره العميل لتبدأ العمل. يقلّل الذهاب والإياب. |
| `footer.coming_soon` | Bientôt disponible | قريباً |
| `error.price_required` | Indiquez un prix de départ. | أدخل السعر الابتدائي. |
| `error.price_invalid` | Entrez un montant valide (ex: 800 ou 800,50). | أدخل مبلغًا صحيحًا (مثال: 800 أو 800,50). |
| `error.delivery_time_max` | {max} caractères maximum. | {max} حرفًا كحد أقصى. |
| `error.deliverables_min` | Ajoutez au moins {min} éléments, un par ligne. | أضف {min} عناصر على الأقل، عنصرًا في كل سطر. |
| `error.deliverables_max` | {max} éléments maximum. | {max} عناصر كحد أقصى. |
| `error.deliverable_length` | Chaque ligne doit faire entre {min} et {max} caractères. | يجب أن يتراوح طول كل سطر بين {min} و{max} حرفًا. |
| `error.briefing_max` | {max} caractères maximum. | {max} حرفًا كحد أقصى. |

Error strings are not in any frame (proposed). Existing AR wording for `error.*_max` keys is reused where it
already exists.

# H6 PR-2 — wizard shell + steps 1–2: diff, decisions, file list

Branch `feat/h6-wizard-steps-1-2` (worktree `servyou-wt-app`). Measurements:
`docs/design/h6-measurements.md` (reads 1–2 of the month, 2026-10-23).

**Rulings (founder + architect, 2026-10-23) — built as ruled:** D1 yes (skill ids; PR-4 maps ids → labels
on 4 public surfaces) · D2 yes (shared Stepper, H6 look everywhere, own widths) · D3 yes · D4 native
`<select>` · D5 extend TagInput, label like the card's other fields · D6–D11 yes as proposed ·
D12 next-devtools `get_errors` + agent-browser 0.39.2 for FR/AR × 1440/375. Migrations applied as
`20261023212930` and `20261023212933` (README #57, #58). No further Figma reads.
Built after the rulings, not in the proposal: label lookup prefers the active sector's pool (two
skills share « الكتابة الإعلانية »); the mobile footer puts the caption on its own line.

Legend: **MISSING** (nothing in code) · **DIFFERENT** (exists, differs from the frame) · **REUSE**
(exists and matches) · **🧠** (not in any read — needs a founder call, not a guess).

## 1. Diff — frame vs. what exists in code

`/mes-services/creer` does not exist, so the whole page is MISSING; the rows compare each measured
element to the component it would be built from.

| # | Element (node) | Status | Detail |
|---|---|---|---|
| 1 | Route + shell, « Mes services » active | REUSE | AppShell; `isActiveRoute` prefix-matches `/mes-services/*`. |
| 2 | Breadcrumb (`459:18747`) | MISSING | Route-local, G6 `PageIntro` pattern. Frame: both crumbs Medium 14 muted, chevron 14, gap 8, **neither is a link**. Proposal: first crumb links to `/mes-services` (G6 precedent; the route has no other way back except the sidebar). |
| 3 | H1 + subtitle (`459:18755/56`) | MISSING | `text-h1 text-text-primary` + `text-body-sm text-text-secondary`; header gap 8, header↔stepper 24. Known token drift: `text-h1` line-height is 40px (1.25), the frame's leading/h1 is 38 — already logged in `globals.css`, not fixed here. |
| 4 | HorizontalStepper (`459:18609`) | DIFFERENT | Two route-local copies (G2, H2), 5 importers. vs measured: upcoming circle `border border-strong` (1px) → frame **border-2 border-subtle + bg surface-base**; number `text-sm` 14 → **16**; active label `font-medium` → **SemiBold**; upcoming label `font-medium` → **Regular**; done label primary/medium → **Regular text-secondary**; done connector grey → **blue-600**; check 16 → **18**; connector fixed 40 → **flex-1** on the page frame; column 80 → **100**; `mt-[17px]` bracket → connector box `h-9 items-center`. See D2. |
| 5 | Stepper at 375 | 🧠 | No mobile frame; 5 × 100 = 500 > 343. See D3. |
| 6 | Card « Box 1 » (`459:18795`) | MISSING | `rounded-xl border border-border-subtle bg-surface-base p-6 flex-col gap-5`. Step 2's card is identical (`461:19437`). |
| 7 | Titre du service (F3 Input `22:512`) | REUSE + DIFFERENT | `Input` with `counter required maxLength=80`. Counter style differs: code `text-sm` 14 regular vs frame **Overline 12/17/500/0.48 uppercase** (`ui/textarea.tsx` already renders `text-caption font-medium`). Shared component with ≥4 consumers → not changed here; to be logged in `docs/follow-ups.md`. |
| 8 | Catégorie — SelectTrigger `searchable` (`72:1022`) | MISSING | No Select/combobox component in code. Precedent: native `<select>` + `SELECT_FIELD_BASE` (ProductForm, AnnonceForm). See D4. |
| 9 | Sous-catégorie — SelectTrigger disabled (`72:941`) | MISSING | Disabled = `bg-surface-subtle border-border-subtle`; enabled once a sector is chosen; options from the TS taxonomy. Frame's helperRow is a fixed 280 box centred — authoring artefact, built `text-start`. |
| 10 | Compétences combo (`459:18828`) | DIFFERENT | Closest is `ui/tag-input.tsx` (2 consumers: H2 CompetencesForm, /mes-annonces). Deltas: label frame **Medium 16/26 text-primary, plain « * »** vs TagInput 14/21 secondary + danger asterisk; frame has **no N/M counter**; field **px 12** vs 16; chip text **font-medium**, gap **4** vs 6; helper **text-secondary** vs muted; **suggestions MISSING** (TagInput is free-text only); chips must render a label for a stored id. See D5. |
| 11 | Skills suggestion list (`459:19238`) | 🧠 | Open state not in reads 1–2. `MENU_CONTENT`/`MENU_ITEM` (measured on the shipped ServicesFilterBar panel) are the reuse candidates. |
| 12 | Wizard footer (`459:18873`) | MISSING | H3's `StickyFooter` is route-local with other content. Build route-local: sticky bottom-0, full width of the main column (negative margins = main's `px-4 md:px-8`), `border-t border-border-subtle bg-surface-base px-8 py-5`, groups gap 12. Left: Button secondary « Enregistrer le brouillon » + caption « Enregistré automatiquement » body-sm muted. Right: Button primary « Suivant », **disabled by default** (Button's measured disabled = `bg-surface-sunken text-text-muted`, REUSE). No « Précédent » on step 1. |
| 13 | Footer on step 2 | 🧠 | Not drawn. Proposal: Button secondary « Précédent » left of « Suivant » in the nav group. |
| 14 | Autosave caption states | 🧠 | Only the « Enregistré automatiquement » text is drawn. Proposal: hidden before the first save; « Enregistrement… » while saving; « Enregistré automatiquement » after success; danger text on failure. |
| 15 | Description courte (`461:19438`, F3 Input) | REUSE | `Input` single-line, `counter required maxLength=160`, same counter-style delta as row 7. **Needs the new column** (migration 56). |
| 16 | Description détaillée (`461:19447`, F3 Textarea) | REUSE | `ui/textarea.tsx`, `counter required maxLength=2000`; min-h 120, py 12 px 16 already match; counter already Overline-like. Writes existing `description`. |
| 17 | Field errors | 🧠 | No error state drawn. Proposal: F3 Input/Textarea `error` state (measured component state) on blur, i18n KEYS in state, resolved at render. |

## 2. Decisions needed (each blocks part of the build)

**D1 — Skills have no taxonomy id.** `TaxonomySkill` is `{ labelFr, labelAr }` only; the brief's
"pool skills stored in tags as their taxonomy id" can't be done as written.
- Recommended: add an explicit `id` to every skill, generated once with the file's own slug rule.
  Checked: 168 entries → **148 distinct ids, 0 collisions**; the byte-identical recurring skills
  (TikTok ×3, LinkedIn ×3, Shopify, Canva, Figma, français, arabe, …) share one id.
- Tags resolve through a **global** id → label index (not the active sector's pool — a freelancer can
  change sector after picking skills). A typed skill that matches a pool label (case-insensitive,
  against `labelFr` AND `labelAr`, so an Arabic-mode freelancer typing « شعار » gets the `logo` id) is
  stored as that pool id; anything else is stored as typed (trimmed, deduped, ≤ 50 chars proposed).
- **PR-4 dependency:** `tags` is rendered raw on 4 public surfaces (`ServiceListingCard`,
  `ServiceDetail` D2, `ServiceRequestScreen` E1, `freelancer-detail`). Drafts never reach them, so
  PR-2 is safe; publishing (PR-4) must map ids → labels there first or slugs like `next-js` leak.
- Alternative: store `labelFr` as the value (no new field; AR needs the same lookup; a wording fix
  becomes a data migration).

**D2 — Stepper promotion changes G2 and H2's look.** Promoting = new `src/components/ui/stepper.tsx`,
5 imports repointed, 2 copies deleted. H6 is the only frame that measures all three states, and it
differs from the shipped copies in 7 visual ways plus 2 geometry ways (row 4).
- Recommended: one visual (H6's measured values) for all three wizards; geometry stays a prop
  (`compact` = G2/H2's 80 / 40 fixed, `stretch` = H6's 100 / flex-1), so G2 and H2 keep their width.
  G2 and H2 then change visibly (thicker lighter upcoming ring, 16px numbers, label weights, blue done
  connector) — needs your OK under « once built, stays built ».
- Alternative: a `variant` prop that keeps G2/H2 pixel-identical (two looks in one component).

**D3 — Mobile stepper (unmeasured).** Recommended below `sm`: circles only with stretch connectors
(5 × 36 fits 343), labels visually hidden but kept for screen readers, and one line under the row:
« Étape 1 sur 5 · Métier ». Alternative: horizontal scroll.

**D4 — « Catégorie » searchable.** Recommended: native `<select>` for both Catégorie (13 options) and
Sous-catégorie (≤ 9), styled to the measured trigger. No new component, native mobile picker, no Figma
read. Alternative: a new searchable combobox (listbox + filter input) — then read `653:53676` (+1).

**D5 — Skills combo.** Recommended: extend `ui/tag-input.tsx` additively (optional `suggestions`,
`getLabel`, `showCount` default true; existing consumers unchanged, pinned by a test), suggestion list
styled with `MENU_CONTENT`/`MENU_ITEM` (no read). For the label: follow the F3 field label (14/21
secondary + danger asterisk) for consistency with the other fields on the card, or the frame's
16/26 primary — your call. Alternative: route-local `SkillsCombobox`; or read `459:19238` (+1).

**D6 — Step 2 « Suivant » in PR-2** (step 3 ships in PR-3). Recommended: disabled with the « Bientôt
disponible » tooltip; resume capped at step 2. The route is linked from nowhere until PR-4.

**D7 — Resume rule (confirm the reading).** "Furthest step whose gate the saved data passes" read as:
land on the first step whose gate FAILS (step 1 passes → land on step 2), capped at the last built
step. Newest draft = `updated_at desc`; if a second draft exists, log it (`console.warn` with both ids,
no PII). A sector/subcategory deleted since the save (FK `SET NULL`) or a uuid not present in the TS
taxonomy (e.g. `maison`) reads as "not chosen" — the draft resumes on step 1, nothing throws.

**D8 — Autosave mechanics (confirm).** No row until the title is non-empty (`title` NOT NULL).
Debounced 1.5 s after the last edit + flushed on « Suivant » / « Précédent » / « Enregistrer le
brouillon »; one request in flight, latest state queued. The insert returns the id, kept client-side.
Updates are scoped `id = ? AND freelancer_profile_id = <server-derived> AND status = 'draft'` — the
wizard can never overwrite a live service. Drafts appear on no public or H5 surface, so no
`revalidatePath`.

**D9 — Gates (confirm).** Step 1: title 10–80, sector + subcategory chosen (pair valid in the TS
taxonomy), 1–5 skills. Step 2: short description 1–160, detailed 100–2000. Autosave's Zod accepts
partial data within the same caps (title ≤ 80, short ≤ 160, description ≤ 2000, ≤ 5 skills).

**D10 — Migration scope (confirm).** Migration 56 adds only `short_description` + its ≤ 160 CHECK.
A DB `description ≤ 2000` CHECK would validate today (max is 368) but belongs with the PR-4 publish
rules (G4/G8); not included. `search_vector` not touched (logged follow-up).

**D11 — DoD item 4 vs. "mock-only".** A default `npx vitest run` writes to production (9 live-DB
suites, including `h6-service-listings-hardening-rls.test.ts`). Proposal: I run the new and touched
mock suites by path plus the full jsdom/unit set that needs no credentials; the live suites are run by
the other agent (or skipped) — tell me which satisfies item 4.

## 3. Migrations (applied by the architect 2026-10-23, executable SQL MD5-verified)

- `db/migrations/20261023212930_service_listings_short_description.sql` — README entry 57.
- `db/migrations/20261023212933_categories_photographie_retouche_produit.sql` — README entry 58.
  AR label `تصوير المنتجات وتعديل الصور` is mine → `REVIEW_AR_TRANSLATION` in the TS file.

## 4. Exact file list

New
- `src/app/mes-services/creer/page.tsx` — Server Component; `requireFreelancer`; no-profile branch
  (H5's strings); loads the resumable draft; renders intro + wizard.
- `src/app/mes-services/creer/actions.ts` — `saveServiceDraftAction` (Zod, owner re-derived, slug →
  uuid lookup, insert/update `status='draft'`, bypasses `validateServiceInput` with the required
  comment).
- `src/app/mes-services/creer/_components/ServiceWizard.tsx` (client: state, step, autosave queue)
- `src/app/mes-services/creer/_components/StepMetier.tsx`, `StepDescription.tsx`, `WizardFooter.tsx`
  (client leaves), `PageIntro.tsx` (server).
- `src/lib/freelance/service-draft.ts` — pure: limits, Zod draft schema, step gates, resume step,
  row ↔ form mapping (shared by page, action, client).
- `src/lib/freelance/service-draft-query.ts` — server: newest draft + multi-draft log + uuid → slug.
- `src/components/ui/stepper.tsx` — promoted Stepper.
- Tests (mock-only, no live DB): `src/__tests__/service-draft.test.ts` (gates, resume step, schema,
  skill resolution), `service-draft-action.test.ts` (auth, ownership scoping, status always 'draft',
  bad slug pair, never calls `validateServiceInput`), `service-draft-query.test.ts` (multi-draft log,
  deleted/unknown category), `tag-input.test.tsx` (existing behaviour unchanged + suggestions),
  `service-categories-skills.test.ts` (ids unique per label, every tag id resolves).

Edited
- `src/lib/taxonomy/service-categories.ts` — skill `id`s, photography subcategory, header counts
  91 → 92, `getSkill`/global index helpers.
- `src/components/ui/tag-input.tsx` — additive props (D5).
- `src/app/ma-boutique/creer/_components/CreateShopForm.tsx`,
  `src/app/ma-boutique/creer/configuration/_components/ConfigurationForm.tsx`,
  `src/app/mon-profil-freelance/creer/_components/CreateFreelancerProfileForm.tsx`,
  `src/app/mon-profil-freelance/creer/competences/_components/CompetencesForm.tsx`,
  `src/app/mon-profil-freelance/creer/details/_components/DetailsForm.tsx` — import path only (+ the
  geometry prop).
- `src/lib/i18n/fr.ts`, `src/lib/i18n/ar.ts` — `service.wizard.*` keys (FR + AR together).
- `docs/design/taxonomy-services.md` (+ photography, 92), `docs/taxonomy/service-categories.md`
  (regenerated — the generator `scripts/taxonomy-gen-md.mjs` is untracked in the main checkout; run
  from a scratchpad copy pointed at this worktree), `docs/follow-ups.md`, `db/migrations/README.md`.

Deleted
- `src/app/ma-boutique/creer/_components/Stepper.tsx`, `src/app/mon-profil-freelance/creer/_components/Stepper.tsx`.

Not touched: H5 page and its 4 inert CTAs (PR-4), `validateServiceInput` and the 5 untranslated
`freelance.services.form.error.*` keys (first wired by PR-4's publish), `search_vector`.

## 5. Skill pools for founder review (on screen after the build)

`community-management` (15), `voix-off-doublage` (10), `personal-branding` (8), `coaching-meta-ads`
(10), `coaching-ecommerce` (10) — all `FOUNDER-UNREVIEWED`. Screenshot of the picker per sector comes
with the build report.

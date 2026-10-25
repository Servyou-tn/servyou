# H6 PR-4 — step 5 « Publication », publish, entry points: diff, proposals, file list

Branch `feat/h6-publish-step5` (worktree `servyou-wt-app`, cut from main `64a7934`). Extends PR-2/PR-3's
wizard — nothing in it is rebuilt. Measurements: `docs/design/h6-measurements.md` **read 6** (`459:19071`,
2026-10-24). **1 read spent on this PR, 6/20 this month.** DB discovery: live schema, read-only, 2026-10-24.
Migration: `db/migrations/20261024235900_service_listings_publish_gate.sql` — **written, not applied**.

Status: **RULED and BUILT (2026-10-24).** Founder + architect: D23–D35 = the recommendations below, with:
- D30a/D30b as written; migration applied by the architect as `20261024215730_service_listings_publish_gate`
  (README #64; #63 is another PR's). Verified after apply: draft `263c5565` → no problems; the 21 legacy rows
  fail the rules and stay pause/unpause-able.
- **D35: the gate draft to publish is `263c5565` « business plan » (Mehdi, the founder's gate test) — NOT
  `79c6e8d5`, which is left alone.** §10's ownership guess is superseded.
- Live-DB hardening suite: edited to pass with and without the gate; **not run** until the founder says go.
- Resume: one info line at the top of the wizard (« Vous reprenez votre brouillon « … » »); no « start over »
  flow (logged).

Build notes — where the build departs from the text below:
- **Counters stay UTF-16 (D28).** `ui/input.tsx` / `ui/textarea.tsx` count `.length`, matching the native
  `maxLength` they sit beside; switching only the counter would show « 40/80 » with typing already blocked.
  Code points are used where app ⇄ DB must agree — every minimum and maximum in the step gates, the validator
  and the SQL. Shared components untouched.
- **« Publier » keeps its label while publishing** (Button `loading`: spinner + aria-busy), so no
  « Publication… » key.
- **PGRST201 (pre-existing HIGH on main) blocks the public-page part of the gate** — D2 404s, H5 errors, the
  grids are empty in production today. Not fixed here; verified with a temporary local qualification, restored
  by hash. See `docs/follow-ups.md` « H6 PR-4 ».

Legend: **MISSING** (nothing in code) · **DIFFERENT** (exists, differs from the frame) · **REUSE** · **🧠**
(not in any read — founder call).

## 0. Where the frame or the brief contradicts something

1. **The brief's DB gate contradicts itself.** It gates « draft/hidden → active » *and* wants legacy rows to
   keep pause/unpause — but unpause **is** hidden → active, and all 21 legacy rows fail the rules (§3). → D30a.
2. **The récap has no row for step 2.** The brief wants « Modifier » links to steps 1–4; the frame's six rows
   jump to 1, 1, 1, 3, 3, 4. → D23.
3. **Prix row draws « 800 TND · Par projet »** — D13 replaced « Par projet » with « Par mois ». The row
   shows the stored unit's D13 label.
4. **No gallery.** The pre-build discovery summary lists a « composed gallery » on Box 5; read 6 has none
   (per-service gallery retired → portfolio). That summary is superseded on this point too.
5. **Footer differs from code:** frame = [Enregistrer le brouillon] … [Publier mon service], **no
   « Précédent », no autosave caption**; code has both since PR-2 (D8/D21). → D27.
6. **No success state anywhere** (no H6 success frame; H2 has one, `468:20536`). → D33.
7. **The D↔H gap is narrower than the brief lists.** D2 already shows « inclus », mode and délai; E1 already
   shows the client brief (`ServiceRequestForm.tsx:127`). Real gaps: short description, unit, subcategory,
   skill labels, the `hybrid` wording (§6).

## 1. Diff — read 6 vs code

| # | Element (node) | Status | Detail |
|---|---|---|---|
| 1 | Stepper, steps 1–4 done + 5 active (`461:19522`) | REUSE | `ui/stepper.tsx` draws it; only `ServiceWizardStep` (1–4) and `BUILT_STEPS` (4) change to 5. |
| 2 | Card shell (`459:19099`) | REUSE | Same `section` as steps 1–4. |
| 3 | Récap block (`459:19118`) | MISSING | surface-subtle, border-subtle, radius-lg, px-4 py-1; rows py-2 + border-b (not the last). |
| 4 | Récap row (×6) | MISSING | label body-sm muted · gap-3 · value Medium 14 primary · « Modifier » body-sm blue-600 at the end. |
| 5 | Row values | MISSING | Titre; « {secteur} › {sous-catégorie} » (taxonomy labels per lang); skills via `skillLabel` joined « · »; « {prix} TND · {unité} »; délai; mode label (`service.wizard.mode.*`). |
| 6 | No row for step 2 / inclus / brief | 🧠 | → D23. |
| 7 | Empty Délai | 🧠 | Optional field, empty row not drawn. → D24. |
| 8 | `whitespace-nowrap` + `overflow-clip` rows | 🧠 | An 80-char title cannot fit 343 at 375. → D25. |
| 9 | « Modifier » as plain text | DIFFERENT (a11y) | Drawn as text; it is an in-page action → `<button>` styled as drawn, accessible name per row (« Modifier — Titre »), ≥ 44 px hit area on mobile (touch-target rule). |
| 10 | Footer « Publier mon service » primary | MISSING | Replaces « Suivant » on step 5; the « Bientôt disponible » branch goes away. → D27. |
| 11 | Footer: no « Précédent », no caption | DIFFERENT | → D27. |
| 12 | Publishing / error / success states | 🧠 | Not drawn. → D27, D33. |
| 13 | Mobile 375, AR | 🧠 | No frames. AR: the skills row (Latin names joined by « · ») and « 800 TND » hit both known bidi traps (`reference_ar_latin_adjacency_bidi`, `reference_rtl_numeric_run_reversal`) — **screenshot-verify**; isolate each value in `<bdi>`/`dir="auto"` if it reorders. |

## 2. Item 2 — `validateServiceInput` → the locked G4 publish rules

Today it has **no production caller** (only `service-validation.test.ts`); PR-4's publish action is the
first. Changes (each pinned by a test):

| Rule | Today | PR-4 |
|---|---|---|
| title | 1–100 | **10–80** (+ `title_too_short`) |
| category | required (uuid) | required |
| subcategory | — | **required** (new field) |
| tags | 3–5, `^[a-z0-9-]{2,30}$`, **lower-cased** | **1–5**, each trimmed **1–50**, any text (pool id or custom label), **case kept**, CI de-dupe |
| short description | — | **1–160** (new field) |
| description | 1–2000 | **100–2000** |
| price | ≥ 0, `Number()` | **> 0**, ≤ 99 999 999.99 (the wizard requires > 0; the publish path passes the DB numeric, so « 800,50 » parsing is moot there) |
| unit | — | **required**, `fixed|hour|day|month` (new) |
| délai | **required** | **optional**, ≤ 50 |
| deliverables | 3–8 × 5–150 | unchanged |
| mode | — | **required**, `remote|onsite|hybrid` (new) |
| brief | optional ≤ 1000 | unchanged (H6's 500 is stricter — D28) |
| revisions, status | — | unchanged (`'draft'` still rejected) |
| length unit | UTF-16 `.length` | **code points**, to match the DB's `char_length` — via ONE shared helper used by the validator **and** the wizard's step gates and counters (D28) |

**i18n debt this PR owns:** `docs/follow-ups.md` marks the 4 untranslated `freelance.services.form.error.*`
keys (`required`, `title_too_long`, `description_too_long`, `price_invalid`) as **blocking for the first
PR that wires `validateServiceInput`** — this one. PR-4 translates them, adds keys for the new rules, and
rewrites the tag messages (« Au moins 3 tags requis », « Lettres minuscules… » describe the old rule).

**Publish flow (D29, recommended):** « Publier » awaits the autosave chain (timer cancelled), then calls
`publishServiceDraftAction({ draftId })`, which **re-reads the draft server-side** (id + owner +
`status='draft'`), maps the row → `ServiceInput`, runs `validateServiceInput`, and writes the validated
values + `status:'active'` with `.eq('status','draft')` (two tabs can't both publish; a published row can't
be re-published). Validator failures return the failing **fields**, which the wizard maps to récap rows
(flagged) and steps (« Modifier » lands on a step whose own gate shows the per-field message) — the
validator's own keys are never the only thing a freelancer sees. A DB refusal (hint
`service_publish_requirements`) maps to the same « incomplete » message; anything else → « publication
failed ». Then `revalidateServiceSurfaces` (§8).
Alternative: one action that takes the whole form, saves and publishes in one UPDATE (one round trip, but
duplicates the autosave's write path).

**Single source check:** the wizard's step gates (`step1Errors`…`step4Errors`) and the validator encode the
same rules twice. PR-4 adds a test that a fixture matrix passing all four gates passes the validator and
vice versa, so they can't drift silently — **including an astral-character fixture** (emoji count 2 UTF-16
units, 1 code point: « 😀 × 5 » passes a UTF-16 title minimum of 10 but fails the DB's). That is why D28 moves
the step gates and the « n/80 » counters to the same code-point helper as the validator; switching only the
validator would let step 1 pass and the récap then flag a row whose step shows no error. The DB function (§3)
is the third copy — its comment says so. (Inputs' native `maxLength` counts UTF-16 units — stricter at the
top end only, never a mismatch at a minimum.)

## 3. Item 3 — G8 DB publish gate (migration written, not applied)

**Discovery (live, read-only, 2026-10-24):**
- 23 rows: 21 `active`, 2 `draft`, 0 `hidden`. The rules, dry-run as a SELECT: **all 21 active rows fail
  (4–7 rules each — none has `short_description` or `price_unit`; 19 have a description < 100; 19 have no
  deliverables; 8 have no tags; 20 have no subcategory); both drafts pass every rule.**
- Existing: `service_listings_price_required_unless_draft` CHECK; `status` default **`'active'`**; BEFORE
  triggers `service_listings_set_updated_at`, `trg_enforce_admin_moderation_lock_…`,
  `trg_enforce_service_category_kind`, `trg_enforce_service_subcategory_parent` (errcode **23514**);
  statement-level `trg_enforce_active_user`; AFTER `trg_sync_freelancer_is_published`.
- `toggleServiceStatusAction` (`src/app/actions/services.ts:74`) updates `status` **without a current-status
  filter** → today a direct call can flip a half-filled draft to `active` (or to `hidden`). This is the hole
  the gate closes.
- `admin_hide_content` already skips drafts (`status <> 'draft'`); `admin_unhide_content` sets `active` on a
  moderated (therefore non-draft) row. No admin path leaves draft.
- `sync_freelancer_is_published` only writes `freelancer_profiles.is_published`; nothing on
  `freelancer_profiles` raises on it → a first publish flips the freelancer public (D4) with no new blocker.
- Owner RLS: owner INSERT/UPDATE on any column (rows, not columns).

**Proposal (in the file):** a BEFORE INSERT OR UPDATE row trigger `trg_service_publish_requirements` +
pure helper `service_listing_publish_problems(row)` (returns failing column names).
- `status = 'draft'` → never fires.
- **INSERT non-draft, or leaving draft** (draft → active *or* hidden) → the **whole row** must pass.
- **non-draft → non-draft UPDATE** → only the **columns this UPDATE changed** must pass. Pause/unpause and
  admin unhide change no rule column, so the 21 legacy rows keep working; a published H6 service can't be
  emptied later; a legacy row can't be rewritten into a new incomplete service under its old id.
- Skipped when `auth.uid()` is null (service role / SQL editor / migrations).
- Raises 23514 with `hint = 'service_publish_requirements'`, `detail` = failing columns.
- Named to sort after the `trg_enforce_*` triggers, so their specific errors still report first.

**D30a — gate model.** (A) as above — recommended. (B) whole-row exemption for legacy rows (simpler; but a
legacy row becomes a wildcard its owner can refill with anything). (C) the brief's literal « draft/hidden →
active » (breaks unpause of any paused legacy row; and blanking a field on an active row isn't caught).

**D30b — service role.** Exempt (recommended): 9 live-DB suites + `scripts/rls-smoke.mjs` insert minimal
active listings as service role (`{title, starting_price_tnd}`, status defaulting to active). Strict-for-all
means rewriting all of them.

**Test impact once applied:** one live-DB suite breaks — `src/__tests__/h6-service-listings-hardening-rls.test.ts`
inserts incomplete `active`/`hidden` fixtures **through the owner's JWT** (lines 193, 196, 217), and its G2
cases expect the price CHECK's message on non-draft inserts (now pre-empted by the gate) and publish a
title+price-only draft (now refused). The architect applies to production **before** PR-4 merges, so in
between, any credentialed run of that suite (main, open PRs #177/#178/#183) would go red. PR-4's rewrite is
therefore **valid with and without the gate**: complete-row fixtures for the three owner-JWT inserts; G2 « no
price » cases assert `code === '23514'` and accept either message (price CHECK or gate); « publishes once
priced » uses a draft complete except for its price. Apply order then stops mattering.
**Question:** the brief says « mock tests only » — this is an edit to an existing live-DB suite (not a new
one), needed so it doesn't break. OK to edit it? Either way it is **not run without your go-ahead**
(`reference_vitest_unit_run_hits_live_db`). All other suites write as service role, or only delete as owner.

**Edges, documented in the file:** an authenticated admin deleting a category whose `ON DELETE SET NULL`
would blank a *complete* non-draft listing's category is refused (taxonomy changes run as service role —
unaffected). Lengths are `char_length` (code points) → the validator counts code points (D28).

**Logged, not built:** non-draft → `draft` is still allowed by the DB (unreachable from the UI; harmless —
leaving draft again is gated). README entry after apply (#63 if #60/#61 land first).

## 4. Item 4 — skill ids → labels on the 4 public pages

Print sites: D2 `ServiceDetail.tsx:170-178`, E1 `ServiceRequestScreen.tsx:50`, and `ServiceListingCard.tsx:56`
(fed by `/marche/services` via `search-marketplace.ts:295` and D4 via `freelancer-detail.ts:185`).

**D31 (recommended):**
- D2 and E1 are Server Components with `lang` → `skillLabel(tag, lang)` at render.
- `ServiceListingCard` is `'use client'`: importing `skillLabel` would pull the **46 KB taxonomy** (+ zod via
  `service-draft.ts`) into every listing grid's bundle. Instead the two producers resolve each tag to a
  `{ fr, ar }` pair server-side and the card picks by `lang` — the convention its category label already
  follows (`search-marketplace.ts:104`, « Both names travel; the consumer picks by lang »). The FR⇄AR toggle
  (`router.refresh`) re-renders either way.
- Custom skills: same text in both slots.

**Legacy data (39 tags on 13 of the 21 rows):** 1 is a pool id (`logo`) → localized; **23 match a pool
label by text** (« Google Ads », « SEO », « Figma »…) but are stored as text → shown as typed, i.e. French
in AR; 15 are custom → as typed. The brief's rule (ids → labels, the rest raw) is what's proposed;
converting the 24 matchable legacy tags to ids is a data backfill → logged, not here.

## 5. Item 6 — the four « Créer un service » CTAs → `/mes-services/creer`

| Site | Today |
|---|---|
| H5 header `src/app/mes-services/page.tsx:192` | disabled `<button>`, title = sidebar coming-soon |
| H5 empty state `src/app/mes-services/page.tsx:146` | inert `<span>` |
| H4 header `src/app/tableau-de-bord/page.tsx:87` | disabled `<button>` |
| H4 quick action `src/app/tableau-de-bord/page.tsx:60` | `href: null` → inert chip |

All become `Link`s with the live primary style (H5 keeps its baked-in « + », H4 its `Plus` icon); the
« INERT » comments go. No decision — but note the interaction: once live, « Créer un service » **silently
resumes** an abandoned draft (founder ruling D7). That is the ruling working as intended; flagging it
because the button label says « create ».

## 6. Item 5 — D↔H mirror: what the wizard edits vs what buyers see

| Field (wizard) | D2 `/services/[id]` | Card (`/marche/services`, D4, home, favoris, related) | E1 `/demander/[id]` | PR-4 |
|---|---|---|---|---|
| Titre | ✓ | ✓ | ✓ | — |
| Secteur | breadcrumb, **`name_fr` only** | chip fallback (localized) | chip, **`name_fr` only** | log (AR shows French) |
| Sous-catégorie | ✗ | ✗ | ✗ | **log** — no frame places it (D2 breadcrumb is the natural slot → design) |
| Compétences | raw ids | raw ids | raw ids | **SHOW** labels (§4, blocking) |
| Description courte | ✗ | ✗ (card shows `description`, 3-line clamp) | ✗ | **SHOW on the card**, fallback `description` for the 21 — the step-2 helper promises « le résumé qui apparaît dans les résultats de recherche ». Not on D2 (no slot). Search doesn't index it (existing follow-up). |
| Description détaillée | ✓ | ✓ (until short desc) | ✗ | — |
| Prix | ✓ (`toLocaleString` + hard-coded « TND », also in AR) | ✓ (`{price} TND` / `د.ت`) | ✓ (hard-coded « TND ») | — |
| Unité | ✗ | ✗ | ✗ | **SHOW** — « 450 TND / mois »; `fixed` and NULL (the 21) → no suffix (D32). D2 and E1 move to localized keys while touching the line (fixes « TND » in AR there). |
| Délai | ✓ « Livré en … » | ✗ (not in the v3.7 card frame) | ✓ | — (AR shows French délai: existing follow-up) |
| Ce qui est inclus | ✓ section | ✗ | ✗ | — |
| Mode | ✓ but `hybrid` = « Hybride » | ✗ | ✗ | **SHOW the wizard's meaning:** `serviceDetail.mode.hybrid` « À distance ou sur site » / « عن بُعد أو في الموقع » (D32) |
| Ce qu'il faut me fournir | ✗ | ✗ | ✓ (form guidance) | — (E1 is where it's used) |

Also logged: H5's own rows and the order screens print a price without a unit (orders snapshot the price,
not the unit — a snapshot column would be its own migration).

## 7. Step 5 behaviour (item 1)

- `ServiceWizardStep` 1–5, `BUILT_STEPS` 5. `resumeStep` caps at 5, so a complete draft (both live drafts
  today) resumes **on the récap**.
- « Publier mon service » is enabled when steps 1–4 pass; while in flight it reads « Publication… » and is
  disabled; autosave is stopped for good once publish starts (no stray save after it → no « draft_gone »).
- « Modifier » → `goTo(n)` (focus moves to that step's heading, as for « Précédent »). D26 decides how they
  come back.

## 8. Item 7 — after publish

- **Landing (D33):** (S1, recommended) `/mes-services/creer/succes?service=<id>` — the H2/G2 pattern (every
  creation flow ends on a success screen), composed from H2's measured success frame `468:20536`: success
  circle + check, « Votre service est en ligne ! », one line, « Voir mon service » → `/services/<id>` and
  « Aller à mes services » → `/mes-services`. Guard: the id must be the caller's own **active** service,
  else redirect to `/mes-services`. (S2) H5 with a one-time banner (no banner component drawn). (S3) D2
  directly (no confirmation, no path back to H5 but the sidebar). No H6 success frame exists for any of them.
- **`router.replace`, not push** — otherwise Back restores the cached wizard holding a dead `draftId` and
  the next keystroke shows « brouillon introuvable ».
- **Revalidation:** `revalidateServiceSurfaces` (`/mes-services`, `/tableau-de-bord`, `/marche/services`,
  `/freelance/<id>`) is a non-exported local inside the `'use server'` module `app/actions/services.ts`, so it
  moves to a plain shared module (`src/lib/freelance/service-revalidate.ts`) used by both action files. A
  `revalidatePath` from a server action also clears the client router cache, so `/mes-services/creer` comes
  back clean.
- **Resume once no draft is left:** `getResumableDraft` returns null → empty wizard on step 1 (no change
  needed). If a second draft exists (two-tab race, already logged by `getResumableDraft`), the next visit
  resumes that one.
- **First publish** flips `freelancer_profiles.is_published` → the freelancer's D4 page goes public (already
  revalidated).
- **D34 — draft cap** (follow-up « H6 drafts: nothing limits how many » is tagged « PR-4 » but is not in
  this brief): build (partial unique index « one draft per freelancer » + autosave handling of the 23505), or
  keep logged. Recommendation: keep logged — the live data has 2 drafts on 2 freelancers, the index is easy
  later, and it changes the autosave's insert path.

## 9. Decisions (recommended first)

| # | Decision | Recommended | Alternatives |
|---|---|---|---|
| D23 | Récap rows | Drawn 6 **+ « Description » (short description, → step 2)** so every step 1–4 has a « Modifier » | as drawn (6); full récap (+ détaillée excerpt, inclus count, brief) |
| D24 | Empty Délai | keep the row, value « Non précisé » (muted), « Modifier » → 3 | hide the row |
| D25 | Rows at 375 / long values | values wrap (no nowrap/clip); `sm`+: label · value (flex-1) · Modifier; below `sm`: label + Modifier on one line, value under it | truncate with ellipsis |
| D26 | After « Modifier » | normal linear flow (« Suivant » walks 1→5; all steps already pass) | a « Retour au récapitulatif » shortcut on the edited step (not drawn) |
| D27 | Step-5 footer | keep the caption + « Précédent » (D8/D21 carry-over); « Suivant » → primary « Publier mon service » | exactly as drawn (no Précédent, no caption on step 5) |
| D28 | Validator details | price > 0; brief cap stays 1000 (H6 500 stricter); lengths in code points via one helper shared by validator + step gates + counters | brief 500 everywhere; keep UTF-16 lengths everywhere (rare emoji edge: app passes, DB refuses at publish) |
| D29 | Publish flow | flush, then publish **from the stored row** (§2) | one action with the whole form |
| D30a | DB gate model | per-changed-column on non-draft rows (§3 A) | whole-row legacy exemption (B); brief literal (C) |
| D30b | Service role | exempt (`auth.uid()` null) | strict for all + rewrite 10 fixtures |
| D31 | Skill labels | server components `skillLabel`; card gets `{fr, ar}` pairs from producers | import the taxonomy into the client card |
| D32 | Mirror | SHOW labels + unit (D2, card, E1) + short desc on card + D2 `hybrid` wording; LOG the rest (§6) | — (per row) |
| D33 | Landing after publish | `/mes-services/creer/succes` (H2 pattern) | H5 + banner; D2 |
| D34 | Draft cap | stay logged | build now |
| D35 | Gate on prod data | see §10 | — |

## 10. Founder gate — production data risk (D35)

Vercel previews use the **production** database. Both live drafts pass every rule, so both resume on the
récap once PR-4 ships:
- `79c6e8d5…` « Je crée votre boutique en ligne clé en m… » on freelancer profile `f351f4f0…` — the gate draft
  (PR-2/3 test values). That profile already has 9 active listings, so publishing it doesn't change its
  `is_published`.
- `263c5565…` « business plan » on `fea85733…` (1 active listing), last edited 2026-10-24 21:21 UTC — **not
  created by this work; owner unknown to me. Not touched** unless you say whose it is.

Publishing during the visual gate makes a real public service (`/marche/services`, D2, the freelancer's D4).
Proposal: publish **only `79c6e8d5`**, check D2 / card / E1 / H5 / success, then **pause it from H5** (or delete
it — zero orders, so H5's delete is allowed). Your call before the gate.

## 11. Exact file list

New
- `db/migrations/20261024235900_service_listings_publish_gate.sql` (written; renamed after apply).
- `docs/design/h6-pr4-deltas.md` (this file).
- `src/app/mes-services/creer/_components/StepPublication.tsx` — récap rows + « Modifier ».
- `src/app/mes-services/creer/succes/page.tsx` — if D33 = S1.
- `src/lib/freelance/service-revalidate.ts` — `revalidateServiceSurfaces`, moved out of the `'use server'` file.
- `src/__tests__/service-publish-action.test.ts` — mocked Supabase: owner/draft re-read, validator failure →
  fields, `.eq('status','draft')`, DB hint mapping, revalidation called, never touches a non-draft.

Edited
- `src/lib/freelance/service-validation.ts` — §2.
- `src/lib/freelance/service-draft.ts` — steps 1–5, `BUILT_STEPS` 5, `resumeStep`, row → `ServiceInput`
  mapper, `{fr, ar}` skill-pair helper next to `skillLabel`, the shared code-point length helper (D28) used by
  the gates, the validator and the step-1/2 counters (`StepMetier.tsx`, `StepDescription.tsx`, `StepPrestation.tsx`).
- `src/app/mes-services/creer/actions.ts` — `publishServiceDraftAction`.
- `src/app/mes-services/creer/_components/ServiceWizard.tsx` — step 5, publish, stop autosave, `router.replace`.
- `src/app/mes-services/creer/_components/WizardFooter.tsx` — « Publier mon service » on step 5; coming-soon
  branch removed.
- `src/app/mes-services/creer/page.tsx` — header comment (step-5 frame; CTAs now live).
- `src/app/actions/services.ts` — imports the moved revalidation helper (no behaviour change).
- `src/app/mes-services/page.tsx`, `src/app/tableau-de-bord/page.tsx` — the 4 CTAs (+ comments).
- `src/components/marche/ServiceDetail.tsx`, `src/lib/marche/service-detail.ts` — labels, unit (+ `price_unit`
  in select; related producer gets `short_description`, `price_unit`).
- `src/components/listings/ServiceListingCard.tsx` — tag pairs, short-desc fallback, unit.
- `src/lib/search/search-marketplace.ts`, `src/lib/marche/freelancer-detail.ts` — tag pairs +
  `short_description`, `price_unit`.
- `src/lib/marche/data.ts`, `src/lib/marche/my-data.ts` — `short_description`, `price_unit` (home, favoris cards).
- `src/app/demander/[id]/_components/ServiceRequestScreen.tsx`, `src/lib/marche/demander.ts` — labels, unit.
- `src/lib/i18n/fr.ts`, `src/lib/i18n/ar.ts` — §13, FR + AR together.
- `src/__tests__/h6-service-listings-hardening-rls.test.ts` — live suite, fixtures for the gate (§3; not run
  without go-ahead).
- Mock tests: `service-validation.test.ts` (new rules; gate ↔ validator matrix), `service-draft.test.ts`
  (step 5, resume 5, mapper, pairs), `service-wizard.test.tsx` (step 5 renders, Modifier jumps, publish
  success → replace, failure → flagged rows, no autosave after publish), `ServiceRow`/card and
  search/freelancer-detail tests where they build `tags`.
- `db/migrations/README.md` (after apply), `docs/follow-ups.md` (§12).

Not touched: `ui/stepper.tsx`, autosave rules, H5's draft exclusion, `search_vector`, `toggleServiceStatusAction`
logic (the DB now covers its hole).

Commits (max 2): (1) migration file + README, after the architect applies; (2) app + tests.

## 12. Out of scope → `docs/follow-ups.md`

1. Subcategory shown nowhere (D2 breadcrumb candidate — needs design).
2. D2/E1 category label is `name_fr` in AR.
3. 24 legacy tags matchable to pool ids — data backfill to ids.
4. H5 rows and order screens: price without unit (orders: snapshot column).
5. DB still allows non-draft → `draft` (UI can't reach it; harmless under the gate).
6. D2 breadcrumb `aria-label="Fil d'Ariane"` hard-coded French (same class as the G6 entry).
7. Close the PR-3 « `price_unit` stored but shown nowhere », « D2 hybrid », « validateServiceInput must
   change », « PR-4 blocker — tags hold ids » entries, and the « `freelance.services.form.error.*` untranslated »
   entry.

## 13. Proposed strings (FR from the frame where drawn; AR mine → `REVIEW_AR_TRANSLATION`)

| Key | FR | AR |
|---|---|---|
| `service.wizard.recap.title` | Titre | العنوان |
| `service.wizard.recap.category` | Catégorie | الفئة |
| `service.wizard.recap.skills` | Compétences | المهارات |
| `service.wizard.recap.description` (D23) | Description | الوصف |
| `service.wizard.recap.price` | Prix | السعر |
| `service.wizard.recap.delivery_time` | Délai | المدة |
| `service.wizard.recap.mode` | Mode | طريقة التقديم |
| `service.wizard.recap.edit` | Modifier | تعديل |
| `service.wizard.recap.edit_aria` | Modifier — {field} | تعديل — {field} |
| `service.wizard.recap.not_set` (D24) | Non précisé | غير محدد |
| `service.wizard.recap.price_value` | {price} TND · {unit} | {price} د.ت · {unit} |
| `service.wizard.footer.publish` | Publier mon service | انشر خدمتي |
| `service.wizard.footer.publishing` | Publication… | جارٍ النشر… |
| `service.wizard.error.publish_incomplete` | Certaines informations manquent. Corrigez les lignes signalées, puis publiez. | بعض المعلومات ناقصة. صحّح الأسطر المحددة ثم انشر. |
| `service.wizard.error.publish_failed` | La publication a échoué. Réessayez. | تعذّر النشر. أعد المحاولة. |
| `service.wizard.succes.title` (D33) | Votre service est en ligne ! | خدمتك منشورة الآن! |
| `service.wizard.succes.subline` | Les clients peuvent le trouver sur le marché et vous contacter sur WhatsApp. | يمكن للعملاء العثور عليها في السوق والتواصل معك عبر واتساب. |
| `service.wizard.succes.view` | Voir mon service | عرض خدمتي |
| `service.wizard.succes.list` | Aller à mes services | الذهاب إلى خدماتي |
| `listing.service.priceRaw_hour / _day / _month` | {price} TND / heure · / jour · / mois | {price} د.ت / الساعة · / اليوم · / الشهر |
| `serviceDetail.price` (+ `_hour/_day/_month`) | {price} TND (+ / heure…) | {price} د.ت (+ / الساعة…) |
| `serviceDetail.mode.hybrid` (D32) | À distance ou sur site | عن بُعد أو في الموقع |
| `freelance.services.form.error.required` | Ce champ est obligatoire. | هذا الحقل إلزامي. |
| `freelance.services.form.error.title_too_short / _long` | {min}–{max} caractères. | بين {min} و{max} حرفًا. |
| `freelance.services.form.error.description_too_short / _long` | Entre 100 et 2000 caractères. | بين 100 و2000 حرف. |
| `freelance.services.form.error.price_invalid` | Entrez un prix valide, supérieur à 0. | أدخل سعرًا صحيحًا أكبر من 0. |
| `freelance.services.form.tags.errors.min / max / format` | Ajoutez au moins 1 compétence. / 5 compétences maximum. / Chaque compétence fait 1 à 50 caractères. | أضف مهارة واحدة على الأقل. / 5 مهارات كحد أقصى. / يجب أن تكون كل مهارة بين 1 و50 حرفًا. |
| new validator keys (short description, subcategory, unit, mode) | reuse the wizard's `service.wizard.error.*` wording | idem |

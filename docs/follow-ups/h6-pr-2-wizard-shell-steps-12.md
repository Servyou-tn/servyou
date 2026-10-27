# H6 PR-2 — wizard shell + steps 1–2 (`feat/h6-wizard-steps-1-2`, 2026-10-23)

## ✅ PR-4 blocker — `service_listings.tags` now holds skill IDS; 4 public surfaces print tags raw — RESOLVED in H6 PR-4

- **Resolved 2026-10-24 in H6 PR-4 (`feat/h6-publish-step5`):** D2 and E1 map tags through `skillLabel(tag, lang)`; the card's two producers
  (`/marche/services`, D4) send `{ fr, ar }` pairs (`skillLabelPair`) so the taxonomy stays out of the
  client bundle (ruling D31). History below.

- H6 stores a pool skill as its taxonomy id (`next-js`, `identite-de-marque`) and a custom skill as
  typed (founder ruling D1). Drafts are private, so nothing shows yet — but the moment PR-4 publishes
  a wizard-made service, these render the raw value: `ServiceListingCard.tsx:56`,
  `ServiceDetail.tsx:170-172` (D2), `ServiceRequestScreen.tsx:50` (E1), `freelancer-detail.ts:185`.
- **Fix:** map every tag through `skillLabel(tag, lang)` (`src/lib/freelance/service-draft.ts`) on
  those four surfaces. Legacy rows (free-text slugs from the old `^[a-z0-9-]` validator) pass through
  unchanged — `skillLabel` returns anything it can't resolve as is.
- **Trigger:** PR-4, before « Publier mon service » can write `status='active'`.

## `short_description` is not searchable

- Migration 20261023212930 added it without touching `search_vector` (GENERATED STORED over title +
  description — the PR-F2.3 trap). Widening it = drop + recreate the generated column and its GIN index.
- **Trigger:** when /marche/services search should match the summary; its own focused migration.

## F3 `Input` counter is 14px regular; the measured Input counter is Overline 12/500/0.48 uppercase

- Figma 22:512 helperRow counter (« 0/80 », « 0/160 ») = Overline. `ui/textarea.tsx` already renders
  `text-caption font-medium`; `ui/input.tsx` renders `text-sm`. On H6 step 2 both sit on one card,
  so « 0/160 » and « 0/2000 » visibly differ in size.
- Not changed here: `Input` has ≥ 4 consumers (H2, H3, E1, H6…). One-line fix in a shared-component
  PR, with a VRT check.

## H6 « Compétences » field — the frame doesn't follow the F3 field anatomy (built to F3, per D5)

- Figma 459:18828 draws the label Medium **16/26 text-primary with a plain « * »**, the field at
  **px 12**, chips **Medium, gap 4**, helper **text-secondary**, and **no counter**. Every other field
  on the card is the F3 Input/SelectTrigger (label 14/21 secondary + danger asterisk, px 16, helper
  muted). Founder ruling D5: build it like the other fields (the shared TagInput, counter hidden).
- **Action:** align the frame to F3 in Figma (no read needed — it's a design-file fix).

## Two different skills share one Arabic label

- `copywriting` (Rédaction & contenu) and `copywriting-publicitaire` (Marketing digital) are both
  « الكتابة الإعلانية ». `findSkillByLabel` resolves it from the freelancer's own sector first, and
  `service-categories-skills.test.ts` pins this as the ONLY shared label — but a native speaker should
  give them distinct Arabic (both lines carry `REVIEW_AR_TRANSLATION`).

## `scripts/taxonomy-gen-md.mjs` is not in the repo

- `docs/taxonomy/service-categories.md` says « Generated — do NOT edit by hand. Regenerate: node
  scripts/taxonomy-gen-md.mjs », but the script exists only as an untracked file in the founder's main
  checkout. H6 PR-2 updated the mirror by hand (photography row, counts, skill-id sentence).
- **Fix:** commit the generator (and `taxonomy-gen-product-md.mjs`).

## Tailwind v4 scans `docs/` — and, in a worktree, even gitignored files

- Raw `get_design_context` output pasted into `docs/design/h6-measurements.md` contained arbitrary
  values like a `var()` with an escaped token name; Tailwind compiled them into invalid CSS and every
  page 500'd (« Parsing CSS source code failed »). Moving the dump to a gitignored folder did NOT fix it
  in the worktree (`.git` is a file there); only moving it out of the tree did.
- **Rule:** never paste raw Figma code into the repo — record measured values in tables. Optional
  hardening: `@source not "../../docs";` in `globals.css` (a global change → its own PR + VRT run).

## H6 autosave doesn't flush when the tab closes

- Edits are saved 1.5 s after the last keystroke and on every button; closing the tab inside that
  window loses the last edit. A `pagehide` flush can't await a server action — would need
  `navigator.sendBeacon` to a route handler, or a `beforeunload` prompt while dirty. Founder call.

## Typed Latin text in an Arabic-mode field puts its punctuation on the wrong side

- In AR, a French description typed into `Input`/`Textarea` renders « .Je conçois … seul » (the field
  is `dir=rtl`). `dir="auto"` on user-content fields fixes it. Shared components → own PR.
- **H6 PR-3 (2026-10-24):** same on the new free-text fields — « 2 semaines » shows as « semaines 2 »
  (Délai) and « 3 écrans » as « écrans 3 » (Ce qui est inclus) in AR. Caution for the fix: an EMPTY
  `dir="auto"` field resolves to LTR, so the Arabic placeholder would left-align — set `dir="auto"` only
  once the value is non-empty, or keep the page direction while empty.

## G6 breadcrumb `aria-label` is hard-coded French

- `src/app/mes-produits/ajouter/page.tsx` `PageIntro`: `aria-label="Fil d'Ariane"` — AR screen readers
  hear French. H6 uses `t('service.wizard.breadcrumb_aria')`; G6 should too.

## H6 drafts: nothing limits how many one freelancer can create

- **H6 PR-4 (ruling D34): kept logged.** Live data: 2 drafts on 2 freelancers.

- `saveServiceDraftAction` inserts whenever it is called with `draftId: null`; the wizard only does that
  once per page load, but the action is callable directly, so a script could create drafts without end
  (each private, owner-only). Resume takes the newest and logs when there are more.
- **Fix options (PR-4):** a per-freelancer draft cap in the action, or a partial unique index
  `(freelancer_profile_id) WHERE status = 'draft'` if « one draft at a time » is the product rule.

## H6 sticky footer vs. the on-screen keyboard / safe area (mobile)

- The footer is `sticky bottom-0`; on a phone it can sit over the field being edited (the browser
  scrolls the focused field into view without knowing about the footer), and it has no
  `env(safe-area-inset-bottom)` padding for the iOS home indicator. No mobile frame exists; check on a
  real device at the founder gate. Fix: `scroll-padding-bottom` on the page + safe-area padding.

# H6 PR-4 — step 5 « Publication », publish, entry points (`feat/h6-publish-step5`, 2026-10-24)

Rulings D23–D35 in `docs/design/h6-pr4-deltas.md`; DB gate = migration `20261024215730` (README #64).

## 🔴 PGRST201 blocks this PR's founder gate on every public service surface (and H5)

- The HIGH entry « every `service_listings → categories` embed fails with PGRST201 » (logged on main by the
  suspension PR) also breaks **H5 `/mes-services`** (`seller-services-query.ts:114` `categories(slug)` → the
  route's error page) and every surface PR-4 changed: D2 (404), E1, the `/marche/services` grid, D4, favoris,
  home, D2 related — and therefore the success screen's « Voir mon service » link.
- PR-4 did not fix it (one PR, one focus). Verified locally with the embeds qualified **temporarily**
  (`categories!service_listings_category_id_fkey`), then restored by hash: once qualified, H5 renders with the
  live CTA, D2/E1 show pool labels and the per-language price.
- **Trigger:** before the PR-4 founder gate's public-page checks — the PGRST201 PR first.

## No live test of the publish gate itself

- The trigger (`trg_service_publish_requirements`) is must-test per CLAUDE.md (a business rule in the DB). PR-4
  ships mock tests only (brief), and the architect verified the gate by hand after apply (263c5565 → `[]`;
  the 21 legacy rows fail the rules and stay pause/unpause-able). The hardening suite was only made gate-proof.
- **Fix:** a live suite — leaving draft incomplete refused (draft → active and → hidden); non-draft insert
  refused; legacy-style row: unpause passes, an edit that leaves a changed column invalid refused; service role
  exempt; hint/detail shape.
- **Trigger:** the next live-DB run window (founder « go »).

## Subcategory is shown nowhere public

- H6 requires a subcategory; no buyer surface prints it. D2's breadcrumb (Accueil › Services › secteur ›
  titre) is the natural slot — needs a design call.

## D2 / E1 / related cards: category label is `name_fr` in Arabic

- `service-detail.ts` and `demander.ts` select `categories ( name_fr )` only, so AR pages show the French
  sector. Same for the related-cards and favoris producers (their card fallback chip).

## 24 legacy tags match a pool skill but are stored as text

- Of the 39 tags on the 21 legacy listings, 1 is a pool id (`logo`), 23 match a pool label (« Google Ads »,
  « SEO », « Figma »…) and render as typed — i.e. French on AR pages — and 15 are custom.
- **Fix:** a data migration rewriting the matchable ones to their ids (`findSkillByLabel`), reviewed row by row.

## H5 rows and the order screens print a price without its unit

- H5 (`seller-services-query.ts`) and `/mes-commandes` / order detail show « 120 TND » with no unit. Orders
  snapshot the price, not the unit — a snapshot column would be its own migration.

## The DB still allows non-draft → `draft`

- Unreachable from the UI (autosave only updates drafts; the H5 toggle only sets active/hidden). Harmless
  under the gate (leaving draft again is checked), but an owner's direct API call could move a live service
  back into « draft », where H6 would resume it. A one-line rule if the founder wants « draft only on insert ».

## D2 / E1 breadcrumb `aria-label` is hard-coded French

- `ServiceDetail.tsx` and `ServiceRequestScreen.tsx`: `aria-label="Fil d'Ariane"` (same class as the G6 entry).

## Step 5 footer is three rows at 375

- « Publier mon service » is longer than « Suivant », so below `sm` the footer wraps to caption / « Enregistrer
  le brouillon » / [Précédent][Publier]. Works; no mobile frame — founder check on a phone.

## No « start over » from a resumed draft

- Founder ruling (PR-4): the wizard says « Vous reprenez votre brouillon « … » » when it resumes; there is no
  way to discard the draft and start a new one. Logged.

## Input / Textarea counters count UTF-16 units; the gates count code points

- Deliberate (ruling D28 build note): the counters sit next to the native `maxLength`, which counts UTF-16
  units, so « 40/80 » with typing blocked would be wrong. Minimums (where app ⇄ DB must agree) use code points
  everywhere. Only an emoji-heavy value can show a counter above its code-point length.

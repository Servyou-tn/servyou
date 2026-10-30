# Mes annonces rebuild — edit an annonce (`feat/mes-annonces-edit`, 2026-10-30)

## An owner cannot fix a typo once the first proposal arrives
**What:** the DB freezes an annonce's content (and skills) from the first proposal (`content_locked`, migration 20261027203831), so « Modifier » is disabled with a reason from then on. A typo found after the first proposal can only be handled by closing / deleting and re-publishing.
**Why deferred:** a deliberate DB rule (founder decisions 5–6, 2026-10-27: no bait-and-switch after freelancers answered); changing it is a product + migration decision, not a UI one.
**Trigger:** the founder wants a narrower lock (e.g. allow description fixes with a visible « modifiée » mark) — needs a migration.

## Post row and skills are not one transaction
**What:** `updateAnnonce` writes the `job_posts` row, then the skills diff (insert, then delete). A failure in between leaves the new text with the old skills and an error toast; a retry converges.
**Why deferred:** PostgREST has no multi-table transaction; an RPC would be the fix and is a migration.
**Trigger:** a reported inconsistency, or the next time `job_post_skills` gets a function.

## The edit page has no tips card and no Figma frame
**What:** F2's tips card (« Conseils pour une bonne annonce ») is not shown on the edit page; the form card is the F2 card with an edit H2.
**Trigger:** the founder draws an edit frame, or asks for the tips beside the form.

## A deadline already in the past is kept on save
**What:** an edit that leaves the stored deadline alone is accepted even when that day has passed (otherwise an owner could not fix anything on a post whose date went by). The native date input still shows the OS locale (existing note in `mes-annonces-rebuild-pr1.md`).
**Trigger:** a DatePicker primitive.

## Kebab / F4 enable rule is computed from list data
**What:** the list row decides « Modifier » from `display_status`, `response_count` and `admin_hidden_at` as loaded; a proposal that arrives after the page loaded is caught by `updateAnnonce` (and the DB), which answers with the « déjà reçu des propositions » message.
**Trigger:** none — by design; listed so nobody « fixes » it with a client clock.

## AR copy is a draft
**What:** the new `annonce.form.edit_*`, `annonce.error.content_locked` / `edit_unavailable`, `annonces.edit.*` and `annonces.detail.edit_locked` strings are marked `REVIEW_AR_TRANSLATION`.
**Trigger:** the founder's Arabic review pass.

# Journey gates G1 / G2 / G10: app follow-ups (`feat/journey-gates-db`, 2026-11-06)

Migration `20261106153901_journey_gates` (README #125, discovery `docs/discovery/journey-gates.md`). The database side
is live; nothing below is built yet. These are mostly Agent B's files (`src/app/**`, `src/components/**`). Ranked, most
important first.

## 1. « Choisir ce freelance » on `/mes-annonces/[id]` (G1)

**What:** a button on each proposal card (`AnnonceResponseCard`) calling
`supabase.rpc('choose_job_response', { p_response_id })`, from a server action with zod (uuid) and `getUser`. It returns
the post id; revalidate `/mes-annonces/[id]` and `/mes-annonces`. Map the error hints:
- `not_found` (P0002);
- `job_filled`, `job_deleted`, `job_expired`, `job_unavailable`, `freelancer_unavailable` (23514);
- `suspended`, `not_signed_in` (42501).

A confirmation dialog is advised: the choice is final, and the post can no longer be reopened.
**Why deferred:** B's files.
**Where it lives:** `src/components/marche/AnnonceResponseCard.tsx`, `src/app/mes-annonces/[id]/actions.ts`.
**Trigger:** next B packet. The RPC is live now.

## 2. A seller's « Accepter » without a phone shows the generic error (G2)

**What:** the database refuses pending → accepted with 23514 `hint = 'seller_phone_required'`, but
`advanceErrorKey` (`src/lib/orders/order-write-error.ts`) maps only the P0001 « stale transition » prefixes. The seller
sees « Une erreur est survenue ». Fix:
- map the hint to a new i18n key (FR + AR), e.g. « Ajoutez votre numéro de téléphone dans Mon compte avant
  d'accepter », with a link to `/mon-compte`;
- add a unit case in `order-write-error.test.ts`.
**Why deferred:** it needs new FR / AR strings (B owns `fr.ts` / `ar.ts`).
**Where it lives:** `src/lib/orders/order-write-error.ts`; the toast in the seller order views.
**Trigger:** before any phone-less seller is expected to accept. Today that is test data only (founder ruling D6).

## 3. « Rouvrir » after a choice is refused with an unmapped error (G1, D2)

**What:** `reopenMissionAction` (`src/app/mes-annonces/[id]/actions.ts`) gets 23514 `job_response_chosen`. Map it to
« Un freelance a été choisi : cette annonce ne peut plus être rouverte », and hide « Rouvrir » when a proposal is
`chosen`.
**Where it lives:** `mes-annonces/[id]/actions.ts`, `AnnonceRowActions.tsx`.
**Trigger:** with #1.

## 4. `/mes-propositions` shows the outcome (G1)

**What:** read `job_responses.status` in `src/lib/marche/proposals-query.ts` and show:
- « Choisie » (chosen);
- « Non retenue » (not_chosen);
- « En attente » (pending);
- « Expirée » (pending on a post past 30 days, derived).

Today a filled post shows « Fermée » to the chosen freelancer and to the others alike.
**Where it lives:** `src/lib/marche/proposals-query.ts`, `src/app/mes-propositions/**`.
**Trigger:** with #1.

## 5. An expired mission is a 404 for a freelancer who never answered (G10)

**What:** the public read now hides posts older than 30 days, so `/missions/[id]` ends in `notFound()` for them instead
of showing « Cette mission a expiré ». The owner and the responders still see « expirée ». If the founder prefers a
friendly expired page for everyone, that needs a dedicated read (an RPC returning only `expired: true`), not a policy
change.
**Trigger:** only if a 404 on an old shared link is reported.

## 6. LOW — a withdraw racing a choose can leave a filled post with no chosen proposal (review, 2026-11-06)

✅ CLOSED — migration `20261106170449_choose_race` (architect, 2026-11-06; README #126), PR #341. Two parts: `choose_job_response` locks the proposal and requires exactly one chosen; a client can withdraw only a pending proposal (`enforce_job_response_withdraw`, 42501 `response_decided`).

**What:** `choose_job_response` locks the post, then reads the freelancer's proposal without locking it. If the
freelancer withdraws in the milliseconds between that read and the UPDATE, the UPDATE matches no row to make `chosen`,
yet the post still becomes `filled` and the RPC returns success.
**Fix (new migration):** `select … for update` on the proposal row, or raise when the UPDATE set no `chosen` row.
**Why deferred:** a tiny window. The outcome equals a manual « marquer pourvue », which the owner can already do.
**Where it lives:** `public.choose_job_response`.
**Trigger:** the next migration touching these functions.

## 7. Before launch — refuse an order for a seller with no phone (discovery D6)

**What:** after G2, a phone-less seller cannot accept, and a buyer cannot cancel a service order. Today 9 phone-less
freelancers own 12 active services, so an order on one of them stays `pending` until the freelancer adds a phone or
cancels. The founder accepted this as test data (wiped before launch; new freelancers give a phone at sign-up).
**Fix if it matters after launch:** refuse the insert in `enforce_order_insert_integrity` when the seller has no phone.
**Trigger:** any phone-less seller left in production after the pre-launch wipe.

## 8. Stale live control in `job-responses-integrity.test.ts` (found by the regression run, 2026-11-06)

✅ CLOSED — PR #341. The control now expects the poster's phone to stay hidden. `suspension-enforcement` « catalog » classifies `contact_messages` and `password_change_attempts` (admin-requests-backend.md #5). Both suites are green live.

**What:** « control: a freelancer responds, and get_contact_phone(poster) then returns the phone » (line 314) expects
the freelancer to see the poster's phone after proposing. The phone-reveal rule (migration 20261101181237) says
« freelancer → client: never through a mission », and the founder reaffirmed it (D7). The live run returns `null`, as
the rule wants, so the test is red: 1 failed, 21 passed. It is unrelated to this migration, which does not touch
`get_contact_phone`.
**Fix:** assert `null` after the proposal (and keep the « before » null), or turn the control into the mission
owner → freelancer direction.
**Why deferred:** one PR, one focus; it is a pre-existing test, not part of the journey gates.
**Also red, and already logged:** `suspension-enforcement` « catalog » (`contact_messages`,
`password_change_attempts` unclassified; `docs/follow-ups/admin-requests-backend.md` #5).

## 9. « Retirer ma proposition » shows the generic error on `response_decided` (review of #341, 2026-11-06)

**What:** since migration `20261106170449`, deleting a proposal that is no longer `pending` raises 42501
`hint = 'response_decided'`. The UI only offers « Retirer » on an open post, so this is reached only when the choice
lands while the withdraw is in flight. `withdrawProposalAction` (`src/app/mes-propositions/actions.ts`) maps any
`deleteError` to `technical`.
**Fix:** map the hint to `not_open` (or a new key: « Cette proposition a déjà reçu une réponse »), and revalidate so the
row shows its outcome. Add a unit case.
**Why deferred:** B's file.
**Trigger:** next B packet on `/mes-propositions`.

## 10. LOW — a rare deadlock between a withdraw and a choose: retry once on 40P01

**What:** a withdraw holds the proposal row, then its AFTER DELETE trigger (`sync_job_post_response_count`) updates the
post. A choose holds the post, then locks the proposal. When both happen in the same instant, PostgreSQL aborts one with
40P01 after `deadlock_timeout` (1 s). Nothing is left half-done: the aborted call changed nothing. The pre-#341 body had
the same lock order.
**Fix:** in the two server actions (choose, withdraw), retry once on `error.code === '40P01'`; otherwise show the generic
error.
**Why deferred:** a millisecond window, consistent state, B's files.
**Trigger:** any 40P01 in the logs, or with #9.

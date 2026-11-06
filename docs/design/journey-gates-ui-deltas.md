# Journey gates — app side (`feat/journey-gates-ui`, 2026-11-06)

DB side: migration `20261106153901_journey_gates` (live; `docs/discovery/journey-gates.md` on `feat/journey-gates-db`).
Gaps: G1, G2, G5, G6, G9 of `docs/discovery/journeys-2026-11-07.md`.

## What ships

| Gap | Where | What |
|---|---|---|
| G1 owner | `/mes-annonces/[id]` | « Choisir ce freelance » on each proposal (details below). |
| G1 freelancer | `/mes-propositions` | The row pill is the proposal's own outcome (details below). |
| G1 reopen | `reopenMissionAction` | 23514 `job_response_chosen` → « Un freelance a été choisi : cette annonce ne peut plus être rouverte. » « Rouvrir » is also hidden once someone is chosen. |
| G2 | order advance (`advanceOrderAction`, both `AdvanceOrderButton`s) | 23514 `seller_phone_required` → « Ajoutez votre numéro de téléphone dans **Mon compte** avant d'accepter. », with « Mon compte » a link to `/mon-compte` (`PhoneRequiredError`). |
| G5 | `/missions` (now a page; the `next.config.ts` redirect is removed) | Sends each viewer to their own missions page (details below). |
| G6 | `FavoriteButton` (product / service hearts) | Every read / insert / delete error is checked: logged, a toast (« Impossible d'ajouter aux favoris / de retirer des favoris. Réessayez. »), the heart left as it was. `toggling` is always released. |
| G9 | `/mes-services` row | « Voir » only for a live service (active, not moderated) — `/services/[id]` 404s on anything else. |

**G1 owner — « Choisir ce freelance »**
- **When it shows:** on each proposal while the post is open, in its 30 days, unmoderated, with nobody chosen yet.
- **Confirm:** « Les autres propositions seront marquées non retenues, et l'annonce passera « Pourvue » : elle ne pourra plus être rouverte. »
- **Server action:** `chooseProposalAction` (zod uuid, session) → RPC `choose_job_response`. Its refusals are mapped by hint (`job_filled` / `job_expired` / `job_unavailable` / `job_deleted` / `freelancer_unavailable` / `not_found` / `suspended`).
- **After:** the chosen card shows « Choisi » and leads the list, the others show « Non retenu », and the post pill reads « Pourvue ».

**G1 freelancer — the pill on `/mes-propositions`**

| Pill | When |
|---|---|
| « Choisie » | the proposal was chosen |
| « Non retenue » | not chosen, or still pending on a post closed by hand |
| « En attente » | pending on an open post |
| « Expirée » | pending on a post past 30 days (derived from the date) |
| « Indisponible » | unchanged |

**G5 — where `/missions` sends each viewer**

| Viewer | Lands on |
|---|---|
| Freelancer | `/trouver-des-missions` |
| Any other signed-in user | `/mes-annonces` |
| Signed out | `/connexion?next=/missions`, then dispatched by role |

## Decisions for the founder

- **D1** No frame draws the new states. « Choisir ce freelance » is the existing primary `Button` md in the card's action row, before WhatsApp. « Choisi » / « Non retenu » are `StatusPill`s on the card's caption row (`reçue` success / `withdrawn` muted). On `/mes-propositions` the outcome pill replaces the post-state pill in the same slot (`reçue` / `withdrawn` / `pending` / the existing expired grey). Send a frame if they should look different.
- **D2** `/mes-propositions` tabs and tiles still count by the POST (« Actives » = open posts, the DB's 5-active cap). A chosen proposal on a now-filled post sits under « Fermées ». Say if « Choisie » should get its own tab.
- **D3** G9 hides « Voir » rather than linking a preview: there is no owner preview of a draft / paused service (`/services/[id]` reads `status = 'active'` only). « Modifier » stays in the menu.
- **D4** G5 for a shop owner: `/mes-annonces` (any signed-in non-freelancer posts missions there).
- **Not in scope (DB decisions D6 / D7):**
  - D6: a phone-less freelancer's new orders still go in, then wait.
  - D7: the chosen freelancer still never sees the client's phone.

## Notes

- **Local types:** `job_responses.status` and `choose_job_response` are typed in the app (`lib/marche/journey-gates.ts`, the action's RPC signature) until the record PR of `feat/journey-gates-db` ships the regenerated `database.types.ts`. Read-only checks on production confirmed both exist (the column selects; the RPC answers anon with 42501).
- **Verification:**
  - Fixture route (deleted before commit), FR + AR, at 1440 / 1100 / 375:
    - the open post with « Choisir »;
    - the decided post (« Choisi » first, « Non retenu », no reopen);
    - the four outcome pills;
    - the phone message.
  - `/missions` signed out → 307 `/connexion?next=%2Fmissions`.
  - Local `next build` passes (config + new route).
  - The signed-in routes were not browser-checked (no gate session).

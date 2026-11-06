# Journey gates — app side follow-ups (`feat/journey-gates-ui`, 2026-11-06)

## Swap the local journey-gates types for the generated ones
- **What:** `job_responses.status` and `choose_job_response` are typed locally:
  - `JobResponseStatus` in `src/lib/marche/journey-gates.ts`;
  - the `ChooseRpc` signature in `src/app/mes-annonces/[id]/actions.ts`;
  - the `status: unknown` casts in `annonce-detail.ts` / `proposals-query.ts`.
- **Why deferred:** the regenerated `database.types.ts` ships with the record PR of `feat/journey-gates-db` (Agent A).
- **Where it lives:** the files above.
- **Trigger:** that PR merges. Then type the client calls with `Database` and drop the casts.

## A live suite for the app path
- **What:** a live test signs in as a post owner and runs `chooseProposalAction`'s RPC against real rows, and checks a phone-less seller's accept through `advanceOrderAction`. The unit tests mock the client.
- **Why deferred:** the DB & Security agent owns the live suites; `journey-gates-live.test.ts` is planned in the DB PR.
- **Where it lives:** `src/__tests__/`.
- **Trigger:** the DB record PR.

## « Voir » on a draft / paused product
- **What:** G9 fixed the service row only. The product rows (`mes-produits` `ProductRow`) were not checked for the same 404.
- **Why deferred:** out of the brief's scope.
- **Where it lives:** `src/app/mes-produits/_components/ProductRow.tsx`.
- **Trigger:** the next `mes-produits` touch.

## Review leftovers (PR #340)
- **What:**
  - (a) `/mes-services` « Voir » is gated on the SERVICE's moderation. `/services/[id]` also needs the freelancer profile unmoderated, so a freelancer whose profile an admin hid still sees « Voir » and gets a 404.
  - (b) `/missions` sends a signed-in user to `/mes-annonces` when `getShellUser`'s profile read fails, or for an admin with no `seller_type`.
- **Why deferred:**
  - (a) needs the profile's `admin_hidden_at` loaded into the services list (a query + props change). The banner on that page already tells the freelancer they are hidden.
  - (b) is a rare fallback, acceptable for the MVP.
- **Where it lives:** `src/app/mes-services/_components/ServiceRow.tsx` / `src/lib/marche/seller-services-query.ts`; `src/app/missions/page.tsx`.
- **Trigger:** the next `/mes-services` touch; an admin missions landing if wanted.

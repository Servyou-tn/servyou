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

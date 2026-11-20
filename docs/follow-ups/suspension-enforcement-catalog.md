# Suspension-enforcement catalog: new public tables go unclassified (`fix/suspension-enforcement-catalog`, 2026-11-20)

The live suite `src/__tests__/suspension-enforcement.test.ts` keeps two hand-written lists:
- `TRIGGERED`, the 28 client-writable tables that carry `trg_enforce_active_user`;
- `NO_CLIENT_WRITES`, the exposed relations with no client write grant (8 since this PR).

Its `catalog` case compares their union with the relations PostgREST exposes. This PR adds the two tables that had
fallen out of both lists:
- `cod_block_lifts`, from `20261115182353_cod_no_show` (#378);
- `notifications`, from `20261116201553_bell_notifications` (#393).

Both are SELECT-only for `authenticated`. The architect verified that read-only on production on 2026-11-20. So the
gate had no gap; only the list was stale.

## 1. MEDIUM (process): a migration that adds a public table must classify it in the same PR

- **What:** #378 and #393 each created a public table, and neither updated the two lists.
  - The `catalog` case has failed against production since `cod_no_show` was applied on 15 Nov. Nobody saw it until
    DB-2's post-apply run on 19 Nov: `suspension-enforcement` came back 230/231 (`db/migrations/README.md`, #138,
    « Live »; PR #404).
  - It then held up DB-2's live batch while the architect ruled out a rollback.
  - The catch only works when someone runs this live suite. It signs in a set of fixture accounts and runs for about a
    minute against production, so it isn't run on every PR, and CI never runs it.
- **Why deferred:** this PR only fixes the stale list. A CI check is new tooling and needs its own PR and review.
- **Where it lives:**
  - `src/__tests__/suspension-enforcement.test.ts` (`TRIGGERED`, `NO_CLIENT_WRITES`, `describe('catalog')`);
  - `src/lib/supabase/database.types.ts`;
  - the `servyou-db-guardian` skill's definition of done.
- **Proposed check (CI, no live DB): a compile-time equality between the generated types and the two lists.**
  - `database.types.ts` is regenerated from the live schema after every applied migration (CLAUDE.md, « DB types »).
    Its `public` `Tables` + `Views` keys are the relations PostgREST exposes, as long as `service_role` holds a
    grant on each (below). On 2026-11-20 that was 34 tables + 2 views = the 36 relations in the `catalog` case.
  - Move the two maps (their keys at least) into a module the live suite imports, for example
    `src/__tests__/support/exposed-relations.ts`, typed with `as const satisfies …` so the keys stay literal.
  - Add a type assertion next to it, which `npx tsc --noEmit` (the CI step) checks:
    `type Exposed = keyof Database['public']['Tables'] | keyof Database['public']['Views']`,
    `type Classified = keyof typeof TRIGGERED | keyof typeof NO_CLIENT_WRITES`,
    then `const exposedRelationsAreClassified: Equals<Exposed, Classified> = true`.
    A table added or dropped without updating the lists then fails `tsc`.
  - The repo has no `Equals<>` type helper yet, and `package.json` has no `type-fest` or `expect-type` (2026-11-20).
    The PR adds one in that module, the usual exact form, so that `any` and unions don't pass for each other:
    `type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false`.
  - A table with no `service_role` grant must not give a false mismatch.
    - The generated types list every table and view in `public`, whatever its grants. The live `catalog` case reads
      PostgREST's OpenAPI with the service-role key, which lists only the relations `service_role` holds a grant on.
    - Such a table would be in `Exposed`, but not in the live set. Classified in `TRIGGERED` or `NO_CLIENT_WRITES`,
      it fails the live case; left out, it fails `tsc`.
    - So the module holds a third list, `NOT_EXPOSED` (in the generated types, no `service_role` grant), with a
      comment per entry saying why. It counts in `Classified`, and the live case leaves it out of its expected set.
    - There is none today: checked read-only on production on 2026-11-20, all 34 tables and 2 views have a grant.
  - It fires in the PR that records the migration (the commit that regenerates the types), before the founder merges.
  - It does not replace the live suite. It only forces the classification. The live suite still proves the grants
    and the trigger, including a table whose grants change while its name stays.
  - A parse of `db/migrations/*.sql` was looked at and rejected: rollback blocks in comments, `private.` tables and
    probe tables made inside DO blocks all give false hits.
  - Also add one line to the `servyou-db-guardian` skill's definition of done: « a new public table is classified in
    suspension-enforcement's lists ».
- **Trigger:** the next PR that creates a public table, or sooner if the architect schedules it. Build the check before
  that migration's record commit.

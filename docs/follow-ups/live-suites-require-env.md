# Live suites require the env: follow-ups (`fix/live-suites-require-env`, 2026-11-15)

The opt-in live run (`vitest.integration.config.ts`) now refuses to start without the three Supabase values
(`vitest.live-env.ts`), and a live suite may skip on nothing but the credentials gate (`integration-globs-guard.test.ts`).
These are the items it leaves, ranked.

## 1. LOW: the 232 `describe.skipIf(!hasCreds)` gates are now unreachable

**What:** every live suite (65 files) still wraps its blocks in `describe.skipIf(!hasCreds)`. Under the integration
config the credentials are always there (else it refuses to start), and the default run never collects these files, so
the gate never skips. It reads as « this suite skips without credentials », which is no longer true.
**Why deferred:** removing it touches all 65 live suites (and their `hasCreds` constants) for no behaviour change: one
PR, one focus. The static check keeps it as the only skip a live suite may have, so it cannot hide anything.
**Where it lives:** `src/__tests__/*-live.test.ts` and the other files listed in `INTEGRATION_GLOBS` (`vitest.config.ts`).
**Trigger:** when a suite is next edited, replace `describe.skipIf(!hasCreds)(` with `describe(` and drop its unused
`hasCreds`; once none is left, drop the `skipIf` exception in `SILENT_SKIP` (`integration-globs-guard.test.ts`).

## 2. INFO: `vitest related --run <live suite>` exits 0 with nothing run

**What:** the default config excludes the live suites, so `npx vitest related --run src/__tests__/x-live.test.ts` prints
« No test files found, exiting with code 0 ». A live file passed by path to `npx vitest run` already fails (exit 1, no
test files found).
**Why deferred:** it is the default run's exclusion working as designed, and the fast loop passes changed files that can
include a live suite: making it fail there would break that loop. A live suite runs only through the integration config.
**Where it lives:** `vitest.config.ts` (`exclude`), CLAUDE.md « Dev loop ».
**Trigger:** none unless someone mistakes a `related` run for a live run; then say it in CLAUDE.md « Dev loop ».

# Vercel: docs-only pushes are not deployed (Ignored Build Step)

Since PR #376 (2026-11-14), a push whose changes are **only documentation** does not build a Vercel deployment. Reason:
Vercel Hobby « Functions Storage » was at 9.26 / 10 GB, and every agent push built a full preview — docs-only ones too.
GitHub CI is unchanged: it still runs the whole gate (`next build` included) on every push.

## What counts as documentation

- anything under `docs/`
- a Markdown file at the repository root (`README.md`, `AGENTS.md`)

Everything else builds: `src/`, `public/`, `scripts/`, `db/`, `.github/`, `.claude/`, `package.json`, the lock file,
`next.config.ts`, `vercel.json`, any other config.

## How it decides

`vercel.json` → `"ignoreCommand": "node scripts/vercel-ignore-build.mjs"`. Vercel runs it after cloning, before
`npm install`. **Exit 0 = skip** (the deployment ends as CANCELED), **exit 1 = build** — Vercel's rule, the reverse of the
usual shell meaning ([Vercel docs](https://vercel.com/docs/project-configuration/project-settings#ignored-build-step)).

It compares the files of the commit being deployed with the files of the **last successful deployment of the same
branch** (`VERCEL_GIT_PREVIOUS_SHA`) — so a push carrying a code commit and then a docs commit still builds.
Without one (a branch's first deployment), it compares with the merge commit `main` was at when the branch was cut.
A merge into `main` is compared with `main` before the merge. When it cannot tell — no base in Vercel's shallow clone,
a git error, or nothing changed at all (a redeploy) — it builds.

## Reading the decision

Every deployment's build log has one line near the top, right after `Running "node scripts/vercel-ignore-build.mjs"`:

- `[ignore-build] SKIP — the 2 path(s) that differ from 1a2b3c4 (last successful deployment) are all docs: docs/…`
- `[ignore-build] BUILD — 5 path(s) differ from 1a2b3c4 (…); first non-docs path: src/app/page.tsx`
- `[ignore-build] BUILD — no base to compare with (…)` or `BUILD — the check failed (…); building to be safe`

## Forcing a deployment anyway

Vercel dashboard → the deployment → **Redeploy**, and untick **« Use project's Ignore Build Step »**. Or push any
non-docs change.

## Known limit

On a branch's **first** deployment, if the branch contains its own merge of `main`, only the commits after that merge
are judged. A code commit made before it could then get no preview until the next push. Production (merges into
`main`) is not affected.

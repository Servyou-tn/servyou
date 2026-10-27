# Dependency audit PR-2 — Sentry SDK bump (`chore/deps-sentry`, 2026-08-24)

## 🔴 Zero successful deployments since 2026-06-05 — not a noisy red check, production is running a month-old manual deploy and every safety-net item merged since is undeployed. FOUNDER DECISION NEEDED.

- **What:** GitHub's own deployment-status API on the PR #158 merge commit (`45ff51a`,
  2026-08-24T16:33:37Z) returns a Vercel status of `failure` with the description **"Cannot deploy
  from a private GitHub organization repository on the Hobby plan"**
  (`target_url` points at `vercel.com/servyou-s-projects?upgradeToPro=github-private-org-to-hobby`).
  Confirmed via `gh api repos/Servyou-tn/servyou/commits/<sha>/status`. Per that same check, the
  **last successful git-triggered deployment of any kind is 2026-06-05T00:28:15Z** — this is a
  platform-level restriction, not a per-commit flake, so it applies to every merge since, not just
  the ones individually re-checked. This is a live restriction, still true today (verified again
  while writing this correction).
- **What production is actually running, precisely — corrected from an earlier "3-month-old build"
  guess in this same entry:** the Vercel MCP's `list_deployments` shows the *most recent deployment of
  any kind* (git-triggered or manual — its metadata doesn't reliably distinguish the two, which is why
  the check above uses GitHub's API instead) is `dpl_5GxbofHn4ZKrePA5Gk1NBR956UQx`, created
  **2026-07-23T11:14:16Z**, actor `claude-code_2-1-215_agent` — almost certainly a manual `vercel
  --prod`/CLI deploy run from a Claude Code session, matching [[project_vercel_deploy_pipeline]]'s
  existing note that CLI `--prod` works while CLI preview is blocked. That deploy shipped commit
  `db740bd` ("PR-DS-2 application shell"). Diffing `db740bd..origin/main` today: **72 merged PRs, 203
  commits** are live on `main` and NOT live in production — everything from PR #87 onward, including
  this PR's Sentry bump, the #157/#158 dependency work, and the entire Paramètres rebuild. So the
  honest framing is two separate facts, not one: the git-integration pipeline has been fully dead for
  ~2.5 months (since June 5), *and* the informal manual escape hatch hasn't been used in over a month
  either (since July 23) — nobody has manually deployed anything since.
- **Sentry, specifically — per the founder, zero events received in this window.** I have no Sentry
  dashboard/API access from this environment to verify that independently (no `SENTRY_AUTH_TOKEN` or
  DSN anywhere local — confirmed empty in `.env.local`/`.env`, only declared as empty placeholders in
  `.env.example`). But it's consistent with everything above regardless: since nothing newer than the
  July 23 manual deploy has ever gone live, no build containing this PR's SDK version — or any of the
  Sentry-adjacent work from the last month — has ever run in production. Whatever Sentry does or
  doesn't show right now, it isn't testing this bump.
- **Why this wasn't caught earlier:** nothing surfaces the failure anywhere a PR author would look —
  the GitHub PR UI doesn't block merge on it, and `docs/servyou-*` / CLAUDE.md's Definition-of-Done
  item 9 ("Vercel green") has apparently been unverifiable-but-uncaught this whole time. The site
  looking "current enough" off a stale manual deploy is exactly what let a fully broken pipeline go
  unnoticed for months.
- **Why this blocked PR-2's live verification:** the task asked for a real preview deploy + a thrown
  error confirmed in the Sentry dashboard. That's the only path to any live evidence at all, and it's
  closed at the platform level — not something a retry or a different push fixes.
- **🔴 FOUNDER DECISION REQUIRED — not fixed here, it's a plan/billing call, not a code change:**
  1. **Upgrade the Vercel team to Pro** (unblocks git-integration deploys), or
  2. **Make the GitHub repo public** (unblocks git-integration deploys AND — see the CI section below
     — unblocks GitHub branch protection, which is *also* Pro/public-only on this org and is why a
     failing CI has never once blocked a merge either).
  Every "ships before real users" safety-net item currently sitting on `main` — this Sentry bump
  included — is undeployed until one of these happens.
- **Trigger:** already fired, repeatedly. Every PR since #87 has merged into this state. Nothing
  further needs to happen to notice it again; it needs a decision.

## ✅ RESOLVED 2026-08-25 (was: 🔴) — CI's `Type-check · Lint · Test · Build` GitHub Action has been red for 9 straight PRs, #150→#158 (2026-08-19→2026-08-24) — genuine, pre-existing, unrelated to dependency work, and it has NEVER been able to block a merge on this repo

- **What, corrected — an earlier pass at this entry said "since #154"; walking every CI run instead of
  a sample shows it started earlier:** `gh run list --branch main --workflow CI` shows `failure` on
  **every merge from #150 through #158 inclusive** — 9 in a row, 2026-08-19 through 2026-08-24. Real
  ESLint errors, not flake, confirmed by pulling each run's actual log (`gh run view <id>
  --log-failed`), not just the pass/fail summary:
  - **#150** (2026-08-19, `feat/annonces-form-ds`) is where it *starts*: `tag-input.tsx` was promoted
    into `src/components/ui/` in that PR, bringing one `shared-ui/no-raw-color` violation
    (`h-[…]`, line 91) — `✖ 6 problems (1 error, 5 warnings)`.
  - **#150 through #155** all fail on that same single error.
  - **#156** (2026-08-23, `feat/parametres-shell`) adds three more of the same rule in the new
    `setting-row.tsx` (`min-h-[…]`/`w-[…]`/`size-[…]`, lines 72/133/151) — from here on it's
    `✖ 9 problems (4 errors, 5 warnings)`, exit code 1.
  - **#157, #158** carry the same 4 errors forward.
  - **Footnote so it isn't conflated with the above:** #148 (2026-08-18) also failed CI, but for
    unrelated `TS2307`/`TS2305` dangling-import errors from a rename in progress — self-fixed the same
    day by #149. A one-off, already resolved, not part of this streak. #144–#147, #149 were green.
  - Neither `chore/deps-lockfile-refresh` (#158) nor `chore/deps-sentry` (this PR) touches
    `setting-row.tsx` or `tag-input.tsx` — confirmed via `git log --follow` on both files.
- **Genuine violation, not the rule misfiring on a token reference:** all four flagged values are
  literal pixel literals (`min-h-[72px]`, `w-[122px]`, `size-[18px]`, `h-[18px]`) — none reference a
  `var(--token)`, so this isn't the rule failing to recognize a legitimate token utility. They're
  Figma-measured exact dimensions that don't land on Tailwind's default spacing scale either (72px/
  122px/18px are all off-scale — the default steps jump 16→20, skip 4.5, etc.), which is presumably
  *why* arbitrary-value syntax was reached for in the first place. The rule is doing exactly what
  `eslint-rules/boundary.mjs` says it's for.
- **Why CI catches it and nothing local does — it's not an environment mismatch, lint just isn't in
  anyone's local loop:** ran `npm run lint` directly against this branch — exit code 1, the identical
  errors CI reports. So the two environments agree; the gap is that **nothing runs that command except
  CI.** CLAUDE.md's Definition-of-Done only names `pnpm build`/`npm run build` as the local gate, never
  `npm run lint`. And a plain `npm run build` (also run against this branch, exit code 0, all 59 routes)
  confirms Next.js 16 no longer runs ESLint during build at all — `next-lint.js` doesn't exist in
  `node_modules/next/dist/cli/` any more, and the build's own step list is just Turbopack compile →
  `runAfterProductionCompile` → TypeScript → static generation, no lint step. Older Next versions ran
  lint automatically at build time as a safety net; this one doesn't, and nothing replaced it locally.
  `npm run lint` genuinely only runs in the CI job.
- **And CI failing has never once blocked a merge, structurally:** `gh api
  repos/Servyou-tn/servyou/branches/main/protection` returns `403` — *"Upgrade to GitHub Pro or make
  this repository public to enable this feature."* Required-status-check branch protection is
  unavailable on this org's current plan+visibility, so a required-CI gate has never existed to bypass
  — a red run was never going to stop anything, which is exactly how #150 through #158 all landed
  clean through review with CI quietly on fire underneath.
- **Not fixed here:** out of scope for a dependency-bump PR per CLAUDE.md's "one PR, one focus." Fix
  options (replace the raw px with a token/nearest scale step, or decide the rule needs a documented
  exception for measured-geometry cases) are a design-system-compliance call, reported to the founder,
  not applied.
- **Trigger:** the next PR that touches `setting-row.tsx` or `tag-input.tsx`, or a dedicated CI-green
  sweep — whichever comes first. Worth reading together with the Vercel finding above, not as two
  isolated items: **this repo currently has no automated signal that can stop bad code from reaching
  `main`, and no deploy pipeline that gets `main` in front of anyone anyway** — the founder's Vercel
  Pro/public-repo decision above would incidentally fix this one too, since branch protection has the
  same plan/visibility gate as the Vercel restriction does.
- **Closed by `chore/lint-raw-colors` (PR #160, 2026-08-25).** All 5 violations fixed — not 4:
  `tag-input.tsx:91`'s `h-[18px] w-[18px]` was two in one string; the linter's `checkString` only
  ever reported the first. None land on `tokens.css`'s named `--spacing-N`
  scale, but Tailwind v4's dynamic scale resolves any bare numeric multiplier through the same
  `--spacing` custom property the named tokens use (verified by compiling through the project's
  actual `@tailwindcss/postcss` pipeline) — so each became a bare multiplier
  (`min-h-18`/`w-30.5`/`size-4.5`/`h-4.5 w-4.5`) rather than a bracket literal, following the
  precedent `Header.tsx` already set with `h-18` for 72px. CLAUDE.md's DoD item 3 now names
  `npm run lint` explicitly alongside `tsc`/`build`, closing the second half of this entry (lint
  passing locally means nothing if nobody runs it) — the branch-protection gap above is still open
  and still the reason a red CI check couldn't have blocked #150→#158 even if lint had been run.
  See that PR's own follow-ups entry below for a related scope gap the investigation surfaced.

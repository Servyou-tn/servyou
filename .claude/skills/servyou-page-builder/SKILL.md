---
name: servyou-page-builder
description: Role skill for the Servyou "Page Builder" agent — build a screen from its Figma frame to measured fidelity on its real route with real Supabase data, FR + AR. Load at the start of any task that says "Role: page-builder", or any page build / page migration / wizard step / screen from Figma node IDs.
---

# Role: Page Builder (Figma → code)

You build Servyou screens to Figma fidelity, wired to the real route, server actions and Supabase
data, in French and Arabic. A founder brief for you can be three lines ("Role: page-builder.
Job: … Frames: …"): everything else is here.

## Load with this skill
figma:figma-design-to-code (MANDATORY before any get_design_context call) · figma-page-rebuild ·
servyou-design-system-compliance · servyou-i18n-vocabulary-lock · servyou-phase-aware-features ·
servyou-visual-gate · vercel-react-best-practices · web-design-guidelines · gstack-qa /
gstack-browse · gstack-review. If a skill is missing, say so in your first report.

## Workspace
- You work in a git worktree (`C:/Users/Zolo/Projects/servyou-wt-*`). First command:
  `cd "<worktree>" && git branch --show-current` and confirm the branch the brief names.
- The shell resets to the main checkout after every command: prefix EVERY shell command with
  `cd "<worktree>" &&` and use absolute paths under the worktree. Never touch the main checkout.

## Figma
- Read each frame ONCE (official Figma MCP), save every measurement as tables in
  `docs/design/<page>-measurements.md`, and reuse that file for the final comparison. Report each
  read used. Until Figma Pro the account cap is ~20 reads/month.
- Never save raw Figma/MCP code into the repo (it broke Tailwind in H6 PR-2). Screenshots go in a
  gitignored folder.
- A quota / rate-limit error → STOP and report. Never build from memory or a summary.
- Where the frame contradicts the brief or an earlier ruling, report it as a numbered decision
  (continue the D-numbering of the page's deltas doc) — don't pick silently.

## Build rules
- Tokens only (no raw hex / guessed px). Logical properties only (ps-/pe-/ms-/me-/text-start/end).
- Every string through t(); keys added to fr.ts AND ar.ts together. Store i18n KEYS in form and
  error state, never resolved text (re-translation on language switch). Your Arabic is a draft:
  mark it REVIEW_AR_TRANSLATION.
- Server Components by default; 'use client' on the smallest interactive leaf. next/image.
- Every server action: Zod first, owner re-derived server-side, errors logged as
  message/code/details (never the raw object), never a silent empty list.
- Supabase embeds: when a table has 2+ FKs to the same target (e.g. service_listings → categories
  via category_id AND subcategory_id) ALWAYS use the FK hint `target!<fk_name>(...)`.
  New code should type its client with `Database` from `src/lib/supabase/database.types.ts`.
- "Once built, stays built": extend earlier PRs, never rebuild them.
- Schema changes: write the migration file in `db/migrations/` and STOP — you NEVER call
  apply_migration. The architect reviews and applies, then you rename the file to the recorded
  version and add its README entry (ask the architect for the README number).

## Tests and gates
- Mock / unit tests only. The DB & Security agent owns the live database; ask before running any
  live-DB suite. Never run rls-smoke. Never run a bare `vitest run` (some live suites may be
  missing from INTEGRATION_GLOBS) — always pass file paths or use `vitest related`.
- Follow the **Fast loop** below: local = fast checks; CI = the full gate.

## Fast loop (speed rules — the dev PC has 2 cores / 8–16 GB)
CI (GitHub Actions) runs the FULL gate on every push in ~2 min: tsc, lint, the whole vitest run,
`next build`, Storybook VRT, token drift, plus the Vercel preview. Don't repeat it locally.
1. **Local checks while iterating:** `npx tsc --noEmit` · `npx eslint <changed files>` ·
   `npx vitest related --run <changed src files>` (or the test files by path).
2. **Local `npm run build` ONLY when** you changed next.config, route structure (new/moved
   route segments, layouts, `generateStaticParams`), dependencies, or CI's build failed.
   Otherwise CI's build is the build gate.
3. **Never stop the dev server to build.** Since Next 16, `next dev` and `next build` use separate
   output dirs and run concurrently. Keep one dev server per worktree alive for the whole job.
4. **Push early.** Push commit 1 as soon as the local checks pass, so CI and the Vercel preview run
   in parallel with your self-verify. Read CI with `gh pr checks <n>`; fix only real failures.
5. **One review per PR**, on the diff only, as a subagent on **Sonnet** (not Opus) — either
   /gstack-review OR an independent reviewer, never both. Fix critical/high findings; log the rest
   in docs/follow-ups.md. Skip the review for docs-only or test-only changes.
6. **Self-verify in one scripted pass** (agent-browser / one Playwright script capturing FR+AR ×
   1440+375 for each state). After a small fix, re-check only the affected views.
7. **Read narrowly:** the files you will change and their direct imports; grep before opening.
   Use Explore subagents for wide searches (they return conclusions, not file dumps).
8. **Short reports:** ≤ 40 lines — what shipped, what was checked, numbered decisions. Detail goes
   in the PR body or the deltas doc, not the chat.

## Self-verify before reporting
next-devtools get_errors (+ compile_route) + agent-browser on the real route: FR and AR × 1440 and
375, against the saved measurements. Max 3 fix rounds, then report what remains. Leave any test
draft you create noted in the report.

## Shipping
Max 3 commits (feature · review fixes · follow-up), conventional prefix, cite the ruling/section in
the body, no Co-Authored-By. `git push -u origin <branch>` only — never main, NEVER force-push (a 4th
commit needs the architect's OK). Open the PR with the preview URL, report, STOP. The founder does
the final visual gate and the merge.

## Definition of done
measure → diff/decisions report approved → build → local fast checks → push (CI + preview start) →
self-verify → one Sonnet review → CI green → report → STOP.

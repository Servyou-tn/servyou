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
  live-DB suite. Never run rls-smoke.
- Gate in your worktree: `npx tsc --noEmit`, `npm run lint` (committed tree), `npm run build`,
  then the mock suites you touched.

## Self-verify before reporting
next-devtools get_errors + agent-browser on the real route: FR and AR × 1440 and 375, against the
saved measurements. Max 3 fix rounds, then report what remains. Leave any test draft you create
noted in the report.

## Shipping
Max 2 commits (conventional prefix, cite the ruling/section in the body, no Co-Authored-By).
`git push -u origin <branch>` only — never main, NEVER force-push (ask for a 3rd-commit exception
instead). Open the PR with the preview URL, run /gstack-review on the diff, report, STOP. The
founder does the final visual gate and the merge.

## Definition of done
measure → diff/decisions report approved → build → self-verify → gates green → /gstack-review →
PR + preview → report → STOP.

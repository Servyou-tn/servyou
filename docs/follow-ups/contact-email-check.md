# Contact email check — audit H3 follow-ups (`fix/contact-email-check`, 2026-11-12)

## 1. The audit doc cited by the brief is not in the repo

**What:** the brief points at `claude/full-audit-2026-11-11.md` section H3. No such file exists in the repo or its
git history, so this PR was built from the brief's description of H3 alone.
**Why deferred:** not code; the doc lives outside the repo (architect side).
**Where it lives:** wherever the 2026-11-11 audit was written.
**Trigger:** before closing H3 in the audit, check that this PR covers everything the doc says about it.

## 2. A third email regex exists, and it is safe (no change)

**What:** `src/components/ui/initials.ts` has `EMAIL = /^[^\s@]+@[^\s@]+$/` (decides whether to show an
address's local part). Its two classes are split by a literal `@` that neither class can match, so there is only
one way to match: linear, no backtracking. It also runs only on a name or email already stored, never on raw
public input.
**Why deferred:** nothing to fix. Logged so the next audit does not need to re-check it.
**Where it lives:** `src/components/ui/initials.ts:17`.
**Trigger:** only if that regex ever gains a third part (e.g. `\.[^\s@]+`). At that point, switch it to `isValidEmail`
from `src/lib/email-check.ts`.

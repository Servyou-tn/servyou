# Action input hardening — audit pass 2 « Logged » (`fix/action-input-hardening`, 2026-10-30)

Closed in this PR (from `docs/audits/prelaunch-security-audit-pass-2-actions.md` « Logged, not fixed »):
- the shop / freelancer report actions now check the target exists and is visible to the reporter;
- the admin dispute / report / moderation actions validate ids (uuid), target types and note length (2000);
- `applyFreelancerDetailsSave` / `applyProfileSave` moved out of 'use server' files (`apply-save.ts` modules);
- `/session-expiree` uses `isValidInternalPath` instead of its weaker local `safeNext`.

Still open from that list:

## 1. LOW — `mes-annonces/[id]` actions: `missionId` is unvalidated
- **What:** every write already filters `consumer_id = user.id`, so it is hygiene only.
- **Why deferred:** the page-builder session is rebuilding `mes-annonces` (PRs #248 / #251); editing those actions
  here would collide with its branch.
- **Trigger:** the next mes-annonces PR, or after it settles — a `z.string().uuid()` on `missionId`.

## 2. LOW — upload COUNT cap (founder number) — see `docs/follow-ups/upload-hardening.md` (#253)

## 3. INFO — no `/auth/callback` route
- **What:** Google OAuth is behind a disabled flag. Whoever builds the callback must validate `next` with
  `isValidInternalPath`.
- **Trigger:** the Google sign-in PR.

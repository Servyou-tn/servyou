# Admin PR-4 — Demandes + Journal follow-ups (`feat/admin-requests-log`, 2026-11-06)

## J10 counts are list lengths, capped at 200 per status
- **What:** the tab badges count the rows the list RPCs return (`p_limit: 200` per status).
- **Why deferred:** volume; an exact count needs a head-count RPC (Agent A's side).
- **Where it lives:** `src/app/admin/demandes/page.tsx`.
- **Trigger:** any list near 200 rows.

## J11 reads the last 500 audit rows of the period
- **What:** filters and search run over those 500; older rows of a long period are unreachable.
- **Why deferred:** volume; server-side filtering on the action prefix wants an index-friendly RPC.
- **Where it lives:** `src/app/admin/journal/page.tsx` (`LIMIT`).
- **Trigger:** more than 500 admin actions in 30 days.

## Review leftovers (PR #333)
- **What:**
  - (a) J11's action-group filter runs after the 500-row read, so a group's older rows can vanish. Filter on the `action` prefix server-side, or show a « 500 dernières » note.
  - (b) A Google (OAuth) account's erasure can never finish: `identity_left`, follow-up #0 of admin-deletion-auth.md. Its « Terminer la suppression » card will keep coming back until that migration ships. Its copy should then say so.
  - (c) `deletionStats` runs 3–4 queries per pending request, and the erasure-audit `.in()` can carry up to 200 ids.
  - (d) Dialog a11y: the irreversible-deletion text is not `aria-describedby`; focus falls to the body after the card re-renders; at 375 the dialog's buttons also stretch full width.
  - (e) The AR hour plural has a single `other` form (3–10 should read ساعات), already marked REVIEW_AR_TRANSLATION.
- **Why deferred:** (b) needs the architect's migration; the rest are low at launch volume.
- **Where it lives:** `src/app/admin/journal/page.tsx`, `src/app/admin/demandes/page.tsx`, `src/app/admin/demandes/_components/RequestActions.tsx`, `src/lib/i18n/plurals.ts`.
- **Trigger:** (b) with follow-up #0; the rest in the next admin PR touching these files.

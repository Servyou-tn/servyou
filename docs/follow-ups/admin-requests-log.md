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

# Admin PR-3 — Contenu + Litiges follow-ups (`feat/admin-content-disputes`, 2026-11-06)

## J4 reads the first 500 rows of a table, then filters in memory
- **What:** `/admin/contenu` loads up to 500 rows of the active table (newest first), then searches, filters, sorts and paginates them. Past 500 items, older ones are unreachable, and « Signalés d'abord » ranks within those 500 only.
- **Why deferred:** launch volume is far below that. Server-side search over titles and owner names needs an RPC (Agent A's side).
- **Where it lives:** `src/app/admin/contenu/page.tsx` (`LIMIT`).
- **Trigger:** any table passes about 300 rows.

## J7 lists the first 100 disputes of a tab
- **What:** the disputes table shows up to 100 per tab, with no pagination. A selected dispute outside those 100 is still shown, at the top of the list.
- **Why deferred:** volume.
- **Where it lives:** `src/app/admin/litiges/_lib/load.tsx`.
- **Trigger:** any tab passes about 50 disputes. Add the shared Pagination.

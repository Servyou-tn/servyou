# Admin PR-2 — Utilisateurs follow-ups (`feat/admin-users`, 2026-11-06)

## The users list reads every profile in one query (1000-row cap)
- **What:** `/admin/utilisateurs` loads all profiles, then filters, counts and paginates in memory. Past PostgREST's 1000-row cap the tab counts, the subtitle and the list stop growing silently.
- **Why deferred:** today's account count is far below that; server-side search across name, e-mail and phone plus role counts wants an RPC (a design call, Agent A's side).
- **Where it lives:** `src/app/admin/utilisateurs/page.tsx`.
- **Trigger:** about 500 accounts, or the admin stats show growth. Move counts to an RPC and paginate with `.range()`.

## J3 « Signalements reçus » open count is computed from the first 50 rows
- **What:** the tile's total uses `count: 'exact'`, but « N ouverts » counts the open rows among the first 50 fetched.
- **Why deferred:** volume.
- **Where it lives:** `src/app/admin/utilisateurs/[id]/page.tsx`.
- **Trigger:** any account with more than 50 reports. Add a head count filtered on open / under_review.

## Review leftovers (PR #331)
- **What:** (a) the detail page puts every content id into the reports `.or()` and the journal `.in()` URLs, so a shop with several hundred products could exceed URL limits (that shows a failed state, not wrong data). (b) On « Activité » both order panels are queried, but only one renders. (c) At 375 the five-tab `AdminTabs` row scrolls, but the active tab is not scrolled into view.
- **Why deferred:** none is a defect at launch volume; (c) touches the shared AdminTabs used by every admin page.
- **Where it lives:** `src/app/admin/utilisateurs/[id]/page.tsx`, `src/components/AdminTabs.tsx`.
- **Trigger:** (a) a shop past about 150 items; (b) and (c) the next admin PR that edits these files.

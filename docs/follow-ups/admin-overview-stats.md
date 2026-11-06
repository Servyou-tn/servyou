# Admin PR-5 — Vue d'ensemble, Statistiques, Commandes follow-ups (`feat/admin-overview-stats`, 2026-11-06)

## Swap the local dashboard schema for Agent A's
- **What:** `src/app/admin/_lib/dashboard.ts` parses `admin_dashboard_stats` with a local zod copy of the shape.
- **Why deferred:** A's `src/lib/admin/dashboard-stats.ts` had not landed when this PR was cut.
- **Where it lives:** `src/app/admin/_lib/dashboard.ts` (`DashboardStats`).
- **Trigger:** A's schema PR merges. Import it and delete the local copy, keeping `parseDashboardStats` as the one entry point.

## Every admin page runs the full dashboard RPC for the sidebar pills
- **What:** the layout calls `admin_dashboard_stats(7)` on every admin navigation, and that RPC also computes the weekly,
  category and city aggregates. The overview page shares the call; the other pages pay for it.
- **Why deferred:** the brief sources the pills from `.queue`; a queue-only RPC would be a DB change (Agent A's side).
- **Where it lives:** `src/app/admin/layout.tsx`, `src/app/admin/_lib/load.ts`.
- **Trigger:** admin pages feel slow, or order volume grows. Then add an `admin_queue_counts()` RPC.

## The J11 action-group filter reads at most 200 rows
- **What:** with a group selected (« Masquage » = every `hide_content_*` code), the page reads the newest 200 matches of the
  other filters and filters / pages them itself. `admin_list_audit_log` takes one exact action code.
- **Why deferred:** needs an RPC parameter for an action prefix or group (DB change).
- **Where it lives:** `src/app/admin/journal/page.tsx` (`GROUP_LIMIT`).
- **Trigger:** more than 200 admin actions in a period.

## Statistics CSV export no longer rendered
- **What:** the brief rules out « Exporter CSV », so the rebuilt J8 does not render the old count page's
  `CsvExportButton`. The button, its `actions.ts` and their test stay in place.
- **Why deferred:** deleting a built feature needs the founder's call (deltas doc D-OS-3).
- **Where it lives:** `src/app/admin/statistiques/CsvExportButton.tsx`, `actions.ts`, `__tests__/csv-export.test.ts`.
- **Trigger:** the founder decides between deleting it and a CSV PR built on the same RPCs (discovery D11).

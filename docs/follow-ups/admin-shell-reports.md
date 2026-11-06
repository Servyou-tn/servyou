# Admin PR-1 — shell + Signalements, review follow-ups (`feat/admin-shell-reports`, 2026-11-06)

From the PR #328 review. These are not fixed in that PR because none is a defect at today's volumes, or because each needs a new string or a design call.

## Queue reads cap at 500 rows before severity sorting
- **What:** `/admin/signalements` loads `.order('created_at', asc).limit(500)` and only then sorts by severity and applies the search. With more than 500 reports in a tab, the newest are dropped silently. In Ouverts that could hide a recent fake_scam report. The batched `.in('id', …)` reads in `_lib/targets.ts` are also unchunked; 500 uuids is about 18 KB of URL, which risks a 414.
- **Why deferred:** today's report volume is far below this. Fixing it means sorting by severity in SQL (an RPC or a computed rank) or paginating, which is a design call.
- **Where it lives:** `src/app/admin/signalements/page.tsx` (the list query), `_lib/targets.ts` (`resolveTargets`, `countReportsBy`).
- **Trigger:** any tab passes about 200 rows, or the admin stats show the queue growing. At that point, chunk the `.in()` lists at about 100 ids, and add a « 500 premiers » notice or pagination.

## Reporter counts can undercount past PostgREST's 1000-row cap
- **What:** `countReportsBy` reads every report row for the listed reporters. Past 1000 rows the « N signalements envoyés » count is truncated silently.
- **Why deferred:** volume, as above.
- **Where it lives:** `src/app/admin/signalements/_lib/targets.ts`.
- **Trigger:** the same as above. Use an RPC that groups counts, or one `count: 'exact', head: true` per reporter on the detail page.

## A partial target-read failure has no banner on the queue
- **What:** `resolveTargets` returns `failed`. The detail page uses it to show « — », but the queue ignores it, so a failed read shows « — » titles with no notice (the error is logged).
- **Why deferred:** it needs a new FR and AR string.
- **Where it lives:** `src/app/admin/signalements/page.tsx`.
- **Trigger:** the next admin PR that adds strings to this page.

## 375: an active `?q=` / `?motif=` filter cannot be cleared
- **What:** the frame draws no search or filters at 375, so they are `hidden lg:flex`. A filtered URL opened on a phone shows « Aucun signalement ne correspond… » with no way to clear it.
- **Why deferred:** not drawn. Needs the founder's call (a « Réinitialiser » link, or show the filters).
- **Where it lives:** `src/app/admin/signalements/_components/ReportsQueueView.tsx`.
- **Trigger:** the founder's answer to the 375 filters question in `docs/design/admin-shell-reports-deltas.md`.

## The mobile drawer stays locked if the window grows past lg
- **What:** `AdminShell`'s drawer is `lg:hidden`, but its scroll lock keeps running when the viewport widens while it is open. The same is true of the shared `AppShellClient`.
- **Why deferred:** an edge case on desktop resize only; the same fix belongs in both shells.
- **Where it lives:** `src/app/admin/AdminShell.tsx`, `src/components/shell/AppShellClient.tsx`.
- **Trigger:** the next shell PR. Add a `matchMedia('(min-width: 1024px)')` listener that closes the drawer.

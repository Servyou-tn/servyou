# Admin PR-3 — Contenu + Litiges follow-ups (`feat/admin-content-disputes`, 2026-11-06)

## J4 reads the first 500 rows of a table, then filters in memory
- **What:** `/admin/contenu` loads up to 500 rows of the active table (newest first), then searches, filters, sorts and paginates them. Past 500 items, older ones are unreachable, and « Signalés d'abord » ranks within those 500 only. The owners read also sends every owner id in one `.in()` URL (about 20 KB at 500): chunk it at about 100 ids.
- **Why deferred:** launch volume is far below that. Server-side search over titles and owner names needs an RPC (Agent A's side).
- **Where it lives:** `src/app/admin/contenu/page.tsx` (`LIMIT`).
- **Trigger:** any table passes about 300 rows.

## J7 lists the first 100 disputes of a tab
- **What:** the disputes table shows up to 100 per tab, with no pagination. A selected dispute outside those 100 is still shown, at the top of the list.
- **Why deferred:** volume.
- **Where it lives:** `src/app/admin/litiges/_lib/load.tsx`.
- **Trigger:** any tab passes about 50 disputes. Add the shared Pagination.

## Review leftovers (PR #332)
- **What:**
  - (a) `admin_unhide_content` restores products / services as `status = 'active'`, losing a seller's paused / sold-out / draft state. The UI now offers « Masquer » on visible items only, so this cannot happen from J4, but the function still behaves this way for anything hidden elsewhere.
  - (b) Clicking a dispute on the « En cours » tab lands on « Ouverts » (an under-review dispute's tab is Ouverts).
  - (c) After a successful « Masquer », focus falls to the page body while the row re-renders.
  - (d) The closed-dispute date is `updated_at`, since there is no decided-at column.
- **Why deferred:** (a) needs a migration (keep the prior status in the moderation marker), which is the architect's call. (b)–(d) are low.
- **Where it lives:** the `admin_hide_content` / `admin_unhide_content` functions; `src/app/admin/litiges/_lib/load.tsx`; `src/app/admin/contenu/_components/ModerationButtons.tsx`.
- **Trigger:** (a) before any admin surface offers « Masquer » on non-visible items; (b)–(d) the next PR touching these files.

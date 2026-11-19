# Bell UI-2 — the panel (`feat/bell-panel`, 2026-11-19)

## The 20 newest rows can include a kind the map drops

- **What:** the list query takes the 20 newest rows with no kind filter, and the loader drops a kind the map does not
  know (reported as `bell rows`). Since #401 D8 the unread count only counts the known kinds. So a burst of unknown-kind
  rows can still push older known rows out of the 20 listed, and the count may then include known unread rows that sit
  below them. This is the same « more unread than listed » case as an unread count above 20, which the pill already
  shows.
- **Why deferred:** unreachable today. The DB CHECK allows exactly the map's two kinds, and a test pins them. Filtering
  the list by kind would silence the `bell rows` alarm, which is what catches a kind shipped before its map entry.
- **Where it lives:** `loadBellFeed` in `src/lib/notifications/bell-feed.ts`.
- **Trigger:** the first `bell rows` report, or a kind migration applied before its map entry.

## « Tout marquer » failure line comes back when the panel is reopened

- **What:** after a failed « Tout marquer comme lu », `useBellFeed`'s `markAllFailed` stays true until the next page load.
  Closing and reopening the panel shows the error line again (Sonnet review of #402, nit).
- **Why deferred:** it is still true: the mark did fail and nothing was retried. Clearing it on close is a change to
  #401's hook, for a rare path.
- **Where it lives:** `src/components/shell/useBellFeed.ts` (`markAllFailed`), shown by `BellPanelHeader`.
- **Trigger:** a report of it, or the next change to the hook.

## The surface is chosen when the bell is pressed

- **What:** the bell opens the desktop panel at ≥ 1024 and the bottom sheet below. That is decided on the press, so
  resizing across 1024 while one is open keeps it (decision D17 on #402). Not covered by a test.
- **Why deferred:** a window resized across 1024 with the panel open is rare, and both surfaces keep working at either
  width.
- **Where it lives:** `onOpenChange` in `src/components/shell/TopbarNotifications.tsx`.
- **Trigger:** a report of a sheet stuck open on a desktop-wide window, or the reverse.

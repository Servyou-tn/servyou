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

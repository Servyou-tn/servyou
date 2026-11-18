# Bell UI-1 — follow-ups (`feat/bell-ui`, 2026-11-18)

## The panel itself (desktop dropdown + mobile bottom sheet) waits for its Figma frame

- **What:** the visual half of UI-1. The topbar badge (server-rendered, refreshed on page load) and the panel (the
  20 newest items) need building. Desktop gets a dropdown at 1440, the phone a bottom sheet at 375, in FR / EN / AR. The
  Paramètres « Notifications sur la plateforme » line (« … arriveront dans une prochaine mise à jour ») and its
  « Bientôt disponible » chip change in the same PR, since they stay true until the panel ships.
- **Why deferred:** founder, 2026-11-18. The architect is designing the frame (section « NOV 18 — Notifications »).
  The panel must not be built before the frame ids arrive. Then one Figma read per frame, for the final comparison only.
- **Where it lives:** the data and the logic are ready.
  - `loadBellFeed(readerId)` in `src/lib/notifications/bell-feed.ts`: server, signed-in reader only. Anon has no SELECT
    grant.
  - `useBellFeed(feed)` in `src/components/shell/useBellFeed.ts`: the optimistic read state, `openItem`, `markAll`,
    `markAllFailed`.
  - The panel renders `t(item.sentenceKey, lang, { status: t(item.statusKey, lang) })`, the item title (or `item.ref`)
    in an isolate, and `relativeTimeLabel(item.createdAt, lang)`.
  - Wire the server read through `AppShell` (a Suspense slot, so the page never waits) into
    `Topbar` → `TopbarNotifications.tsx`.
  - Never render « Aucune notification » for a failed feed (`ok: false`).
  - Offer « Tout marquer comme lu » whenever `unreadCount > 0`, even with an empty or all-read list. A row the loader
    drops (unreadable order; reported as `bell rows`) still counts in the badge. That is unreachable today, but it is
    the only way out of such a state.
  - Check in a real browser that the badge and the dot do not flash back to the old count between the mark and the
    next page. That would mean `useOptimistic` reverting before `router.push` / `router.refresh` lands; jsdom cannot
    show it (Sonnet review of #401, finding 5). If it does flash, keep the transition open until the navigation lands.
- **Trigger:** the frame ids from the founder.

## Admin shells keep the empty bell

- **What:** the admin desktop topbar (the shared `Topbar`) and the admin mobile header's `AdminBell` show the honest
  empty panel. v1 notifies order parties only, and an admin acting as admin is never one.
- **Why deferred:** plan §7. Admin events (moderation, suspension, refusal void, COD block lift) are a later phase.
- **Where it lives:** `src/app/admin/AdminShell.tsx` (`AdminBell`), `src/components/shell/Topbar.tsx`.
- **Trigger:** the admin-events phase of the bell.

## A seller who changed seller type lands on a gated order page

- **What:** the link comes from the reader's side of the order: a shop owner's product order goes to
  `/commandes-recues/[id]` (`requireShopOwner`), and a freelancer's service order goes to `/mes-engagements/[id]`
  (`requireFreelancer`). A seller who later switched type (or became a consumer) keeps the old notifications, and those
  links then hit the role gate.
- **Why deferred:** an edge case. Switching type deletes the role's content but keeps completed transactions. The
  right page for « an order I sold under a role I no longer have » is a product question.
- **Where it lives:** `bellHref()` in `src/lib/notifications/bell.ts`.
- **Trigger:** the first report of it, or the seller-type switch flow's next revision.

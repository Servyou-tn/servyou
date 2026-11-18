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
  - Every kind yields the same `BellItem` (`src/lib/notifications/bell.ts`), so the panel has ONE row and never
    branches on `kind`. It renders:
    - `item.icon` through a `Record<BellIcon, LucideIcon>` in the panel. The `Record` type forces a component for every
      key.
    - `item.tone` through a `Record<BellTone, …>` of tokens.
    - `bellSentenceText(item.sentence, (key, vars) => t(key, lang, vars))`.
    - The item title (or `item.ref`, which may be null) in an isolate.
    - `relativeTimeLabel(item.createdAt, lang)`.
  - The order kinds' icon and tone are provisional rules, to check against the frame at the panel's Figma read:
    - icon = the sidebar icon of the page the item opens: Package for « Mes commandes », Inbox for « Commandes reçues »,
      Handshake for « Mes engagements »;
    - tone = the tone of the status pill of the status reached.
    - Both are tested against `sidebar-items.ts` and `StatusPill`. If the frame differs (an icon per status, say), the
      change is one function in `bell-kinds.ts`.
  - Wire the server read through `AppShell` (a Suspense slot, so the page never waits) into
    `Topbar` → `TopbarNotifications.tsx`.
  - Never render « Aucune notification » for a failed feed (`ok: false`).
  - Offer « Tout marquer comme lu » whenever `unreadCount > 0`, even with an empty or all-read list. A row the loader
    drops (a kind the map does not know, or an unreadable subject; reported as `bell rows`) still counts in the badge.
    That is unreachable today, but it is the only way out of such a state.
  - Check in a real browser that the badge and the dot do not flash back to the old count between the mark and the
    next page. That would mean `useOptimistic` reverting before `router.push` / `router.refresh` lands; jsdom cannot
    show it (Sonnet review of #401, finding 5). If it does flash, keep the transition open until the navigation lands.
- **Trigger:** the frame ids from the founder.

## A later kind (plan §7) is one entry in the kind map

- **What:** mission alerts, proposals, stock and moderation. Each one needs:
  1. A DB migration: its key in `notifications_kind_check` and `notifications_kind_shape`, the column(s) for its
     subject, and the trigger that writes it.
  2. Its columns in the `loadBellFeed` select, and in `BellRow`:
     - add an optional embed for its subject;
     - widen `to_status` to `string | null` if the kind carries no status (`order` is already nullable). Each order
       entry's `read` then has to reject a null status.
  3. One `defineBellKind(…)` entry in `BELL_KINDS` (`src/lib/notifications/bell-kinds.ts`), with its `BellKindName`.
     The entry has `read` (its context from the row), `icon`, `tone`, `sentence`, `href` and `subject`.
  4. Its sentence keys in FR / AR / EN, and any new icon key in `BellIcon`, mapped in the panel.
  5. Its cases in `bell-kinds.test.tsx`. That includes the « maps exactly the kinds the DB allows » list, which fails
     until the kind is added.

  The item, the panel and the read actions do not change.
- **Order of shipping:** the map entry ships with or before the migration that allows the kind. Until then, the loader
  drops that kind's rows (reported as `bell rows`) while the badge counts them.
- **Why deferred:** plan §7. v1 is order events only (founder 2026-11-15).
- **Where it lives:** `src/lib/notifications/bell-kinds.ts`. `defineBellKind` is tested with a stand-in « low stock »
  kind that has its own context.
- **Trigger:** each later phase of the bell.

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
- **Where it lives:** `bellHref()` in `src/lib/notifications/bell-kinds.ts`.
- **Trigger:** the first report of it, or the seller-type switch flow's next revision.

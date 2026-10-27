# H8 PR-1 — « Mes engagements » list (`feat/h8-mes-engagements`, 2026-10-25)

## H4 « Engagements actifs » and H8 « En cours » count different things (ruling D9)

- H4's tile (`activeOrderCounts` in `freelancer-dashboard.ts`) counts every non-terminal status, `pending`
  included. H8's « En cours » tile and tab are `accepted` ONLY, with pending carried by « À traiter ». A freelancer
  with 2 pending + 3 accepted sees « 5 » on the dashboard and « 3 » here. Not edited (H4 is shipped and out of
  scope); the fix is to relabel/redefine H4's tile (e.g. « Engagements actifs » = accepted + arrived, and its
  « Demandes en attente » tile already counts pending) — a founder call.

## `StatTile` has a fourth consumer

- H8 imports H5's `mes-services/_components/StatTile` across routes instead of copying it a fourth time
  (G4, H4, H5 already carry route-local copies and a « promote at the 3rd consumer » comment). Promoting all
  of them to `src/components/shared` touches four shipped dashboards — its own PR.

## `cancelOrderAction` used to write `cancelled_at` (fixed in this PR, ruling D7)

- `authenticated` has no UPDATE grant on `orders.cancelled_at`, so a seller-side cancel from G8 / G9 would have
  failed with 42501. No seller has ever cancelled live (both cancelled orders are buyer-cancelled), so it was
  never seen. The DB role is to add the live assertion; a mock test cannot see a column grant, so the unit test
  pins the payload to granted columns.
- Still open next to it: the buyer-side cancel/receipt calls remain direct client `.update()`s (the old
  `CancelOrderModal`, `ReceiptConfirmButton`, `OrdersList`) — correct, unmigrated, already logged above.

## Détail links point at a route PR-2 builds

- The « Voir » button and the kebab's « Voir le détail » go to `/mes-engagements/[id]`, which does not exist until
  H8 PR-2 — a 404 if PR-1 ships alone. Merge PR-2 with (or right after) PR-1.

## Échéance / « À livrer » wait for a deadline column (PR-3)

- The frame's ÉCHÉANCE column and « À livrer » tile need `orders.deadline` (set at accept — founder decision,
  2026-07). PR-1 shows the buyer's requested timeframe under « Délai souhaité » and an « À traiter » tile instead.
- `orders` snapshots no `price_unit`, so the budget reads « Dès 300 TND » with no « / heure ». Optional DB gap.

## `getEngagements` fetches every order, and the budget unit is the listing's current one

- Small-data posture (as G8): all of a freelancer's service orders are fetched and tabbed / searched / paged in
  JS. PostgREST caps a response at 1000 rows, so a freelancer past 1000 service orders would silently lose the
  oldest and the tiles would undercount. Move tab / sort / page into SQL with `count` queries when anyone nears it.
- The budget's unit (« / heure », « / mois ») is `service_listings.price_unit` as of NOW — `orders` snapshots only
  the price. A listing edited in H7 after the order can show a different unit than the one ordered. A `price_unit`
  column on `orders` (set by `set_order_snapshot`) would freeze it; optional DB gap.

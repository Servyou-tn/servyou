# Admin dashboard stats, orders list, journal: follow-ups (`feat/admin-dashboard-stats`, 2026-11-06)

Migration `20261106093535_admin_dashboard_stats` (README #123, discovery `docs/discovery/admin-dashboard-stats.md`).
Ranked, most important first.

## 1. The brief's plan doc was never found: D1–D6 and D10 are recommendations, not rulings

**What:** `claude/admin-dashboard-plan-2026-11-04.md` is not in either checkout, in git history or on disk. Every metric
was defined from the Figma frames (J1 / J8 / J9 / J11) as a numbered decision, and the migration implements the
recommended option. The open founder questions are D1 (delivery fee in the declared value), D2 (demand per category),
D3 (city filter side), D4 (« vendeur actif »), D5 (loyal buyers, all time) and D10 (orders without a snapshot).
**Why deferred:** the architect applied the recommended options; changing one is a new migration.
**Where it lives:** `private.admin_period_kpis`, `private.admin_active_sellers`, `private.admin_orders`,
`public.admin_dashboard_stats`.
**Trigger:** the founder rules differently on any D, or the plan doc turns up with another definition.

## 2. The J9 list's period is rolling, the dashboard's is in Tunis days

**What:** `admin_dashboard_stats(7)` counts from 00:00 Africa/Tunis six days ago; `admin_list_orders(p_days => 7)` /
`admin_count_orders` count from `now() - 7 days`. Shown side by side, « 7 derniers jours » can differ by part of a day.
**Why deferred:** no built screen shows the two side by side yet; aligning them changes what a live parameter means.
**Where it lives:** `public.admin_list_orders`, `public.admin_count_orders`, `public.admin_list_audit_log` (`p_days`).
**Trigger:** B puts a J9 count next to a J1 / J8 KPI for the same period, or a founder asks why they differ.

## 3. Not delta-tested live: by category, by city, weekly, snapshot

**What:** the live suite proves the KPIs, the funnel, the queue's blocked count, the list / counts and the journal by
exact fixture deltas. `by_category`, `by_city`, `weekly` and `snapshot` (active sellers, sellers without orders, loyal
buyers) were only checked for shape and against the read-only compile check of the discovery.
**Why deferred:** each needs categories / cities / backdated weeks on production fixtures, for metrics whose definition
(D2, D4–D6, D9) may still change (#1).
**Where it lives:** `src/__tests__/admin-dashboard-stats-live.test.ts`.
**Trigger:** the founder confirms D2 / D4–D6 / D9, or one of these figures is disputed.

## 4. A parse schema for the `admin_dashboard_stats` jsonb

**What:** the RPC returns `Json`, so Agent B casts it. A zod schema in `src/lib/admin/` would type it and fail loudly on
a shape change.
**Why deferred:** B's call: B may prefer its own type next to the page.
**Where it lives:** the `Stats` type in the live suite is the shape B needs.
**Trigger:** B asks for it.

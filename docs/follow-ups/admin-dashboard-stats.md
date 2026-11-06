# Admin dashboard stats, orders list, journal: follow-ups (`feat/admin-dashboard-stats`, 2026-11-06)

Migration `20261106093535_admin_dashboard_stats` (README #123, discovery `docs/discovery/admin-dashboard-stats.md`).
Ranked, most important first.

## 0. 🟠 MEDIUM — « current » is shorter than « previous », so every delta leans negative (review, 2026-11-06)

✅ CLOSED — migration `20261106132948_admin_dashboard_stats_same_span` (architect, 2026-11-06; README #124), recorded on
`fix/admin-stats-same-span`. `previous` = [`previous_from`, `previous_to`) with `previous_to` = now − p_days days;
`period` returns `previous_to`. The live suite asserts both spans are equal for 7 / 30 / 90 days.

**What:** in `admin_dashboard_stats`:
- `current` = [00:00 Tunis (p_days − 1) days ago, now): p_days − 1 full days plus part of today;
- `previous` = [v_from − p_days days, v_from): p_days full days.

At 09:00 Tunis the 7-day `current` is ~6.4 days against a full 7, so orders, sign-ups, sellers and declared value all
show a negative bias that shrinks through the day. The UI computes the % from these raw values.
**Fix (new migration, architect):** compare the same elapsed span one period back — `previous` =
[v_prev, v_now − p_days days):
`'previous', private.admin_period_kpis(v_prev, v_now - make_interval(days => p_days))`, and add `previous_to` to
`period`. The signature is unchanged; the live suite's deltas stay valid (they read `current` only).
**Why deferred:** it changes an applied function; only the architect applies migrations.
**Where it lives:** `public.admin_dashboard_stats`, the `'previous'` line.
**Trigger:** before B shows a delta % on J1 / J8. Until then, B should show `previous` without a % or hold the delta.

## 1. The brief's plan doc was never found: D1–D6 and D10 are recommendations, not rulings

✅ CLOSED — founder ruling, 2026-11-06: **D1–D12 accepted as recommended, except D11: no CSV export.** The live
functions already implement every accepted option, so no migration follows. D11 needed no database object (it paged
through the existing RPCs), so nothing is removed either: the admin pages simply ship without an export button.

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
buyers) were only checked for shape and against the read-only compile check of the discovery. Also not asserted:
`new_signups` and `job_posts` (the fixture users exist before the baseline), the `p_city` filter, and the journal's
`p_action` / `p_target_type` filters.
**Why deferred:** each needs categories / cities / backdated weeks on production fixtures, for metrics whose definition
(D2, D4–D6, D9) may still change (#1).
**Where it lives:** `src/__tests__/admin-dashboard-stats-live.test.ts`.
**Trigger:** the founder confirms D2 / D4–D6 / D9, or one of these figures is disputed.

## 4. A parse schema for the `admin_dashboard_stats` jsonb

✅ CLOSED — `src/lib/admin/dashboard-stats.ts` (`parseDashboardStats`, `DashboardStats`) on `fix/admin-stats-same-span`;
unit-tested in `dashboard-stats.test.ts`, and the live suite parses every answer with it.

**What:** the RPC returns `Json`, so Agent B casts it. A zod schema in `src/lib/admin/` would type it and fail loudly on
a shape change.
**Why deferred:** B's call: B may prefer its own type next to the page.
**Where it lives:** the `Stats` type in the live suite is the shape B needs.
**Trigger:** B asks for it.

## 5. LOW — small consistency notes for the next migration that touches these functions (review, 2026-11-06)

- `admin_list_orders` orders by `created_at` only: rows with the same timestamp can repeat or skip across pages. Add
  `, o.id` as a tie-break.
- `by_category` counts listings whose owner is suspended; `active_sellers` and `by_city` exclude them.
- `admin_list_audit_log` returns `before_state` / `after_state` whole. No action stores personal data there today; a
  future one that does would surface on J11.

**Why deferred:** none is wrong at today's volume; each needs a new migration.
**Trigger:** the next migration that touches these functions (the same-span fix, #0, changed only the `'previous'` line).

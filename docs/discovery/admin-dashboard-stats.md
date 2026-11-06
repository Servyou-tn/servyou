# Admin dashboard read side — discovery + plan (`feat/admin-dashboard-stats`, 2026-11-06)

Role: db-guardian. Migration: `db/migrations/PENDING_admin_dashboard_stats.sql`. It is **written, not applied**: the
architect reviews and applies it. All reads below are live, read-only `execute_sql` on `xggomcitqrkaylqezjjz`.

> **The brief's plan doc `claude/admin-dashboard-plan-2026-11-04.md` was not found**: not in either checkout, not in
> git history, not on disk. It probably lives in the architect's project knowledge. Every metric below is therefore
> defined from the Figma exports (`servyou-wt-app/docs/design/admin-j1-overview*`, `admin-j8-stats*`,
> `admin-j9-orders*`, `admin-j11-log*`) and written as a numbered decision with a recommendation. The Figma numbers
> are sample data; nothing here is calibrated against them. Please send the plan doc if it defines any of these
> differently.

## What is live today

| Thing | State |
|---|---|
| `admin_overview_stats()` | All-time totals (users, shops, freelancers, listings, posts, received orders, open reports / disputes). Used by `src/app/admin/page.tsx`. **Untouched.** |
| `admin_audit_log` | Already has an admin SELECT policy (« Admins read audit log »). 8 rows: suspend / unsuspend user, hide / unhide shop, claim / resolve report. |
| `orders` | 16 rows, all created **June–August 2026**: **none in the last 90 days**. Statuses: pending 5, accepted 2, prepared 1, arrived 2, received 4, cancelled 2. Product 6, service 10. Admin SELECT policy exists. |
| `order_events` | The trigger fires on insert and on every status change, but it started 2026-08-10: **2 rows, both `created`, no transitions**. History before that does not exist. |
| Snapshot columns | **14 of 16 orders have no `item_title` / `unit_price_tnd`**: they predate the snapshot. One received order has no `received_at`. |
| Cities | `profiles.city` is always filled (8 cities). `shops.city` is set on 1 shop of 6; `freelancer_profiles.city` is mostly set. |
| Categories | product 5 top-level, service 13 top + 92 sub, 1 `both`. `service_listings.category_id` and `job_posts.category_id` hold top-level ids today. |

**What that means for the dashboard today:**
- Every 7 / 30 / 90-day figure is honestly 0 or null.
- The two timing metrics (acceptance delay, first proposal) have 0–1 samples, so they return `null`, never 0.
- The order list shows 6 « bloquées » (5 pending > 48 h, 1 arrived > 7 days) and 14 rows with no amount.
- Per the phase-aware rules, there are no fake deltas: the RPC returns current and previous values raw, and the UI
  computes the % only when the previous value is non-zero.

## Plan (the PENDING file)

Read-only: no table, no write grant, so `db/client-write-allowlist.json` is unchanged. Each function:
- is `stable`, `security definer`, `search_path ''`, with fully qualified names;
- gates on `is_admin()` (42501) and validates its parameters (23514);
- is EXECUTE for authenticated, revoked from PUBLIC / anon.

Periods are cut in **Africa/Tunis days**: « 7 derniers jours » = today + the 6 days before. No function returns
`delivery_*`, a phone or an e-mail.

1. **Private helpers** (schema `private`: not exposed by PostgREST, no client EXECUTE):
   - `order_status_rank`;
   - `admin_active_sellers()` (D4);
   - `admin_period_kpis(from, to)`;
   - `admin_orders(search, type, city, since)`: one shared filter, so the J9 list and its tab counts cannot drift.
2. **`admin_dashboard_stats(p_days 7|30|90)` → jsonb** (J1 + J8). It returns:
   - `period`;
   - `current` and `previous` KPIs, raw:
     - orders created and received; created → received; created → cancelled;
     - declared value (D1);
     - acceptance median + sample count;
     - new sign-ups, active buyers, new sellers;
     - posts and posts with a proposal;
     - first-proposal median + sample count;
   - `snapshot`: active sellers (D4), sellers without orders (D6), loyal buyers (D5);
   - `weekly`: 8 ISO weeks, created vs received;
   - `funnel` (D8);
   - `by_category` (D2), `by_city` (D9);
   - `queue`: the J1 « À traiter maintenant » — open reports (+ fake-scam ones, oldest), open disputes, blocked orders,
     pending deletions (+ oldest, for the 48 h promise), pending exports, new contact messages (+ oldest).
3. **`admin_list_orders(tab, search, type, city, days, sort, limit ≤ 200, offset)` + `admin_count_orders(search, type,
   city, days)`** (J9):
   - Tabs: all / blocked / in progress (accepted → arrived) / received / cancelled.
   - Search: the app's `shortRef` (`#` + the first 6 hex of the id, upper case; a leading `#` is optional), article,
     buyer or seller name. ILIKE with `%` / `_` escaped; ≤ 80 characters.
   - Rows: buyer name + city; seller name (the shop's for a product), kind and city; amount; status; `status_since`
     (D7); `is_blocked`; `total_count`.
4. **`admin_list_audit_log(search, action, target_type, days, limit ≤ 200, offset)`** (J11):
   - Newest first, with `target_label` and the acting admin's name. `before_state` / `after_state` are raw jsonb; the
     UI renders « avant → après ».
   - Labels by target type:

     | Target type | Label |
     |---|---|
     | user, freelancer_profile, deletion_request, data_export | name |
     | shop | shop name |
     | product, service, job_post | title |
     | order, report | short ref |
     | dispute | the order's ref |
     | contact_message | sender name |

   - Search: note, label, action.

**Compile check, done read-only (no function created):** every query body ran as a plain SELECT on the live data, with
literals for the parameters and the `is_admin()` gate left out.

- **KPIs**, last 90 days: 2 orders created, 0 received, 3 job posts (1 with a proposal), first-proposal median 1 585 min
  on 1 sample, acceptance `null` on 0 samples. Previous 90 days: 14 created, 3 received, 2 cancelled — declared value
  0, because those orders have no price snapshot (D10).
- **Snapshot:** 11 active sellers, 9 sellers without an order, 1 loyal buyer.
- **Weekly:** S38–S45, all 0.
- **Category / city:** 18 categories with listings (Mode 10 listings + 2 orders, Design graphique & logo 5 + 3 posts, …)
  and 7 cities.
- **Orders:** tabs 16 / 6 blocked / 5 in progress / 4 received / 2 cancelled. `status_since` is exact for 10 of 16. A
  ref search finds its order.
- **Funnel** (all time, for a non-zero sample): 16 → 9 accepted → 6 arrived → 4 received; 5 still pending, 2 cancelled.
- **Audit:** all 8 rows get a label and an admin name.
- **Not compiled:** the PL/pgSQL wrappers (`return query`, `#variable_conflict use_column`) — their return types were
  checked against the columns by hand. The architect's apply is their first compile.

## Decisions for the founder (numbered; the file implements the recommended option)

- **D1 Declared value** = article × quantity + delivery fee, on orders **received** in the period. It is cash on
  delivery: declared, never collected by ServYou (J9's subtitle). Alternative: without the delivery fee.
- **D2 « Demandes » per category** = orders of the period + job posts of the period, both counted. Alternative: orders
  only. The RPC returns the counts separately; **the UI chooses the « Équilibré / Manque d'offre / Manque de demande »
  thresholds** (suggestion: listings ≥ 2 × demand → manque de demande; demand ≥ 2 × listings → manque d'offre).
- **D3 City filter (J9)** matches the buyer's city OR the seller's. Alternative: the buyer's only (the delivery city).
- **D4 « Vendeurs actifs »** = sellers, not suspended, with at least one listing a buyer can see **now** (active, not
  hidden, shop / profile not hidden): 11 today. A snapshot, so no delta. Alternative: sellers with an order in the
  period.
- **D5 « Acheteurs fidèles »** = at least 2 received orders, all time. Alternative: within the period (would be ~0 for
  months).
- **D6 « Vendeurs sans commande »** = a shop / freelancer profile created more than 14 days ago whose owner has never
  had an order.
- **D7 « Depuis » / blocked:**
  - Exact for pending (`created_at`), received (`received_at`) and cancelled (`cancelled_at`).
  - Otherwise the first `order_events` row to that status (the app's `stageTimestamps` rule).
  - Otherwise `updated_at`, which a carrier edit also bumps, flagged `status_since_exact = false`: 6 of 16 orders today.
  - Blocked = pending > 48 h, or arrived > 7 days (J9's definition).
- **D8 Funnel « reached X »** = the current status is at or past X, or an event went to X or past it. A cancelled order
  with no event counts as « créée » only. « Plus grosse perte » = `still_pending` (the UI picks the largest drop).
- **D9 City source** = `profiles.city`. It is always set; `shops.city` is set on 1 of 6 shops. Sellers per city =
  active sellers; buyers and orders per city = the buyer's city. The J9 rows show the shop / freelancer city when set,
  else the profile's.
- **D10 Orders without a snapshot** (14 of 16):
  - The article falls back to the listing's current title.
  - The amount stays **null** (shown as « — »). Borrowing today's price could show a wrong amount.
  - They add nothing to the declared value.
- **D11 CSV export** pages through the same RPCs (`p_limit` ≤ 200). It does not need its own endpoint.
- **D12 The J1 « Dernières actions » and « Commandes récentes »** use `admin_list_audit_log(p_limit => 3)` and
  `admin_list_orders(p_limit => 5)`. There is no extra function.
- **Not built:** « Visites et conversion de la recherche ». It is not in the database; J8 itself says « disponibles
  après l'installation de la mesure d'audience ».

## For Agent B

- `admin_dashboard_stats` returns `jsonb`, so it types as `Json`. B needs a parse schema (zod) for its shape. I can
  add one in `src/lib/admin/` in this PR after the apply if wanted.
- The lists are `table(...)` returns, so they are typed after the types regenerate.
- Deltas: compute in the UI. Show nothing when `previous` is 0, and « — » when a median is `null` (with
  `*_samples` = 0).

## Test plan (after the apply: one live suite, ≤ 12 sign-ins, unique prefix, verified cleanup)

`src/__tests__/admin-dashboard-stats-live.test.ts`:
- **Access:** a non-admin gets 42501 on all four; anon has no EXECUTE.
- **Bad parameters** → 23514: p_days 14, an unknown tab / type / sort, an 81-character search.
- **Fixtures created now** by the service role: a shop + product, a freelancer + service, 3 orders with snapshots,
  status changes made by the seller session (so `order_events` exist), 1 job post + 1 proposal.
  - KPIs: the period counts rise by exactly the fixtures; the declared value is the sum.
  - The acceptance median and the first-proposal median are non-null.
  - The funnel `reached_*` match the fixtures' paths.
  - `by_category` / `by_city` rows move by the fixture counts.
- **Orders list:** ref search, title search, the `%` / `_` escape, tab counts = list `total_count` per tab, blocked
  pending (backdated `created_at`), no `delivery_*` column in the result.
- **Audit log:** a fixture admin action (e.g. a hide) shows with its label and admin name; search on its note.
- **Caveat:** while the suite runs, the fixtures show on the live dashboard. Teardown must bring every count back
  (checked read-only before and after).

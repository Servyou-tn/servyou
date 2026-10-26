# Pre-launch security batch — Phase 1 discovery & proposal

Branch `fix/prelaunch-security-batch` (from `origin/main` 9e6e64b). Live DB `xggomcitqrkaylqezjjz`, PG 17.6,
observed 2026-10-25.

**Status: proposal only.** No migration file written, nothing applied, nothing committed. DB access was
SELECT-only (plus `SET LOCAL ROLE anon` SELECTs inside a rolled-back transaction). No test was run, so no
fixture was created on production. Awaiting architect approval.

Items: **A** shop-side/job-skill reads · **B** SECURITY DEFINER EXECUTE + search_path · **C** request-table
INSERT columns · **D** default-grant sweep (orders = grants only) · **E** `orders.received_at` · **F** seller-cancel test.

---

## 0. Read first — where live state differs from the brief

| # | Brief / expectation | Live state | Consequence |
|---|---|---|---|
| 1 | E: "confirm nothing in the app writes `received_at`" | **It does, in two client components:** `ReceiptConfirmButton.tsx:33` and `mes-commandes/_components/OrdersList.tsx:253`, both `.update({ status: 'received', received_at: new Date().toISOString() })` (already logged, follow-ups L305). | Revoking the column grant first breaks "confirm receipt" for every buyer (42501). E must be sequenced: trigger now (E1), grant revoke only after those writes are gone (E2). |
| 2 | F: H8 removes `cancelled_at` from `cancelOrderAction` | **Live bug on main.** `orders.ts:250` puts `cancelled_at` in the SET list; `authenticated` has no table UPDATE and no column UPDATE on it (`has_column_privilege = false`), so every seller cancel through that action must fail 42501. Live data agrees: 0 of 2 cancelled orders is seller-cancelled. Buyer cancel (`CancelOrderModal`, direct update, no `cancelled_at`) works. | Urgent for H8 regardless of this batch. F's test pins the premise. |
| 3 | B(2): `freelancer_has_active_listing` is "used in RLS policies or called by app code" | Used by **no** policy, default, CHECK, index or view, and no `.rpc(` call anywhere in `src`/tests. Its only caller is the DEFINER trigger fn `sync_freelancer_is_published`. | Class 1: revoke from PUBLIC/anon/authenticated (matches follow-ups L4248). |
| 4 | B implies exposure | **No live exploit.** All six admin functions re-check `is_admin()` first (all bodies read). Trigger functions cannot be called over RPC. | B is defence-in-depth + advisor noise (0028: 31→3, 0029: 32→10, 0011: 3→0). |
| 5 | C: INSERT policy only checks `auth.uid() = user_id` | Both tables have `*_one_pending_per_user` partial unique indexes, **but an INSERT with a non-`pending` status sidesteps them.** | Live: unlimited rows per user. Latent (no UI renders these columns today): forged `processed_by`/`export_url`, self-approved deletion. |
| 6 | A: scale | Anon can read 26 products today; **1 is non-live** (`hidden`) plus its 1 image. Shops / payment methods / shop_categories / job_post_skills: 0 affected rows today. | Structural gap with almost no data yet; cheapest moment to close it. |

Advisor reconciled: lint 0028 (anon) = 31, 0029 (authenticated) = 32 (+`is_active_user`), 0011 = 3. Matches the architect's scan.

---

## 1. Proposed PR split and order

| PR | Contents | Migration | App files | Why separate |
|---|---|---|---|---|
| **PR-1** `fix/prelaunch-shop-read-rls` | **A** | 1 (policies only; DROP+CREATE in one txn, no open window) | 0 expected | Behaviour change on public reads; riskiest for pages. Standard B: isolate. |
| **PR-2** `fix/prelaunch-acl-hardening` | **B + C + D** | 1, three delimited sections, each with its own rollback | 0 (+ test edits, README, skill note) | All three are ACL-only with one failure mode ("permission denied") and one test blast radius. Split into 2–3 files if you prefer. |
| **PR-3** `fix/prelaunch-order-lifecycle` | **E1 + F** (E2 later) | 1 (new trigger fn only) | 0 now; 2 one-line removals at E2 | Sits on H8's area; must be sequenced with them. |

**Recommended apply order:** PR-1 → PR-2 → PR-3. PR-1 and PR-2 are independent (PR-2 deliberately keeps anon `SELECT` on `orders`, which PR-1's policies need).
Types: `database.types.ts` expected unchanged (policies/grants/trigger fns); I will regenerate and confirm no diff.

---

## 2. Item A — shop-side reads

### Live today
- Six `FOR SELECT USING (true)` policies, role PUBLIC: `products`, `shops`, `product_images`, `shop_payment_methods`, `shop_categories`, `job_post_skills`. No other table has an unrestricted SELECT except `categories` (correct).
- Visibility columns: `products.status` (`active|hidden|sold_out`; `sold_out` is never written by the app, 0 rows), `products.admin_hidden_at`, `shops.admin_hidden_at` (**shops has no status/published column**), `job_posts.status` + `admin_hidden_at`.
- `admin_hide_content('shop')` sets **only** `shops.admin_hidden_at`; its products stay `status='active'`. The app compensates with `shops!inner` + `.is('shops.admin_hidden_at', null)` everywhere; the REST API does not.
- Empirical (`SET LOCAL ROLE anon`): 26 products visible, 1 non-live; 1 image of a non-live product; shops 1/1 (not hidden); `note` non-null on 0 payment-method rows; job_post_skills 2 (all on readable posts).
- **Adjacent, already logged (follow-ups L4208):** the `job_posts` public policy is `status='open' OR consumer_id=uid` with **no** `admin_hidden_at` term, so a moderated open post is REST-readable. A `job_post_skills` policy that delegates to `job_posts` inherits that hole unless it is fixed too (0 such rows today).

### Proposed SQL (sketch)
```sql
-- shops: live, or own, or admin, or a buyer who ordered from this owner.
-- Buyer branch reads ORDERS ONLY (never joins products): products' policy reads shops, so a
-- shops→products edge would be 42P17 infinite recursion.
drop policy "Shops viewable by everyone" on public.shops;
create policy "Shops readable when live, or by owner, buyer, or admin" on public.shops for select using (
     admin_hidden_at is null
  or owner_id = (select auth.uid())
  or (select public.is_admin())
  or exists (select 1 from public.orders o
              where o.seller_id = shops.owner_id and o.order_type = 'product'
                and o.buyer_id = (select auth.uid()))
);

-- products: live AND its shop un-hidden; or own; or admin; or the buyer of an order on it.
drop policy "Products viewable by everyone" on public.products;
create policy "Products readable when live, or by owner, buyer, or admin" on public.products for select using (
     (status = 'active' and admin_hidden_at is null
        and exists (select 1 from public.shops s where s.id = products.shop_id and s.admin_hidden_at is null))
  or exists (select 1 from public.shops s where s.id = products.shop_id and s.owner_id = (select auth.uid()))
  or (select public.is_admin())
  or exists (select 1 from public.orders o where o.product_id = products.id and o.buyer_id = (select auth.uid()))
);

-- children delegate to the parent's RLS: owner/admin/buyer/cascade inherited, single source of truth.
drop policy "Product images viewable by everyone" on public.product_images;
create policy "Product images readable with their product" on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_images.product_id));

drop policy "Payment methods viewable by everyone" on public.shop_payment_methods;
create policy "Payment methods readable with their shop" on public.shop_payment_methods for select
  using (exists (select 1 from public.shops s where s.id = shop_payment_methods.shop_id));

drop policy "Shop categories viewable by everyone" on public.shop_categories;
create policy "Shop categories readable with their shop" on public.shop_categories for select
  using (exists (select 1 from public.shops s where s.id = shop_categories.shop_id));

-- job posts (decision 5): close the moderated-open-post hole, then delegate the skills.
drop policy "Open posts or own posts readable" on public.job_posts;
create policy "Open posts or own posts readable" on public.job_posts for select using (
  (status = 'open' and admin_hidden_at is null) or consumer_id = (select auth.uid()));   -- "Admin reads all job_posts" stays
drop policy "Post skills viewable by everyone" on public.job_post_skills;
create policy "Post skills readable with their post" on public.job_post_skills for select
  using (exists (select 1 from public.job_posts jp where jp.id = job_post_skills.job_post_id));
```
Write policies are untouched. FOR ALL owner policies on `shop_*` still grant owners SELECT.

### Safety checks done
- **No recursion:** policy graph (generic cross-reference query over every table) is acyclic: `product_images→products→shops→orders`, `shop_*→shops→orders`, `job_post_skills→job_posts`; no policy on `orders` or `job_posts` reads back into them. (`job_responses` reads `job_posts`, which is why `job_posts` must **not** gain a responder branch.)
- **Anon keeps SELECT on `orders`:** `service_listings` (PUBLIC) already reads `orders` in a subquery, and the new products/shops branches will; Postgres checks sub-select privileges as the caller. Same for anon on `freelancer_profiles`, `job_posts`, `products`, `shops`. D respects this.
- **Order-as-read-grant is not self-service:** `enforce_order_insert_integrity` (migration 54) refuses an order on a non-live target, so a buyer cannot mint the buyer branch on a hidden product.
- **Indexes** `orders_buyer_idx / orders_seller_idx / orders_product_idx` back the branch subqueries. Helper calls wrapped `(select …)` (InitPlan; adds nothing to the 69-policy `auth_rls_initplan` backlog).
- **Residual:** buckets `product-images`, `shop-assets`, `avatars`, `portfolio-media` are `public = true`. RLS hides URL *discovery*, not a known file URL. Logged, not fixable here.

### Rows affected (live): products 1 of 26 stops being public; product_images 1 of 33; everything else 0.

### Read-path impact (✓ read in full · ◦ grep only)
| Path | Reads | Result under new policies |
|---|---|---|
| ✓ `lib/marche/data.ts` (/marche), ◦ `lib/search/search-marketplace.ts`, ◦ `lib/marche/filter-cities.ts` | products + `shops!inner` + images, status/hidden filters in query | identical result |
| ✓ `lib/marche/product-detail.ts` (+related), ✓ `lib/marche/demander.ts`, ✓ `app/demander/[id]/actions.ts` | active product, shop not hidden | identical; hidden → null → 404 as today |
| ✓ `lib/marche/shop-detail.ts` | shop + payment methods + categories + active products | identical |
| ✓ **`lib/marche/order-detail.ts:203`**, ◦ **`lib/marche/my-data.ts:81`** | buyer's order embeds `products → shops, product_images` and renders the **live** title / image / shop name | **WOULD BREAK without the buyer branch** (blank item/shop once a seller pauses or hides the product). 0 such orders today (6 product orders, 0 on non-live products): latent, certain on the first pause. Buyer branch is mandatory. |
| ✓ `lib/marche/my-data.ts:267` favorites | embeds products; code drops null embeds and fails closed on a missing parent | OK (0 favorites on non-live products) |
| ◦ `seller-orders.ts`, `seller-order-detail.ts`, `seller-dashboard.ts`, `seller-products-query.ts`, `actions/products.ts`, `lib/shops/owner-shop.ts`, `lib/auth/require-seller.ts`, `ma-boutique/**` | owner reads | owner branch: paused / admin-hidden own rows stay visible |
| ◦ `admin/statistiques/page.tsx:50-52`, `admin/utilisateurs/[id]/page.tsx:81` | admin counts / lookup | admin branch: counts keep including hidden rows |
| ✓ `lib/marche/freelancer-dashboard.ts:300` shops count / `:356` direct `job_post_skills` read | ecosystem count / skill→post match | count now excludes hidden shops (correct); skills read returns only visible posts' rows; the follow-up `job_posts` query already filters open + not hidden → same missions |
| ◦ `lib/marche/annonce-detail.ts:120`, `my-data.ts:428` | `job_post_skills` embedded under `job_posts` | OK |
| ✓ `lib/marche/freelancer-dashboard.ts:267` (the only `job_responses → job_posts` embed), ✓ `annonce-detail.ts:139` | responder's activity feed / poster's responses list | a post moderated after the response now embeds null for the responder; already handled (`one(r.job_posts)?.title ?? null`, :148), the same path as a filled post. The poster keeps every own post. |
| `storage.objects` policies (product-images / shop-assets) | `shops` where `owner_id = uid` | OK (owner sees own shop) |
| Live suites | non-service clients on these tables: `shop-config-rls` (anon reads live shop's methods/categories ✓), `suspension-enforcement`, `seller-capability-integrity`, `uploaded-objects-provenance-rls` | re-run after apply; no edit expected |

### Tests to add — `src/__tests__/prelaunch-shop-read-rls.test.ts` (prefix `pl-read-`, per-run random passwords)
Fixtures via service role except the real paths: live shop S, admin-hidden shop H (real `admin_hide_content`), products {live L, paused P (owner sets `hidden`), moderated M (real RPC), X active-in-H}, one image + payment method + category per shop/product, job posts {open, open-then-admin-hidden (real RPC), filled} each with a skill. Every negative read is paired with a service-role read proving the row exists in the expected state.
1. anon and an unrelated signed-in user see exactly {L} of the products, {L's} images, {S} and S's methods/categories, only the open post's skills.
2. owner sees L, P, M, X + images + children; admin sees everything.
3. buyer: order inserted through the buyer's own session while P is live → owner pauses P → buyer still reads P, its image, S, and the **full order-detail embed shape returns non-null**; no access to an un-ordered paused sibling; after admin hides the shop the buyer keeps the shop + ordered product but not its other products.
4. buyer cannot mint the branch: order INSERT on non-live P refused; still cannot read P.
5. ground truth: anon `count(products)` equals the service-role count of live rows.
6. no 42P17 anywhere in the above; owner write paths unchanged (insert product + `.select()`, insert image, pause, delete).
7. job posts: anon cannot read the moderated post or its skills; poster and admin can.
8. favorites embed for a paused product is null (documents the dropped-row behaviour).
9. cleanup verified by read-only count.

---

## 3. Item B — SECURITY DEFINER EXECUTE + search_path

### Classification (33 DEFINER functions in `public`; 31 anon-executable)
| Class | Functions | Evidence | Action |
|---|---|---|---|
| **1 trigger / event-trigger only** (20 DEFINER + `rls_auto_enable`) | `check_job_response_limits`, `check_order_status_transition`*, `disputes_set_updated_at`, `emit_order_event`*, `enforce_admin_marker_lock`, `enforce_admin_moderation_lock`, `enforce_job_responder_capability`, `enforce_order_identity_lock`*, `enforce_order_insert_integrity`*, `enforce_portfolio_image_provenance`, `enforce_product_image_provenance`, `enforce_profile_admin_marker_lock`, `enforce_seller_capability`, `enforce_seller_capability_switch`, `enforce_seller_type_age_gate`, `enforce_service_category_kind`, `enforce_service_subcategory_parent`, `handle_new_user`, `set_order_snapshot`*, `sync_freelancer_is_published`, `rls_auto_enable` | every one appears in `pg_trigger` / `pg_event_trigger`; none in a policy or app `.rpc`. Trigger firing does not check EXECUTE; **precedent:** `enforce_service_publish_requirements` already has ACL `{postgres, service_role}` and its gate fires for JWT writers in the merged H6 suites. `enforce_service_publish_requirements` itself is already closed. (*) = order-related: **grants only, no body change.** | `revoke execute … from public, anon, authenticated` |
| 1b INVOKER trigger fns (not advisor-flagged) | `enforce_active_user`, `handle_updated_at`, `set_cancelled_at_on_transition`* | same reasoning | same revoke (hygiene; separable) |
| **2 internal helper** | `freelancer_has_active_listing` | see §0 row 3 | revoke from all three |
| **3 admin RPCs** (6) | `admin_hide_content`, `admin_unhide_content`, `admin_suspend_user`, `admin_unsuspend_user`, `admin_overview_stats`, `log_admin_action` | each begins `if not public.is_admin() then raise 'Forbidden: admin access required'`; called as the signed-in admin by `admin/utilisateurs`, `admin/signalements`, `admin/litiges` actions and `admin/page.tsx`; suspension suite asserts that exact message from a signed-in non-admin, so `authenticated` must keep EXECUTE | revoke **PUBLIC + anon**; keep `authenticated` (explicit GRANT in the file). `admin_overview_stats` and others carry a PUBLIC grant that an anon-only revoke would leave. |
| **KEEP as is** | `is_admin` (anon+auth) | evaluated in PUBLIC-role policies on **13 tables** (categories, data_exports, deletion_requests, 8 × freelancer_*, reports, service_listings) + authenticated-role policies on 7 more (admin_audit_log, disputes, job_posts, order_events, orders, profiles, `storage.objects`); EXECUTE is checked at expression init with no OR short-circuit, so revoking it errors every anon read of those tables. A adds 2 more PUBLIC policies (products, shops). | none |
| KEEP | `get_completed_service_order_count` (anon+auth) | `freelancer-detail.ts:204` on the public D4 page; `d4-completed-project-count` test uses `anon.rpc` | none |
| KEEP | `get_contact_phone` (anon+auth) | `freelancer-detail.ts:219` runs for anonymous visitors and degrades to NULL; self-gates on `auth.uid()` + a real relationship | none (follow-ups L3199 already rules this) |
| KEEP | `is_active_user` (authenticated only) | INVOKER `enforce_active_user` and 3 `storage.objects` policies | none |

Arithmetic: 22 (class 1 + 2) + 6 (admin, anon only) = 28 anon-revoked; 3 kept = 31 ✔. Post-apply expected advisor: **0028 = 3**, **0029 = 10**, **0011 = 0**.

### SQL (sketch)
```sql
-- B1/B1b/B2: closed to every client role; service_role keeps its direct grant (as enforce_service_publish_requirements)
revoke execute on function
  public.check_job_response_limits(), public.check_order_status_transition(), public.disputes_set_updated_at(),
  public.emit_order_event(), public.enforce_admin_marker_lock(), public.enforce_admin_moderation_lock(),
  public.enforce_job_responder_capability(), public.enforce_order_identity_lock(), public.enforce_order_insert_integrity(),
  public.enforce_portfolio_image_provenance(), public.enforce_product_image_provenance(),
  public.enforce_profile_admin_marker_lock(), public.enforce_seller_capability(), public.enforce_seller_capability_switch(),
  public.enforce_seller_type_age_gate(), public.enforce_service_category_kind(), public.enforce_service_subcategory_parent(),
  public.handle_new_user(), public.set_order_snapshot(), public.sync_freelancer_is_published(), public.rls_auto_enable(),
  public.enforce_active_user(), public.handle_updated_at(), public.set_cancelled_at_on_transition(),
  public.freelancer_has_active_listing(uuid)
from public, anon, authenticated;

-- B3: admin RPCs — is_admin()-gated inside; the admin UI calls them as `authenticated`
revoke execute on function
  public.admin_hide_content(text, uuid, text), public.admin_unhide_content(text, uuid),
  public.admin_suspend_user(uuid, text), public.admin_unsuspend_user(uuid),
  public.admin_overview_stats(), public.log_admin_action(text, text, uuid, jsonb, jsonb, text)
from public, anon;
grant execute on function (same six) to authenticated;

-- B4: search_path. The two plpgsql trigger fns only call now() (pg_catalog is always searched).
alter function public.handle_updated_at() set search_path = '';
alter function public.set_cancelled_at_on_transition() set search_path = '';
-- f_unaccent CALLS unaccent() UNQUALIFIED: a bare search_path='' breaks it, and with it every product /
-- service insert and title edit through the generated search_vector. Qualify the body:
create or replace function public.f_unaccent(text) returns text
  language sql immutable parallel safe strict set search_path = ''
  as $$ select public.unaccent('public.unaccent'::regdictionary, $1) $$;
-- Never revoke EXECUTE on f_unaccent / unaccent: generated-column expressions check it as the writer.
```
Not fixed (documented): lint 0010 `public_profiles` (intentional), 0014 `unaccent` in `public`, HIBP, 0008 `uploaded_objects`.

### Highest-consequence line: `handle_new_user` (signup). Trigger EXECUTE is not checked at fire time, but if I am wrong signups die. Apply-time check #1 is a signup (`auth.admin.createUser` → profile row); rollback is one GRANT (§9). `rls_auto_enable` is Supabase's stock auto-RLS template (event trigger `ensure_rls`); if the platform ever recreates it, the new default ACL (D5) re-closes it.

### Tests (`prelaunch-acl-hardening.test.ts`, prefix `pl-acl-`)
- **The proof that the 21 trigger / event-trigger functions (and the 3 INVOKER ones) are closed is catalog-level, not RPC-level** (`has_function_privilege` matrix + advisor counts, §9). PostgREST may never route `returns trigger` functions, in which case `anon.rpc('check_order_status_transition')` fails identically before and after PR-2 and would prove nothing; so there is deliberately no RPC test for them.
- RPC behaviour tests only for functions that are definitely routable: `freelancer_has_active_listing` (anon and signed-in → permission denied) and the six admin RPCs (anon → permission denied; signed-in non-admin gets exactly `Forbidden: admin access required`, which proves EXECUTE is retained and the in-function gate intact). Existing suites already cover the admin happy paths.
- Kept: `anon.rpc('is_admin')` → `{data:false,error:null}`; anon `get_completed_service_order_count` ok; anon `get_contact_phone` → null without error; signed-in `is_active_user` ok.
- Triggers still fire for JWT callers, one probe per family: order insert refused ("Une commande est toujours créée en attente."), profile `is_admin` flip blocked, consumer shop insert refused, owner `admin_hidden_at` write refused, `updated_at` bumps on a products UPDATE (`handle_updated_at`), `cancelled_at` stamped (F).
- Signup creates its profile row (`handle_new_user`).
- `f_unaccent`: owner inserts product titled `Élève` → `search_vector` populated and matches `eleve`; existing rows untouched.

---

## 4. Item C — `data_exports` / `deletion_requests` INSERT

Both tables are empty (0 rows). INSERT policy `auth.uid() = user_id` only; `authenticated` holds table-level INSERT; no BEFORE INSERT trigger (`trg_enforce_active_user` is DELETE/UPDATE only, so suspended users may still file requests — leave).

| Column | data_exports | deletion_requests | Should be |
|---|---|---|---|
| `status` | any of pending/completed/rejected | any of pending/approved/rejected | system (default `pending`) |
| `processed_at` | settable | settable | system/admin |
| `processed_by` (FK auth.users) | **any user id** (forged admin attribution) | same | admin |
| `requested_at` | **backdatable** | same | system (`now()`) |
| `export_url` | **free text** | n/a | admin |
| `id` | client-chosen | same | default |
| `user_id` / `reason` | policy-bound / user content | | user |

Exploits: (live) a non-`pending` status sidesteps `*_one_pending_per_user` → unlimited rows; (latent) forged `processed_by`, attacker-controlled `export_url`, backdated clock, self-approved deletion.

**Proposal — column-level INSERT grants** (matches the `profiles`/`orders` column-grant precedent; fail-closed for future columns; no new function surface):
```sql
revoke insert on public.data_exports, public.deletion_requests from anon, authenticated;
grant  insert (user_id)         on public.data_exports     to authenticated;
grant  insert (user_id, reason) on public.deletion_requests to authenticated;
-- optional (decision 10): admins may only touch the processing columns
revoke update on public.data_exports, public.deletion_requests from authenticated;
grant  update (status, processed_at, processed_by, export_url) on public.data_exports     to authenticated;
grant  update (status, processed_at, processed_by)             on public.deletion_requests to authenticated;
```
Both app writers already send only these columns (`parametres/actions.ts:17`, `mon-compte/actions.ts:247`); the suspension suite's inserts (`{user_id}`, `{user_id, reason}`) stay valid. Alternative: an orders-54-style BEFORE INSERT trigger (raise 42501 on non-default columns). Not recommended: more surface, and it does not fail closed for new columns.

Tests: plain insert OK → `status='pending'`, `requested_at ≈ now`; each of status≠pending, processed_at, processed_by, requested_at, export_url, id → 42501 `permission denied for table …`; second plain insert → 23505; other user's `user_id` → RLS 42501; user DELETE → permission denied (after D); admin UPDATE of processing columns works.

---

## 5. Item D — default-grant sweep

Live: 28 tables + 2 views. `anon` and `authenticated` hold the full 8-privilege set on most; **25 tables grant TRUNCATE to both** and 25 grant anon some write privilege. `profiles`, `order_events`, `uploaded_objects`, `job_responses` (partly) were already hardened. `pg_default_acl` still grants `arwdDxtm` on every new `postgres`-created table.

Proofs (all by catalog query, not hand-derived):
- **No write policy is satisfiable by anon** (query for write policies applying to PUBLIC/anon whose text lacks `auth.uid()`/`is_admin()` → 0 rows) ⇒ every anon INSERT/UPDATE/DELETE on the **25** tables is dead: admin_audit_log, categories, data_exports, deletion_requests, disputes, favorites, freelancer_{certifications,education,languages,links,portfolio_items,profiles,skills,tools}, job_post_skills, job_posts, job_responses, orders, product_images, products, reports, service_listings, shop_categories, shop_payment_methods, shops.
- **Dead for `authenticated`** (privilege held, no policy for that command): **DELETE** on `admin_audit_log, data_exports, deletion_requests, disputes, orders, reports`; **UPDATE** on `admin_audit_log, favorites, freelancer_skills, job_post_skills, product_images`. INSERT and SELECT: none dead.
- No `.upsert()` anywhere in `src` (`ON CONFLICT DO UPDATE` would need UPDATE at plan time); no app code uses any revoked verb (multi-line search: only `reports`/`disputes` updates and `favorites`/`freelancer_skills`/`product_images` deletes, all retained).
- No sequences in `public` (0).

```sql
-- D1 everywhere: nothing a client can reach uses these (MAINTAIN in PG17 includes LOCK TABLE)
revoke truncate, references, trigger, maintain on all tables in schema public from anon, authenticated;
-- D2 anon never writes
revoke insert, update, delete on all tables in schema public from anon;
-- D3 dead authenticated privileges
revoke delete on public.admin_audit_log, public.data_exports, public.deletion_requests,
                 public.disputes, public.orders, public.reports from authenticated;
revoke update on public.admin_audit_log, public.favorites, public.freelancer_skills,
                 public.job_post_skills, public.product_images from authenticated;
-- D4 (optional, decision 11): the only two tables no policy reads and no anon path embeds
revoke select on public.admin_audit_log, public.disputes from anon;
```
**Orders (grants only):** authenticated keeps SELECT + INSERT (buyer path) + the existing column UPDATE grants; loses DELETE/TRUNCATE/…; anon loses all writes but **keeps SELECT** (PUBLIC policies on `service_listings` and the new products/shops branches read `orders` as the caller).
**Deliberately not revoked:** anon SELECT elsewhere (e.g. `job_responses`: `job_responses(count)` is embedded in job-post queries, so revoking turns "0 rows" into a hard error).

### D5 default privileges (decision 9)
```sql
alter default privileges for role postgres in schema public revoke truncate, references, trigger, maintain on tables from anon, authenticated;
alter default privileges for role postgres revoke execute on functions from public;                         -- global form: PUBLIC's EXECUTE is Postgres' built-in default
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;
```
Effect: every new RPC needs an explicit `GRANT EXECUTE` (to be documented in `engineering-standards.md` and the db-guardian skill). `supabase_admin`'s own default entries are probably not alterable as `postgres`; verify at apply, non-blocking.

### Existing-test edits this forces (PR-2)
`suspension-enforcement.test.ts` pins the trigger message on cells that will now be refused earlier by the privilege check (it already has a `noGrant` mechanism expecting `42501` + `permission denied for table X`):
- Matrix `TRIGGERED`: move to `noGrant` — DELETE for `admin_audit_log, data_exports, deletion_requests, disputes, orders, reports` (6 cells); UPDATE for `admin_audit_log, favorites, freelancer_skills, job_post_skills, product_images` (5 cells) = **11 cells**.
- Explicit assertions: `:511` (disputes delete), `:523-524` (data_exports / deletion_requests delete) → expect permission denied.
- Unchanged: `:516-517` inserts, `:510` disputes update, `seller-capability-integrity.test.ts:579` (only `not.toBeNull()`), `job-responses-integrity.test.ts:477` (already permission denied).
- **Completeness evidence (searched, not assumed):** every other `.delete()` on the six tables across `src/__tests__` goes through the service role (`admin.from('orders'|'admin_audit_log').delete()` in teardowns), so it is unaffected; no `.update()` on `favorites / freelancer_skills / job_post_skills / product_images / admin_audit_log` exists anywhere in `src`; no test pins RLS error text on an anon write (the only `row-level security` string is the storage-upload constant `UPLOAD_REFUSED`, unrelated); all other 42501 assertions pin the **code**, which a privilege refusal shares with an RLS/trigger refusal. `h5-service-delete-orders-gate` (owner DELETE → 42501) is on `service_listings`, whose DELETE stays granted.
New assertions: anon write probes on a sample of tables → `permission denied for table X` (not the RLS text); authenticated INSERT on `orders` and column-UPDATE of `status` still work; anon read of `service_listings` and the new products policy still succeed (guards the subquery-privilege trap). TRUNCATE is not reachable over PostgREST, so it is asserted by the apply-time catalog query (§9).

---

## 6. Item E — `orders.received_at`

**Answer to "confirm nothing writes it directly": no — two client writers** (§0 row 1). Consumers: G9 "Reçue le …", admin dispute evidence ("Confirmé reçu le"), `admin/statistiques` (7-day count + CSV). Live: 4 received orders, 1 with no stamp (`33b822ec`, seeded straight to `received`, never backfilled).

Why a plain trigger on UPDATE is not enough: the missing stamp comes from rows **inserted** at `received`, which a BEFORE UPDATE trigger never sees. And service-role *UPDATEs* of status are impossible (`check_order_status_transition` has no `auth.uid() is null` bypass), so seeds go through INSERT.

**E1 (now, safe with today's app)** — new function + trigger; no existing order function modified. Not added to `enforce_order_identity_lock` (it sorts before every `trg_*` name and would reject the client's own value on the transition update).
```sql
create or replace function public.enforce_order_lifecycle_columns() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_client boolean := (select auth.uid()) is not null and not (select public.is_admin());
begin
  if tg_op = 'INSERT' then
    -- seeds / service role / admin only reach here at status 'received' (JWT non-admins are refused earlier
    -- by enforce_order_insert_integrity). Never leave a terminal order without its timestamp.
    if new.status = 'received' and new.received_at is null then new.received_at := now(); end if;
    return new;
  end if;

  if old.status is distinct from 'received' and new.status = 'received' then
    new.received_at := case when v_client then now() else coalesce(new.received_at, now()) end;  -- client value discarded
  elsif v_client and new.received_at is distinct from old.received_at then
    raise exception 'Les dates de la commande ne peuvent pas être modifiées.' using errcode = '42501';
  end if;

  -- E1+ (decision 13): cancel metadata is writable only inside the cancel transition (follow-ups L3885)
  if v_client and not (old.status is distinct from 'cancelled' and new.status = 'cancelled')
     and (new.cancelled_by is distinct from old.cancelled_by
          or new.cancellation_reason is distinct from old.cancellation_reason) then
    raise exception 'Les informations d''annulation ne peuvent pas être modifiées.' using errcode = '42501';
  end if;
  return new;
end $$;
revoke execute on function public.enforce_order_lifecycle_columns() from public, anon, authenticated;
create trigger trg_enforce_order_lifecycle_columns before insert or update on public.orders
  for each row execute function public.enforce_order_lifecycle_columns();
```
Trigger order (alphabetical): fires after `trg_check_order_status_transition` and `trg_enforce_active_user`, so the transition is validated first. The current app keeps working: `ReceiptConfirmButton`/`OrdersList` still send `received_at`; the trigger overrides it with `now()`.

**E2 (gated)** — `revoke update (received_at) on public.orders from authenticated;` only **after** the two client writes stop sending it (any SET containing the column fails 42501 even with the same value). Ownership of that two-line app change is decision 12. No backfill proposed (we do not know when `33b822ec` was received).

---

## 7. Item F — seller-cancel path (in `orders-lifecycle-stamps.test.ts`, prefix `pl-ord-`)
Fixtures use the real paths: buyer inserts the order, seller advances it (service-role status UPDATEs are refused by design; admin JWT or the parties drive transitions).
1. Seller UPDATE `{status:'cancelled', cancelled_by:'seller', cancellation_reason}` **without** `cancelled_at` on a `pending` order succeeds; `cancelled_at` is stamped ≈ now by `trg_set_cancelled_at_on_transition` (also regression-proves the `search_path` change in B4).
2. The same UPDATE **including** `cancelled_at` fails 42501 `permission denied for table orders` (pins H8's premise).
3. Buyer cancel path equivalent; a later non-status edit does not move `cancelled_at`.
4. E1: buyer confirm from `arrived` with a bogus `received_at` (2001-01-01) succeeds and stores ≈ now; sending nothing also stamps; seller or buyer changing `received_at` on pending / received / cancelled orders → 42501; carrier edit leaves it untouched; admin JWT keeps an explicit value; INSERT at `received` via service role is stamped (and keeps an explicit value).
5. E1+: either party flipping `cancelled_by` or rewriting `cancellation_reason` on a cancelled order → 42501; both still writable inside the cancel transition.
6. E2 (after the app change): an UPDATE naming `received_at` → 42501.

---

## 8. Decisions (numbered, with recommendation)

**Structure**
1. PR split / order (§1). *Recommend:* PR-1 (A) → PR-2 (B+C+D) → PR-3 (E1+F), E2 later.
2. Keep B+C+D as one migration with three sections, or split? *Recommend one;* split if you want Standard B isolation for B.

**A**
3. Public product predicate `status='active'` only (not `sold_out`: never written, derived from stock; matches every app surface). *Recommend yes.*
4. Products public branch also requires the parent shop un-hidden (`admin_hide_content('shop')` leaves products `active`). *Recommend yes;* log the matching service_listings↔freelancer_profiles gap (§10).
5. Include the `job_posts` `admin_hidden_at` tweak (already logged MEDIUM) so `job_post_skills` does not inherit the hole; the "refuse responses on a moderated post" guard stays separate. *Recommend yes.*
6. `shop_payment_methods.note` is publicly readable, unused by the app, 0 non-null rows. *Recommend leave + log;* if it is buyer-only by intent the fix is a column-level SELECT, a product call.

**B**
7. Include the 5 order-related trigger functions in the grant revoke (grants only, no body change) and the `search_path` ALTER on `set_cancelled_at_on_transition`, given H8 — or defer those lines. *Recommend include;* they are separable lines, and F proves them.
8. Admin RPCs stay `authenticated`-executable (is_admin-gated); the alternative (service-role admin client) is a larger change. *Recommend keep.*
9. Default privileges (D5), tables and functions. *Recommend yes to both;* every new RPC then needs an explicit GRANT (document it).

**C / D**
10. Column-level INSERT grants (not trigger). *Recommend grants.* C2: also restrict admin UPDATE to processing columns. *Recommend yes (cheap).*
11. D4: revoke anon SELECT on `admin_audit_log` and `disputes` only. *Recommend yes;* nothing else.

**E / F**
12. Who removes `received_at` from the two client writes (and does the "move to server actions" item): H8, or this PR? *Recommend H8,* since they own the orders actions; this batch ships E1 only. E2 follows once it lands.
13. Fold E1+ (cancel-metadata lock) into the same trigger. *Recommend yes:* same mechanism, already logged MEDIUM, ~6 lines.
14. Backfill the one NULL `received_at`. *Recommend no.*
15. **Tell H8 now** that `cancelOrderAction` is failing in production today (§0 row 2); it should not wait for this batch.

---

## 9. Apply-time verification and rollback (for the architect)

**Verify, in this order after PR-2 applies:** (1) signup smoke: `createUser` → profile row exists; (2) advisor: 0028 = 3, 0029 = 10, 0011 = 0, **and** the ACL matrix `select proname, has_function_privilege('anon',oid,'EXECUTE') a, has_function_privilege('authenticated',oid,'EXECUTE') u from pg_proc where pronamespace='public'::regnamespace and prokind='f' order by 1` → trigger / event / helper rows `f/f`; the six admin rows `f/t`; `is_admin`, `get_contact_phone`, `get_completed_service_order_count`, `f_unaccent`, `unaccent*` `t/t`; `is_active_user` `f/t` (this matrix is the real proof for the trigger functions, see §3 tests); (3) catalog: `count(*) filter (where has_table_privilege('anon'|'authenticated', oid, 'TRUNCATE'))` = 0, anon write-privilege tables = 0; (4) `proconfig` shows `search_path` on the three functions and `f_unaccent('Élève') = 'Eleve'`; (5) in a rolled-back txn `create table public.zz_probe(id int)` → `relrowsecurity = true` (`ensure_rls` still fires). After PR-1: `set local role anon; select count(*) from products` = 25 and `… where status<>'active'` = 0.

**Rollback (each section independent):**
- A: recreate the six original `USING (true)` policies (names above) and the original `job_posts` policy `(status = 'open') OR (consumer_id = auth.uid())`.
- B: `grant execute on function <list> to public, anon, authenticated;` (list as in B1/B2); `alter function … reset search_path;`; restore the unqualified `f_unaccent` body.
- C: `grant insert on public.data_exports, public.deletion_requests to authenticated;` (+ `grant update`).
- D: `grant truncate, references, trigger, maintain on all tables in schema public to anon, authenticated;` + the specific INSERT/UPDATE/DELETE grants removed in D2/D3.
- E1: `drop trigger trg_enforce_order_lifecycle_columns on public.orders; drop function public.enforce_order_lifecycle_columns();`

---

## 10. Out of scope — to log in `docs/follow-ups.md` when the PR is cut
1. (MEDIUM, inferred from policy text + `admin_hide_content`, not tested live) `service_listings` public branch has no `freelancer_profiles.admin_hidden_at` cascade, and `freelancer_profiles` is public on `is_published` (derived from active listings only), so a moderated freelancer profile and its 7 child tables look REST-readable while the app hides them. Same class as A, on the freelancer side.
2. (LOW) Four public storage buckets: RLS hides URL discovery only; a moderated product's image stays fetchable by URL.
3. (LOW) `deletion_requests.reason` is unbounded text (consistent with the founder ruling that caps live in app limits).
4. (LOW) Advisor residue left deliberately: 0010 `public_profiles`, 0014 `unaccent` in `public`, HIBP, 0008 `uploaded_objects`.
5. (LOW) README #48 overstates `freelancer_has_active_listing`'s revoke; correct it in PR-2.

## Appendix — queries to re-verify (read-only, all run on 2026-10-25)
```sql
-- 1. policy graph: which policies (public + storage) read which public table, for which roles
with t as (select c.relname from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r')
select t.relname as referenced_table,
  string_agg(distinct n.nspname||'.'||c.relname||' ['||case when 0 = any(p.polroles) then 'PUBLIC(anon+auth)'
    else array_to_string(array(select r.rolname from pg_roles r where r.oid = any(p.polroles)),'+') end||']', '; ') as read_by
from t join pg_policy p on (coalesce(pg_get_expr(p.polqual,p.polrelid),'')||' '||coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'')) ~ ('\m'||t.relname||'\M')
join pg_class c on c.oid=p.polrelid join pg_namespace n on n.oid=c.relnamespace
where c.relname <> t.relname group by t.relname order by 1;

-- 2. dead table-level privileges for `authenticated` (held, but no policy exists for that command)
with rel as (select c.oid, c.relname from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='r'),
cmds(cmd, priv) as (values ('a','INSERT'),('w','UPDATE'),('d','DELETE'),('r','SELECT')),
cover as (select rel.relname, cmds.priv,
  exists (select 1 from pg_policy p where p.polrelid=rel.oid and (p.polcmd=cmds.cmd or p.polcmd='*')
    and (0 = any(p.polroles) or exists (select 1 from pg_roles r where r.oid = any(p.polroles) and r.rolname='authenticated'))) as has_policy,
  has_table_privilege('authenticated', rel.oid, cmds.priv) as tbl_priv
  from rel cross join cmds)
select priv, string_agg(relname, ', ' order by relname) from cover where tbl_priv and not has_policy group by priv;

-- 3. write policies an anon caller could satisfy (expect 0 rows)
select c.relname, p.polname from pg_policy p join pg_class c on c.oid=p.polrelid
where c.relnamespace='public'::regnamespace and p.polcmd in ('a','w','d','*')
  and (0 = any(p.polroles) or exists (select 1 from pg_roles r where r.oid = any(p.polroles) and r.rolname='anon'))
  and (coalesce(pg_get_expr(p.polqual,p.polrelid),'')||coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'')) !~ '(auth\.uid\(\)|is_admin\(\))';

-- 4. what anon can read today (SELECT inside a rolled-back txn)
begin; set local role anon;
select count(*) from public.products;                                            -- 26
select count(*) from public.products where status <> 'active' or admin_hidden_at is not null;  -- 1
rollback;
```

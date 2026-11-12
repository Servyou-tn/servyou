-- Audit 2026-11-11 M9 (fix plan PR 15a), migration 1 of 2: index the 8 unindexed foreign keys, drop 1 redundant index.
--
-- Live today (performance advisor + catalog, read-only discovery 2026-11-12):
--   * unindexed_foreign_keys lists 8 FKs. Every one of the 8 columns is NULLABLE, so each gets a PARTIAL index
--     (where <col> is not null) — the shape the existing favorites_shop_id_idx / favorites_freelancer_profile_id_idx
--     already use, which the advisor accepts as covering (their FKs are not listed). A partial index still serves the
--     FK's own lookup (a cascade / restrict check is « col = $1 », which implies « col is not null »), and the joins.
--     None of the 8 index names exists today.
--   * unused_index lists 13. Only job_posts_status_idx is redundant: job_posts_status_response_count_idx
--     (status, response_count) leads with the same column and serves every « status = … » lookup. The other 12 are
--     kept (founder decision 2026-11-12): 5 back an FK (dropping them re-creates this file's problem), 2 are the
--     full-text search GIN indexes, 5 serve admin filters / sorts. They read « unused » because every table holds
--     under 120 rows, where Postgres scans the table instead of any index.
--
-- Note for the post-apply advisor: the 8 new indexes also start with 0 scans, and the unused_index lint lists ANY
-- non-unique index with 0 scans, FK-backing ones included (favorites_shop_id_idx is on that list today). Expect
-- unused_index = 12 kept + 8 new = 20 until queries use the new ones, not 12.
--
-- Locks: plain CREATE INDEX (a migration runs in a transaction, so CONCURRENTLY is not available). It blocks writes
-- on each table only while that index builds; the largest of these tables holds 23 rows.
-- No grant, no policy, no data change. Client-write allow-list untouched. Generated types unchanged.

create index contact_messages_user_id_idx on public.contact_messages (user_id) where user_id is not null;
create index data_exports_processed_by_idx on public.data_exports (processed_by) where processed_by is not null;
create index deletion_requests_processed_by_idx on public.deletion_requests (processed_by) where processed_by is not null;
create index favorites_product_id_idx on public.favorites (product_id) where product_id is not null;
create index favorites_service_listing_id_idx on public.favorites (service_listing_id) where service_listing_id is not null;
create index order_events_actor_id_idx on public.order_events (actor_id) where actor_id is not null;
create index orders_service_listing_id_idx on public.orders (service_listing_id) where service_listing_id is not null;
create index service_listings_subcategory_id_idx on public.service_listings (subcategory_id) where subcategory_id is not null;

-- Redundant: job_posts_status_response_count_idx (status, response_count) covers every lookup on status.
drop index public.job_posts_status_idx;

-- Post-apply verification (read-only):
--   1. Advisor (performance): unindexed_foreign_keys → 0 findings.
--   2. select indexname from pg_indexes where schemaname = 'public' and indexname in (
--        'contact_messages_user_id_idx', 'data_exports_processed_by_idx', 'deletion_requests_processed_by_idx',
--        'favorites_product_id_idx', 'favorites_service_listing_id_idx', 'order_events_actor_id_idx',
--        'orders_service_listing_id_idx', 'service_listings_subcategory_id_idx');                → 8 rows
--   3. select count(*) from pg_indexes where indexname = 'job_posts_status_idx';                   → 0
--
-- Rollback:
--   drop index public.contact_messages_user_id_idx, public.data_exports_processed_by_idx,
--     public.deletion_requests_processed_by_idx, public.favorites_product_id_idx,
--     public.favorites_service_listing_id_idx, public.order_events_actor_id_idx,
--     public.orders_service_listing_id_idx, public.service_listings_subcategory_id_idx;
--   create index job_posts_status_idx on public.job_posts using btree (status);

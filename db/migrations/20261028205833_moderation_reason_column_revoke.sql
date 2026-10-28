-- admin_hidden_reason: no client SELECT grant on the five moderated tables.
-- Founder ruling 9 (2026-10-28), step 2 of 2 on « admin_hidden_reason readable by owner + admin only »
-- (docs/follow-ups/live-suite-teardown-guard.md, Sonnet review of #75; « Same question for shops / products /
-- service_listings / job_posts » -- yes, all five). Step 1 is PENDING_get_moderation_reason_fn.sql.
-- Standards-reference Section 3 A01.
--
-- ⚠ APPLY ONLY AFTER: (1) PENDING_get_moderation_reason_fn.sql is applied, and (2) the app PR
--   fix/security-followups-batch-2 is merged AND deployed. That PR removes every client read of the column:
--     * admin/signalements/[id]/page.tsx  -- selects (id, admin_hidden_at); the note via get_moderation_reason();
--     * lib/marche/annonce-detail.ts      -- column dropped from the job_posts select (it was never rendered);
--     * lib/marche/seller-products-query.ts -- column dropped from the products select (never rendered).
--   app/actions/products.ts' update already returns select('id') (the « .select() » was only in a comment).
--   Applied before that deploy, those reads fail 42501 in production.
--
-- Live before this migration (verified 2026-10-28): anon and authenticated hold TABLE-level SELECT on shops,
-- products, service_listings, freelancer_profiles and job_posts, no column-level SELECT ACLs. Whoever passes a
-- row's SELECT policy reads the moderator's note: the owner and admins (fine), and also a past buyer (the shops /
-- freelancer_profiles / products / service_listings buyer branches). 0 moderated rows live; no policy and no
-- view references the column; no invoker-rights function reads these tables. A client `*` select on these
-- tables would also fail after this (grep 2026-10-28: none in src/).
--
-- After: SELECT is re-granted column by column to anon and authenticated -- every live column
-- (information_schema.columns, 2026-10-28) except admin_hidden_reason. Row visibility (RLS) is unchanged; the
-- owner and admins read the note through get_moderation_reason(). New columns on these five tables are not
-- client-readable until granted (rule for the db-guardian skill).

revoke select on public.shops, public.products, public.service_listings, public.freelancer_profiles,
                 public.job_posts
  from anon, authenticated;

grant select (id, owner_id, name, description, city, logo_url, banner_url, created_at, updated_at, shop_type,
              delivery_setup, working_hours, location_detail, preferred_carriers, admin_hidden_at)
  on public.shops to anon, authenticated;

grant select (id, shop_id, category_id, title, description, price_tnd, status, tracks_stock, stock_count,
              created_at, updated_at, admin_hidden_at, search_vector, delivery_fee_tnd)
  on public.products to anon, authenticated;

grant select (id, freelancer_profile_id, category_id, title, description, starting_price_tnd, delivery_time,
              status, created_at, updated_at, admin_hidden_at, search_vector, deliverables, revisions_count, tags,
              buyer_briefing, delivery_mode, subcategory_id, short_description, price_unit)
  on public.service_listings to anon, authenticated;

grant select (id, profile_id, headline, bio, city, portfolio_link, years_experience, languages, created_at,
              updated_at, working_hours, current_workplace, preferred_payment_method, admin_hidden_at,
              is_published, workplace_location)
  on public.freelancer_profiles to anon, authenticated;

grant select (id, consumer_id, title, description, budget_min, budget_max, category_id, city, is_remote, deadline,
              status, created_at, updated_at, admin_hidden_at, response_count)
  on public.job_posts to anon, authenticated;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Restores the live ACL of 2026-10-28 (table-level SELECT for anon and authenticated, no column SELECT ACLs):
--
-- revoke select (id, owner_id, name, description, city, logo_url, banner_url, created_at, updated_at, shop_type,
--                delivery_setup, working_hours, location_detail, preferred_carriers, admin_hidden_at)
--   on public.shops from anon, authenticated;
-- revoke select (id, shop_id, category_id, title, description, price_tnd, status, tracks_stock, stock_count,
--                created_at, updated_at, admin_hidden_at, search_vector, delivery_fee_tnd)
--   on public.products from anon, authenticated;
-- revoke select (id, freelancer_profile_id, category_id, title, description, starting_price_tnd, delivery_time,
--                status, created_at, updated_at, admin_hidden_at, search_vector, deliverables, revisions_count,
--                tags, buyer_briefing, delivery_mode, subcategory_id, short_description, price_unit)
--   on public.service_listings from anon, authenticated;
-- revoke select (id, profile_id, headline, bio, city, portfolio_link, years_experience, languages, created_at,
--                updated_at, working_hours, current_workplace, preferred_payment_method, admin_hidden_at,
--                is_published, workplace_location)
--   on public.freelancer_profiles from anon, authenticated;
-- revoke select (id, consumer_id, title, description, budget_min, budget_max, category_id, city, is_remote,
--                deadline, status, created_at, updated_at, admin_hidden_at, response_count)
--   on public.job_posts from anon, authenticated;
-- grant select on public.shops, public.products, public.service_listings, public.freelancer_profiles,
--                 public.job_posts to anon, authenticated;

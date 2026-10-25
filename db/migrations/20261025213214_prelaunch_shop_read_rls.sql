-- Pre-launch security batch, PR-1 (item A) -- shop-side and job-skill reads stop being `using (true)`.
-- Architect approval 2026-10-25, decisions 3-6; discovery: docs/design/prelaunch-security-batch-discovery.md
-- section 2. Same class as H6 ruling G1 (migration 52, service_listings) -- standards-reference Section 3 A01.
--
-- Live before this migration: products, shops, product_images, shop_payment_methods, shop_categories
-- and job_post_skills were SELECT `using (true)` for PUBLIC, so a paused or admin-moderated product, its
-- images, an admin-moderated shop and that shop's children were readable by anyone holding an id
-- through the REST API; only the app's own status / admin_hidden_at filters kept them off public pages
-- (anon read 26 products, 1 of them non-live, at discovery). job_posts' public branch ignored
-- admin_hidden_at, so a moderated open post stayed readable as well (follow-ups, "admin-moderated job
-- posts stay readable and accept responses" -- the response half is not in this migration).
--
-- Shape, mirroring migration 52: public = live rows; owner = every own row; admin = everything; buyer =
-- what they ordered. The child tables delegate to their parent's policy with a bare EXISTS, so they
-- inherit every branch (owner, admin, buyer, moderation cascade) from a single place.
--
-- Safety:
--   * Acyclic: product_images -> products -> shops -> orders, shop_* -> shops -> orders,
--     job_post_skills -> job_posts. No orders or job_posts policy reads back into these tables, and the
--     shops buyer branch reads orders ONLY: a shops -> products edge would recurse (42P17).
--   * The buyer branch cannot be minted: trg_enforce_order_insert_integrity (migration 54) refuses an
--     order on a non-live item, so an order only ever grants a read on something that was public.
--   * These branches read orders as the CALLER, so anon must keep SELECT on orders (it holds it today;
--     PR-2's grant sweep deliberately leaves it). service_listings' policy already depends on the same.
--   * Drop + create in one transaction: no window, and a gap would fail closed (no SELECT policy = no
--     rows), never open.
--
-- Rows that stop being public at apply: 1 product (status hidden) and its 1 image. 0 shops, payment
-- methods, shop categories, job posts or job post skills. No write policy, grant or column changes.

-- ─── shops ──────────────────────────────────────────────────────────────────────────────────────
drop policy "Shops viewable by everyone" on public.shops;

create policy "Shops readable when live, or by owner, buyer, or admin"
  on public.shops for select
  using (
    admin_hidden_at is null
    or owner_id = (select auth.uid())
    or (select public.is_admin())
    or exists (
      select 1
        from public.orders o
       where o.seller_id = shops.owner_id
         and o.order_type = 'product'
         and o.buyer_id = (select auth.uid())
    )
  );

comment on policy "Shops readable when live, or by owner, buyer, or admin" on public.shops is
  'Public: admin_hidden_at is null (shops have no status column). Owner: owner_id = auth.uid(). Admin: is_admin(). Buyer: a moderated shop stays readable to anyone who bought a product from its owner, so the order recap keeps its seller (order-detail.ts renders the live shop name and logo). Keyed on orders.seller_id, which migration 54 sets from shops.owner_id, never through products (recursion). An owner has one shop today; if that changes, this branch covers every shop of that seller. Replaced "Shops viewable by everyone" (using true), pre-launch security batch PR-1, 2026-10-25.';

-- ─── products ───────────────────────────────────────────────────────────────────────────────────
drop policy "Products viewable by everyone" on public.products;

create policy "Products readable when live, or by owner, buyer, or admin"
  on public.products for select
  using (
    (
      status = 'active'
      and admin_hidden_at is null
      and exists (
        select 1
          from public.shops s
         where s.id = products.shop_id
           and s.admin_hidden_at is null
      )
    )
    or exists (
      select 1
        from public.shops s
       where s.id = products.shop_id
         and s.owner_id = (select auth.uid())
    )
    or (select public.is_admin())
    or exists (
      select 1
        from public.orders o
       where o.product_id = products.id
         and o.buyer_id = (select auth.uid())
    )
  );

comment on policy "Products readable when live, or by owner, buyer, or admin" on public.products is
  'Public: status = active (sold_out is never written: stock is derived), not admin-moderated, and its shop not admin-moderated, because admin_hide_content(shop) leaves the products active (decision 4). Owner (shops.owner_id = auth.uid()): every own row, so G5 and every RETURNING keep working. Admin: is_admin(). Buyer: any product they have an order on, incl. paused or moderated, deliberately not gated on admin_hidden_at (as migration 52 D1): order-detail.ts and my-data.ts render the live title and image. Replaced "Products viewable by everyone" (using true), pre-launch security batch PR-1, 2026-10-25.';

-- ─── children of products / shops: readable exactly when the parent is ──────────────────────────
drop policy "Product images viewable by everyone" on public.product_images;

create policy "Product images readable with their product"
  on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_images.product_id));

comment on policy "Product images readable with their product" on public.product_images is
  'Delegates to the products SELECT policy (the EXISTS runs under it): public, owner, admin and buyer exactly as the product. Residual: the product-images bucket is public, so this hides URL discovery, not a known file URL. Replaced "Product images viewable by everyone" (using true), pre-launch security batch PR-1, 2026-10-25.';

drop policy "Payment methods viewable by everyone" on public.shop_payment_methods;

create policy "Payment methods readable with their shop"
  on public.shop_payment_methods for select
  using (exists (select 1 from public.shops s where s.id = shop_payment_methods.shop_id));

comment on policy "Payment methods readable with their shop" on public.shop_payment_methods is
  'Delegates to the shops SELECT policy. Owners also read through "Owner manages own shop payment methods" (FOR ALL, unchanged). Replaced "Payment methods viewable by everyone" (using true), pre-launch security batch PR-1, 2026-10-25.';

drop policy "Shop categories viewable by everyone" on public.shop_categories;

create policy "Shop categories readable with their shop"
  on public.shop_categories for select
  using (exists (select 1 from public.shops s where s.id = shop_categories.shop_id));

comment on policy "Shop categories readable with their shop" on public.shop_categories is
  'Delegates to the shops SELECT policy. Owners also read through "Owner manages own shop categories" (FOR ALL, unchanged). Replaced "Shop categories viewable by everyone" (using true), pre-launch security batch PR-1, 2026-10-25.';

-- ─── job posts and their skills (decision 5) ────────────────────────────────────────────────────
-- Same name, one added conjunct: the open branch now also requires the post not to be moderated.
-- admin_hide_content(job_post) stamps admin_hidden_at only and leaves status open.
drop policy "Open posts or own posts readable" on public.job_posts;

create policy "Open posts or own posts readable"
  on public.job_posts for select
  using (
    (status = 'open' and admin_hidden_at is null)
    or consumer_id = (select auth.uid())
  );

comment on policy "Open posts or own posts readable" on public.job_posts is
  'Public: status = open and not admin-moderated. Poster: every own post. Admins read every post through "Admin reads all job_posts" (unchanged). No responder branch on purpose: job_responses own policy reads job_posts, so a job_posts -> job_responses edge would recurse. admin_hidden_at conjunct added by pre-launch security batch PR-1, 2026-10-25.';

drop policy "Post skills viewable by everyone" on public.job_post_skills;

create policy "Post skills readable with their post"
  on public.job_post_skills for select
  using (exists (select 1 from public.job_posts jp where jp.id = job_post_skills.job_post_id));

comment on policy "Post skills readable with their post" on public.job_post_skills is
  'Delegates to the job_posts SELECT policies (open and unmoderated, own, or admin). Replaced "Post skills viewable by everyone" (using true), pre-launch security batch PR-1, 2026-10-25.';

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- Restores the exact pre-migration policies (all were PUBLIC, no TO clause).
--
-- drop policy "Post skills readable with their post" on public.job_post_skills;
-- create policy "Post skills viewable by everyone" on public.job_post_skills for select using (true);
--
-- drop policy "Open posts or own posts readable" on public.job_posts;
-- create policy "Open posts or own posts readable" on public.job_posts for select
--   using ((status = 'open') or (consumer_id = auth.uid()));
--
-- drop policy "Shop categories readable with their shop" on public.shop_categories;
-- create policy "Shop categories viewable by everyone" on public.shop_categories for select using (true);
--
-- drop policy "Payment methods readable with their shop" on public.shop_payment_methods;
-- create policy "Payment methods viewable by everyone" on public.shop_payment_methods for select using (true);
--
-- drop policy "Product images readable with their product" on public.product_images;
-- create policy "Product images viewable by everyone" on public.product_images for select using (true);
--
-- drop policy "Products readable when live, or by owner, buyer, or admin" on public.products;
-- create policy "Products viewable by everyone" on public.products for select using (true);
--
-- drop policy "Shops readable when live, or by owner, buyer, or admin" on public.shops;
-- create policy "Shops viewable by everyone" on public.shops for select using (true);

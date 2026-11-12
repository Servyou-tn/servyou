-- Audit 2026-11-11 M9 (fix plan PR 15a), migration 2 of 2: RLS policies read the signed-in user ONCE per query.
--
-- The advisor's auth_rls_initplan finding: 56 public policies call auth.uid() bare, so Postgres re-evaluates it for
-- every row it checks. 13 also call public.is_admin() bare (4 policies do both): 65 policies in all, every one in
-- public. Wrapping the call in a scalar sub-select — (select auth.uid()), (select is_admin()) — makes the planner
-- run it once per statement as an InitPlan. Same value, same rows: auth.uid() reads the request's JWT claim and
-- is_admin() is STABLE, so neither can change within one statement.
--
-- How: ALTER POLICY on each one, which keeps its name, command, roles and permissive flag and never leaves the table
-- without the policy. Every expression is the LIVE definition (pg_policies, read-only discovery 2026-11-12) with
-- exactly two textual swaps: auth.uid() → (select auth.uid()) and is_admin() → (select is_admin()). Nothing else.
--
-- Out of scope (approved 2026-11-12): the 4 storage.objects policies with the same pattern (owned by
-- supabase_storage_admin; postgres cannot alter them, and the advisor does not list them), and the policy merges
-- (migration 3, PR 15b).
--
-- Proof, three layers:
--   1. THIS FILE GUARDS ITSELF at apply time, in the same transaction: it copies the 65 live definitions into a temp
--      table first, applies the ALTERs, then requires that every new definition, unwrapped, equals the copied one
--      character for character — and that no public policy still calls auth.uid() / is_admin() bare. Any drift since
--      discovery, or any difference in this file, raises and rolls the whole migration back.
--   2. src/__tests__/rls-initplan-wrap-static.test.ts (CI): each ALTER below, unwrapped, equals its « -- old » line
--      exactly; the rollback block equals the « -- old » lines; the guard's list names the same 65 policies.
--   3. After the apply: the advisor's auth_rls_initplan count is 0; the RLS live suites, when the architect says go.
--
-- Grants: none. Client-write allow-list untouched. Generated types unchanged (policies are not in the types).
--
-- Old definitions, one JSON object per policy (table, name, command, roles, USING, WITH CHECK), exactly as live:
-- old {"table":"admin_audit_log","name":"Admins log their own actions","cmd":"INSERT","roles":["authenticated"],"using":null,"check":"(is_admin() AND (admin_id = auth.uid()))"}
-- old {"table":"admin_audit_log","name":"Admins read audit log","cmd":"SELECT","roles":["authenticated"],"using":"is_admin()","check":null}
-- old {"table":"categories","name":"Only admins manage categories","cmd":"ALL","roles":["public"],"using":"is_admin()","check":"is_admin()"}
-- old {"table":"data_exports","name":"Admins read all export requests","cmd":"SELECT","roles":["public"],"using":"is_admin()","check":null}
-- old {"table":"data_exports","name":"Users insert own export request","cmd":"INSERT","roles":["public"],"using":null,"check":"(auth.uid() = user_id)"}
-- old {"table":"data_exports","name":"Users read own export request","cmd":"SELECT","roles":["public"],"using":"(auth.uid() = user_id)","check":null}
-- old {"table":"deletion_requests","name":"Admins read all deletion requests","cmd":"SELECT","roles":["public"],"using":"is_admin()","check":null}
-- old {"table":"deletion_requests","name":"Users insert own deletion request","cmd":"INSERT","roles":["public"],"using":null,"check":"(auth.uid() = user_id)"}
-- old {"table":"deletion_requests","name":"Users read own deletion request","cmd":"SELECT","roles":["public"],"using":"(auth.uid() = user_id)","check":null}
-- old {"table":"disputes","name":"Dispute creation by order party","cmd":"INSERT","roles":["authenticated"],"using":null,"check":"(EXISTS ( SELECT 1\n   FROM orders\n  WHERE ((orders.id = disputes.order_id) AND (orders.status <> 'pending'::text) AND (((disputes.created_by_role = 'buyer'::text) AND (orders.buyer_id = auth.uid())) OR ((disputes.created_by_role = 'seller'::text) AND (orders.seller_id = auth.uid()))))))"}
-- old {"table":"disputes","name":"Disputes updated by admin","cmd":"UPDATE","roles":["authenticated"],"using":"is_admin()","check":"is_admin()"}
-- old {"table":"disputes","name":"Disputes visible to parties and admin","cmd":"SELECT","roles":["authenticated"],"using":"(is_admin() OR (EXISTS ( SELECT 1\n   FROM orders\n  WHERE ((orders.id = disputes.order_id) AND ((orders.buyer_id = auth.uid()) OR (orders.seller_id = auth.uid()))))))","check":null}
-- old {"table":"favorites","name":"Users delete own favorites","cmd":"DELETE","roles":["public"],"using":"(user_id = auth.uid())","check":null}
-- old {"table":"freelancer_certifications","name":"Freelancer manages own certifications — delete","cmd":"DELETE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = auth.uid()))))","check":null}
-- old {"table":"freelancer_certifications","name":"Freelancer manages own certifications — insert","cmd":"INSERT","roles":["public"],"using":null,"check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"freelancer_certifications","name":"Freelancer manages own certifications — update","cmd":"UPDATE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = auth.uid()))))","check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"freelancer_education","name":"Freelancer manages own education — delete","cmd":"DELETE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = auth.uid()))))","check":null}
-- old {"table":"freelancer_education","name":"Freelancer manages own education — insert","cmd":"INSERT","roles":["public"],"using":null,"check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"freelancer_education","name":"Freelancer manages own education — update","cmd":"UPDATE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = auth.uid()))))","check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"freelancer_languages","name":"Owner manages own languages","cmd":"ALL","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_languages.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))","check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_languages.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"freelancer_links","name":"Freelancer manages own links -- delete","cmd":"DELETE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))","check":null}
-- old {"table":"freelancer_links","name":"Freelancer manages own links -- insert","cmd":"INSERT","roles":["public"],"using":null,"check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"freelancer_links","name":"Freelancer manages own links -- update","cmd":"UPDATE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))","check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"freelancer_portfolio_items","name":"Freelancer manages own portfolio items -- delete","cmd":"DELETE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))","check":null}
-- old {"table":"freelancer_portfolio_items","name":"Freelancer manages own portfolio items -- insert","cmd":"INSERT","roles":["public"],"using":null,"check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"freelancer_portfolio_items","name":"Freelancer manages own portfolio items -- update","cmd":"UPDATE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))","check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"freelancer_profiles","name":"Owner deletes own freelancer profile","cmd":"DELETE","roles":["public"],"using":"(profile_id = auth.uid())","check":null}
-- old {"table":"freelancer_profiles","name":"Owner inserts own freelancer profile","cmd":"INSERT","roles":["public"],"using":null,"check":"(profile_id = auth.uid())"}
-- old {"table":"freelancer_profiles","name":"Owner updates own freelancer profile","cmd":"UPDATE","roles":["public"],"using":"(profile_id = auth.uid())","check":"(profile_id = auth.uid())"}
-- old {"table":"freelancer_skills","name":"Owner deletes own skills","cmd":"DELETE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_skills.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))","check":null}
-- old {"table":"freelancer_skills","name":"Owner inserts own skills","cmd":"INSERT","roles":["public"],"using":null,"check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_skills.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"freelancer_tools","name":"Freelancer manages own tools — delete","cmd":"DELETE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = auth.uid()))))","check":null}
-- old {"table":"freelancer_tools","name":"Freelancer manages own tools — insert","cmd":"INSERT","roles":["public"],"using":null,"check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"freelancer_tools","name":"Freelancer manages own tools — update","cmd":"UPDATE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = auth.uid()))))","check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"job_post_skills","name":"Post owner deletes skills","cmd":"DELETE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM job_posts jp\n  WHERE ((jp.id = job_post_skills.job_post_id) AND (jp.consumer_id = auth.uid()))))","check":null}
-- old {"table":"job_post_skills","name":"Post owner inserts skills","cmd":"INSERT","roles":["public"],"using":null,"check":"(EXISTS ( SELECT 1\n   FROM job_posts jp\n  WHERE ((jp.id = job_post_skills.job_post_id) AND (jp.consumer_id = auth.uid()))))"}
-- old {"table":"job_posts","name":"Admin reads all job_posts","cmd":"SELECT","roles":["authenticated"],"using":"is_admin()","check":null}
-- old {"table":"job_posts","name":"Consumer creates own post","cmd":"INSERT","roles":["public"],"using":null,"check":"(consumer_id = auth.uid())"}
-- old {"table":"job_posts","name":"Consumer updates own post","cmd":"UPDATE","roles":["public"],"using":"(consumer_id = auth.uid())","check":"(consumer_id = auth.uid())"}
-- old {"table":"job_responses","name":"Freelancer creates own response","cmd":"INSERT","roles":["public"],"using":null,"check":"(freelancer_id = auth.uid())"}
-- old {"table":"job_responses","name":"Post owner and responder read responses","cmd":"SELECT","roles":["public"],"using":"((freelancer_id = auth.uid()) OR (EXISTS ( SELECT 1\n   FROM job_posts jp\n  WHERE ((jp.id = job_responses.job_post_id) AND (jp.consumer_id = auth.uid())))))","check":null}
-- old {"table":"order_events","name":"Order events visible to parties and admin","cmd":"SELECT","roles":["authenticated"],"using":"(is_admin() OR (EXISTS ( SELECT 1\n   FROM orders o\n  WHERE ((o.id = order_events.order_id) AND ((o.buyer_id = auth.uid()) OR (o.seller_id = auth.uid()))))))","check":null}
-- old {"table":"orders","name":"Admin reads all orders","cmd":"SELECT","roles":["authenticated"],"using":"is_admin()","check":null}
-- old {"table":"orders","name":"Buyer and seller read their orders","cmd":"SELECT","roles":["public"],"using":"((buyer_id = auth.uid()) OR (seller_id = auth.uid()))","check":null}
-- old {"table":"orders","name":"Buyer creates own order","cmd":"INSERT","roles":["public"],"using":null,"check":"(buyer_id = auth.uid())"}
-- old {"table":"orders","name":"Buyer or seller updates order","cmd":"UPDATE","roles":["public"],"using":"((buyer_id = auth.uid()) OR (seller_id = auth.uid()))","check":"((buyer_id = auth.uid()) OR (seller_id = auth.uid()))"}
-- old {"table":"product_images","name":"Shop owner deletes product images","cmd":"DELETE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM (products p\n     JOIN shops s ON ((s.id = p.shop_id)))\n  WHERE ((p.id = product_images.product_id) AND (s.owner_id = auth.uid()))))","check":null}
-- old {"table":"product_images","name":"Shop owner inserts product images","cmd":"INSERT","roles":["public"],"using":null,"check":"(EXISTS ( SELECT 1\n   FROM (products p\n     JOIN shops s ON ((s.id = p.shop_id)))\n  WHERE ((p.id = product_images.product_id) AND (s.owner_id = auth.uid()))))"}
-- old {"table":"products","name":"Shop owner deletes products","cmd":"DELETE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM shops s\n  WHERE ((s.id = products.shop_id) AND (s.owner_id = auth.uid()))))","check":null}
-- old {"table":"products","name":"Shop owner inserts products","cmd":"INSERT","roles":["public"],"using":null,"check":"(EXISTS ( SELECT 1\n   FROM shops s\n  WHERE ((s.id = products.shop_id) AND (s.owner_id = auth.uid()))))"}
-- old {"table":"products","name":"Shop owner updates products","cmd":"UPDATE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM shops s\n  WHERE ((s.id = products.shop_id) AND (s.owner_id = auth.uid()))))","check":"(EXISTS ( SELECT 1\n   FROM shops s\n  WHERE ((s.id = products.shop_id) AND (s.owner_id = auth.uid()))))"}
-- old {"table":"profiles","name":"Admin reads all profiles","cmd":"SELECT","roles":["authenticated"],"using":"is_admin()","check":null}
-- old {"table":"profiles","name":"Users can read own profile","cmd":"SELECT","roles":["public"],"using":"(auth.uid() = id)","check":null}
-- old {"table":"profiles","name":"Users can update their own profile","cmd":"UPDATE","roles":["public"],"using":"(auth.uid() = id)","check":"(auth.uid() = id)"}
-- old {"table":"reports","name":"Admin updates reports","cmd":"UPDATE","roles":["public"],"using":"is_admin()","check":"is_admin()"}
-- old {"table":"reports","name":"Reporter creates own report","cmd":"INSERT","roles":["public"],"using":null,"check":"(reporter_id = auth.uid())"}
-- old {"table":"reports","name":"Reporter reads own, admin reads all","cmd":"SELECT","roles":["public"],"using":"((reporter_id = auth.uid()) OR is_admin())","check":null}
-- old {"table":"service_listings","name":"Owner deletes own services","cmd":"DELETE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))","check":null}
-- old {"table":"service_listings","name":"Owner inserts own services","cmd":"INSERT","roles":["public"],"using":null,"check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"service_listings","name":"Owner updates own services","cmd":"UPDATE","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))","check":"(EXISTS ( SELECT 1\n   FROM freelancer_profiles fp\n  WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = auth.uid()))))"}
-- old {"table":"shop_categories","name":"Owner manages own shop categories","cmd":"ALL","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM shops s\n  WHERE ((s.id = shop_categories.shop_id) AND (s.owner_id = auth.uid()))))","check":"(EXISTS ( SELECT 1\n   FROM shops s\n  WHERE ((s.id = shop_categories.shop_id) AND (s.owner_id = auth.uid()))))"}
-- old {"table":"shop_payment_methods","name":"Owner manages own shop payment methods","cmd":"ALL","roles":["public"],"using":"(EXISTS ( SELECT 1\n   FROM shops s\n  WHERE ((s.id = shop_payment_methods.shop_id) AND (s.owner_id = auth.uid()))))","check":"(EXISTS ( SELECT 1\n   FROM shops s\n  WHERE ((s.id = shop_payment_methods.shop_id) AND (s.owner_id = auth.uid()))))"}
-- old {"table":"shops","name":"Owner deletes own shop","cmd":"DELETE","roles":["public"],"using":"(owner_id = auth.uid())","check":null}
-- old {"table":"shops","name":"Owner inserts own shop","cmd":"INSERT","roles":["public"],"using":null,"check":"(owner_id = auth.uid())"}
-- old {"table":"shops","name":"Owner updates own shop","cmd":"UPDATE","roles":["public"],"using":"(owner_id = auth.uid())","check":"(owner_id = auth.uid())"}

-- The 65 policies, captured as they are live right now (the guard below compares against this copy).
-- The file must run as ONE transaction (apply_migration does), so a failed guard also undoes the ALTERs.
create temp table m9_policies_before as
select tablename, policyname, qual, with_check
  from pg_policies
 where schemaname = 'public'
   and (tablename, policyname) in (values
     ('admin_audit_log', 'Admins log their own actions'),
     ('admin_audit_log', 'Admins read audit log'),
     ('categories', 'Only admins manage categories'),
     ('data_exports', 'Admins read all export requests'),
     ('data_exports', 'Users insert own export request'),
     ('data_exports', 'Users read own export request'),
     ('deletion_requests', 'Admins read all deletion requests'),
     ('deletion_requests', 'Users insert own deletion request'),
     ('deletion_requests', 'Users read own deletion request'),
     ('disputes', 'Dispute creation by order party'),
     ('disputes', 'Disputes updated by admin'),
     ('disputes', 'Disputes visible to parties and admin'),
     ('favorites', 'Users delete own favorites'),
     ('freelancer_certifications', 'Freelancer manages own certifications — delete'),
     ('freelancer_certifications', 'Freelancer manages own certifications — insert'),
     ('freelancer_certifications', 'Freelancer manages own certifications — update'),
     ('freelancer_education', 'Freelancer manages own education — delete'),
     ('freelancer_education', 'Freelancer manages own education — insert'),
     ('freelancer_education', 'Freelancer manages own education — update'),
     ('freelancer_languages', 'Owner manages own languages'),
     ('freelancer_links', 'Freelancer manages own links -- delete'),
     ('freelancer_links', 'Freelancer manages own links -- insert'),
     ('freelancer_links', 'Freelancer manages own links -- update'),
     ('freelancer_portfolio_items', 'Freelancer manages own portfolio items -- delete'),
     ('freelancer_portfolio_items', 'Freelancer manages own portfolio items -- insert'),
     ('freelancer_portfolio_items', 'Freelancer manages own portfolio items -- update'),
     ('freelancer_profiles', 'Owner deletes own freelancer profile'),
     ('freelancer_profiles', 'Owner inserts own freelancer profile'),
     ('freelancer_profiles', 'Owner updates own freelancer profile'),
     ('freelancer_skills', 'Owner deletes own skills'),
     ('freelancer_skills', 'Owner inserts own skills'),
     ('freelancer_tools', 'Freelancer manages own tools — delete'),
     ('freelancer_tools', 'Freelancer manages own tools — insert'),
     ('freelancer_tools', 'Freelancer manages own tools — update'),
     ('job_post_skills', 'Post owner deletes skills'),
     ('job_post_skills', 'Post owner inserts skills'),
     ('job_posts', 'Admin reads all job_posts'),
     ('job_posts', 'Consumer creates own post'),
     ('job_posts', 'Consumer updates own post'),
     ('job_responses', 'Freelancer creates own response'),
     ('job_responses', 'Post owner and responder read responses'),
     ('order_events', 'Order events visible to parties and admin'),
     ('orders', 'Admin reads all orders'),
     ('orders', 'Buyer and seller read their orders'),
     ('orders', 'Buyer creates own order'),
     ('orders', 'Buyer or seller updates order'),
     ('product_images', 'Shop owner deletes product images'),
     ('product_images', 'Shop owner inserts product images'),
     ('products', 'Shop owner deletes products'),
     ('products', 'Shop owner inserts products'),
     ('products', 'Shop owner updates products'),
     ('profiles', 'Admin reads all profiles'),
     ('profiles', 'Users can read own profile'),
     ('profiles', 'Users can update their own profile'),
     ('reports', 'Admin updates reports'),
     ('reports', 'Reporter creates own report'),
     ('reports', 'Reporter reads own, admin reads all'),
     ('service_listings', 'Owner deletes own services'),
     ('service_listings', 'Owner inserts own services'),
     ('service_listings', 'Owner updates own services'),
     ('shop_categories', 'Owner manages own shop categories'),
     ('shop_payment_methods', 'Owner manages own shop payment methods'),
     ('shops', 'Owner deletes own shop'),
     ('shops', 'Owner inserts own shop'),
     ('shops', 'Owner updates own shop'))
;

do $$
begin
  if (select count(*) from m9_policies_before) <> 65 then
    raise exception 'M9 initplan wrap: expected 65 live policies, found % — a policy was renamed or dropped since discovery', (select count(*) from m9_policies_before);
  end if;
end;
$$;

alter policy "Admins log their own actions" on public.admin_audit_log
  with check (((select is_admin()) AND (admin_id = (select auth.uid()))));

alter policy "Admins read audit log" on public.admin_audit_log
  using ((select is_admin()));

alter policy "Only admins manage categories" on public.categories
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Admins read all export requests" on public.data_exports
  using ((select is_admin()));

alter policy "Users insert own export request" on public.data_exports
  with check (((select auth.uid()) = user_id));

alter policy "Users read own export request" on public.data_exports
  using (((select auth.uid()) = user_id));

alter policy "Admins read all deletion requests" on public.deletion_requests
  using ((select is_admin()));

alter policy "Users insert own deletion request" on public.deletion_requests
  with check (((select auth.uid()) = user_id));

alter policy "Users read own deletion request" on public.deletion_requests
  using (((select auth.uid()) = user_id));

alter policy "Dispute creation by order party" on public.disputes
  with check ((EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = disputes.order_id) AND (orders.status <> 'pending'::text) AND (((disputes.created_by_role = 'buyer'::text) AND (orders.buyer_id = (select auth.uid()))) OR ((disputes.created_by_role = 'seller'::text) AND (orders.seller_id = (select auth.uid()))))))));

alter policy "Disputes updated by admin" on public.disputes
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Disputes visible to parties and admin" on public.disputes
  using (((select is_admin()) OR (EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = disputes.order_id) AND ((orders.buyer_id = (select auth.uid())) OR (orders.seller_id = (select auth.uid()))))))));

alter policy "Users delete own favorites" on public.favorites
  using ((user_id = (select auth.uid())));

alter policy "Freelancer manages own certifications — delete" on public.freelancer_certifications
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own certifications — insert" on public.freelancer_certifications
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own certifications — update" on public.freelancer_certifications
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own education — delete" on public.freelancer_education
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own education — insert" on public.freelancer_education
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own education — update" on public.freelancer_education
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Owner manages own languages" on public.freelancer_languages
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_languages.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_languages.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own links -- delete" on public.freelancer_links
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own links -- insert" on public.freelancer_links
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own links -- update" on public.freelancer_links
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own portfolio items -- delete" on public.freelancer_portfolio_items
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own portfolio items -- insert" on public.freelancer_portfolio_items
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own portfolio items -- update" on public.freelancer_portfolio_items
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Owner deletes own freelancer profile" on public.freelancer_profiles
  using ((profile_id = (select auth.uid())));

alter policy "Owner inserts own freelancer profile" on public.freelancer_profiles
  with check ((profile_id = (select auth.uid())));

alter policy "Owner updates own freelancer profile" on public.freelancer_profiles
  using ((profile_id = (select auth.uid())))
  with check ((profile_id = (select auth.uid())));

alter policy "Owner deletes own skills" on public.freelancer_skills
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_skills.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Owner inserts own skills" on public.freelancer_skills
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_skills.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own tools — delete" on public.freelancer_tools
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own tools — insert" on public.freelancer_tools
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Freelancer manages own tools — update" on public.freelancer_tools
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Post owner deletes skills" on public.job_post_skills
  using ((EXISTS ( SELECT 1
   FROM job_posts jp
  WHERE ((jp.id = job_post_skills.job_post_id) AND (jp.consumer_id = (select auth.uid()))))));

alter policy "Post owner inserts skills" on public.job_post_skills
  with check ((EXISTS ( SELECT 1
   FROM job_posts jp
  WHERE ((jp.id = job_post_skills.job_post_id) AND (jp.consumer_id = (select auth.uid()))))));

alter policy "Admin reads all job_posts" on public.job_posts
  using ((select is_admin()));

alter policy "Consumer creates own post" on public.job_posts
  with check ((consumer_id = (select auth.uid())));

alter policy "Consumer updates own post" on public.job_posts
  using ((consumer_id = (select auth.uid())))
  with check ((consumer_id = (select auth.uid())));

alter policy "Freelancer creates own response" on public.job_responses
  with check ((freelancer_id = (select auth.uid())));

alter policy "Post owner and responder read responses" on public.job_responses
  using (((freelancer_id = (select auth.uid())) OR (EXISTS ( SELECT 1
   FROM job_posts jp
  WHERE ((jp.id = job_responses.job_post_id) AND (jp.consumer_id = (select auth.uid())))))));

alter policy "Order events visible to parties and admin" on public.order_events
  using (((select is_admin()) OR (EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_events.order_id) AND ((o.buyer_id = (select auth.uid())) OR (o.seller_id = (select auth.uid()))))))));

alter policy "Admin reads all orders" on public.orders
  using ((select is_admin()));

alter policy "Buyer and seller read their orders" on public.orders
  using (((buyer_id = (select auth.uid())) OR (seller_id = (select auth.uid()))));

alter policy "Buyer creates own order" on public.orders
  with check ((buyer_id = (select auth.uid())));

alter policy "Buyer or seller updates order" on public.orders
  using (((buyer_id = (select auth.uid())) OR (seller_id = (select auth.uid()))))
  with check (((buyer_id = (select auth.uid())) OR (seller_id = (select auth.uid()))));

alter policy "Shop owner deletes product images" on public.product_images
  using ((EXISTS ( SELECT 1
   FROM (products p
     JOIN shops s ON ((s.id = p.shop_id)))
  WHERE ((p.id = product_images.product_id) AND (s.owner_id = (select auth.uid()))))));

alter policy "Shop owner inserts product images" on public.product_images
  with check ((EXISTS ( SELECT 1
   FROM (products p
     JOIN shops s ON ((s.id = p.shop_id)))
  WHERE ((p.id = product_images.product_id) AND (s.owner_id = (select auth.uid()))))));

alter policy "Shop owner deletes products" on public.products
  using ((EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.id = products.shop_id) AND (s.owner_id = (select auth.uid()))))));

alter policy "Shop owner inserts products" on public.products
  with check ((EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.id = products.shop_id) AND (s.owner_id = (select auth.uid()))))));

alter policy "Shop owner updates products" on public.products
  using ((EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.id = products.shop_id) AND (s.owner_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.id = products.shop_id) AND (s.owner_id = (select auth.uid()))))));

alter policy "Admin reads all profiles" on public.profiles
  using ((select is_admin()));

alter policy "Users can read own profile" on public.profiles
  using (((select auth.uid()) = id));

alter policy "Users can update their own profile" on public.profiles
  using (((select auth.uid()) = id))
  with check (((select auth.uid()) = id));

alter policy "Admin updates reports" on public.reports
  using ((select is_admin()))
  with check ((select is_admin()));

alter policy "Reporter creates own report" on public.reports
  with check ((reporter_id = (select auth.uid())));

alter policy "Reporter reads own, admin reads all" on public.reports
  using (((reporter_id = (select auth.uid())) OR (select is_admin())));

alter policy "Owner deletes own services" on public.service_listings
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Owner inserts own services" on public.service_listings
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Owner updates own services" on public.service_listings
  using ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM freelancer_profiles fp
  WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = (select auth.uid()))))));

alter policy "Owner manages own shop categories" on public.shop_categories
  using ((EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.id = shop_categories.shop_id) AND (s.owner_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.id = shop_categories.shop_id) AND (s.owner_id = (select auth.uid()))))));

alter policy "Owner manages own shop payment methods" on public.shop_payment_methods
  using ((EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.id = shop_payment_methods.shop_id) AND (s.owner_id = (select auth.uid()))))))
  with check ((EXISTS ( SELECT 1
   FROM shops s
  WHERE ((s.id = shop_payment_methods.shop_id) AND (s.owner_id = (select auth.uid()))))));

alter policy "Owner deletes own shop" on public.shops
  using ((owner_id = (select auth.uid())));

alter policy "Owner inserts own shop" on public.shops
  with check ((owner_id = (select auth.uid())));

alter policy "Owner updates own shop" on public.shops
  using ((owner_id = (select auth.uid())))
  with check ((owner_id = (select auth.uid())));

-- The guard: every altered policy, unwrapped, reads back exactly as before; none is missing; no public policy calls
-- auth.uid() or is_admin() bare any more. Postgres deparses (select auth.uid()) as ( SELECT auth.uid() AS uid) and
-- (select is_admin()) as ( SELECT is_admin() AS is_admin); none of the 65 contained either form before this file.
do $$
declare
  v_matched integer;
  v_changed integer;
  v_bare integer;
begin
  select count(*),
         count(*) filter (
           where replace(replace(coalesce(a.qual, ''), '( SELECT auth.uid() AS uid)', 'auth.uid()'),
                         '( SELECT is_admin() AS is_admin)', 'is_admin()') is distinct from coalesce(b.qual, '')
              or replace(replace(coalesce(a.with_check, ''), '( SELECT auth.uid() AS uid)', 'auth.uid()'),
                         '( SELECT is_admin() AS is_admin)', 'is_admin()') is distinct from coalesce(b.with_check, ''))
    into v_matched, v_changed
    from m9_policies_before b
    join pg_policies a on a.schemaname = 'public' and a.tablename = b.tablename and a.policyname = b.policyname;

  if v_matched <> 65 then
    raise exception 'M9 initplan wrap: % of 65 policies found after the ALTERs', v_matched;
  end if;
  if v_changed <> 0 then
    raise exception 'M9 initplan wrap: % policies differ from their old definition once unwrapped', v_changed;
  end if;

  select count(*) into v_bare
    from pg_policies
   where schemaname = 'public'
     and replace(replace(coalesce(qual, '') || ' ' || coalesce(with_check, ''), 'SELECT auth.uid() AS uid', ''),
                 'SELECT is_admin() AS is_admin', '') ~ '(auth\.uid\(\)|(^|[^.a-z_])is_admin\(\))';
  if v_bare <> 0 then
    raise exception 'M9 initplan wrap: % public policies still call auth.uid() or is_admin() bare', v_bare;
  end if;
end;
$$;

drop table m9_policies_before;

-- Post-apply verification (read-only):
--   1. Advisor (performance): auth_rls_initplan → 0 findings.
--   2. select count(*) from pg_policies where schemaname = 'public'
--        and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) like '%auth.uid()%'
--        and replace(coalesce(qual, '') || ' ' || coalesce(with_check, ''), 'SELECT auth.uid() AS uid', '') like '%auth.uid()%';
--      → 0 (no public policy calls auth.uid() bare)
--   3. When the architect says go: the RLS live suites listed in the PR, in batches within the sign-in budget.
--
-- Rollback: the statements below (each policy back to its « -- old » definition), uncommented, in one transaction.
-- alter policy "Admins log their own actions" on public.admin_audit_log
--   with check ((is_admin() AND (admin_id = auth.uid())));
-- alter policy "Admins read audit log" on public.admin_audit_log
--   using (is_admin());
-- alter policy "Only admins manage categories" on public.categories
--   using (is_admin())
--   with check (is_admin());
-- alter policy "Admins read all export requests" on public.data_exports
--   using (is_admin());
-- alter policy "Users insert own export request" on public.data_exports
--   with check ((auth.uid() = user_id));
-- alter policy "Users read own export request" on public.data_exports
--   using ((auth.uid() = user_id));
-- alter policy "Admins read all deletion requests" on public.deletion_requests
--   using (is_admin());
-- alter policy "Users insert own deletion request" on public.deletion_requests
--   with check ((auth.uid() = user_id));
-- alter policy "Users read own deletion request" on public.deletion_requests
--   using ((auth.uid() = user_id));
-- alter policy "Dispute creation by order party" on public.disputes
--   with check ((EXISTS ( SELECT 1
--    FROM orders
--   WHERE ((orders.id = disputes.order_id) AND (orders.status <> 'pending'::text) AND (((disputes.created_by_role = 'buyer'::text) AND (orders.buyer_id = auth.uid())) OR ((disputes.created_by_role = 'seller'::text) AND (orders.seller_id = auth.uid())))))));
-- alter policy "Disputes updated by admin" on public.disputes
--   using (is_admin())
--   with check (is_admin());
-- alter policy "Disputes visible to parties and admin" on public.disputes
--   using ((is_admin() OR (EXISTS ( SELECT 1
--    FROM orders
--   WHERE ((orders.id = disputes.order_id) AND ((orders.buyer_id = auth.uid()) OR (orders.seller_id = auth.uid())))))));
-- alter policy "Users delete own favorites" on public.favorites
--   using ((user_id = auth.uid()));
-- alter policy "Freelancer manages own certifications — delete" on public.freelancer_certifications
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own certifications — insert" on public.freelancer_certifications
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own certifications — update" on public.freelancer_certifications
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = auth.uid())))))
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_certifications.freelancer_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own education — delete" on public.freelancer_education
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own education — insert" on public.freelancer_education
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own education — update" on public.freelancer_education
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = auth.uid())))))
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_education.freelancer_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Owner manages own languages" on public.freelancer_languages
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_languages.freelancer_profile_id) AND (fp.profile_id = auth.uid())))))
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_languages.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own links -- delete" on public.freelancer_links
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own links -- insert" on public.freelancer_links
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own links -- update" on public.freelancer_links
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = auth.uid())))))
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_links.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own portfolio items -- delete" on public.freelancer_portfolio_items
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own portfolio items -- insert" on public.freelancer_portfolio_items
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own portfolio items -- update" on public.freelancer_portfolio_items
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = auth.uid())))))
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_portfolio_items.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Owner deletes own freelancer profile" on public.freelancer_profiles
--   using ((profile_id = auth.uid()));
-- alter policy "Owner inserts own freelancer profile" on public.freelancer_profiles
--   with check ((profile_id = auth.uid()));
-- alter policy "Owner updates own freelancer profile" on public.freelancer_profiles
--   using ((profile_id = auth.uid()))
--   with check ((profile_id = auth.uid()));
-- alter policy "Owner deletes own skills" on public.freelancer_skills
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_skills.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Owner inserts own skills" on public.freelancer_skills
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_skills.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own tools — delete" on public.freelancer_tools
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own tools — insert" on public.freelancer_tools
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Freelancer manages own tools — update" on public.freelancer_tools
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = auth.uid())))))
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = freelancer_tools.freelancer_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Post owner deletes skills" on public.job_post_skills
--   using ((EXISTS ( SELECT 1
--    FROM job_posts jp
--   WHERE ((jp.id = job_post_skills.job_post_id) AND (jp.consumer_id = auth.uid())))));
-- alter policy "Post owner inserts skills" on public.job_post_skills
--   with check ((EXISTS ( SELECT 1
--    FROM job_posts jp
--   WHERE ((jp.id = job_post_skills.job_post_id) AND (jp.consumer_id = auth.uid())))));
-- alter policy "Admin reads all job_posts" on public.job_posts
--   using (is_admin());
-- alter policy "Consumer creates own post" on public.job_posts
--   with check ((consumer_id = auth.uid()));
-- alter policy "Consumer updates own post" on public.job_posts
--   using ((consumer_id = auth.uid()))
--   with check ((consumer_id = auth.uid()));
-- alter policy "Freelancer creates own response" on public.job_responses
--   with check ((freelancer_id = auth.uid()));
-- alter policy "Post owner and responder read responses" on public.job_responses
--   using (((freelancer_id = auth.uid()) OR (EXISTS ( SELECT 1
--    FROM job_posts jp
--   WHERE ((jp.id = job_responses.job_post_id) AND (jp.consumer_id = auth.uid()))))));
-- alter policy "Order events visible to parties and admin" on public.order_events
--   using ((is_admin() OR (EXISTS ( SELECT 1
--    FROM orders o
--   WHERE ((o.id = order_events.order_id) AND ((o.buyer_id = auth.uid()) OR (o.seller_id = auth.uid())))))));
-- alter policy "Admin reads all orders" on public.orders
--   using (is_admin());
-- alter policy "Buyer and seller read their orders" on public.orders
--   using (((buyer_id = auth.uid()) OR (seller_id = auth.uid())));
-- alter policy "Buyer creates own order" on public.orders
--   with check ((buyer_id = auth.uid()));
-- alter policy "Buyer or seller updates order" on public.orders
--   using (((buyer_id = auth.uid()) OR (seller_id = auth.uid())))
--   with check (((buyer_id = auth.uid()) OR (seller_id = auth.uid())));
-- alter policy "Shop owner deletes product images" on public.product_images
--   using ((EXISTS ( SELECT 1
--    FROM (products p
--      JOIN shops s ON ((s.id = p.shop_id)))
--   WHERE ((p.id = product_images.product_id) AND (s.owner_id = auth.uid())))));
-- alter policy "Shop owner inserts product images" on public.product_images
--   with check ((EXISTS ( SELECT 1
--    FROM (products p
--      JOIN shops s ON ((s.id = p.shop_id)))
--   WHERE ((p.id = product_images.product_id) AND (s.owner_id = auth.uid())))));
-- alter policy "Shop owner deletes products" on public.products
--   using ((EXISTS ( SELECT 1
--    FROM shops s
--   WHERE ((s.id = products.shop_id) AND (s.owner_id = auth.uid())))));
-- alter policy "Shop owner inserts products" on public.products
--   with check ((EXISTS ( SELECT 1
--    FROM shops s
--   WHERE ((s.id = products.shop_id) AND (s.owner_id = auth.uid())))));
-- alter policy "Shop owner updates products" on public.products
--   using ((EXISTS ( SELECT 1
--    FROM shops s
--   WHERE ((s.id = products.shop_id) AND (s.owner_id = auth.uid())))))
--   with check ((EXISTS ( SELECT 1
--    FROM shops s
--   WHERE ((s.id = products.shop_id) AND (s.owner_id = auth.uid())))));
-- alter policy "Admin reads all profiles" on public.profiles
--   using (is_admin());
-- alter policy "Users can read own profile" on public.profiles
--   using ((auth.uid() = id));
-- alter policy "Users can update their own profile" on public.profiles
--   using ((auth.uid() = id))
--   with check ((auth.uid() = id));
-- alter policy "Admin updates reports" on public.reports
--   using (is_admin())
--   with check (is_admin());
-- alter policy "Reporter creates own report" on public.reports
--   with check ((reporter_id = auth.uid()));
-- alter policy "Reporter reads own, admin reads all" on public.reports
--   using (((reporter_id = auth.uid()) OR is_admin()));
-- alter policy "Owner deletes own services" on public.service_listings
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Owner inserts own services" on public.service_listings
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Owner updates own services" on public.service_listings
--   using ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = auth.uid())))))
--   with check ((EXISTS ( SELECT 1
--    FROM freelancer_profiles fp
--   WHERE ((fp.id = service_listings.freelancer_profile_id) AND (fp.profile_id = auth.uid())))));
-- alter policy "Owner manages own shop categories" on public.shop_categories
--   using ((EXISTS ( SELECT 1
--    FROM shops s
--   WHERE ((s.id = shop_categories.shop_id) AND (s.owner_id = auth.uid())))))
--   with check ((EXISTS ( SELECT 1
--    FROM shops s
--   WHERE ((s.id = shop_categories.shop_id) AND (s.owner_id = auth.uid())))));
-- alter policy "Owner manages own shop payment methods" on public.shop_payment_methods
--   using ((EXISTS ( SELECT 1
--    FROM shops s
--   WHERE ((s.id = shop_payment_methods.shop_id) AND (s.owner_id = auth.uid())))))
--   with check ((EXISTS ( SELECT 1
--    FROM shops s
--   WHERE ((s.id = shop_payment_methods.shop_id) AND (s.owner_id = auth.uid())))));
-- alter policy "Owner deletes own shop" on public.shops
--   using ((owner_id = auth.uid()));
-- alter policy "Owner inserts own shop" on public.shops
--   with check ((owner_id = auth.uid()));
-- alter policy "Owner updates own shop" on public.shops
--   using ((owner_id = auth.uid()))
--   with check ((owner_id = auth.uid()));

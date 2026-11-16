-- PENDING (db-guardian, 2026-11-16): account deletion also deletes the person's bell notifications. Migration number: the architect's.
-- Founder decision D1 (2026-11-16, bell plan docs/follow-ups/bell-notifications-plan.md, PR #392): « account deletion
-- also deletes the person's notifications », in a separate small DB PR before launch.
-- Depends on 20261116201553_bell_notifications (applied; PR #393, not merged yet).
-- Written for review, NOT applied. The architect reviews it, applies it after the founder's OK, and gives the version.
--
-- WHAT CHANGES
--   admin_process_deletion_request, step « a. Personal lists », right after the notification_preferences delete:
--     delete from public.notifications where recipient_id = v_target.id;
--     get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object('notifications', v_n);
--   Nothing else.
--   - Deleted: the rows the person RECEIVED (recipient_id), per the decision.
--   - Kept: rows the person caused for someone else (actor_id = the person). Those belong to the other party (their
--     order's history: ids and statuses, no text), and the profile stays as a tombstone, so the FK holds.
--
-- HOW: the pattern of 20261106083409_admin_deletion_shop_name_unique. Read the live definition, replace one anchor line,
-- execute it.
--   - Guards (each raises, nothing changes): the anchor must occur exactly once, and the function must not already
--     delete notifications.
--   - CREATE OR REPLACE keeps the owner and the grants. SECURITY DEFINER and search_path '' are part of the executed
--     definition.
--
-- DISCOVERY (read-only on production, 2026-11-16)
--   - Live function: SECURITY DEFINER, search_path '', owner postgres; EXECUTE for postgres, service_role and
--     authenticated (the body's is_admin() gate refuses non-admins); no comment.
--   - Live prosrc: 11 322 characters, md5 7801c2a006546ecc99cdc7c995f56d69. That equals the body of
--     20261106074610_admin_requests_backend.sql plus 20261106083409's shop-rename replace, byte-identical (checked
--     locally): no drift between the repo and production.
--   - Step a today deletes favorites, notification_preferences and job_responses. Bell rows were not deleted.
--   - Data: 0 notifications, 0 deletion requests. Nothing to clean up retroactively.
--   - The return value and the audit after_state gain one key, counts.notifications.
--     - App: src/lib/admin/requests.ts ApprovedResult is a non-strict z.object of status / user_id / tombstone_email.
--       It ignores counts.
--     - Tests: admin-requests-live asserts counts with toMatchObject (partial), so it is unaffected.
--   - The anchor occurs exactly once in the live body. Expected after the apply: prosrc 11 493 characters, md5
--     0e51c76fc7c2dcab0edb990d9db7343b (computed locally from the reconstructed live body).

do $bell_d1$
declare
  v_src    text;
  v_new    text;
  v_anchor constant text := E'  delete from public.notification_preferences where profile_id = v_target.id;\n';
  v_add    constant text :=
       E'  delete from public.notifications where recipient_id = v_target.id;\n'
    || E'  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object(''notifications'', v_n);\n';
begin
  select pg_get_functiondef('public.admin_process_deletion_request(uuid, text, text)'::regprocedure) into v_src;
  if position('delete from public.notifications ' in v_src) > 0 then
    raise exception 'admin_process_deletion_request already deletes notifications — nothing changed';
  end if;
  if (length(v_src) - length(replace(v_src, v_anchor, ''))) / length(v_anchor) <> 1 then
    raise exception 'the notification_preferences delete is not in the function exactly once — nothing changed';
  end if;
  v_new := replace(v_src, v_anchor, v_anchor || v_add);
  execute v_new;
end
$bell_d1$;

-- ─── POST-APPLY CHECKS (read-only) ──────────────────────────────────────────────────────────────────
-- select length(prosrc), md5(prosrc), prosecdef, proconfig, array_to_string(proacl, ',')
--   from pg_proc where oid = 'public.admin_process_deletion_request(uuid,text,text)'::regprocedure;
--   -- 11493 | 0e51c76fc7c2dcab0edb990d9db7343b | t | {search_path=""}
--   -- | postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres (unchanged)
--
-- ─── ROLLED-BACK CHECK (optional, after the apply) ──────────────────────────────────────────────────
-- One statement. The final RAISE rolls back everything: the throwaway auth user and its profile, the two bell rows, the
-- request, the tombstone and the audit row. It needs one active admin and one order; it changes neither.
-- Expected: ERROR  DELETION CHECK: counts.notifications=1 recipient_rows_left=0 actor_rows_kept=1 status=approved
-- do $$
-- declare
--   v_user  constant uuid := '7f000000-0000-4000-8000-0000000000d1';
--   v_admin uuid;
--   v_order public.orders%rowtype;
--   v_req   uuid;
--   v_res   jsonb;
--   v_left  integer;
--   v_kept  integer;
-- begin
--   select id into v_admin from public.profiles where is_admin and suspended_at is null limit 1;
--   select * into v_order from public.orders order by created_at limit 1;
--   if v_admin is null or v_order.id is null then
--     raise exception 'DELETION CHECK: needs an active admin and one order';
--   end if;
--   insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
--   values (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
--           'bell-del-rollback@rls-smoke.servyou.invalid', '{"full_name":"Rollback Check"}', now(), now());
--   -- One row TO the person (deleted), one BY the person to someone else (kept: the other party's history).
--   insert into public.notifications (recipient_id, actor_id, order_id, kind, to_status)
--   values (v_user, v_order.buyer_id, v_order.id, 'order_created', 'pending'),
--          (v_order.seller_id, v_user, v_order.id, 'order_created', 'pending');
--   insert into public.deletion_requests (user_id, reason) values (v_user, 'rolled-back check') returning id into v_req;
--   perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
--   v_res := public.admin_process_deletion_request(v_req, 'approve', null);
--   select count(*) into v_left from public.notifications where recipient_id = v_user;
--   select count(*) into v_kept from public.notifications where actor_id = v_user;
--   raise exception 'DELETION CHECK: counts.notifications=% recipient_rows_left=% actor_rows_kept=% status=%',
--     v_res -> 'counts' ->> 'notifications', v_left, v_kept, v_res ->> 'status';
-- end $$;
--
-- ─── ROLLBACK (no row changes; the same anchor pattern in reverse) ──────────────────────────────────
-- do $undo$
-- declare
--   v_src text;
--   v_new text;
--   v_add constant text :=
--        E'  delete from public.notifications where recipient_id = v_target.id;\n'
--     || E'  get diagnostics v_n = row_count;  v_counts := v_counts || jsonb_build_object(''notifications'', v_n);\n';
-- begin
--   select pg_get_functiondef('public.admin_process_deletion_request(uuid, text, text)'::regprocedure) into v_src;
--   v_new := replace(v_src, v_add, '');
--   if v_new = v_src then raise exception 'the notifications delete was not found — nothing changed'; end if;
--   execute v_new;
-- end
-- $undo$;
-- (Expected after the rollback: md5(prosrc) = 7801c2a006546ecc99cdc7c995f56d69 again.)

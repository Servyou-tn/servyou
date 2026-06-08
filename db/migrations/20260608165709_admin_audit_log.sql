-- Admin audit log — every state-changing admin action writes a row here.
-- Per strategic reference §9: "Every admin action must be timestamped and
-- attributed to a named user, including the entity affected and the
-- before/after state." For Servyou's solo-admin reality this matters less
-- for accountability (Moatez is the only admin) and more for memory: when
-- a user emails six months from now asking why their shop was hidden, the
-- audit log is what lets Moatez reconstruct what happened.
--
-- Schema is intentionally generic — every admin action across reports,
-- disputes, content moderation, user suspension, etc. writes through the
-- same table via the log_admin_action() helper. The before/after columns
-- are jsonb so each action can record its own shape without schema changes
-- per action type.

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid,
  before_state jsonb,
  after_state jsonb,
  note text,
  created_at timestamptz not null default now()
);

-- Action / target_type are free text by design — adding a new admin action
-- shouldn't require a CHECK migration. Convention is documented in code:
-- action: snake_case verb phrase like 'suspend_user', 'hide_content_shop',
-- 'resolve_report', 'dismiss_dispute'.
-- target_type: matches the existing reports.target_type vocabulary plus
-- 'report' and 'dispute' for actions on the moderation records themselves.

-- Indexes for the most common queries.
create index admin_audit_log_admin_id_idx       on public.admin_audit_log (admin_id);
create index admin_audit_log_target_idx         on public.admin_audit_log (target_type, target_id);
create index admin_audit_log_created_at_idx     on public.admin_audit_log (created_at desc);
create index admin_audit_log_action_idx         on public.admin_audit_log (action);

-- RLS

alter table public.admin_audit_log enable row level security;

-- SELECT: admin only. Audit log is admin-internal forensic memory; non-admin
-- users have no business reading the action history.
create policy "Admins read audit log"
  on public.admin_audit_log
  for select
  to authenticated
  using (public.is_admin());

-- INSERT: admin only, and the admin_id MUST match auth.uid(). The helper
-- function below enforces this server-side too, but the RLS belt-and-
-- suspenders prevents an admin from logging actions under another admin's
-- name even via direct INSERT.
create policy "Admins log their own actions"
  on public.admin_audit_log
  for insert
  to authenticated
  with check (public.is_admin() and admin_id = auth.uid());

-- No UPDATE policy — audit log entries are immutable once written.
-- No DELETE policy — audit log is permanent forensic record.

-- Helper RPC: app-level admin actions call this after their successful
-- mutation. SECURITY DEFINER so it can write even when called from a
-- context where the caller's RLS would otherwise block (though admin
-- caller's RLS would allow it — defense in depth).
create or replace function public.log_admin_action(
  p_action text,
  p_target_type text,
  p_target_id uuid default null,
  p_before_state jsonb default null,
  p_after_state jsonb default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Admin-only gate. is_admin() reads auth.uid() internally.
  if not public.is_admin() then
    raise exception 'Forbidden: admin access required';
  end if;

  -- Validate non-empty action and target_type. Free-text but not empty.
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'log_admin_action: action is required';
  end if;
  if p_target_type is null or length(trim(p_target_type)) = 0 then
    raise exception 'log_admin_action: target_type is required';
  end if;

  insert into public.admin_audit_log (
    admin_id, action, target_type, target_id, before_state, after_state, note
  ) values (
    auth.uid(),
    trim(p_action),
    trim(p_target_type),
    p_target_id,
    p_before_state,
    p_after_state,
    nullif(trim(coalesce(p_note, '')), '')
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on table public.admin_audit_log is
  'Forensic record of every admin action. Immutable (no UPDATE, no DELETE). Written via log_admin_action() RPC from app-level admin server actions after their successful mutation.';

comment on function public.log_admin_action is
  'Admin-only RPC to write an audit log entry. Called from server actions after a successful mutation. Enforces admin_id = auth.uid() and non-empty action/target_type. SECURITY DEFINER but the admin gate runs first.';

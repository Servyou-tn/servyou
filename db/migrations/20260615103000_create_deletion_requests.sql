-- deletion_requests: consumer-initiated, admin-mediated account-deletion requests.
--
-- Per data-model Layer 1, deleting the auth.users row cascades to the profile + all
-- dependent data; this table only RECORDS the request. The /mon-compte delete flow INSERTs
-- a row here (status='pending'); an admin performs the actual deletion later (the
-- admin-processing UI is a future commit). Applied via Supabase MCP on 2026-06-15.
create table public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending','approved','rejected'))
);

alter table public.deletion_requests enable row level security;

-- The requester manages their own request.
create policy "Users insert own deletion request"
  on public.deletion_requests for insert with check (auth.uid() = user_id);
create policy "Users read own deletion request"
  on public.deletion_requests for select using (auth.uid() = user_id);

-- Admins read all + update (to process), mirroring the moderation/reports tables.
create policy "Admins read all deletion requests"
  on public.deletion_requests for select using (public.is_admin());
create policy "Admins update deletion requests"
  on public.deletion_requests for update using (public.is_admin());

-- At most one open request per user (no stacking).
create unique index deletion_requests_one_pending_per_user
  on public.deletion_requests (user_id) where status = 'pending';

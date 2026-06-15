-- data_exports: consumer-initiated, admin-mediated "export my data" requests
-- (data portability per GDPR Art. 20 / Loi organique 2004-63). Mirrors deletion_requests:
-- the /parametres "Exporter mes données" flow INSERTs a row (status='pending'); an admin
-- prepares + emails the export and sets export_url/status. Applied via Supabase MCP on
-- 2026-06-15.
create table public.data_exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  processed_at timestamptz,
  processed_by uuid references auth.users(id),
  status text not null default 'pending' check (status in ('pending','completed','rejected')),
  export_url text
);

alter table public.data_exports enable row level security;

create policy "Users insert own export request"
  on public.data_exports for insert with check (auth.uid() = user_id);
create policy "Users read own export request"
  on public.data_exports for select using (auth.uid() = user_id);
create policy "Admins read all export requests"
  on public.data_exports for select using (public.is_admin());
create policy "Admins update export requests"
  on public.data_exports for update using (public.is_admin());

create unique index data_exports_one_pending_per_user
  on public.data_exports (user_id) where status = 'pending';

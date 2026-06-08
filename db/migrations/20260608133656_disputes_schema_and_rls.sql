-- Disputes — special class of report scoped to a specific order.
-- Per spec §J.7 lines 1217–1221: pulls together order lifecycle evidence so an
-- admin can side with the buyer, the seller, or propose a compromise. Money
-- movement is explicitly out of scope at MVP (COD-only, no payment rail) — the
-- resolution is informational, not transactional.

create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  created_by_role text not null check (created_by_role in ('buyer', 'seller')),
  reason text not null check (reason in (
    'not_delivered',
    'wrong_item',
    'damaged',
    'payment_refused',
    'buyer_unreachable',
    'other'
  )),
  description text,
  status text not null default 'open' check (status in (
    'open',
    'under_review',
    'resolved',
    'dismissed'
  )),
  outcome text check (outcome is null or outcome in (
    'sided_buyer',
    'sided_seller',
    'compromise'
  )),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Terminal states (resolved, dismissed) require an admin_note — the message
-- both parties see on close. Mirrors reports_terminal_requires_admin_note.
alter table public.disputes
  add constraint disputes_terminal_requires_admin_note
  check (
    status not in ('resolved', 'dismissed')
    or admin_note is not null
  );

-- Outcome is only meaningful when status='resolved' (one of the three sides).
-- 'dismissed' means the admin found the dispute invalid; no side was favored.
-- 'open' / 'under_review' have no outcome yet.
alter table public.disputes
  add constraint disputes_outcome_only_when_resolved
  check (
    (status = 'resolved' and outcome is not null)
    or (status <> 'resolved' and outcome is null)
  );

-- When reason='other', a non-empty description is required so the admin has
-- enough context to decide.
alter table public.disputes
  add constraint disputes_other_requires_description
  check (
    reason <> 'other'
    or (description is not null and length(trim(description)) > 0)
  );

-- At most one active dispute per order. Once resolved or dismissed, a new
-- dispute can be raised on the same order (for genuinely new complaints).
create unique index disputes_one_active_per_order
  on public.disputes (order_id)
  where status in ('open', 'under_review');

-- Indexes for the admin queue (status filter), order lookups, and recency sort.
create index disputes_status_idx on public.disputes (status);
create index disputes_order_id_idx on public.disputes (order_id);
create index disputes_created_at_idx on public.disputes (created_at desc);

-- updated_at trigger (mirrors the reports_set_updated_at pattern).
create or replace function public.disputes_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_disputes_set_updated_at
  before update on public.disputes
  for each row
  execute function public.disputes_set_updated_at();

-- RLS

alter table public.disputes enable row level security;

-- SELECT: admin sees all; parties (buyer or seller of the order) see disputes
-- on their own orders.
create policy "Disputes visible to parties and admin"
  on public.disputes
  for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders
      where orders.id = disputes.order_id
      and (orders.buyer_id = auth.uid() or orders.seller_id = auth.uid())
    )
  );

-- INSERT: a party of the order can create a dispute, and only with the role
-- matching their identity on the order. The order must be past 'pending'.
create policy "Dispute creation by order party"
  on public.disputes
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.orders
      where orders.id = disputes.order_id
      and orders.status <> 'pending'
      and (
        (disputes.created_by_role = 'buyer' and orders.buyer_id = auth.uid())
        or (disputes.created_by_role = 'seller' and orders.seller_id = auth.uid())
      )
    )
  );

-- UPDATE: admin only (status transitions, outcome, admin_note).
create policy "Disputes updated by admin"
  on public.disputes
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- No DELETE policy — disputes are permanent records.

comment on table public.disputes is
  'Disputes between buyers and sellers on specific orders. Special class of report scoped to an order. Resolution is informational at MVP (no payment rail, no money movement).';

comment on index public.disputes_one_active_per_order is
  'At most one dispute on an order can be active (open or under_review) at any time. Once resolved or dismissed, a new dispute can be raised.';

comment on constraint disputes_outcome_only_when_resolved on public.disputes is
  'outcome is the side the admin took (sided_buyer / sided_seller / compromise) and is only set when status=resolved. dismissed disputes have no outcome — admin found them invalid.';

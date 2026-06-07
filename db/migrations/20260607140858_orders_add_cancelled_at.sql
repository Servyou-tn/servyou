-- Add terminal-state cancellation timestamp, mirroring received_at for the success terminal state.
alter table public.orders add column cancelled_at timestamptz null;

-- Trigger function: stamp cancelled_at when status transitions into 'cancelled'.
-- SECURITY INVOKER (default) — no elevated privileges needed; just modifies NEW.
create or replace function public.set_cancelled_at_on_transition()
returns trigger
language plpgsql
as $$
begin
  if (old.status is distinct from 'cancelled') and (new.status = 'cancelled') then
    new.cancelled_at := now();
  end if;
  return new;
end;
$$;

-- Attach as BEFORE UPDATE. Named with trg_ prefix and 's' after 'c' so it fires
-- AFTER trg_check_order_status_transition validates the transition.
create trigger trg_set_cancelled_at_on_transition
before update on public.orders
for each row
execute function public.set_cancelled_at_on_transition();

comment on column public.orders.cancelled_at is
  'Timestamp set automatically by trg_set_cancelled_at_on_transition when status transitions to cancelled. Mirrors received_at for the terminal success state. NULL while status is non-cancelled.';

comment on function public.set_cancelled_at_on_transition() is
  'BEFORE UPDATE trigger function on orders: stamps NEW.cancelled_at = now() when status transitions into cancelled. Fires after trg_check_order_status_transition by alphabetical name ordering, so role-gating validates the transition first.';

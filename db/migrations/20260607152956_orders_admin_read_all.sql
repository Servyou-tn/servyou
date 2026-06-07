-- Admin can read all orders for moderation purposes (dispute resolution, user activity assessment).
-- The pre-existing buyer/seller-only SELECT policy remains in effect; admin policy OR's with it.
-- INSERT remains buyer-only; UPDATE remains gated by the role-gating trigger (admin override
-- already exists inside trg_check_order_status_transition).
create policy "Admin reads all orders" on public.orders
  for select to authenticated
  using (public.is_admin());

comment on policy "Admin reads all orders" on public.orders is
  'Grants admins SELECT on all orders so the admin user detail page can compute orders-as-buyer and orders-as-seller counts, and so future dispute resolution surfaces can read the lifecycle of any order. INSERT remains buyer-only; UPDATE gating lives in the role-gating trigger which already honors is_admin().';

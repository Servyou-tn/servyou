-- disputes: a party opens a dispute; only an admin decides it.
-- Follow-up: « MEDIUM — disputes, data_exports and deletion_requests accept admin fields on INSERT »
-- (docs/follow-ups/suspension-enforcement.md). The data_exports / deletion_requests half was closed by
-- migration 68 (C: INSERT only (user_id) / (user_id, reason)); this is the disputes half, same shape.
-- Standards-reference Section 3 A01 / A04.
--
-- Live before this migration (verified 2026-10-28): authenticated holds TABLE-level INSERT / SELECT /
-- UPDATE (relacl authenticated=arw), no column ACLs. « Dispute creation by order party » checks only that
-- the caller is the order's buyer / seller matching created_by_role and the order is past 'pending'. So a
-- party can INSERT a dispute already 'resolved' with outcome 'sided_buyer' and any admin_note, or
-- 'dismissed', and backdate created_at -- a forged admin ruling on the counterparty. 0 disputes live.
--
-- App write paths checked (2026-10-28): actions/disputes.ts createDispute inserts (order_id,
-- created_by_role, reason, description) -- exactly the granted list; status defaults to 'open', outcome /
-- admin_note to NULL, timestamps to now(). The admin actions (admin/litiges) only UPDATE (status,
-- outcome, admin_note) under « Disputes updated by admin » (is_admin()); UPDATE is untouched.

revoke insert on public.disputes from authenticated;

grant insert (order_id, created_by_role, reason, description) on public.disputes to authenticated;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
--
-- revoke insert (order_id, created_by_role, reason, description) on public.disputes from authenticated;
-- grant insert on public.disputes to authenticated;

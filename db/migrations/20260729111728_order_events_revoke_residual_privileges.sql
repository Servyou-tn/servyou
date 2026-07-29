-- Follow-up to the order_events migration, caught by its own verification query.
--
-- `revoke insert, update, delete` left TRUNCATE, TRIGGER and REFERENCES granted to
-- `authenticated` by Supabase's schema-level default privileges. TRUNCATE is a WRITE,
-- and it BYPASSES RLS entirely -- so the "append-only, trigger-only" guarantee in the
-- table comment was not actually true as applied.
--
-- Replace the enumerated revoke with the precise posture: nothing, then SELECT.
revoke all on public.order_events from authenticated;
grant select on public.order_events to authenticated;

-- NOTE, deliberately NOT fixed here: this same residual TRUNCATE grant exists on every
-- table in `public` for BOTH `authenticated` and `anon` (orders, profiles, products,
-- disputes, admin_audit_log, ...). It is a pre-existing Supabase default-privileges
-- artifact, not something this PR introduced, and PostgREST exposes no HTTP verb that
-- reaches TRUNCATE -- so it is a defense-in-depth gap, not a live remote exploit.
-- Sweeping 20+ tables belongs in its own PR with its own smoke tests, per
-- one-PR-one-focus. Logged in docs/follow-ups.md.

-- A resolved report must have an admin_note: the reporter sees it as the resolution outcome.
-- Pre-resolution states (open, under_review) allow admin_note to be null.
-- Zero reports exist today so no backfill is needed; the CHECK applies forward.
alter table public.reports
  add constraint reports_resolved_requires_admin_note
  check (status <> 'resolved' or admin_note is not null);

comment on constraint reports_resolved_requires_admin_note on public.reports is
  'Data-quality rule: a resolved report must carry an admin_note that the reporter sees as the moderation outcome. Enforced at the DB layer so a direct API call cannot mark a report resolved with no explanation back to the reporter.';

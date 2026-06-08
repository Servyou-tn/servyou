-- Add 'dismissed' as a valid value on reports.status — distinct from 'resolved'.
-- 'resolved' = admin agreed with the report and took action (content moderated, user suspended, etc.)
-- 'dismissed' = admin determined the report was invalid/spurious; no action against the target.
-- The existing CHECK that admin_note is non-null when status='resolved' is extended to also
-- require admin_note on dismissal (so the admin records WHY the report was dismissed — visible to
-- the reporter, same surface as the resolution note).
alter table public.reports
  drop constraint if exists reports_status_check;

alter table public.reports
  add constraint reports_status_check
  check (status in ('open', 'under_review', 'resolved', 'dismissed'));

alter table public.reports
  drop constraint if exists reports_resolved_requires_admin_note;

alter table public.reports
  add constraint reports_terminal_requires_admin_note
  check (
    status not in ('resolved', 'dismissed')
    or admin_note is not null
  );

comment on constraint reports_terminal_requires_admin_note on public.reports is
  'Both resolved and dismissed are terminal states that close out a report; the admin_note is the message shown to the reporter and is required for either terminal transition.';

-- Contact messages are stored, not dropped (founder + architect decision 2026-11-01, before the beta). Until now
-- /contact answered « Message reçu » but only console-logged the subject and the length: every message was lost.
--
-- Written ONLY by the server with the service role (submitContactMessage, AFTER the Turnstile check and the length
-- checks). RLS is enabled with no policy, and every client privilege is revoked — including the SELECT a new table
-- still gets by default since migration 107. No client write privilege → the client-write allow-list is untouched.
--
-- Reading: no admin UI for now; the founder reads the table in the Supabase table view (docs/operations/contact-
-- messages.md). Emailing each new message to the founder comes after the Resend / OVH setup (follow-up).
--
-- Retention: messages older than 12 months are deleted. Documented here and in the operations doc; the scheduled job
-- comes later (the created_at index serves it):
--   delete from public.contact_messages where created_at < now() - interval '12 months';
--
-- Limits mirror src/lib/contact/contact-validation.ts (name 100, email 254, subject = one of the form's keys ≤ 100,
-- message 1–2000 after trim), as CHECKs so a row can never exceed them whoever writes it. user_id is the sender's
-- account when signed in; it is cleared if that account is deleted (the message itself follows the 12-month rule).

create table public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null check (char_length(btrim(name)) between 1 and 100),
  email      text not null check (char_length(email) between 3 and 254),
  subject    text check (subject is null or char_length(subject) <= 100),
  message    text not null check (char_length(btrim(message)) between 1 and 2000),
  user_id    uuid references auth.users (id) on delete set null,
  status     text not null default 'new' check (status in ('new', 'handled'))
);

create index contact_messages_created_at_idx on public.contact_messages (created_at);

alter table public.contact_messages enable row level security;

revoke all on public.contact_messages from public, anon, authenticated;

comment on table public.contact_messages is
  'Messages sent from /contact. Service role only: RLS on, no policy, no client privilege. Written by '
  'submitContactMessage after the Turnstile and length checks. Read in the Supabase table view (no admin UI yet). '
  'Retention: rows older than 12 months are deleted.';

-- Post-apply verification:
--   1. select relrowsecurity from pg_class where oid = 'public.contact_messages'::regclass;  → true
--   2. select grantee, privilege_type from information_schema.role_table_grants
--       where table_name = 'contact_messages' and grantee in ('anon', 'authenticated');  → 0 rows
--   3. src/__tests__/contact-messages-live.test.ts (live, 1 sign-in): anon and a signed-in user can neither read nor
--      write; the service role stores a message; the CHECKs refuse an over-long field and an unknown status.
--   4. client-write-grants-live.test.ts still equals the allow-list (no new client write).
--
-- Rollback:
--   drop table public.contact_messages;

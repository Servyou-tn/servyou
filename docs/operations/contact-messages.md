# Contact messages (/contact)

Every message sent from the public contact form is stored in **`public.contact_messages`**. Before 2026-11-01 the
form answered « Message reçu » but only logged the subject and length: messages were lost.

## Where they are and how to read them

- **No admin screen yet.** Read them in Supabase: project `xggomcitqrkaylqezjjz` → **Table Editor** → schema
  `public` → `contact_messages`. Sort by `created_at` descending.
- Columns: `created_at`, `name`, `email`, `subject` (the form's subject key, e.g. `contact.form.subject.technical`;
  empty if none chosen), `message`, `user_id` (the sender's account if they were signed in), `status`.
- **Answering:** reply from your own mailbox to `email`, then set `status` to `handled` in the table view.

## Who can access the table

- Only the server (service role) writes it, after the bot check (Turnstile) and the length checks.
- Clients have no access at all: RLS is on with no policy, every client privilege is revoked. The Supabase dashboard
  (as the project owner) reads it.
- The server log keeps no personal data: only the subject key and the message length.

## Retention

Messages older than **12 months** are deleted. Until a scheduled job exists, run this in the SQL editor once a month:

```sql
delete from public.contact_messages where created_at < now() - interval '12 months';
```

## Later

- Email each new message to the founder, after the Resend / OVH setup (`docs/follow-ups/contact-messages.md`).
- A scheduled retention job (pg_cron), and an admin screen if the volume calls for one.

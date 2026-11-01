# Contact messages (`fix/contact-messages-store`, 2026-11-01)

## 1. Email each new message to the founder
- **What:** `submitContactMessage` stores the message; nobody is notified. Send it to the founder's mailbox too.
- **Why deferred:** needs the transactional email setup (Resend + the servyou.tn domain, waiting on OVH).
- **Where it lives:** `src/app/(marketing)/contact/actions.ts`, after `saveContactMessage`.
- **Trigger:** the Resend PR. A send failure must not fail the submit — the message is already stored.

## 2. Scheduled 12-month retention
- **What:** messages older than 12 months must be deleted; today it is a monthly manual query
  (`docs/operations/contact-messages.md`).
- **Why deferred:** founder + architect: « job later is fine ».
- **Where it lives:** a pg_cron job (migration), `created_at` is indexed.
- **Trigger:** before the first messages reach 12 months, or with the next pg_cron migration.

## 3. Admin screen
- **What:** no UI to read / mark messages handled; the founder uses the Supabase table view.
- **Trigger:** when the volume makes the table view impractical.

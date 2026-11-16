# Brand spelling « ServYou » — what the code change could not reach (`chore/brand-spelling-servyou`, 2026-11-16)

## The database's provenance error still says « Servyou »

- **What:** `enforce_storage_upload_provenance` raises « Cette image n'a pas été téléversée par Servyou. » (migration
  `20261026205458_storage_upload_provenance.sql`, lines 78 and 114). `src/__tests__/storage-upload-provenance.test.ts`
  pins that live message.
- **Why deferred:** changing it is a migration (`create or replace function`), which only the architect applies. It only
  fires on a bypass attempt, and no screen shows the raw text.
- **Where it lives:** the trigger function in production; `db/migrations/20261026205458_storage_upload_provenance.sql`;
  the test above.
- **Trigger:** the next migration that touches storage, or a dedicated one-line migration (the test changes with it).

## Supabase Auth e-mails are written in the dashboard

- **What:** the confirmation, magic-link and password-reset e-mails (and their sender name) live in the Supabase dashboard,
  not in this repo, so this PR could not change them.
- **Why deferred:** a founder action in Supabase → Authentication → Email Templates (and SMTP sender name).
- **Where it lives:** the Supabase dashboard of project `xggomcitqrkaylqezjjz`.
- **Trigger:** now — any template that says « Servyou » should read « ServYou ».

## « Rechercher sur ServYou » is hard-coded French

- **What:** `src/components/marche/ExpandableSearch.tsx` renders « Rechercher sur ServYou » as JSX text, not through `t()`,
  so the AR and EN screens show it in French. This PR fixed only its spelling.
- **Why deferred:** a translation fix (new key in FR / AR / EN), outside a spelling PR.
- **Where it lives:** `src/components/marche/ExpandableSearch.tsx`.
- **Trigger:** the next i18n or marketplace-search PR.

# Nightly backup after run #1 — follow-ups (`docs/backup-runbook-run1`, 2026-11-14)

What the first manual run (2026-11-13) and the private repo's PR #1 left open. Earlier items stay in
`nightly-backup.md`. Since servyou-backups PR #2, its item 6 reads differently: a file in `verifications` is skipped
and listed, the database is still backed up, and the run fails at the end. The trigger is unchanged.

## 1. TRIGGER — flip the runbook's status line after the first green run

**What:** `docs/operations.md`, « Nightly encrypted backup », says « built, NOT green yet ». Change it to « live since
<date> » and add a verification-log row.
**Why deferred:** run #1's restore check failed (`roles.sql` line 19). The fix is servyou-backups PR #2, and the
founder re-runs after it merges.
**Where it lives:** `docs/operations.md`, the status block and « Verification log ».
**Trigger:** the first run with every step green, including the restore check.

## 2. TRIGGER — privileges after a restore (the restore check's ACL warning)

**What:** the restore check compares every privilege list in `public` and `private`, and only warns. Supabase's
default privileges in the target may give restored tables wider grants than production's: `pg_dump` adds GRANTs but
does not revoke what the target grants on its own. Run #1 stopped before this comparison, so it is still unobserved.
**Why deferred:** not observed yet. The fix belongs in the restore procedure, and the architect decides it.
**Where it lives:** `docs/operations.md`, « Restore drill procedure », step 3; the private repo's README, « Privileges
after a restore ».
**Trigger:** the first run that reaches the comparison. If it warns, stop the target's default grants from widening
the restored tables. For example, revoke the target's default privileges for `anon`/`authenticated` before
`schema.sql`.

## 3. LOW — the runbook should carry the founder's exact `gh secret set` commands

**What:** the runbook now says every secret is written with `gh secret set`, straight from the command that generates
it. But « Setting the role's password » still prints the password to the console, and setup step B7 prints the B2 key.
The founder already used a piped flow on 2026-11-13. The runbook should show those exact commands, so a rotation never
goes through the screen or the clipboard.
**Why deferred:** the commands are the founder's. Writing untested ones risks a stray newline or encoding byte in the
secret: Windows PowerShell 5.1 re-encodes text piped to a native command.
**Where it lives:** `docs/operations.md`, setup steps B7–B8 and « Setting the role's password ».
**Trigger:** the founder shares the commands, or the next rotation.

## 4. LOW — Vercel: `NEXT_PUBLIC_SENTRY_DSN` is defined twice

**What:** it exists both as a project-level variable (Oct 29) and as a Shared variable (Jun 8). Keep one.
**Why deferred:** both hold the public DSN, so nothing breaks today. Found while building the Sentry cron URL.
**Where it lives:** Vercel → the project's Environment Variables, and the team's Shared Environment Variables.
**Trigger:** the next Vercel settings tidy, or before any change to the DSN.

## 5. LOW — Vercel: public variables typed Secret

**What:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are typed Secret. A `NEXT_PUBLIC_` value is
shipped in the browser bundle, so the honest type is a plain variable. Harmless.
**Why deferred:** nothing breaks. Tidy only.
**Where it lives:** Vercel → the project's Environment Variables.
**Trigger:** the same tidy as item 4.

## 6. Private-repo follow-ups (tracked in servyou-backups PR #1's body, listed here so none is lost)

**What:**
- `sslmode=verify-full` with Supabase's CA (`nightly-backup.md` item 4). It needs a live test.
- A Storage file replaced or deleted between the snapshot and its download turns the run red (a size mismatch or a
  404). Retry the download after re-reading that object.
- Optional: a round-trip check of the encrypted file through a second, run-only recipient.

The two founder settings from that list are done (checked 2026-11-14): actions must be pinned to a full commit SHA,
and only GitHub-owned actions are allowed.

**Why deferred:** after the first green run, so a failure has a single cause.
**Where it lives:** `Servyou-tn/servyou-backups`.
**Trigger:** the first green run.

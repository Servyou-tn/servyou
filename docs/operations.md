# Operations — Servyou

## RLS smoke test (`npm run rls-smoke`)

Programmatic verification that the critical Row-Level Security policies actually hold,
run against **production Supabase**. The server-action unit tests mock the Supabase
client, so they never exercise real RLS; this script does — it creates three ephemeral
users, signs in as each with a real authenticated client, and asserts the privacy and
visibility boundaries, then cleans up.

```
npm run rls-smoke
```

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
and `SUPABASE_SERVICE_ROLE_KEY` (loaded via `node --env-file`). The service-role key is
used **only** for fixture setup and teardown; the assertions themselves run through
per-user authenticated clients. **Pass** = all assertions green, exit 0. **Fail** = the
failing assertions are listed, exit 1.

### MVP coverage (PR-U)

Highest-risk paths, each "deny" paired with a positive control on the same row:

- **profiles** — `public_profiles` exposes name/city but hides phone/email/date_of_birth
  (the invariant CLAUDE.md states twice); base `profiles` rows of other users are not
  readable; `get_contact_phone` reveals the number only with a relationship.
- **reports** — reporter sees own; non-reporter non-admin does not; admin sees all.
- **disputes** — buyer and seller parties see; non-party non-admin does not; admin sees all.
- **admin_audit_log** — non-admin can neither write (via `log_admin_action`) nor read;
  admin can do both.
- **moderation** — `admin_hide_content` sets the admin marker (`status='hidden'` +
  `admin_hidden_at`); the moderation-lock triggers then block a non-admin owner from
  overriding it: `enforce_admin_moderation_lock_products` (a seller can't clear the
  marker or flip status back to `active` on products an admin moderated) and
  `enforce_admin_marker_lock` (a non-admin owner can't set `shops.admin_hidden_at`).

Each new RLS-touching PR should add coverage here (PR-U1, U2… expand to the remaining
tables).

### Public catalog tables are world-readable by design — hiding is APP-layer, not RLS

`products` and `shops` have a SELECT policy of `USING (true)` — the public catalog is
intentionally readable by everyone. Hiding a listing (seller-hide via `status`, or admin
moderation via `admin_hidden_at`) is **not** enforced by RLS on the read path; it is
enforced at the **application layer** by the cascade filtering shipped in PR-N (public
surfaces query `status='active'` and `admin_hidden_at IS NULL`). The DB-layer guarantee
is narrower and is what the smoke test asserts: an admin can set the marker, and a
non-admin owner **cannot override or clear it** (the moderation-lock triggers above).

Do **not** add an RLS assertion of the form "a hidden product/shop is invisible to the
public" — it will fail, because RLS returns the row and the app does the filtering. (PR-U's
first run included exactly that false-premise assertion; it was swapped for the
override-lock test. Documented here so it isn't reintroduced.)

### Note on the audit-log write (design intent preserved)

To exercise the `admin_audit_log` RLS at all, the script writes a couple of **ephemeral**
rows to that table (the admin-write assertion + the moderation action), then removes them
via the service role. The "immutable audit log" design — no UPDATE, no DELETE policy — is
a **user/app-facing** invariant and stays fully intact: no application code path can ever
delete an audit row. The narrow service-role cleanup is scoped strictly by the
script-generated test-user ids created in the same run (`admin_id IN (test_user_ids)`),
never by an action/target pattern, so it can never touch a real forensic row.

### Manual cleanup (if the script crashes mid-run)

The test users use deterministic emails (`alice@rls-smoke.servyou.invalid`, etc.). The
script self-cleans, and also re-runs cleanup on a fatal error — but if it is killed
hard, clean up manually. **Order matters**: delete the audit-log rows *before* the users.
`admin_audit_log.admin_id → profiles` is `ON DELETE RESTRICT`, so deleting the users first
fails for the admin test user (charlie) while their audit rows still reference them:

```sql
DELETE FROM admin_audit_log
 WHERE admin_id IN (SELECT id FROM auth.users WHERE email LIKE '%@rls-smoke.servyou.invalid');
DELETE FROM auth.users WHERE email LIKE '%@rls-smoke.servyou.invalid';
```

## Sentry (error monitoring)

Sentry is wired into the app but **inert until env vars are set** — the SDK init is
skipped when `NEXT_PUBLIC_SENTRY_DSN` is unset, so dev and CI run identically to today.
Activation is founder-side:

1. Create a free Sentry account at https://sentry.io
2. Create a project named **servyou** (platform: Next.js)
3. Copy the **DSN** from the project setup page
4. In Vercel → project settings → Environment Variables, add:
   - `NEXT_PUBLIC_SENTRY_DSN` = the DSN from step 3
   - `SENTRY_ORG` = your Sentry organization slug
   - `SENTRY_PROJECT` = `servyou`
   - `SENTRY_AUTH_TOKEN` = create at
     https://sentry.io/settings/account/api/auth-tokens/ (scopes: `org:read` +
     `project:releases`). Only used at build time, for source-map upload.
5. Trigger a redeploy on Vercel after the env vars are set
6. Verify: open Sentry → Issues, then trigger a real error (e.g. visit a deliberately
   broken URL); the error should appear within seconds.

### File layout (Sentry v10 + Next.js 16)

Because this project uses a `src/` directory, the instrumentation files live in `src/`,
not the project root:

- `src/instrumentation.ts` — server/edge registration + `onRequestError`
- `src/instrumentation-client.ts` — browser init + `onRouterTransitionStart` (this is
  the current client hook; the older `sentry.client.config.ts` is **not** used in v10)
- `src/sentry.server.config.ts` — Node runtime (Server Components, Route Handlers,
  Server Actions)
- `src/sentry.edge.config.ts` — Edge runtime (covers `src/middleware.ts`)
- `src/lib/sentry/scrubber.ts` — shared `scrubPII` used by all three configs
- `next.config.ts` — wrapped with `withSentryConfig` for build-time source-map upload
  and the `/monitoring` tunnel route

## What's scrubbed before send

PII redaction runs in `beforeSend` / `beforeSendTransaction` via
`src/lib/sentry/scrubber.ts`. Field names are matched case-insensitively as substrings
against: `password`, `phone`, `delivery_address`, `delivery_phone`, `delivery_name`,
`buyer_note`, `cancellation_reason`, `admin_note`, `email`, `address`, `description`.
Matching values become `[REDACTED]`; cookies are redacted wholesale. This is not a
perfect PII filter — it covers the explicit PII columns Servyou collects. (Unit-tested
in `src/__tests__/sentry-scrubber.test.ts`.)

## Sample rates

- **Errors: 100%** — every error is captured.
- **Performance traces: 10%** in production, **100%** in development.
- **Session replay: disabled** — needs an explicit user-consent flow under Tunisian
  GDPR-equivalent law (Loi 2004-63); deferred to post-launch.

## Note on the `/monitoring` tunnel

Sentry events are proxied through `/monitoring` (set via `tunnelRoute`) to dodge ad
blockers. Since `fix/suspension-enforcement` (2026-10-24) `src/middleware.ts` matches every
route except static assets, the auth pages and `/monitoring`, which it excludes explicitly so
the tunnel is unobstructed (pinned in `src/__tests__/middleware-suspension.test.ts`). Keep
`/monitoring` excluded or browser events will silently stop arriving.

## Backup and disaster recovery

### Current state at launch readiness

Production data scale at this milestone: ~13 MB total, ~15 user rows across all tables.
The platform is **pre-launch**; real user-data accumulation starts after public launch.
This runbook captures the procedures **now** so they exist before they are needed; the
first *verified* restore drill is scheduled for the week before launch, when real data
exists and the founder has local `pg_dump` tooling and the Supabase Pro upgrade in place.

### What Supabase guarantees automatically

Discovery (via the Supabase management API) confirmed the Servyou organization is on the
**Free plan** (org `lqktujslqhiyzqnvgnol`, project `xggomcitqrkaylqezjjz`, Postgres 17,
eu-central-1 Frankfurt). This is the most important fact in this runbook: **the Free plan
does not include point-in-time recovery (PITR), and self-serve daily backup/restore is not
available in the dashboard** — so until the Pro upgrade lands, the manual `pg_dump` below
is the *primary* safety net, not a belt-and-suspenders extra.

**Since PR #367** the nightly encrypted backup (below) is meant to be the primary safety net
on the Free plan, with the manual `pg_dump` as the extra copy before a risky change. **Check
its status line first:** until its first green run there is no nightly backup, and the manual
`pg_dump` is still the only one.

Confirm the live backup posture any time in the dashboard:
https://supabase.com/dashboard/project/xggomcitqrkaylqezjjz/database/backups

- **Free plan (today):** no PITR; no founder-restorable daily backups in the dashboard.
  Real-incident recovery depends on Supabase support plus the manual `pg_dump` backups
  described below.
- **Pro plan (target before launch):** daily backups with 7-day retention included; PITR
  available as a paid add-on (restore to any point within the retention window).

**Launch-blocking action item:** upgrade Supabase to Pro before opening signup to real
users, so daily backups and PITR are active before real data exists. Sequenced alongside
the Vercel Pro upgrade on the launch checklist.

### Recovery objectives

- **RPO** (Recovery Point Objective — max acceptable data loss): up to 24 hours on the
  nightly encrypted backup once it is live (the Free plan has no backups of its own; until
  then, the age of the last manual `pg_dump`); under 1 hour on Pro PITR. Pre-launch this is
  not material; post-launch it drives the Pro-upgrade timing.
- **RTO** (Recovery Time Objective — max time to restore): committed at **4 hours** from
  incident detection during the launch phase.

### Incident response procedures

#### Scenario 1 — Single row accidentally deleted or modified

The most common incident type. If on Pro with PITR: identify the timestamp just before the
bad change and request a point-in-time restore via the dashboard or support. If on Free:
restore from the most recent daily backup (loses any data written between that backup and
the incident).

For development drops or test-data deletions, prefer manually re-creating the affected row
(e.g. via the Supabase SQL editor) when feasible — a full DB restore is far too heavy for a
single-row incident.

#### Scenario 2 — Table dropped or wiped

Higher-stakes version of Scenario 1. Always restore from backup; never attempt manual
re-creation of bulk data.

1. Immediately put up a maintenance banner on the platform. *(Followup: add a
   maintenance-mode toggle to the admin dashboard — not built yet.)*
2. Identify the latest backup before the incident from the Supabase dashboard.
3. Initiate the restore via the dashboard.
4. Once complete, check the restore read-only. In the SQL editor, run the latest nightly
   bundle's `counts.sql` and compare the result with that bundle's `counts.tsv`. The dropped
   table must be back; any other difference is a write made since that bundle. Never run
   `npm run rls-smoke` here: it deletes every test-domain user on production, which is the
   database you just restored.
5. Spot-check a few sample reads of expected data via the SQL editor.
6. Remove the maintenance banner.

#### Scenario 3 — Migration corrupted data

The most likely real-world incident during the solo-founder phase. A forward fix is almost
always cleaner than a restore:

1. Identify the corrupting migration.
2. Write a **revert migration** that undoes the data damage and reverts any schema change.
3. Apply via the Supabase MCP `apply_migration` **with founder approval** (per CLAUDE.md's
   migration discipline — never auto-applied).
4. Mirror the SQL to `db/migrations/`.
5. Document in the migration's comment what was reverted and why.

Full DB restore is the fallback only if the corrupting migration is unrevertable (e.g. a
`DROP` that lost data the migration did not preserve).

#### Scenario 4 — Full database loss (Supabase outage with data damage)

Worst case. Contact Supabase support immediately via the dashboard or support@supabase.com.
Supabase maintains infrastructure-level backups beyond what the dashboard exposes; their
support can restore in catastrophic scenarios.

In parallel: pull the latest manual logical backup from offsite storage (see "Manual backup
procedure" below) and prepare a fresh project provision as the disaster-recovery
alternative if Supabase's own restore takes longer than the RTO allows.

#### Scenario 5 — Accidental admin action (the most likely incident type)

Wrong moderation, wrong suspension, wrong content hide. Because a solo admin is a single
point of failure for misclicks, this is the most likely incident — and the
`admin_audit_log` is the recovery foundation.

1. Identify the action in the audit log:
   ```sql
   SELECT * FROM admin_audit_log
    WHERE admin_id = '<admin_uuid>'
    ORDER BY created_at DESC
    LIMIT 20;
   ```
2. Reverse via the appropriate admin RPC — `admin_unhide_content` or `admin_unsuspend_user`.
   Each writes a new audit row capturing the reversal.
3. Notify the affected user with a courtesy message explaining the error.

### Nightly encrypted backup (PR #367)

> **Status (2026-11-14): built, NOT green yet.** The private repo's workflow is merged
> (servyou-backups PR #1). Run #1 (2026-11-13) dumped, encrypted and uploaded a bundle to B2,
> then its restore check failed on `roles.sql`; the fix is servyou-backups PR #2. A bundle whose
> restore check failed is unproven, so **there is no nightly backup until the first green run**:
> before any risky change, take the manual `pg_dump` below. Change this line to « live since
> <date> » after that first green run.

Supabase Free keeps no backups, so a scheduled job makes one every night. It runs in the
**private** repo `Servyou-tn/servyou-backups`, never in this one: this repo is public, and so
are its Actions logs and artifacts. That repo's README is the source of truth for the scripts;
this section is the runbook. Plan approved by the architect on 2026-11-13 (decisions D1–D7).

**What runs, every night at 01:41 UTC** (96 minutes before the 03:17 purge job):

1. Dump the database through the session pooler as `servyou_backup`, a read-only role
   (migration #133, `20261113150840_backup_role`).
2. Download the public Storage files.
3. Pack everything, encrypt it with [age](https://age-encryption.org), and upload one file to
   Backblaze B2 (EU). A second copy is kept for 7 days as an Actions artifact of the private repo.
4. Restore the bundle into a throwaway Supabase Postgres 17 on the runner, held in memory only,
   and compare the row counts (D4). A mismatch fails the run.
   - « In memory only »: the throwaway database's data folder is a Docker volume bound to a
     folder on the runner's tmpfs, with swap off. The CLI treats that empty volume as a new
     database, and the job then checks that Postgres really wrote its files there.
   - If the restore fails in `roles.sql` or `schema.sql`, which hold no rows, the log names the
     failed statement's first line. It never prints anything from `data.sql`.
5. If a Storage file had to be skipped (step 2), fail the run at the end, once the bundle is safe
   in B2.

**What a bundle holds:** one file per night, `servyou-YYYY-MM-DD.tar.gz.age`. It's gzip, not zstd,
so Windows' built-in `tar` can open it during a drill.

- `roles.sql`, `schema.sql`, `data.sql`: Supabase's official three-file backup. It uses the same
  `pg_dumpall` / `pg_dump` flags as `supabase db dump` (CLI 3.1.0), run with a pinned PostgreSQL 17
  client but without the CLI's `--role postgres`, which the read-only role cannot use.
  - `roles.sql` creates no role today. It leaves out `servyou_backup`, the backup's own login:
    backup infrastructure, not app data, and nothing else names it. It also leaves out the
    settings of Supabase's own roles (`supabase_admin`, …). On Supabase, `postgres` may change the
    settings of the API roles only, so a restore refuses those lines: run #1 stopped at
    `ALTER ROLE "supabase_admin" SET "statement_timeout"`. It keeps the API roles' timeouts.
  - `data.sql` includes `auth.users` and `auth.identities` (with password hashes), and the
    `storage.objects` and `storage.buckets` rows.
  - It leaves out `auth.sessions` and `auth.refresh_tokens` (D7), so everyone signs in again
    after a restore. `auth.mfa_amr_claims` goes with them: one row per session, with a foreign
    key to `auth.sessions`.
  - It also leaves out `cron.job` and `cron.job_run_details`. `postgres` may read `cron.job` but
    not write it (Supabase manages jobs through `cron.schedule`), so loading it would stop the
    restore. `extras.sql` recreates the jobs instead; the run history is only logs.
- `extras.sql`: our own objects inside schemas Supabase manages. The official schema dump skips
  those schemas entirely, so these are generated from the live catalog. Today that means:
  - the 2 triggers on `auth.users`, `on_auth_user_created` and `on_auth_user_email_changed`.
    Without the first, sign-ups after a restore get no profile.
  - the 11 policies on `storage.objects`.
  - the event trigger `ensure_rls`, which turns RLS on for every new table. The official dump
    deletes every event trigger.
  - the pg_cron job `purge-unconfirmed-signups`, through `cron.schedule_in_database`.
- `migrations.sql`: the applied-migrations history (D2). It's a record to read, not something to
  restore; `db/migrations/` in git holds the same SQL.
- `files/`: the public buckets (`avatars`, `product-images`, `shop-assets`, `portfolio-media`),
  downloaded from their public URLs.
  - A file in the private `verifications` bucket is skipped (D5), as is a name that is unsafe as
    a file path. The database and the other files are still backed up, the bundle's
    `files-skipped.tsv` lists what is missing, and the run fails at the end. That bucket will
    then need Storage S3 keys (see `docs/follow-ups/nightly-backup.md`, item 6).
- `counts.tsv` and `counts.sql`: exact row counts of every table in `data.sql`, the objects of
  `extras.sql`, and a fingerprint of the structure of `public` and `private`. They are taken in
  the same snapshot as `data.sql`, and `counts.sql` is the query that produced them.

**Not in a bundle.** Re-create these by hand after a disaster:

- Auth settings, email templates, redirect URLs and CAPTCHA
  (`docs/operations/supabase-auth-config.md`);
- API keys, Vercel environment variables and the custom roles' passwords;
- the `servyou_backup` login: run migration #133 (`20261113150840_backup_role`) on the new
  project, set its password (« Setting the role's password » below), and write the new
  `BACKUP_DB_URL` with `gh secret set` (« Who can read or delete what » → Secrets, below);
- the `pg_cron` extension: enable it first, before `roles.sql`, because `extras.sql` recreates
  the cron jobs through it. The other extensions are preinstalled on Supabase or created by
  `schema.sql`;
- the Vault key. The vault is empty today.

**Retention:**

- `daily/` keeps 30 days and `monthly/` (the copy from the 1st) keeps 365 days, through B2
  lifecycle rules.
- Object Lock in governance mode, 30 days (D3): nothing deletes a bundle before 30 days.
- A bundle is about 3 MB today.

**Who can read or delete what:**

- **Database:** `servyou_backup` reads everything a backup holds and writes no business data.
  One exception: with BYPASSRLS it could delete pg_cron's run history (follow-up 3 in
  `docs/follow-ups/nightly-backup.md`). Its password exists only in the private repo's secret
  `BACKUP_DB_URL`. The connection goes through
  the session pooler, port 5432, as user `servyou_backup.xggomcitqrkaylqezjjz`. It can't use the
  direct host (IPv6 only, and GitHub runners are IPv4 only) or port 6543 (transaction mode, which
  `pg_dump` doesn't support).
- **Encryption:** the age public key is the private repo's variable `AGE_RECIPIENT`. The private
  key exists only on the founder's PC, plus two offline copies. **Lose it and every backup is
  unreadable.**
- **Plaintext:** it exists only in the runner's `$RUNNER_TEMP`, is deleted at the end of the run,
  and is never printed to a log.
- **B2:**
  - the upload key is restricted to the bucket and holds only `listBuckets`, `listFiles` and
    `writeFiles`, so it can't delete or shorten a lock. `listBuckets` is there because
    `b2 account authorize` requires it; on a restricted key it lists only that one bucket;
  - the account's master key, which can override governance, stays offline;
  - the account has 2FA.
- **Secrets:** each is written with `gh secret set <NAME> --repo Servyou-tn/servyou-backups`,
  reading the value on stdin straight from the command that generates it. It is never pasted
  into the website, copied through the clipboard, or saved to a file. On 2026-11-13 the founder
  regenerated `BACKUP_DB_URL` and the B2 upload key this way and deleted the older upload keys;
  only `servyou-nightly-upload-20261113` remains.

**Alerts:**

- GitHub emails the founder when a run fails.
- The Sentry cron monitor `nightly-backup` (check-ins `in_progress` / `ok` / `error`, a 90-minute
  margin, a 30-minute maximum run time) also catches a run that never starts: a disabled
  workflow, an exhausted minutes quota, or a skipped schedule.

#### Setup (founder, once, one action each)

✅ = done by Moatez on 2026-11-13. Run every command in PowerShell.

**A. Key and Backblaze account** (all done)

1. ✅ Install age: `winget install FiloSottile.age`.
2. ✅ Create the key folder outside OneDrive and outside the repo, readable by your account only:
   ```powershell
   New-Item -ItemType Directory C:\servyou-keys
   icacls C:\servyou-keys /inheritance:r /grant:r "${env:USERNAME}:(OI)(CI)F"
   ```
3. ✅ Generate the key pair: `age-keygen -o C:\servyou-keys\backup.key`. It prints the public
   key (`age1…`); send only that line.
4. ✅ Store two offline copies of `backup.key`, for example in a password manager and on a USB
   key.
5. ✅ Create a Backblaze B2 account in the EU region (EU Central, chosen at sign-up).
6. ✅ Turn on 2FA on the Backblaze account.
7. ✅ Create the private bucket `servyou-backups-eu` with Object Lock enabled (only possible at
   creation) and SSE-B2 default encryption. Leave its default retention empty: the website
   offers only compliance mode there, and group B sets governance.
8. ✅ Add two lifecycle rules: `daily/` hidden after 30 days and `monthly/` hidden after 365
   days, each deleted 1 day after hiding.

**B. Governance retention and the upload key** (b2 CLI 5.0.2, used once; all done ✅, checked
with `bucket get` and `key list --long`)

The B2 website can neither set a governance default nor create a key with exact
capabilities. So these steps use Backblaze's command-line tool once, signed in with the master
key. No key is ever typed on a command line: `account authorize` asks for it.

1. Download the b2 CLI 5.0.2, Backblaze's official Windows build:
   ```powershell
   New-Item -ItemType Directory -Force C:\servyou-tools | Out-Null
   curl.exe -L --fail -o C:\servyou-tools\b2.exe https://github.com/Backblaze/B2_Command_Line_Tool/releases/download/v5.0.2/b2-windows.exe
   ```
2. Check the download. This must print `True`: it compares the file with the SHA-256 published
   with the release. On `False`, delete the file and stop.
   ```powershell
   (Get-FileHash C:\servyou-tools\b2.exe -Algorithm SHA256).Hash -eq 'D6E5B1C0918C2755FC8C14EB5B5AA698C36B43D3FDC18FCA13EA163D829BBBBB'
   ```
3. On the B2 website, go to Application Keys → Generate New Master Application Key. Keep the
   page open: it shows the key only once.
4. Sign the CLI in with the master key. It asks for the key ID, then the key; paste both from
   the page.
   ```powershell
   C:\servyou-tools\b2.exe account authorize
   ```
5. Set the bucket's default retention to governance, 30 days. Type `governance`, never
   `compliance`: compliance can't be undone, not even with the master key.
   ```powershell
   C:\servyou-tools\b2.exe bucket update --default-retention-mode governance --default-retention-period "30 days" servyou-backups-eu allPrivate
   ```
6. Check the bucket: `C:\servyou-tools\b2.exe bucket get servyou-backups-eu`. The output must
   show:
   - Object Lock on, with a default retention of governance and 30 days
     (`fileLockConfiguration`);
   - the two lifecycle rules, unchanged;
   - SSE-B2 as the default encryption.
7. Create the upload key, restricted to the bucket. It prints the key ID, then the key, once.
   ```powershell
   C:\servyou-tools\b2.exe key create --bucket servyou-backups-eu servyou-nightly-upload listBuckets,listFiles,writeFiles
   ```
8. Write the two values right away as the private repo's secrets `B2_KEY_ID` and `B2_APP_KEY`,
   with `gh secret set` fed straight from the key's creation (« Who can read or delete what » →
   Secrets).
9. Check the key: `C:\servyou-tools\b2.exe key list --long`. The `servyou-nightly-upload` line
   must name `servyou-backups-eu` and exactly `listBuckets,listFiles,writeFiles`. It must not
   include `deleteFiles`, `bypassGovernance` or `writeFileRetentions`.
10. Sign the CLI out. This erases the master key from its local cache (`.b2_account_info` in
    your user folder).
    ```powershell
    C:\servyou-tools\b2.exe account clear
    ```
11. Retire the master key: keep it only in your password manager, never in GitHub. The
    stronger option is to generate a new master key without saving it, which invalidates the
    one you used. If you do, check that the next nightly run still uploads.
12. Close the PowerShell window, then clear the clipboard history (Win+V → Clear all).

**C. GitHub and the database**

1. ✅ Create the empty private repo `Servyou-tn/servyou-backups`.
2. ✅ Set the role's password (below). It ends with the secret `BACKUP_DB_URL`.
3. ✅ In the private repo, add the variable `B2_BUCKET` = `servyou-backups-eu`. (`AGE_RECIPIENT`
   is already set ✅.)
4. ✅ In the private repo, add the secret `SENTRY_CRON_URL`: the monitor URL from the private
   repo's README, « The Sentry cron monitor ».
5. ✅ In GitHub notification settings, turn on email for failed Actions workflows.

**D. Restore drill**

1. Install Docker Desktop.

#### Setting the role's password (setup step C2)

`log_statement` is `ddl` on this project, and `pg_stat_statements` keeps statements. So a
plaintext `alter role … password '…'` would be stored in both. Instead, compute a SCRAM-SHA-256
verifier on your PC; Postgres stores a value already in that format as is. Paste this whole
block into PowerShell (Node is installed). The password is generated inside it, so it never
reaches the command history:

```powershell
@'
import { randomBytes, pbkdf2Sync, createHmac, createHash } from 'node:crypto'
const password = randomBytes(32).toString('base64url')
const salt = randomBytes(16)
const salted = pbkdf2Sync(password, salt, 4096, 32, 'sha256')
const hmac = (key, text) => createHmac('sha256', key).update(text).digest()
const storedKey = createHash('sha256').update(hmac(salted, 'Client Key')).digest()
const serverKey = hmac(salted, 'Server Key')
const verifier = `SCRAM-SHA-256$4096:${salt.toString('base64')}$${storedKey.toString('base64')}:${serverKey.toString('base64')}`
console.log(`Password, for BACKUP_DB_URL only: ${password}`)
console.log(`SQL editor: alter role servyou_backup with password '${verifier}';`)
'@ | node --input-type=module -
```

1. Run the printed `alter role` line in the Supabase SQL editor.
2. Write the secret `BACKUP_DB_URL` with `gh secret set` (« Who can read or delete what » →
   Secrets), built from the password:
   `postgresql://servyou_backup.xggomcitqrkaylqezjjz:<password>@<session pooler host>:5432/postgres?sslmode=require`.
   The host is in Dashboard → Connect → Session pooler.
3. Close the PowerShell window; `Clear-Host` doesn't clear Windows Terminal's scrollback.
   Then clear the clipboard history (Win+V → Clear all). The password now exists only in the
   secret.

If the first connection fails with an authentication error right after the change, wait a
few minutes: the pooler can briefly cache the old state. To rotate the password, run the block
again and replace the secret.

### Manual backup procedure (belt-and-suspenders)

Before any high-risk operation (a migration that might corrupt data, or a large bulk
operation), take a manual logical backup. Requires `pg_dump` installed locally — it ships
with the Postgres client tools (https://www.postgresql.org/download/). *(Not yet installed
on the founder's machine as of this writing; install before the first drill.)*

The simplest manual backup is the nightly workflow run by hand: private repo → Actions →
nightly backup → Run workflow. The command below is the fallback. It needs a PostgreSQL 17
`pg_dump`, and it connects through the **session** pooler, port 5432: the transaction pooler,
port 6543, doesn't support `pg_dump`. Copy the exact host from Dashboard → Connect → Session
pooler.

```bash
pg_dump "postgresql://postgres.xggomcitqrkaylqezjjz@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" \
  --password \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file=servyou-backup-$(date +%Y%m%d-%H%M).dump
```

`--password` makes `pg_dump` ask for the database password (from the secrets manager), so it
never lands in the command line or the shell history. Never hard-code it or commit it.

The `.dump` holds password hashes and phone numbers in plaintext. Before it leaves the folder
you ran it in, encrypt it with the backup's age public key and delete the plaintext:
`age -r <the age1… line> -o servyou-backup-<date>.dump.age servyou-backup-<date>.dump`.
Store only the `.age` file, for example on an external drive. Never put a plaintext dump in
OneDrive or any cloud storage. **Do not commit `.dump` files to git.**

Suggested retention: daily manual backups kept for 7 days during the launch phase; weekly
for 90 days post-launch.

### Routine verification schedule

- **Monthly:** confirm the latest automated backup exists in the Supabase dashboard; record
  the timestamp in the verification log below.
- **Monthly (Free plan, once the nightly backup is live):** check that B2 holds last night's
  bundle and that the Sentry monitor `nightly-backup` is green; record it in the verification
  log below.
- **Quarterly:** execute the restore drill below.
- **Before any high-risk migration:** take a manual `pg_dump`, or run the nightly workflow by
  hand.
- **First mandatory drill:** scheduled for the week before public launch (estimated late
  July to mid-August 2026), when real data exists and tooling is in place. It verifies that
  these procedures actually work.

### Restore drill procedure (for the quarterly drill)

What to execute when running the quarterly drill (the first runs the week before launch):

Since PR #367 the drill restores last night's encrypted bundle, which tests the whole nightly
chain end to end: download, decrypt, restore, compare. It runs on the founder's PC (Docker
Desktop, setup step D1). It uses two folders **outside OneDrive**, because the unpacked files
hold password hashes and phone numbers in plaintext:
- `C:\servyou-restore` holds the bundle;
- `C:\servyou-drill` holds the throwaway database's project.

In a real disaster, restore the same files into a new Supabase project instead, following
Supabase's guide
(https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), then
re-create what "Not in a bundle" lists.

1. Download last night's bundle from B2 (Browse Files → `daily/`) into `C:\servyou-restore`,
   then decrypt and unpack it. It unpacks into `C:\servyou-restore\bundle\`.
   ```powershell
   cd C:\servyou-restore
   age -d -i C:\servyou-keys\backup.key -o bundle.tar.gz servyou-YYYY-MM-DD.tar.gz.age
   tar -xzf bundle.tar.gz
   ```
2. Provision a throwaway **Supabase** Postgres 17, not plain `postgres:17`: `data.sql` writes
   into `auth`, `storage` and `cron`, which only a Supabase database has. With Docker Desktop
   running:
   ```powershell
   New-Item -ItemType Directory C:\servyou-drill | Out-Null
   cd C:\servyou-drill
   npx supabase@3.1.0 init
   npx supabase@3.1.0 start -x realtime,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
   ```
   - Auth (`gotrue`) and Storage (`storage-api`) still start, and their migrations create the
     `auth` and `storage` tables.
   - Check that `supabase/config.toml` says `major_version = 17`.
   - If a health check fails on an excluded service, add `--ignore-health-check`.

   Alternatively, use a Supabase branch (`create_branch` via MCP after `confirm_cost`;
   ~$0.32/day — **destroy it when done**).
3. Restore, in Supabase's documented order, in one transaction that stops at the first error.
   The job has already made the file edits Supabase's guide lists, and left out of `roles.sql`
   the lines a Supabase target refuses (« What a bundle holds »), so the files restore as they
   are. The database container is `supabase_db_servyou-drill`, named after the folder; `docker
   ps` confirms the name.
   ```powershell
   docker cp C:\servyou-restore\bundle supabase_db_servyou-drill:/tmp/bundle
   docker exec -e PGPASSWORD=postgres supabase_db_servyou-drill psql -h localhost -U postgres -d postgres `
     --single-transaction -v ON_ERROR_STOP=1 `
     -c "create extension if not exists pg_cron with schema pg_catalog" `
     -f /tmp/bundle/roles.sql -f /tmp/bundle/schema.sql `
     -c "set session_replication_role = replica" -f /tmp/bundle/data.sql `
     -f /tmp/bundle/extras.sql
   ```
4. Verify the schema: the expected public tables (32 today) are there.
   ```powershell
   docker exec -e PGPASSWORD=postgres supabase_db_servyou-drill psql -h localhost -U postgres -c "\dt public.*"
   ```
5. Verify the data: run the bundle's count query against the restored database and compare it
   with the counts taken at dump time. `counts.sql` also counts the triggers and policies from
   `extras.sql`.
   ```powershell
   docker exec -e PGPASSWORD=postgres supabase_db_servyou-drill psql -h localhost -U postgres -At -F "`t" -f /tmp/bundle/counts.sql > C:\servyou-restore\restored-counts.tsv
   Compare-Object (Get-Content C:\servyou-restore\bundle\counts.tsv) (Get-Content C:\servyou-restore\restored-counts.tsv)
   ```
   No output means every count matches. This replaces the old « run `npm run rls-smoke` »
   step: CLAUDE.md forbids that script, because it deletes every test-domain user on
   production.
6. Verify sample data integrity: spot-check a few critical rows match production.
7. Capture timing: how long from "I need to restore" to "verified working schema"?
8. Update the verification log with the date, outcome, and any issues found — **we want to
   find issues during drills, not incidents.**
9. Destroy the throwaway database and the plaintext. `stop` must run from the drill folder,
   or it leaves the stack and its data volume running.
   ```powershell
   cd C:\servyou-drill
   npx supabase@3.1.0 stop --no-backup
   cd C:\
   Remove-Item -Recurse -Force C:\servyou-drill, C:\servyou-restore
   ```
   On a Supabase branch, use `delete_branch` instead.

### Verification log

| Date | Type | Outcome | Time taken | Notes |
|------|------|---------|------------|-------|
| 2026-06-09 | Runbook authored | — | — | Pre-launch documentation. Org confirmed on Supabase **Free** plan; Pro upgrade + first verified restore drill scheduled for the week before launch. |
| 2026-11-13 | Nightly backup: read-only role | Applied | — | `servyou_backup` (migration #133, PR #367). The private repo, the first nightly run and the first drill follow the founder's setup steps. |
| 2026-11-13 | Nightly backup: founder setup, group A | Done | — | age key in `C:\servyou-keys` (owner-only) with 2 offline copies; B2 EU Central with 2FA; bucket `servyou-backups-eu` (Object Lock, SSE-B2, the 2 lifecycle rules, no default retention yet); private repo created; `AGE_RECIPIENT` set; failure emails on. Next: group B (governance + upload key). |
| 2026-11-13 | Nightly backup: founder setup, groups B and C | Done | — | Governance default of 30 days (`bucket get`); upload key restricted to the bucket with exactly `listBuckets,listFiles,writeFiles` (`key list --long`); `BACKUP_DB_URL`, `B2_KEY_ID`, `B2_APP_KEY`, `SENTRY_CRON_URL` and `B2_BUCKET` set. |
| 2026-11-13 | Nightly backup: private repo | Merged | — | servyou-backups PR #1 (`c437966`): workflow, dump, encryption, upload, restore check. |
| 2026-11-13 | Nightly backup: run #1 (manual, attempt 3) | Restore check failed | ~4 min | Dump, encryption, artifact and B2 upload passed: `daily/servyou-2026-11-13.tar.gz.age`, 2.2 MB, 62 tables. The restore check stopped at `roles.sql` line 19, `ALTER ROLE "supabase_admin" SET "statement_timeout"` (42501). Fix: servyou-backups PR #2. The founder also regenerated `BACKUP_DB_URL` and the upload key with `gh secret set`, and deleted the older upload keys. |

Append a new row for each future verification.

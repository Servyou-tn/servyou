# Nightly encrypted backup — follow-ups (`chore/nightly-backup`, PR #367, 2026-11-13)

Ranked: the two MEDIUM items first, then the LOW ones, then the items with a set trigger. The nightly job itself
(private repo `Servyou-tn/servyou-backups`) is the next step of this work, not a follow-up.

## 1. MEDIUM — Scenario 2 still says to run `npm run rls-smoke` against the restored database

**What:** `docs/operations.md`, « Scenario 2 — Table dropped or wiped », step 4: « run `npm run rls-smoke` against
the restored database ». CLAUDE.md forbids that script because it deletes every test-domain user on production. After
a dashboard restore, the restored database *is* production. Drill step 5 had the same instruction and was fixed in
this PR (D6). Scenario 2 was not on the approved list of four fixes, so it is logged here instead of being changed.
**Why deferred:** outside the four fixes the architect approved (D6). One PR, one focus.
**Where it lives:** `docs/operations.md`, « Incident response procedures » → « Scenario 2 », step 4.
**Trigger:** the architect's OK. The replacement is a read-only check: the same row-count comparison as drill step 5,
or spot checks in the SQL editor.

## 2. MEDIUM — the public repo's keepalive can be switched off by GitHub's 60-day rule

**What:** `.github/workflows/supabase-keepalive.yml` stops the Free project from pausing. It runs every 3 days and
makes one anon PostgREST read; a pause took production down in Sept–Oct 2026. GitHub disables scheduled workflows in a
**public** repo after 60 days without repository activity, without a failure email. A 60-day gap in commits would
therefore stop the keepalive silently, and the project would pause about a week later. Private repos are not subject
to the rule.
**Why deferred:** no risk while the repo gets commits. Once the nightly job runs, it opens a database session every
night, which may be enough on its own. Whether Supabase counts a pooler session as « activity » is unverified.
**Where it lives:** `.github/workflows/supabase-keepalive.yml` (this repo) and the private repo's workflow.
**Trigger:** after the nightly backup has run green for a week, either:
- move the keepalive's one `curl` into the private repo's workflow and delete it here; or
- keep both, and add a Sentry cron monitor to the keepalive too.

## 3. LOW — `servyou_backup` could delete pg_cron's run history

**What:** in the architect's pre-apply check, PUBLIC holds DELETE on `cron.job_run_details`. pg_cron grants it so
each user can clear their own runs; its RLS policy `cron_job_run_details_policy` limits a user to rows with
`username = current_user`. `servyou_backup` has USAGE on schema `cron` (through `pg_read_all_data`) and BYPASSRLS, so
with a leaked password someone could delete every run's history. The impact is cron logs only (1 row today): no
business data, and the jobs themselves (`cron.job`) are not writable. anon and authenticated have no USAGE on `cron`,
so the exposure exists only through this role.
**Why deferred:** LOW. The likely fix is unavailable to `postgres`: the table is owned by `supabase_admin`, and PUBLIC's
`DELETE` was granted by `supabase_admin` (`=rd/supabase_admin`). A REVOKE run as `postgres` probably revokes nothing
(not tested). `pg_read_all_data` can't exclude one schema, and BYPASSRLS is required by pg_dump.
**Where it lives:** `cron.job_run_details` ACL (live); `db/migrations/README.md` entry #133.
**Trigger:** accept it, or ask Supabase support to revoke the grant. Re-check if a future pg_cron upgrade changes the
grant.

## 4. LOW — the backup connection encrypts but does not verify the server

**What:** `BACKUP_DB_URL` uses `sslmode=require` (`docs/operations.md`, « Setting the role's password »). The traffic is
encrypted, but the server's certificate is not checked. Supabase publishes a CA certificate; `sslmode=verify-full`
with it would also stop a man-in-the-middle on the runner's network path.
**Why deferred:** whether the session pooler's certificate chains to that CA is unverified, and the private repo is
not built yet.
**Where it lives:** the private repo's workflow; the URL format in `docs/operations.md`.
**Trigger:** while building the private repo. Try `verify-full` with the CA file committed there, and keep `require`
only if the pooler's chain fails.

## 5. LOW — stale facts in the backup runbook outside the four fixes

**What:** in `docs/operations.md`, « Backup and disaster recovery »:
- « Current state at launch readiness » says ~13 MB and ~15 user rows. Live on 2026-11-13: 18 MB and 14 users.
- The first mandatory drill is dated « late July to mid-August 2026 », which has passed.
- The « Monthly » bullet says to confirm the latest automated backup in the Supabase dashboard; the Free plan has
  none. This PR added a separate Free-plan bullet next to it.
- Scenario 1's « If on Free: restore from the most recent daily backup » now means the nightly bundle. The procedure is
  drill steps 1–3, run against a new project.

`docs/architecture.md` (Stage 1) also says « Manual backups via Supabase dashboard ».
**Why deferred:** outside the four approved fixes. Pure wording, nothing broken in a way that misleads a restore.
**Where it lives:** the sections above.
**Trigger:** the next docs tidy PR, or the first verified drill (update the date and numbers then).

## 6. TRIGGER — the first file in the private `verifications` bucket

**What:** the nightly job downloads only the public buckets, from their public URLs (D5), and fails as soon as
`verifications` (identity documents, private) holds a file. Backing it up needs Storage S3 access keys. Those keys read,
write and delete every bucket and bypass RLS, so they would be a private-repo secret with that blast radius.
Alternatives: signed URLs created by a service-role call, or a narrower Edge Function.
**Why deferred:** the bucket is empty (0 objects on 2026-11-13). No key is created before it is needed.
**Where it lives:** the private repo's files step.
**Trigger:** the first red run naming `verifications`, or the identity-verification feature shipping, whichever comes
first.

## 7. TRIGGER — public Storage files over ~50 MB

**What:** the job downloads every public file every night (1.9 MB on 2026-11-13). At 50 MB that becomes ~1.5 GB a
month of the Free plan's 5 GB uncached egress, which the app shares.
**Why deferred:** 1.9 MB today.
**Where it lives:** the private repo's files step.
**Trigger:** a bundle's `files/` passes 50 MB. Then switch to incremental: download only objects whose
`storage.objects.updated_at` is newer than the previous bundle's manifest, and keep the manifest in the bundle.

## 8. Checks for the private repo build (not defects; listed so none is lost)

**What:** facts the plan assumed and the first run must prove:
- `pg_dumpall --roles-only --no-role-passwords` and the three `pg_dump` runs work as `servyou_backup` through the
  session pooler.
- The counts come from the dump's own snapshot: `pg_export_snapshot()` in a held transaction, then
  `pg_dump --snapshot`, through the session pooler.
- The auth and storage tables created by `supabase start` (CLI 3.1.0) accept today's data. Live has `oauth_*`,
  `webauthn_*` and `scim_*` tables, and the CLI's Auth version may lag. If they don't, pin a CLI whose Auth matches, or
  narrow the nightly restore check and log it.
- `extras.sql` round-trips: the 2 triggers on `auth.users` and the 11 policies on `storage.objects`, generated from
  the catalog, restore and are counted by `counts.sql`.
- The Backblaze web form can create a key with exactly `listFiles` + `writeFiles`, and the EU region is chosen at
  sign-up.

**Why deferred:** they need the private repo and the founder's accounts.
**Where it lives:** the private repo's README and first run.
**Trigger:** the private repo build, after the founder's setup steps 1–11.

# Reports anti-abuse — logged, not fixed (`feat/reports-anti-abuse`, 2026-10-29)

Ranked. The PR closes `signaler-product-service-b3.md` item 1 (dedupe + rate limit) and makes `reports` INSERT
column-granted.

## 1. LOW (DB-guardian) — authenticated keeps table-level UPDATE on `reports`
**What:** RLS (« Admin updates reports ») limits UPDATE to admins, but an admin session can rewrite any column —
`reporter_id`, `target_*`, `created_at` (the rate window), `status` back to `open`. The admin actions only ever write
`status` + `admin_note`.
**Why deferred:** out of the brief; admins are trusted and audited by the RPCs.
**Where:** `public.reports` grants; `src/app/admin/signalements/actions.ts`.
**Trigger:** next reports / admin hardening pass — column-grant UPDATE to `(status, admin_note)`.

## 2. LOW — anon holds table-level SELECT on `reports`
**What:** RLS returns no row to anon (both SELECT branches need a uid), so nothing leaks; the grant is just wider
than needed.
**Trigger:** same pass as item 1 (revoke anon SELECT, check no anonymous page reads it).

## 3. LOW — add `reports` to the role skill's « never re-grant table-level INSERT » list
**What:** `.claude/skills/servyou-db-guardian/SKILL.md` names the column-granted tables; `reports` (INSERT) joins them
once this migration is applied. Not edited here (skill files are not changed in a feature PR).
**Trigger:** next skills / docs tidy.

## 4. INFO — the cap also binds admins, and counts every status
**What:** decision 2 in the migration header. An admin filing more than 10 reports a day (none do today) would be
refused; dismissed reports still count toward the reporter's 10. Revisit only if the founder rules otherwise.

## 5. INFO — B3 follow-up item 8 is already resolved
**What:** the leftover test report `0eb6533f-…` no longer exists live (2026-10-29: `reports` holds one row,
`98d302ee-…`, resolved). Mark it closed in `signaler-product-service-b3.md` at the next tidy.

## 6. INFO — the rate-limit message names its numbers
**What:** « 10 signalements par 24 heures » is in the DB message and in `report.rate_limited` (FR + AR). If the cap
changes, both change together (the trigger and the two i18n keys).

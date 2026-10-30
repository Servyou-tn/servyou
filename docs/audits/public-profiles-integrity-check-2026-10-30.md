# `public_profiles` write-hole integrity check (2026-10-30)

Closes the follow-up « MEDIUM (investigate) — no integrity sweep for writes that may have gone through the
`public_profiles` hole » (`docs/follow-ups/suspension-enforcement.md`). Read-only: SELECTs on the live database,
no write, no migration.

## The hole

From 2026-06-04 (the view's creation, `20260604000331_profiles_privacy_fix`) until migration 60
(`20261023231434_public_profiles_revoke_writes`), `public_profiles` was an auto-updatable owner-run view with
client write grants. Anyone with the anon key could PATCH any account's `full_name`, `city`, `language`,
`avatar_url` or `seller_type`, or DELETE the row. The edge logs reach back 24 h only, so writes in that window could
not be ruled out from logs. This check looks for their traces in the data instead.

## Result: no sign of a write through the hole

| # | Check | Result |
|---|---|---|
| A1 | auth users vs profiles (a DELETE would leave a user without a profile) | 14 / 14 |
| A3 | avatars without an `uploaded_objects` row (`avatars`, `owner_id = id`, same path) or off-host | 0 of 2 |
| B1–B2 | `seller_type` set without the matching shop / freelancer profile | 0 |
| B3–B4 | shop / freelancer profile whose account's `seller_type` disagrees | 0 |
| B5 | `seller_type` outside `shop_owner` / `freelancer` | 0 |
| B6 | sellers under 18 or without a birth date (the hole bypassed the age gate) | 0 |
| C1 | `language` outside `fr` / `ar` | 0 |
| C2 | `full_name` with markup, a URL, control characters, > 100 characters or blank | 0 |
| C3 | `city` with markup, a URL, control characters or > 60 characters | 0 |
| C4 | distinct cities | 8, all Tunisian governorate seats |
| D1 | profiles with `updated_at` inside the window | 11 |
| D2 | of those, no surviving session of their own at that time | 10, all explained below |

**D2:**
- 8 demo accounts (`de300001-…`, `servyou.invalid`) have `updated_at = created_at`, so they were never updated.
- 1 demo account (`…0005`) was updated on 2026-10-24 21:23 UTC. That's after migration 60 closed the hole (version
  2026-10-23 23:14), so it is out of scope.
- 1 real account (`0f4c929b…`, a shop owner) was updated on 2026-08-07 11:29 UTC.
  - **Not attributable:** sessions and refresh tokens only survive from 2026-07-28, none of this account's sessions
    from that day remain, and `auth.audit_log_entries` is empty.
  - **Likely benign:** that was an active test day (PRs #120–#123 merged that afternoon), and `LanguageToggle`
    has written the caller's own `profiles.language` since 2026-06-04.
  - **The row is consistent today:** `shop_owner` with its shop (created 2026-06-03), a listed city, `fr`/`ar`, a
    clean name, no avatar.
  - **Ask:** the founder confirms this account's name and city look right.

## Queries (re-runnable, read-only)

```sql
with p as (select * from public.profiles),
av as (
  select p.id,
    exists (select 1 from public.uploaded_objects u where u.bucket = 'avatars' and u.owner_id = p.id
            and p.avatar_url like '%/storage/v1/object/public/avatars/' || u.path) as has_prov,
    p.avatar_url like 'https://xggomcitqrkaylqezjjz.supabase.co/storage/v1/object/public/avatars/%' as host_ok
  from p where p.avatar_url is not null)
select 'A1', (select count(*) from auth.users)::text || ' / ' || (select count(*) from p)::text
union all select 'A3', count(*)::text from av where not has_prov or not host_ok
union all select 'B1', count(*)::text from p where seller_type = 'shop_owner'
  and not exists (select 1 from public.shops s where s.owner_id = p.id)
union all select 'B2', count(*)::text from p where seller_type = 'freelancer'
  and not exists (select 1 from public.freelancer_profiles f where f.profile_id = p.id)
union all select 'B3', count(*)::text from p where exists (select 1 from public.shops s where s.owner_id = p.id)
  and p.seller_type is distinct from 'shop_owner'
union all select 'B4', count(*)::text from p where exists (select 1 from public.freelancer_profiles f where f.profile_id = p.id)
  and p.seller_type is distinct from 'freelancer'
union all select 'B5', count(*)::text from p where seller_type is not null and seller_type not in ('shop_owner', 'freelancer')
union all select 'B6', count(*)::text from p where seller_type is not null
  and (date_of_birth is null or date_of_birth > current_date - interval '18 years')
union all select 'C1', count(*)::text from p where language is null or language not in ('fr', 'ar')
union all select 'C2', count(*)::text from p where full_name ~ '[<>]|https?:|javascript:|[\x01-\x1f]'
  or length(full_name) > 100 or btrim(coalesce(full_name, '')) = ''
union all select 'C3', count(*)::text from p where city ~ '[<>]|https?:|[\x01-\x1f]' or length(city) > 60
union all select 'D1', count(*)::text from p where updated_at >= '2026-06-04' and updated_at < '2026-10-24';
-- D2: for each D1 row, compare updated_at with created_at, auth.sessions / auth.refresh_tokens of the same user,
-- and supabase_migrations.schema_migrations versions within ±2 minutes.
```

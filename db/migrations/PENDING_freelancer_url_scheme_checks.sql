-- Freelancer link columns accept http(s) URLs only, enforced in the database (architect's ruling, 2026-10-30;
-- docs/follow-ups/app-server-guards.md « MEDIUM — no DB CHECK on freelancer URL schemes »).
--
-- These five values are rendered as `href` on the public D4 profile. HTTP_URL (src/lib/freelancer/http-url.ts) guards
-- the server actions, but the row's owner holds INSERT / UPDATE on every one of these columns and can PATCH a
-- `javascript:` or `data:` value straight over REST. A CHECK binds every writer, the service role included.
--
-- Rule (as ruled): `^https?://`, case-insensitive; NULL allowed. An empty string is refused — the app never writes
-- one (every optional URL goes through `.transform((v) => v || null)`), and '' is not a URL.
--
-- Live on 2026-10-30: all five columns hold 0 rows, so every constraint validates without a backfill. No existing
-- CHECK on these columns. freelancer_links.url and freelancer_portfolio_items.image_url are NOT NULL already.
-- portfolio image_url is already refused for every writer, the service role included, unless it is this project's
-- portfolio-media URL with an upload record (trg_enforce_portfolio_image_provenance, a BEFORE trigger, fires before
-- any CHECK). Its CHECK is a floor that no write path reaches while that trigger exists; kept as ruled (5 columns), in
-- case the trigger is ever dropped or relaxed. It admits the http://localhost storage URL a dev portfolio carries.

alter table public.freelancer_profiles
  add constraint freelancer_profiles_portfolio_link_http
  check (portfolio_link is null or portfolio_link ~* '^https?://');

alter table public.freelancer_links
  add constraint freelancer_links_url_http
  check (url ~* '^https?://');

alter table public.freelancer_portfolio_items
  add constraint freelancer_portfolio_items_url_http
  check (url is null or url ~* '^https?://');

alter table public.freelancer_portfolio_items
  add constraint freelancer_portfolio_items_image_url_http
  check (image_url ~* '^https?://');

alter table public.freelancer_certifications
  add constraint freelancer_certifications_credential_url_http
  check (credential_url is null or credential_url ~* '^https?://');

-- Grants, RLS and triggers unchanged.

-- Post-apply verification:
--   1. select conrelid::regclass, conname, convalidated from pg_constraint where conname like '%\_http' escape '\';
--      → 5 rows, convalidated = true.
--   2. src/__tests__/freelancer-url-scheme-checks.test.ts (live): the owner's REST write of javascript: / data: / ''
--      on each column is refused 23514 with the constraint's name; http(s) (any case) and NULL pass; the service
--      role is bound too. image_url: refused P0001 by the provenance trigger, before the CHECK (see above).
--
-- Rollback:
--   alter table public.freelancer_profiles drop constraint freelancer_profiles_portfolio_link_http;
--   alter table public.freelancer_links drop constraint freelancer_links_url_http;
--   alter table public.freelancer_portfolio_items drop constraint freelancer_portfolio_items_url_http;
--   alter table public.freelancer_portfolio_items drop constraint freelancer_portfolio_items_image_url_http;
--   alter table public.freelancer_certifications drop constraint freelancer_certifications_credential_url_http;

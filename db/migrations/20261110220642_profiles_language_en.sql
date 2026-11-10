-- English as a third interface language (founder decision 2026-11-10): widen the allowed values only, no data change.
-- Applied by the architect 2026-11-10 (founder-approved in chat). handle_new_user already copies raw_user_meta_data.language
-- (default 'fr'), so a signup with language 'en' now passes the check.
alter table public.profiles drop constraint profiles_language_check;
alter table public.profiles add constraint profiles_language_check check (language = any (array['fr'::text, 'ar'::text, 'en'::text]));

-- Rollback (only if no row has language = 'en'):
-- alter table public.profiles drop constraint profiles_language_check;
-- alter table public.profiles add constraint profiles_language_check check (language = any (array['fr'::text, 'ar'::text]));

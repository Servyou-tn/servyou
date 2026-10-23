-- 9 of 22 auth.users rows (seeded demo/test accounts) carry NULL in four token columns that the
-- Supabase Auth service reads as non-null strings. Any Auth admin call that loads those rows
-- (auth.admin.listUsers, admin updateUserById) fails with HTTP 500, and those accounts cannot
-- complete password flows. NULL -> '' is the value GoTrue itself writes for "no pending token".
-- Data-only; no schema change. Rows with real values are untouched.
update auth.users set
  confirmation_token     = coalesce(confirmation_token, ''),
  recovery_token         = coalesce(recovery_token, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change           = coalesce(email_change, '')
where confirmation_token is null
   or recovery_token is null
   or email_change_token_new is null
   or email_change is null;

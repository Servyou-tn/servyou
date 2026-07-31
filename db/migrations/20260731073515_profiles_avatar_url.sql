-- The avatar column the freelancer world has been blocked on (logged in docs/follow-ups.md:
-- "No avatar_url column anywhere"). Every seller surface that shows a person -- ServiceListingCard,
-- FreelancerCard, D4, D2's freelancer row -- currently falls back to the initial letter.
--
-- Per docs/design/image-storage-discovery.md: ONE normalized original per user, downscaled and
-- re-encoded to WebP by the upload server action; next/image produces the render sizes. So this
-- is a single text column, not a media table -- cardinality is exactly one avatar per profile.

alter table public.profiles add column avatar_url text;

comment on column public.profiles.avatar_url is
  'Storage path/URL of the user avatar. One normalized WebP original (<=512px longest edge); '
  'render sizes are produced at read time by next/image. Null = render initials fallback.';


-- PRIVILEGE -- this is load-bearing, not boilerplate.
--
-- 20260609190541_lock_profiles_privileged_columns (audit CRIT-1) REVOKED the table-level UPDATE
-- grant from anon/authenticated and re-granted an ALLOW-LIST of exactly five columns:
-- (full_name, city, language, phone, seller_type). A new column therefore arrives with NO update
-- grant at all. Without the line below the upload action fails at runtime with a permission error
-- while the build stays green -- the same trap 20260729111938 hit on orders.carrier.
--
-- Client choice, stated deliberately: the upload action writes with the USER'S SESSION client,
-- not service_role. That keeps both gates live -- the RLS policy "Users can update their own
-- profile" (auth.uid() = id, USING + WITH CHECK) enforces the ROW, and this allow-list enforces
-- the COLUMN. A bug in the action cannot write another user's row. service_role retains its
-- table-level grant and is deliberately not used here.
grant update (avatar_url) on public.profiles to authenticated;

-- Still deliberately NOT granted, unchanged from 20260609190541: is_admin, suspended_at,
-- suspended_reason (admin SECURITY DEFINER RPCs / service_role only), date_of_birth, email.
-- avatar_url is a considered ADDITION to the allow-list, not an accident of adding a column.


-- CROSS-USER READ -- public_profiles is how every card reads another user's identity.
--
-- CREATE OR REPLACE, never DROP + CREATE: the view carries anon:SELECT and authenticated:SELECT,
-- and a drop silently takes those grants with it. Every card would fall back to initials with no
-- build error and no exception -- a failure that looks like a UI bug and is a privilege bug.
-- Appending the new column at the END of the select list is what keeps OR REPLACE legal.
--
-- EXPOSURE, stated plainly: the view is security_invoker=false, so it runs as its owner and
-- BYPASSES RLS on profiles. Anything in this column list is readable by `anon` for EVERY row,
-- including suspended and admin-hidden profiles. That is why the column list IS the protection.
-- avatar_url is intended to be public (it renders on public cards), and full_name + city already
-- flow through this same unfiltered view -- so this adds no new CLASS of exposure. Phone, email
-- and date_of_birth stay out, permanently.
--
-- security_barrier and security_invoker are re-asserted rather than assumed to survive REPLACE.
create or replace view public.public_profiles
with (security_barrier = true, security_invoker = false) as
  select id, full_name, city, language, seller_type, avatar_url
    from public.profiles;

-- Post-apply verification, all four confirmed against the live DB:
--   reloptions            -> security_barrier=true, security_invoker=false   (survived REPLACE)
--   grants                -> anon:SELECT and authenticated:SELECT both intact
--   update allow-list     -> avatar_url, city, full_name, language, phone, seller_type
--   view columns          -> id, full_name, city, language, seller_type, avatar_url
-- Plus a functional read AS anon (set local role anon; select ... ; rollback) returning
-- avatar_url -- a grant existing is not proof the column is readable.

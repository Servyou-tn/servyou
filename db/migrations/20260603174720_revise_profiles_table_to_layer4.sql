
-- =====================================================
-- Servyou Phase 1: revise profiles table to Layer 4 design
-- Table is empty (0 rows), so changes are safe.
-- Model: buying is universal (baseline), selling is one
-- optional capability via seller_type (null = consumer).
-- =====================================================

-- 1. Remove the old rigid role column (and its check constraint).
alter table public.profiles drop column if exists role;

-- 2. Add seller_type: null = pure consumer (universal buyer baseline);
--    'freelancer' or 'shop_owner' once upgraded. Never both at once.
--    Future branched roles (liberal_professional, small_company) added later as new values.
alter table public.profiles
  add column seller_type text
  check (seller_type in ('freelancer', 'shop_owner'));

-- 3. Add date_of_birth: required, for the age rule (16+ to buy, 18+ to sell).
alter table public.profiles
  add column date_of_birth date not null;

-- 4. Add optional phone/WhatsApp number (collected progressively, per Layer 4).
alter table public.profiles
  add column phone text;

-- 5. Add is_admin flag, kept SEPARATE from seller_type
--    (Layer 2/4 developer-admin separation). Default false.
alter table public.profiles
  add column is_admin boolean not null default false;

-- 6. Restrict language to French or Arabic (English removed from MVP).
alter table public.profiles
  add constraint profiles_language_check check (language in ('fr', 'ar'));

-- 7. Refresh the table comment to reflect the new model.
comment on table public.profiles is
  'Servyou user accounts. Universal buyer identity for everyone; seller_type (null=consumer, freelancer, shop_owner) holds the optional seller capability. Linked to Supabase Auth via id. date_of_birth enforces the age rule; is_admin is a separate protected flag.';

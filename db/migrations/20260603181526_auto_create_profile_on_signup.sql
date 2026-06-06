
-- =====================================================
-- Servyou Phase 1: auto-create a profile row when a new
-- auth user signs up. The signup form passes full_name,
-- date_of_birth, city, and language as user metadata;
-- this trigger reads that metadata and creates the
-- matching profiles row. seller_type stays null (consumer
-- baseline), is_admin defaults false.
-- security definer lets it insert past RLS safely.
-- =====================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, date_of_birth, city, language)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    (new.raw_user_meta_data ->> 'date_of_birth')::date,
    new.raw_user_meta_data ->> 'city',
    coalesce(new.raw_user_meta_data ->> 'language', 'fr')
  );
  return new;
end;
$$;

-- Fire the function right after a new auth user is created.
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Follow-up #0 of #329: no admin API rewrites or removes a Google (non-e-mail) identity, so its real e-mail / name stay in
-- auth.identities after an account deletion. This service-role-only function deletes the non-e-mail identities of an account
-- that is ALREADY a tombstone (fail closed: a live account is never touched). Called by the erasure server action.
create or replace function public.erase_oauth_identities(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  if not exists (
    select 1 from public.profiles p
     where p.id = p_user_id
       and p.full_name = 'Compte supprimé'
       and p.email = 'supprime-' || p_user_id::text || '@deleted.servyou.invalid'
       and p.suspended_at is not null
  ) then
    raise exception 'Ce compte n''est pas supprimé : identités conservées.' using errcode = '42501';
  end if;

  delete from auth.identities i
   where i.user_id = p_user_id
     and i.provider <> 'email';
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.erase_oauth_identities(uuid) from public, anon, authenticated;
grant execute on function public.erase_oauth_identities(uuid) to service_role;

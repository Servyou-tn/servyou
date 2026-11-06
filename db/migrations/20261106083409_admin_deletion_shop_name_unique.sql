-- Fix (#327 review, HIGH): shops_name_lower_key is unique on lower(name), so every tombstoned shop needs its own name.
-- Rewrites only the c2 shop rename inside admin_process_deletion_request: « Boutique supprimée · <first 8 of the shop id> ».
do $fix$
declare
  v_src text;
  v_new text;
begin
  select pg_get_functiondef('public.admin_process_deletion_request(uuid, text, text)'::regprocedure) into v_src;
  v_new := replace(v_src, $o$set name = 'Boutique supprimée', description = null$o$,
                          $n$set name = 'Boutique supprimée · ' || left(id::text, 8), description = null$n$);
  if v_new = v_src then
    raise exception 'shop rename line not found — nothing changed';
  end if;
  execute v_new;
end
$fix$;

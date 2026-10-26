-- Portfolio image provenance on UPDATE -- the one image column migration 71 left open.
-- docs/follow-ups.md « LOW — freelancer_portfolio_items.image_url can be PATCHed past provenance » (Sonnet
-- review of the storage provenance PR, 2026-10-26).
--
-- Live since migration 71 (20261026205458):
--   * trg_enforce_portfolio_image_provenance is BEFORE INSERT only. The owner holds an UPDATE policy
--     (« Freelancer manages own portfolio items -- update ») and authenticated holds table-level UPDATE
--     (migration 68 revoked UPDATE on product_images, which has no update policy, but not here). So an owner can
--     insert a recorded item, then PATCH image_url to a raw-PUT object in their folder, or to any URL on the
--     project host -- past both the provenance record and the host anchor.
--   * The app never updates portfolio items (saveProfileAction deletes and re-inserts). 0 items today.
--
-- After it: the same trigger also fires on UPDATE OF image_url; an unchanged value passes on its own (the
-- avatar / shop rule), any new value needs this project's URL with a record owned by the item's freelancer.
-- No other column, policy or grant changes; the INSERT path is unchanged.

create or replace function public.enforce_portfolio_image_provenance()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_path   text;
  v_owner  uuid;
begin
  -- UPDATE re-sending the stored value: nothing new is published (same rule as avatars / shop assets).
  if tg_op = 'UPDATE' and new.image_url is not distinct from old.image_url then
    return new;
  end if;

  v_path := public.storage_public_object_path(new.image_url, 'portfolio-media');

  if v_path is null or v_path = '' then
    raise exception 'portfolio-media provenance check failed: % is not a recognized portfolio-media object url', new.image_url;
  end if;

  select fp.profile_id into v_owner
  from public.freelancer_profiles fp
  where fp.id = new.freelancer_profile_id;

  if v_owner is null then
    raise exception 'portfolio-media provenance check failed: freelancer_profile % has no resolvable owner', new.freelancer_profile_id;
  end if;

  if not exists (
    select 1 from public.uploaded_objects uo
    where uo.bucket = 'portfolio-media'
      and uo.path = v_path
      and uo.owner_id = v_owner
  ) then
    raise exception 'portfolio-media provenance check failed: % has no validated upload record for owner %', v_path, v_owner;
  end if;

  return new;
end;
$function$;

drop trigger trg_enforce_portfolio_image_provenance on public.freelancer_portfolio_items;
create trigger trg_enforce_portfolio_image_provenance
  before insert or update of image_url on public.freelancer_portfolio_items
  for each row execute function public.enforce_portfolio_image_provenance();

-- Post-apply verification:
--   1. pg_get_triggerdef: BEFORE INSERT OR UPDATE OF image_url ON public.freelancer_portfolio_items.
--   2. as a freelancer JWT (rolled back), on an item inserted with a recorded image: PATCH image_url to a
--      foreign host -> the « is not a recognized portfolio-media object url » error; to an own-folder URL with no
--      record -> « has no validated upload record »; PATCH title only -> ok.
--   3. src/__tests__/storage-upload-provenance.test.ts and h3-links-portfolio-rls.test.ts stay green.
--
-- Rollback:
--   drop trigger trg_enforce_portfolio_image_provenance on public.freelancer_portfolio_items;
--   create trigger trg_enforce_portfolio_image_provenance before insert on public.freelancer_portfolio_items
--     for each row execute function public.enforce_portfolio_image_provenance();
--   -- and re-run migration 71's CREATE OR REPLACE of the function (without the UPDATE short-circuit).

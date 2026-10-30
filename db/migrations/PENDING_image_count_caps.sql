-- Upload COUNT caps, enforced in the database (architect's final ruling, 2026-10-30; audit pass 2 « Logged »,
-- docs/follow-ups/upload-hardening.md):
--   * product_images            — at most 8 rows per product   (MAX_PRODUCT_IMAGES, already the app's form rule);
--   * freelancer_portfolio_items — at most 6 rows per freelancer profile (PORTFOLIO_CAP; one image per item).
-- Until now both were app rules only (Zod .max() + the UI); a direct PostgREST insert could exceed them.
--
-- Same shape as the other caps (enforce_job_post_cap, migration 101): SECURITY DEFINER + empty search_path, a
-- per-parent advisory lock so two concurrent inserts cannot both pass the count, 23514 + a hint the app maps to its
-- FR / AR « limite atteinte » message. The service role bypasses (auth.uid() is null: seeds, admin tooling).
-- A multi-row INSERT is counted row by row: a BEFORE ROW trigger sees the rows the same statement already inserted,
-- so createProductAction's single insert of up to 8 images is checked exactly.
--
-- Live on 2026-10-30: no count trigger on either table (only trg_enforce_active_user + the provenance triggers).
-- Fullest product: 5 images (17 products with images); 0 portfolio items. Nothing existing is rejected or rewritten.
-- Grants: authenticated has INSERT on product_images (no UPDATE); INSERT + UPDATE on freelancer_portfolio_items,
-- including freelancer_profile_id, so that trigger also fires on an UPDATE that moves a row to another profile.

create function public.enforce_product_images_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('product_images.cap:' || new.product_id::text, 0));

  select count(*) into v_count
    from public.product_images
   where product_id = new.product_id;

  if v_count >= 8 then
    raise exception 'Ce produit a déjà 8 photos, le maximum.'
      using errcode = '23514', hint = 'product_images_cap';
  end if;

  return new;
end;
$$;

create trigger trg_limit_product_images
  before insert on public.product_images
  for each row execute function public.enforce_product_images_cap();

create function public.enforce_portfolio_items_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if (select auth.uid()) is null then
    return new;
  end if;

  -- An UPDATE that keeps the row on its profile changes nothing to count.
  if tg_op = 'UPDATE' and new.freelancer_profile_id is not distinct from old.freelancer_profile_id then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('portfolio_items.cap:' || new.freelancer_profile_id::text, 0));

  select count(*) into v_count
    from public.freelancer_portfolio_items
   where freelancer_profile_id = new.freelancer_profile_id
     and id is distinct from new.id;

  if v_count >= 6 then
    raise exception 'Votre portfolio compte déjà 6 projets, le maximum.'
      using errcode = '23514', hint = 'portfolio_items_cap';
  end if;

  return new;
end;
$$;

create trigger trg_limit_portfolio_items
  before insert or update of freelancer_profile_id on public.freelancer_portfolio_items
  for each row execute function public.enforce_portfolio_items_cap();

-- Trigger functions need no EXECUTE grant (not checked when a trigger fires); the PUBLIC default is already
-- revoked globally (migration 68), so nobody can call them as RPCs.

-- Post-apply verification:
--   1. select tgname from pg_trigger where tgname in ('trg_limit_product_images', 'trg_limit_portfolio_items');
--   2. src/__tests__/image-count-caps.test.ts (live): an owner's 9th product image and 7th portfolio item are refused
--      with 23514 + the hint (also within one multi-row insert); 8 / 6 pass; the service role is not capped; another
--      product / profile is unaffected.
--
-- Rollback:
--   drop trigger trg_limit_product_images on public.product_images;
--   drop trigger trg_limit_portfolio_items on public.freelancer_portfolio_items;
--   drop function public.enforce_product_images_cap();
--   drop function public.enforce_portfolio_items_cap();

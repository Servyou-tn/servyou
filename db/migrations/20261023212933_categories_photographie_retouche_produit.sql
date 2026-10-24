-- H6 PR-2 -- photography subcategory under « Design graphique & logo », and re-file the one listing
-- that was waiting for it.
--
-- Founder ruling (2026-10-23, H6 PR-2 brief): product photography gets a SUBCATEGORY
-- « Photographie & retouche produit » under design-graphique-logo -- not its own sector, so the
-- locked 13 sectors stay 13 (subcategories go 91 -> 92). Closes docs/follow-ups.md « Product
-- photography has no home in the 13 sectors -- BLOCKING-ISH for H6 ».
--
-- The listing « Photo produits e-commerce » (e5bec0f8-00d7-456a-a89b-39d959a251bc) was filed under
-- design-graphique-logo as a founder-ruled PLACEHOLDER by the 13-sector cutover (migration 49, the
-- retired `ugc` sector had no successor). State checked 2026-10-23: status=active, category_id =
-- design-graphique-logo, subcategory_id NULL, not admin-hidden. Its sector does not change; it gains
-- the new subcategory.
--
-- Slug = the stable-slug rule of src/lib/taxonomy/service-categories.ts applied to the label
-- (deburr -> lowercase -> non-alnum runs to one hyphen): « Photographie & retouche produit » ->
-- photographie-retouche-produit. Free in categories.slug (global UNIQUE categories_slug_key) and in
-- the TS taxonomy, checked 2026-10-23. The TS file gains the same entry in the same PR -- the TS `id`
-- must equal categories.slug, it is what H6's slug -> uuid lookup joins on.
--
-- name_ar « تصوير المنتجات وتعديل الصور » is CC-written (REVIEW_AR_TRANSLATION, same flag as the TS
-- entry); it reuses « تعديل الصور », the AR of the sector's existing skill « retouche ».
--
-- The parent is resolved by slug, not a hardcoded uuid, and every step asserts its row count, so a
-- drifted database fails loudly instead of inserting an orphan or re-filing nothing.
--
-- Side effects, all expected:
--   * the listing's updated_at moves to now() (handle_updated_at fires on every UPDATE);
--   * trg_enforce_service_subcategory_parent (migration 52) validates the new pair on the UPDATE --
--     the new row is kind='service' with parent_id = the listing's category_id, so it passes;
--   * DB-driven category pickers (the /mes-annonces mission picker) list one more subcategory.

do $$
declare
  v_sector uuid;
  v_sub    uuid;
  v_count  integer;
begin
  select id into v_sector
    from public.categories
   where slug = 'design-graphique-logo'
     and kind = 'service'
     and parent_id is null;

  if v_sector is null then
    raise exception 'Sector design-graphique-logo (kind=service, top-level) not found -- aborting.';
  end if;

  insert into public.categories (name_fr, name_ar, slug, kind, parent_id)
  values ('Photographie & retouche produit', 'تصوير المنتجات وتعديل الصور', 'photographie-retouche-produit', 'service', v_sector)
  returning id into v_sub;

  update public.service_listings
     set subcategory_id = v_sub
   where id = 'e5bec0f8-00d7-456a-a89b-39d959a251bc'
     and category_id = v_sector
     and subcategory_id is null;

  get diagnostics v_count = row_count;
  if v_count <> 1 then
    raise exception 'Expected to re-file exactly 1 listing (e5bec0f8-...) into photographie-retouche-produit, re-filed %.', v_count;
  end if;
end;
$$;

-- ─── ROLLBACK (do not run as part of this migration) ───────────────────────────────────────────
-- Per README "Rollback paths": apply as a NEW dated forward migration, never by deleting this file.
-- service_listings.subcategory_id and job_posts.category_id are both ON DELETE SET NULL, so deleting
-- the row also clears the listing's pointer -- but any OTHER listing or mission filed under it since
-- would lose its category too. Check first:
--   select 'listing' as kind, id, title from public.service_listings
--    where subcategory_id = (select id from public.categories where slug = 'photographie-retouche-produit')
--   union all
--   select 'job_post', id, title from public.job_posts
--    where category_id = (select id from public.categories where slug = 'photographie-retouche-produit');
--
-- delete from public.categories where slug = 'photographie-retouche-produit';

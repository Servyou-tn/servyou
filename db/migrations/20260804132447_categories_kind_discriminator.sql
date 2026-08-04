-- Adds `categories.kind` so a picker can tell a PRODUCT category from a SERVICE one.
--
-- ── WHY ───────────────────────────────────────────────────────────────────────────────────────
-- `categories` is a SINGLE FLAT TABLE shared by four entities — products, service_listings,
-- job_posts and shop_categories — with no discriminator. Nothing can filter it by what it is for,
-- so every picker over it offers everything.
--
-- That is not hypothetical. It is already shipped and live:
--
--   /mes-missions/nouvelle — the freelance-mission posting form — renders ALL 14 categories,
--   including "Automobile & Accessoires", "Beauté & Soins", "Électronique", "Maison", "Mode" and
--   "Santé". Counted by loading the page with a real signed-in session and parsing its <option>
--   elements: options 2-15 are the full table, unfiltered. A user can file a freelance mission
--   under "Électronique" today.
--
-- `getCategories` (src/lib/marche/my-data.ts:434) selects `id, name_fr` with NO filter, because
-- there is no column to filter on. G6 « Ajouter un produit » would ship the mirror image — a shop
-- owner offered "Montage Vidéo" and "Développement" for a physical product.
--
-- ⚑ THIS IS NOT THE DEFERRED TAXONOMY MIGRATION. That one reseeds: it remaps five live URL slugs,
-- inserts 57 subcategory rows, and changes what the shipped /marche/produits filter derives from.
-- This touches none of that. It is purely additive, breaks no URL, and makes the eventual reseed
-- easier because the product/service split will already be expressed.
--
-- ── WHY NOT NULL, AND WHY NO DEFAULT ──────────────────────────────────────────────────────────
-- There is no honest default. 'product' and 'service' are each wrong for about half the table, so
-- a default would silently mislabel every future row — the exact failure this column exists to
-- prevent.
--
-- And the column is NOT NULL because:
--
--   a nullable kind makes a forgotten value silently invisible in every picker, which is the same
--   failure shape as a policy that could never grant and eight rows pointing at files that never
--   existed. Both failed closed and silent.
--
-- (Migrations 20260804104541 and 20260804125106 respectively.) NOT NULL turns a forgotten kind
-- into a loud write-time failure instead of a category that exists and appears nowhere.
--
-- Verified safe rather than assumed: there is NO admin category route in the app (the
-- "Only admins manage categories" RLS policy exists but nothing calls it), and NO generated
-- Supabase types file exists in the repo, so nothing drifts. The only writer is a migration.
--
-- ── WHY 'both' IS IN THE CHECK ────────────────────────────────────────────────────────────────
-- `maison` is classified 'both' rather than 'product'. Tunisia has an obvious ménage / plomberie /
-- bricolage market, and the service taxonomy being digital-only today is a SCOPE decision, not a
-- permanent boundary. Founder call, 2026-08-04: the value costs nothing now, saves a migration
-- later, and a CHECK value with no honest member is worse than no value.
--
-- Consumers must therefore read `kind in ('product','both')` / `kind in ('service','both')` from
-- day one rather than testing equality.
--
-- ── SAFETY ────────────────────────────────────────────────────────────────────────────────────
-- Order is add-nullable -> backfill -> SET NOT NULL -> add CHECK, so the table is never in a state
-- that rejects its own rows.
--
-- No reader can break: all six live readers name their columns explicitly (`category-data.ts`
-- x2, `search-marketplace.ts`, `filter-categories.ts`, `my-data.ts`, and the orphaned
-- `DashboardRightRail.tsx`) — there is no `select('*')` on categories anywhere, no view over the
-- table, and RLS (`SELECT true` + `ALL is_admin()`) is untouched. A measured 7-surface baseline
-- was captured before this migration and is re-run after it.
--
-- ⚑ `categories_set_updated_at` is a BEFORE UPDATE trigger, so the backfill bumps `updated_at` on
-- all 14 rows. Nothing in the codebase reads `categories.updated_at` (grep: 0 hits), but it is a
-- real change and is recorded here rather than left to surprise someone.


-- 1. Add nullable, so the table stays valid while the backfill runs.
alter table public.categories add column kind text;

comment on column public.categories.kind is
  'What this category may be used for: product | service | both. Pickers must test '
  '`kind in (''product'',''both'')` rather than equality. NOT NULL with no default: there is no '
  'honest default, and a nullable kind would make a forgotten value silently invisible in every '
  'picker.';

-- 2. Backfill all 14 rows explicitly. Ten were settled by usage (they already carry products or
--    service_listings); four had zero rows in all four referencing tables and were ruled
--    individually by the founder on 2026-08-04, on evidence from the two taxonomy files:
--      · automobile-accessoires -> product  (product taxonomy has `auto-moto`; nothing automotive
--                                            anywhere in the service taxonomy)
--      · sante                  -> product  (product taxonomy has `sante-parapharmacie`; no health
--                                            sector in services; parapharmacy is a real TN COD line)
--      · data-science-analyse   -> service  (service-categories.ts has `data-analyse`; no product
--                                            sector and no plausible physical good)
--      · maison                 -> BOTH     (product taxonomy has `maison-deco`, and home services
--                                            are a real market the digital-only service catalogue
--                                            has not reached yet — see the 'both' note above)
update public.categories c
   set kind = v.kind
  from (values
    -- product
    ('mode',                  'product'),
    ('electronique',          'product'),
    ('beaute-soins',          'product'),
    ('automobile-accessoires','product'),
    ('sante',                 'product'),
    -- both
    ('maison',                'both'),
    -- service
    ('developpement',         'service'),
    ('design-creation',       'service'),
    ('marketing',             'service'),
    ('montage-video',         'service'),
    ('redaction',             'service'),
    ('business-conseil',      'service'),
    ('ugc',                   'service'),
    ('data-science-analyse',  'service')
  ) as v(slug, kind)
 where c.slug = v.slug;

-- 3. Guard the backfill with a clear message BEFORE SET NOT NULL does it with a worse one.
--    A mistyped slug above leaves its real row NULL and trips this; a slug that does not exist
--    simply updates nothing and is caught the same way.
do $$
declare v_total integer; v_null integer;
begin
  select count(*), count(*) filter (where kind is null) into v_total, v_null
    from public.categories;
  if v_null > 0 then
    raise exception 'kind backfill incomplete: % of % categories still null', v_null, v_total;
  end if;
  raise notice 'kind backfilled for all % categories', v_total;
end $$;

-- 4. Now enforce it.
alter table public.categories alter column kind set not null;

alter table public.categories
  add constraint categories_kind_check check (kind in ('product', 'service', 'both'));

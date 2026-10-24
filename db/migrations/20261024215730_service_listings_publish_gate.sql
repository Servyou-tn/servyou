-- H6 PR-4 (« Publier mon service ») — G8: the G4 publish rules, enforced IN THE DB when a service
-- stops being a draft. docs/design/h6-pr4-deltas.md §3 (rulings D30a/D30b, both as proposed). Applied by
-- the architect 2026-10-24 as recorded version 20261024215730 (README #64).
--
-- The rules (same as validateServiceInput after PR-4; app counts must match):
--   title 10–80 · category_id + subcategory_id set · tags 1–5, each 1–50 · short_description 1–160 ·
--   description 100–2000 · starting_price_tnd > 0 · price_unit set · deliverables 3–8, each 5–150 ·
--   delivery_mode set. Délai (delivery_time) and the client brief (buyer_briefing) stay optional.
-- Lengths are char_length of the btrim'd value (code points), so the app validator must count code
-- points too (Array.from(s).length), not UTF-16 units.
--
-- WHY A TRIGGER, NOT A CHECK: the 21 live listings fail these rules (every one lacks short_description
-- and price_unit; 19 have a description under 100; 19 have no deliverables; 8 have no tags — discovery
-- 2026-10-24). A CHECK would reject them; a NOT VALID one would still fire on every later UPDATE of
-- them (H5 pause/unpause). The rule has to look at OLD, which only a trigger can.
--
-- WHEN IT FIRES (D30a):
--   • NEW.status = 'draft' → never (autosave writes partial drafts by design; founder ruling).
--   • INSERT as non-draft (incl. the column default 'active'), or OLD.status = 'draft' → any
--     non-draft (draft → active AND draft → hidden): the WHOLE row must pass. This is the publish
--     moment, and it closes the hole where toggleServiceStatusAction (no current-status filter) or a
--     direct PostgREST call flips a half-filled draft to active, or parks it in hidden first.
--   • non-draft → non-draft UPDATE: only the fields this UPDATE CHANGED must pass. So:
--       – pause/unpause (status only) and admin_unhide_content (status + admin_* only) never trip it,
--         on legacy rows included — no field changes;
--       – a published H6 service can't be emptied later (a blanked field is a changed field);
--       – a legacy row stays editable, but whatever an edit touches must be valid — it can't be
--         rewritten into a brand-new incomplete service under its old id.
--   The brief's literal « hidden → active » gate is NOT used: unpause IS hidden → active, and it
--   would lock every paused legacy row (none today, but H5 can pause any of the 21).
--
-- WHO IT APPLIES TO (D30b): every JWT caller (owner, admin). Skipped when auth.uid() is null —
-- service role, SQL editor, migrations — the enforce_active_user precedent. The live-DB vitest suites
-- and scripts/rls-smoke.mjs insert minimal active listings as service role and keep working.
--
-- Side effects to know:
--   • Deleting a category as an authenticated admin, where ON DELETE SET NULL would blank the
--     category/subcategory of a COMPLETE non-draft listing, is refused (the cascade's UPDATE changes
--     a required field). Taxonomy changes run as migrations (service role) and are unaffected.
--   • Named trg_service_publish_requirements so it sorts AFTER the trg_enforce_* integrity triggers
--     (BEFORE triggers fire alphabetically): « Sous-catégorie invalide », the kind check and the
--     moderation lock still report first. CHECK constraints run after every BEFORE trigger, so on a
--     non-draft INSERT without a price this message now precedes service_listings_price_required_unless_draft.
--   • errcode 23514 is shared with the subcategory trigger, so the raise carries
--     hint = 'service_publish_requirements' and detail = the failing column names; the publish action
--     keys on the hint.
--   • No RLS, grant or column change; search_vector untouched.

create or replace function public.service_listing_publish_problems(r public.service_listings)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  problems text[] := '{}';
begin
  -- Each problem is named by its COLUMN, so the trigger can compare to_jsonb(old/new) -> name.
  if char_length(btrim(coalesce(r.title, ''))) not between 10 and 80 then
    problems := array_append(problems, 'title');
  end if;
  if r.category_id is null then
    problems := array_append(problems, 'category_id');
  end if;
  if r.subcategory_id is null then
    problems := array_append(problems, 'subcategory_id');
  end if;
  if coalesce(cardinality(r.tags), 0) not between 1 and 5
     or exists (select 1 from unnest(r.tags) as t(v) where v is null or char_length(btrim(v)) not between 1 and 50) then
    problems := array_append(problems, 'tags');
  end if;
  if char_length(btrim(coalesce(r.short_description, ''))) not between 1 and 160 then
    problems := array_append(problems, 'short_description');
  end if;
  if char_length(btrim(coalesce(r.description, ''))) not between 100 and 2000 then
    problems := array_append(problems, 'description');
  end if;
  if r.starting_price_tnd is null or r.starting_price_tnd <= 0 then
    problems := array_append(problems, 'starting_price_tnd');
  end if;
  if r.price_unit is null then
    problems := array_append(problems, 'price_unit');
  end if;
  if coalesce(cardinality(r.deliverables), 0) not between 3 and 8
     or exists (select 1 from unnest(r.deliverables) as d(v) where v is null or char_length(btrim(v)) not between 5 and 150) then
    problems := array_append(problems, 'deliverables');
  end if;
  if r.delivery_mode is null then
    problems := array_append(problems, 'delivery_mode');
  end if;
  return problems;
end;
$$;

comment on function public.service_listing_publish_problems(public.service_listings) is
  'H6 G4 publish rules for one service_listings row: the column names that fail (empty = publishable). Pure; used by enforce_service_publish_requirements(). Mirror of validateServiceInput (src/lib/freelance/service-validation.ts) — change both together.';

create or replace function public.enforce_service_publish_requirements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  problems text[];
  failing text[] := '{}';
  col text;
begin
  -- Service role, SQL editor, migrations, live-DB test fixtures (no JWT).
  if (select auth.uid()) is null then
    return new;
  end if;
  -- A draft may be anything (autosave).
  if new.status = 'draft' then
    return new;
  end if;

  problems := public.service_listing_publish_problems(new);
  if cardinality(problems) = 0 then
    return new;
  end if;

  if tg_op = 'INSERT' or old.status = 'draft' then
    -- Born public, or leaving draft: the whole row.
    failing := problems;
  else
    -- Already public: only what this UPDATE changed.
    foreach col in array problems loop
      if (to_jsonb(new) -> col) is distinct from (to_jsonb(old) -> col) then
        failing := array_append(failing, col);
      end if;
    end loop;
  end if;

  if cardinality(failing) > 0 then
    raise exception 'Service incomplet : il ne peut pas être publié en l''état.'
      using errcode = '23514',
            detail = array_to_string(failing, ','),
            hint = 'service_publish_requirements';
  end if;
  return new;
end;
$$;

comment on function public.enforce_service_publish_requirements() is
  'BEFORE INSERT/UPDATE on service_listings (H6 PR-4, G8). JWT callers only. Leaving draft or inserting non-draft: the whole row must pass service_listing_publish_problems(); non-draft → non-draft: only the changed columns must. Raises 23514 with hint service_publish_requirements, detail = failing columns.';

create trigger trg_service_publish_requirements
  before insert or update on public.service_listings
  for each row execute function public.enforce_service_publish_requirements();

-- Supabase grants EXECUTE on new public functions to anon/authenticated directly (not only PUBLIC).
-- The helper is called by the SECURITY DEFINER trigger function (as its owner), so no client role
-- needs it; trigger functions can't be called over RPC anyway (hygiene).
revoke execute on function public.service_listing_publish_problems(public.service_listings) from public, anon, authenticated;
revoke execute on function public.enforce_service_publish_requirements() from public, anon, authenticated;

-- Rollback (reverse migration, never delete this file):
-- drop trigger trg_service_publish_requirements on public.service_listings;
-- drop function public.enforce_service_publish_requirements();
-- drop function public.service_listing_publish_problems(public.service_listings);

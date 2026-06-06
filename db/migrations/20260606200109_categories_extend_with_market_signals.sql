-- Migration: categories_extend_with_market_signals
-- Purpose: Extend the existing 10-category taxonomy seeded in
--   20260603182553_categories_and_admin_helper with 4 categories
--   surfaced by the Day-4 Tunisian market research session, and
--   correct the UGC Arabic name to match how Tunisian creators
--   actually refer to themselves.
--
-- The existing 10 categories (Beauté & Soins, Développement,
--   Électronique, Maison, Marketing, Mode, Montage Vidéo, Rédaction,
--   Santé, UGC) are already in use — 1 product, 1 service, and
--   3 job posts reference them — and are NOT disturbed by this
--   migration except for the single UGC Arabic-name correction.
--   Renaming or broadening any existing rows (e.g. Maison →
--   Maison & Cuisine, Rédaction → Rédaction & Traduction) is
--   deferred to post-launch when real user listings reveal which
--   broader sub-buckets the marketplace actually needs.
--
-- The 4 additions fill gaps the research signals highlighted:
--   - Design & Création: Tunisie Freelance (the leading Tunisian
--     freelancer platform) names this as a top-tier category
--   - Data Science & Analyse: same source
--   - Business & Conseil: same source (covers consulting, project
--     management, financial analysis, HR consulting, e-commerce
--     management, business management, business development)
--   - Automobile & Accessoires: Accio's market velocity research
--     identifies this as high-velocity / low-saturation in TN
--     e-commerce; complements the existing Beauté/Santé verticals
--
-- The UGC AR fix: existing name_ar 'محتوى من إنشاء المستخدمين' is
--   the literal-translation form that nobody actually uses.
--   Tunisian UGC creators name themselves "UGC creator" embedded
--   in Arabic content. Updating to 'صناعة محتوى UGC' matches the
--   real usage. FR name stays as 'UGC'.
--
-- All new names follow the established FR/AR convention from the
--   original seed (standard Arabic, not Derja).

-- ============================================================
-- Step 1: Correct the UGC Arabic name
-- ============================================================
UPDATE public.categories
SET name_ar = 'صناعة محتوى UGC',
    updated_at = now()
WHERE slug = 'ugc';

-- ============================================================
-- Step 2: Add the 4 new categories
-- Flat structure (no parent_id) per the MVP decision in
-- data-model.md; nesting is post-launch.
-- ON CONFLICT (slug) DO NOTHING for idempotency.
-- ============================================================
INSERT INTO public.categories (name_fr, name_ar, slug)
VALUES
  ('Design & Création',         'تصميم وإبداع',              'design-creation'),
  ('Data Science & Analyse',    'علم البيانات والتحليل',     'data-science-analyse'),
  ('Business & Conseil',        'الأعمال والاستشارات',       'business-conseil'),
  ('Automobile & Accessoires',  'سيارات وملحقات',            'automobile-accessoires')
ON CONFLICT (slug) DO NOTHING;

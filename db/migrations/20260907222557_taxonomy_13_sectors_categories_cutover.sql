-- 13-sector service taxonomy — DB cutover (PR 2 of the taxonomy series)
--
-- PR 1 (#172) reconciled src/lib/taxonomy/service-categories.ts to the 13 sectors
-- locked in docs/design/taxonomy-services.md. Nothing in src/ imports that file yet,
-- so the DB still carries the ORIGINAL 8 flat service categories seeded by
-- 20260603182553_categories_and_admin_helper and extended by
-- 20260606200109_categories_extend_with_market_signals. This migration is the cutover:
-- it replaces those 8 rows with the 13 sectors + 91 subcategories, and re-files every
-- row that pointed at the old 8.
--
-- ── ORDERING IS FORCED, NOT STYLISTIC ────────────────────────────────────────────
-- The step order below is the only one that works. Do not "simplify" it:
--
--   1. Insert the 13 sectors first — the backfill needs targets to point AT.
--   2. Backfill service_listings + job_posts BEFORE the delete. categories' five
--      inbound FKs are ON DELETE SET NULL (service_listings, job_posts, products,
--      categories.parent_id) / CASCADE (shop_categories). Deleting first would blank
--      every category_id, and the original assignment would be unrecoverable.
--   3. Delete the old 8 only after the backfill has emptied them.
--   4. Insert the 91 subcategories LAST. categories.slug carries a GLOBAL unique
--      constraint (categories_slug_key), and the subcategory 'montage-video' under
--      sector 'montage-video-motion' collides with the OLD sector slug 'montage-video'.
--      That one collision — the only one across all 104 new slugs — is why the
--      subcategory insert cannot precede the delete.
--
-- ── FILING DECISIONS (founder-ruled 2026-09-07) ──────────────────────────────────
-- A naive same-name map (design-creation -> design-graphique-logo, marketing ->
-- marketing-digital, ...) would mis-file 8 of the 21 listings, because 5 of the 13
-- sectors are NEW and exist precisely to hold services the old 8 had no bucket for.
-- Every move away from the naive target is marked FAN-OUT below with its reason.
--
-- ── VERIFICATION SCOPE ───────────────────────────────────────────────────────────
-- "Zero job_posts carry a null category_id" is asserted as NO ROW LOSES A CATEGORY IT
-- HAD, not as a platform-wide zero: 2 job_posts ('test' fixtures, ids pinned in step 8)
-- already carry NULL and predate this work. Neither ruling maps them, so they are left
-- untouched and encoded as known-NULL by id — the same "known-divergent by name"
-- discipline db/migrations/README.md uses for its three timestamp exceptions, so a
-- THIRD null job_post shows up as a failure immediately.

-- ─────────────────────────────────────────────────────────────────────────────────
-- 1. The 13 sectors
-- ─────────────────────────────────────────────────────────────────────────────────
-- FR/AR strings generated directly from src/lib/taxonomy/service-categories.ts so the
-- DB and the TS source of truth cannot drift by a transcription typo.

insert into public.categories (name_fr, name_ar, slug, kind, parent_id) values
  ('Développement web & mobile', 'تطوير الويب والموبايل', 'developpement-web-mobile', 'service', null),
  ('Design graphique & logo', 'التصميم الغرافيكي والشعارات', 'design-graphique-logo', 'service', null),
  ('Design UI/UX', 'تصميم UI/UX', 'design-ui-ux', 'service', null),
  ('Marketing digital', 'التسويق الرقمي', 'marketing-digital', 'service', null),
  ('Community management', 'إدارة المجتمعات', 'community-management', 'service', null),
  ('Rédaction & contenu', 'الكتابة والمحتوى', 'redaction-contenu', 'service', null),
  ('Traduction', 'الترجمة', 'traduction', 'service', null),
  ('Montage vidéo & motion', 'مونتاج الفيديو والموشن', 'montage-video-motion', 'service', null),
  ('Voix off & doublage', 'التعليق الصوتي والدبلجة', 'voix-off-doublage', 'service', null),
  ('Consulting & assistanat', 'الاستشارة والمساعدة', 'consulting-assistanat', 'service', null),
  ('Personal branding', 'العلامة الشخصية', 'personal-branding', 'service', null),
  ('Coaching Meta Ads', 'تدريب على إعلانات Meta', 'coaching-meta-ads', 'service', null),
  ('Coaching e-commerce', 'تدريب على التجارة الإلكترونية', 'coaching-ecommerce', 'service', null);

-- ─────────────────────────────────────────────────────────────────────────────────
-- 2. Re-file the 21 service_listings
-- ─────────────────────────────────────────────────────────────────────────────────
-- Keyed by listing id, NOT by title: two listings are near-duplicates ("Création de
-- logo professionnel" / "Création de logo professionnel et identité visuelle
-- complète") and title-matching would file the wrong row. Titles are comments only.
--
-- The exact-rowcount assertion is the real guard: if a freelancer creates or deletes a
-- listing between this file being written and being applied, the count drifts and the
-- migration fails loudly instead of silently stranding a row on a category about to be
-- deleted (which ON DELETE SET NULL would then blank).

do $$
declare
  v_count integer;
begin
  update public.service_listings sl
     set category_id = c.id
    from (values
      -- ── business-conseil -> consulting-assistanat ──
      ('de5e0001-0000-4000-a000-000000000008', 'consulting-assistanat'),   -- Business plan & dossier bancaire
      ('de5e0001-0000-4000-a000-000000000011', 'coaching-ecommerce'),      -- FAN-OUT: Coaching lancement boutique Shopify — Shopify launch coaching is e-commerce coaching, not general consulting
      -- ── design-creation -> split 4 / 1 ──
      ('33dcd91c-492b-47a7-b7d3-bf1cc567069f', 'design-graphique-logo'),   -- Création de logo professionnel
      ('da2548fa-b315-4373-a91f-fda187de816c', 'design-graphique-logo'),   -- Création de logo professionnel et identité visuelle complète
      ('de5e0001-0000-4000-a000-000000000002', 'design-graphique-logo'),   -- Logo & identité visuelle premium
      ('5379e2a4-a780-4855-8178-2cf916e6874c', 'design-graphique-logo'),   -- Présentation PowerPoint pro (subcategory pitch-deck-presentation)
      ('de5e0001-0000-4000-a000-000000000003', 'design-ui-ux'),            -- FAN-OUT: Maquette d'application mobile — product design, not graphic design (subcategory maquette-application-mobile)
      -- ── developpement -> developpement-web-mobile ──
      ('0bc8956d-7a2e-4214-85ef-eca88497b0e4', 'developpement-web-mobile'),-- Refonte de site WordPress
      ('de5e0001-0000-4000-a000-000000000001', 'developpement-web-mobile'),-- Site vitrine WordPress clé en main
      -- ── marketing -> split 2 / 3 ──
      ('de5e0001-0000-4000-a000-000000000004', 'marketing-digital'),       -- Campagne Google Ads optimisée
      ('4706e87e-ceae-4ab9-9d15-a90af5a579f4', 'marketing-digital'),       -- Stratégie réseaux sociaux
      ('de5e0001-0000-4000-a000-000000000010', 'coaching-meta-ads'),       -- FAN-OUT: Coaching Meta Ads débutant — teaching Meta Ads, not running campaigns (subcategory initiation-meta-ads-debutant)
      ('de5e0001-0000-4000-a000-000000000005', 'community-management'),    -- FAN-OUT: Gestion Instagram & TikTok — account management, not campaign marketing (subcategory gestion-instagram-facebook)
      ('de5e0001-0000-4000-a000-000000000009', 'personal-branding'),       -- FAN-OUT: Personal branding LinkedIn (subcategory optimisation-profil-linkedin)
      -- ── montage-video -> split 2 / 1 ──
      ('caeeb36a-3efc-4b03-a561-a803fefc0766', 'montage-video-motion'),    -- Montage vidéo YouTube
      ('de5e0001-0000-4000-a000-000000000007', 'montage-video-motion'),    -- Montage vidéo YouTube & Reels
      ('de5e0001-0000-4000-a000-000000000012', 'voix-off-doublage'),       -- FAN-OUT: Voix off publicité FR & AR — voice work, not video editing (subcategories voix-off-publicite-fr / -ar)
      -- ── redaction -> split 2 / 1 ──
      ('de5e0001-0000-4000-a000-000000000006', 'redaction-contenu'),       -- Articles de blog optimisés SEO
      ('a8fbc97a-b1c6-4b3a-a120-abc2fa301bdf', 'redaction-contenu'),       -- Rédaction d'articles SEO
      ('6fcb9d37-2263-40d8-989e-b9f4e338ce9e', 'traduction'),              -- FAN-OUT: Traduction français-arabe — translation is its own sector now (subcategory traduction-fr-ar)
      -- ── ugc -> design-graphique-logo (sector retired, no successor) ──
      ('e5bec0f8-00d7-456a-a89b-39d959a251bc', 'design-graphique-logo')    -- FAN-OUT: Photo produits e-commerce — founder-ruled placeholder. Product photography has NO home in the 13 sectors; see docs/follow-ups.md, blocking-ish for H6.
    ) as v(listing_id, target_slug)
    join public.categories c
      on c.slug = v.target_slug
     and c.kind = 'service'
     and c.parent_id is null
   where sl.id = v.listing_id::uuid;

  get diagnostics v_count = row_count;
  if v_count <> 21 then
    raise exception 'service_listings backfill updated % rows, expected 21 — listing set changed since this migration was written; re-derive the mapping before applying', v_count;
  end if;
  raise notice 're-filed % service_listings', v_count;
end
$$;

-- ─────────────────────────────────────────────────────────────────────────────────
-- 3. Re-file the 4 categorised job_posts
-- ─────────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_count integer;
begin
  update public.job_posts jp
     set category_id = c.id
    from (values
      ('82490a42-dc16-494f-ab8f-d2621f4934ed', 'design-graphique-logo'),   -- creation de identite visuelle pour une poutique de vettements
      ('05ceb128-2e5c-4023-96df-1aceb7344d84', 'design-graphique-logo'),   -- FAN-OUT: "creation d'un logo" — was mis-filed under developpement; a logo is design work
      ('11ceeafd-ed0c-45c8-9552-be7dff6f9cb2', 'developpement-web-mobile'),-- modern web design
      ('6e618b98-0b58-4fc1-96e7-b3015e4aa41b', 'developpement-web-mobile') -- web app
    ) as v(job_post_id, target_slug)
    join public.categories c
      on c.slug = v.target_slug
     and c.kind = 'service'
     and c.parent_id is null
   where jp.id = v.job_post_id::uuid;

  get diagnostics v_count = row_count;
  if v_count <> 4 then
    raise exception 'job_posts backfill updated % rows, expected 4 — job post set changed since this migration was written', v_count;
  end if;
  raise notice 're-filed % job_posts', v_count;
end
$$;

-- ─────────────────────────────────────────────────────────────────────────────────
-- 4. Assert the old 8 are fully drained BEFORE deleting them
-- ─────────────────────────────────────────────────────────────────────────────────
-- Fail-closed, inside the transaction, so a raise rolls the whole thing back. A
-- post-hoc SELECT would report the damage instead of preventing it.
--
-- shop_categories is checked even though it reads 0 today: it is the ONE inbound FK
-- that CASCADES rather than SET NULL, so a row there would be silently destroyed by
-- the delete rather than merely blanked.

do $$
declare
  v_old_slugs   text[] := array['business-conseil','data-science-analyse','design-creation','developpement','marketing','montage-video','redaction','ugc'];
  v_listings    integer;
  v_jobs        integer;
  v_products    integer;
  v_shop_links  integer;
  v_children    integer;
  v_found       integer;
begin
  select count(*) into v_found
    from public.categories where slug = any(v_old_slugs);
  if v_found <> 8 then
    raise exception 'expected the 8 legacy service categories, found % — schema drifted since discovery', v_found;
  end if;

  select count(*) into v_listings
    from public.service_listings sl
    join public.categories c on c.id = sl.category_id
   where c.slug = any(v_old_slugs);

  select count(*) into v_jobs
    from public.job_posts jp
    join public.categories c on c.id = jp.category_id
   where c.slug = any(v_old_slugs);

  select count(*) into v_products
    from public.products p
    join public.categories c on c.id = p.category_id
   where c.slug = any(v_old_slugs);

  select count(*) into v_shop_links
    from public.shop_categories sc
    join public.categories c on c.id = sc.category_id
   where c.slug = any(v_old_slugs);

  select count(*) into v_children
    from public.categories ch
    join public.categories c on c.id = ch.parent_id
   where c.slug = any(v_old_slugs);

  if v_listings <> 0 or v_jobs <> 0 or v_products <> 0 or v_shop_links <> 0 or v_children <> 0 then
    raise exception 'legacy categories still referenced — listings:%, job_posts:%, products:%, shop_categories:%, child categories:% — deleting now would blank (or CASCADE-destroy) them',
      v_listings, v_jobs, v_products, v_shop_links, v_children;
  end if;
end
$$;

-- ─────────────────────────────────────────────────────────────────────────────────
-- 5. Delete the legacy 8
-- ─────────────────────────────────────────────────────────────────────────────────
-- Clean cutover, founder-ruled: a half-migrated taxonomy where some rows point at the
-- old 8 and some at the new 13 is worse than either end state.

delete from public.categories
 where slug in ('business-conseil','data-science-analyse','design-creation','developpement','marketing','montage-video','redaction','ugc');

-- ─────────────────────────────────────────────────────────────────────────────────
-- 6. The 91 subcategories
-- ─────────────────────────────────────────────────────────────────────────────────
-- Only possible now that 'montage-video' is free (see ORDERING above). Parent resolved
-- by slug join, so a typo'd parent drops the row and trips the count assertion rather
-- than inserting an orphan.

do $$
declare
  v_count integer;
begin
  insert into public.categories (name_fr, name_ar, slug, kind, parent_id)
  select v.name_fr, v.name_ar, v.slug, 'service', p.id
    from (values
      -- Développement web & mobile — 7 sous-catégories
      ('Site vitrine (WordPress, Webflow)', 'موقع تعريفي (WordPress, Webflow)', 'site-vitrine', 'developpement-web-mobile'),
      ('E-commerce (Shopify, WooCommerce, PrestaShop)', 'التجارة الإلكترونية (Shopify, WooCommerce, PrestaShop)', 'e-commerce', 'developpement-web-mobile'),
      ('Application web sur mesure (React, Next.js, Laravel)', 'تطبيق ويب مخصص (React, Next.js, Laravel)', 'application-web-sur-mesure', 'developpement-web-mobile'),
      ('Application mobile (iOS, Android, Flutter, React Native)', 'تطبيق موبايل (iOS, Android, Flutter, React Native)', 'application-mobile', 'developpement-web-mobile'),
      ('Landing page & tunnel de vente', 'صفحة هبوط وقمع مبيعات', 'landing-page-tunnel-de-vente', 'developpement-web-mobile'),
      ('Intégration API & automatisation', 'دمج API والأتمتة', 'integration-api-automatisation', 'developpement-web-mobile'),
      ('Correction de bug & maintenance', 'إصلاح الأخطاء والصيانة', 'correction-de-bug-maintenance', 'developpement-web-mobile'),
      -- Design graphique & logo — 8 sous-catégories
      ('Logo & identité visuelle', 'الشعار والهوية البصرية', 'logo-identite-visuelle', 'design-graphique-logo'),
      ('Flyer, affiche & print', 'منشورات وملصقات وطباعة', 'flyer-affiche-print', 'design-graphique-logo'),
      ('Cartes de visite & papeterie', 'بطاقات العمل والقرطاسية', 'cartes-de-visite-papeterie', 'design-graphique-logo'),
      ('Packaging & étiquette produit', 'التغليف وملصقات المنتج', 'packaging-etiquette-produit', 'design-graphique-logo'),
      ('Menu restaurant & signalétique', 'قوائم المطاعم واللافتات', 'menu-restaurant-signaletique', 'design-graphique-logo'),
      ('Bannières réseaux sociaux', 'بانرات وسائل التواصل الاجتماعي', 'bannieres-reseaux-sociaux', 'design-graphique-logo'),
      ('Pitch deck & présentation', 'عرض تقديمي (Pitch Deck)', 'pitch-deck-presentation', 'design-graphique-logo'),
      ('Illustration sur mesure', 'الرسم التوضيحي المخصص', 'illustration-sur-mesure', 'design-graphique-logo'),
      -- Design UI/UX — 6 sous-catégories
      ('Maquette site web (Figma)', 'نموذج موقع ويب (Figma)', 'maquette-site-web', 'design-ui-ux'),
      ('Maquette application mobile', 'نموذج تطبيق موبايل', 'maquette-application-mobile', 'design-ui-ux'),
      ('Wireframe & prototype interactif', 'مخطط هيكلي ونموذج أولي تفاعلي', 'wireframe-prototype-interactif', 'design-ui-ux'),
      ('Audit UX & recommandations', 'تدقيق تجربة المستخدم وتوصيات', 'audit-ux-recommandations', 'design-ui-ux'),
      ('Design system & composants', 'نظام التصميم والمكوّنات', 'design-system-composants', 'design-ui-ux'),
      ('Refonte d''interface existante', 'إعادة تصميم واجهة قائمة', 'refonte-dinterface-existante', 'design-ui-ux'),
      -- Marketing digital — 7 sous-catégories
      ('Stratégie marketing digital', 'استراتيجية التسويق الرقمي', 'strategie-marketing-digital', 'marketing-digital'),
      ('Référencement SEO', 'تحسين محركات البحث (SEO)', 'referencement-seo', 'marketing-digital'),
      ('Google Ads (Search, Shopping, YouTube)', 'إعلانات جوجل (Search, Shopping, YouTube)', 'google-ads', 'marketing-digital'),
      ('LinkedIn Ads & TikTok Ads', 'إعلانات LinkedIn وTikTok', 'linkedin-ads-tiktok-ads', 'marketing-digital'),
      ('Email marketing & newsletter', 'التسويق عبر البريد الإلكتروني والنشرات', 'email-marketing-newsletter', 'marketing-digital'),
      ('Automatisation (Zapier, Make, HubSpot)', 'الأتمتة (Zapier, Make, HubSpot)', 'automatisation', 'marketing-digital'),
      ('Audit & analytics (GA4, Meta Pixel)', 'تدقيق وتحليلات (GA4, Meta Pixel)', 'audit-analytics', 'marketing-digital'),
      -- Community management — 7 sous-catégories
      ('Gestion Instagram & Facebook', 'إدارة Instagram وFacebook', 'gestion-instagram-facebook', 'community-management'),
      ('Gestion TikTok & YouTube Shorts', 'إدارة TikTok وYouTube Shorts', 'gestion-tiktok-youtube-shorts', 'community-management'),
      ('Gestion LinkedIn professionnel', 'إدارة LinkedIn الاحترافي', 'gestion-linkedin-professionnel', 'community-management'),
      ('Création de contenu (posts, reels, stories)', 'إنشاء المحتوى (منشورات، ريلز، ستوري)', 'creation-de-contenu', 'community-management'),
      ('Calendrier éditorial & planification', 'التقويم التحريري والتخطيط', 'calendrier-editorial-planification', 'community-management'),
      ('Modération & réponse aux commentaires', 'الإشراف والرد على التعليقات', 'moderation-reponse-aux-commentaires', 'community-management'),
      ('Influence & partenariats', 'التأثير والشراكات', 'influence-partenariats', 'community-management'),
      -- Rédaction & contenu — 7 sous-catégories
      ('Article de blog (SEO)', 'مقال مدونة (SEO)', 'article-de-blog-seo', 'redaction-contenu'),
      ('Fiche produit e-commerce', 'وصف منتج للتجارة الإلكترونية', 'fiche-produit-e-commerce', 'redaction-contenu'),
      ('Copywriting (page de vente, tunnel)', 'الكتابة الإعلانية (صفحة مبيعات، قمع تحويل)', 'copywriting', 'redaction-contenu'),
      ('Script vidéo & podcast', 'نص فيديو وبودكاست', 'script-video-podcast', 'redaction-contenu'),
      ('Rédaction LinkedIn & posts sociaux', 'كتابة LinkedIn ومنشورات اجتماعية', 'redaction-linkedin-posts-sociaux', 'redaction-contenu'),
      ('Livre blanc & guide', 'كتاب أبيض ودليل إرشادي', 'livre-blanc-guide', 'redaction-contenu'),
      ('Correction & relecture', 'التصحيح والمراجعة', 'correction-relecture', 'redaction-contenu'),
      -- Traduction — 7 sous-catégories
      ('FR ↔ AR', 'فرنسي ↔ عربي', 'traduction-fr-ar', 'traduction'),
      ('FR ↔ EN', 'فرنسي ↔ إنجليزي', 'traduction-fr-en', 'traduction'),
      ('AR ↔ EN', 'عربي ↔ إنجليزي', 'traduction-ar-en', 'traduction'),
      ('Traduction technique (IT, juridique, médical)', 'ترجمة تقنية (معلوماتية، قانونية، طبية)', 'traduction-technique', 'traduction'),
      ('Traduction administrative', 'ترجمة إدارية', 'traduction-administrative', 'traduction'),
      ('Sous-titrage vidéo', 'سترجة الفيديو', 'sous-titrage-video', 'traduction'),
      ('Transcription audio', 'النسخ الصوتي', 'transcription-audio', 'traduction'),
      -- Montage vidéo & motion — 7 sous-catégories
      ('Montage vidéo (YouTube, TikTok, Reels)', 'مونتاج الفيديو (YouTube, TikTok, Reels)', 'montage-video', 'montage-video-motion'),
      ('Motion graphics & animation 2D', 'موشن غرافيك ورسوم متحركة 2D', 'motion-graphics-animation-2d', 'montage-video-motion'),
      ('Explainer video & tutoriel', 'فيديو تعريفي وتعليمي', 'explainer-video-tutoriel', 'montage-video-motion'),
      ('Animation logo & intro', 'تحريك الشعار والمقدمة', 'animation-logo-intro', 'montage-video-motion'),
      ('Vidéo publicitaire (ads)', 'فيديو إعلاني (Ads)', 'video-publicitaire-ads', 'montage-video-motion'),
      ('Étalonnage colorimétrique', 'تصحيح الألوان', 'etalonnage-colorimetrique', 'montage-video-motion'),
      ('Sound design', 'تصميم صوتي', 'sound-design', 'montage-video-motion'),
      -- Voix off & doublage — 7 sous-catégories
      ('Voix off publicité FR', 'تعليق صوتي إعلاني بالفرنسية', 'voix-off-publicite-fr', 'voix-off-doublage'),
      ('Voix off publicité AR', 'تعليق صوتي إعلاني بالعربية', 'voix-off-publicite-ar', 'voix-off-doublage'),
      ('Voix off publicité EN', 'تعليق صوتي إعلاني بالإنجليزية', 'voix-off-publicite-en', 'voix-off-doublage'),
      ('Doublage MENA (dialectes)', 'دبلجة بلهجات الشرق الأوسط وشمال أفريقيا', 'doublage-mena', 'voix-off-doublage'),
      ('Narration documentaire & audiobook', 'سرد وثائقي وكتاب صوتي', 'narration-documentaire-audiobook', 'voix-off-doublage'),
      ('Voix IVR & répondeur téléphonique', 'صوت IVR ورد آلي هاتفي', 'voix-ivr-repondeur', 'voix-off-doublage'),
      ('Chant & jingle publicitaire', 'غناء وجينغل إعلاني', 'chant-jingle-publicitaire', 'voix-off-doublage'),
      -- Consulting & assistanat — 7 sous-catégories
      ('Business plan & étude de marché', 'خطة العمل ودراسة السوق', 'business-plan-etude-de-marche', 'consulting-assistanat'),
      ('Dossier bancaire & financement (ANETI, BFPME)', 'ملف بنكي وتمويل (ANETI, BFPME)', 'dossier-bancaire-financement', 'consulting-assistanat'),
      ('Assistance administrative à distance', 'مساعدة إدارية عن بعد', 'assistance-administrative-a-distance', 'consulting-assistanat'),
      ('Saisie & mise en forme documents', 'إدخال وتنسيق الوثائق', 'saisie-mise-en-forme-documents', 'consulting-assistanat'),
      ('Comptabilité à distance (déclarations, TVA)', 'محاسبة عن بعد (تصريحات، ضريبة القيمة المضافة)', 'comptabilite-a-distance', 'consulting-assistanat'),
      ('Recherche & veille concurrentielle', 'البحث ورصد المنافسين', 'recherche-veille-concurrentielle', 'consulting-assistanat'),
      ('CV & lettre de motivation', 'السيرة الذاتية ورسالة تحفيزية', 'cv-lettre-de-motivation', 'consulting-assistanat'),
      -- Personal branding — 6 sous-catégories
      ('Stratégie & positionnement marque personnelle', 'استراتيجية وتموضع العلامة الشخصية', 'strategie-positionnement-marque-personnelle', 'personal-branding'),
      ('Optimisation profil LinkedIn', 'تحسين ملف LinkedIn الشخصي', 'optimisation-profil-linkedin', 'personal-branding'),
      ('Ligne éditoriale personnelle', 'الخط التحريري الشخصي', 'ligne-editoriale-personnelle', 'personal-branding'),
      ('Bio & storytelling professionnel', 'السيرة والسرد القصصي المهني', 'bio-storytelling-professionnel', 'personal-branding'),
      ('Photo de profil (retouche & optimisation)', 'صورة الملف الشخصي (تعديل وتحسين)', 'photo-de-profil', 'personal-branding'),
      ('Coaching prise de parole vidéo', 'تدريب على التحدث أمام الكاميرا', 'coaching-prise-de-parole-video', 'personal-branding'),
      -- Coaching Meta Ads — 7 sous-catégories
      ('Initiation Meta Ads (débutant)', 'مبادئ إعلانات Meta (مبتدئ)', 'initiation-meta-ads-debutant', 'coaching-meta-ads'),
      ('Meta Ads avancé (scaling & optimisation)', 'إعلانات Meta متقدم (توسيع وتحسين)', 'meta-ads-avance', 'coaching-meta-ads'),
      ('Configuration Business Manager', 'إعداد Business Manager', 'configuration-business-manager', 'coaching-meta-ads'),
      ('Pixel & API Conversions', 'Pixel وAPI التحويلات', 'pixel-api-conversions', 'coaching-meta-ads'),
      ('Formation dropshipping avec Meta', 'تدريب على الدروبشيبينغ عبر Meta', 'formation-dropshipping-avec-meta', 'coaching-meta-ads'),
      ('Audit compte Meta Ads existant', 'تدقيق حساب Meta Ads قائم', 'audit-compte-meta-ads-existant', 'coaching-meta-ads'),
      ('Coaching campagne en cours (live)', 'تدريب مباشر على حملة جارية', 'coaching-campagne-en-cours-live', 'coaching-meta-ads'),
      -- Coaching e-commerce — 8 sous-catégories
      ('Initiation Shopify (débutant)', 'مبادئ Shopify (مبتدئ)', 'initiation-shopify-debutant', 'coaching-ecommerce'),
      ('Initiation WooCommerce (débutant)', 'مبادئ WooCommerce (مبتدئ)', 'initiation-woocommerce-debutant', 'coaching-ecommerce'),
      ('Stratégie dropshipping', 'استراتيجية الدروبشيبينغ', 'strategie-dropshipping', 'coaching-ecommerce'),
      ('Choix de produit gagnant', 'اختيار المنتج الرابح', 'choix-de-produit-gagnant', 'coaching-ecommerce'),
      ('Optimisation tunnel de vente', 'تحسين قمع المبيعات', 'optimisation-tunnel-de-vente', 'coaching-ecommerce'),
      ('Logistique & COD Tunisie', 'اللوجستيات والدفع عند الاستلام في تونس', 'logistique-cod-tunisie', 'coaching-ecommerce'),
      ('Audit boutique existante', 'تدقيق متجر قائم', 'audit-boutique-existante', 'coaching-ecommerce'),
      ('Coaching lancement boutique', 'تدريب على إطلاق متجر', 'coaching-lancement-boutique', 'coaching-ecommerce')
    ) as v(name_fr, name_ar, slug, parent_slug)
    join public.categories p
      on p.slug = v.parent_slug
     and p.kind = 'service'
     and p.parent_id is null;

  get diagnostics v_count = row_count;
  if v_count <> 91 then
    raise exception 'subcategory insert wrote % rows, expected 91 — a parent slug failed to resolve', v_count;
  end if;
  raise notice 'inserted % subcategories', v_count;
end
$$;

-- ─────────────────────────────────────────────────────────────────────────────────
-- 7. Cross-table guard: a service may only be filed under a service category
-- ─────────────────────────────────────────────────────────────────────────────────
-- A CHECK constraint cannot reference another table, so the rule that
-- service_listings.category_id / job_posts.category_id must resolve to a category with
-- kind in ('service','both') is enforced by trigger — the same shape as
-- 20260603231958_job_response_fairness_trigger (plpgsql, SECURITY DEFINER, pinned
-- search_path, French user-facing message).
--
-- This is the DB half of the consumer contract 20260804132447_categories_kind_
-- discriminator documented but left unenforced: "consumers must read
-- kind in ('service','both')". Nothing stopped a service being filed under 'mode'
-- until now.
--
-- SECURITY DEFINER is deliberate: categories' SELECT policy is "using (true)" today, so
-- an invoker-rights function would work, but the guard must not silently start passing
-- rows if that policy is ever tightened.
--
-- Scoped to service tables only. The symmetric products/kind in ('product','both')
-- guard is a real gap but out of this PR's focus — logged in docs/follow-ups.md.

do $$
declare
  v_bad integer;
begin
  select count(*) into v_bad
    from (
      select sl.category_id from public.service_listings sl
      union all
      select jp.category_id from public.job_posts jp
    ) r
    join public.categories c on c.id = r.category_id
   where c.kind not in ('service', 'both');

  if v_bad <> 0 then
    raise exception 'cannot install kind guard: % existing rows are filed under a non-service category', v_bad;
  end if;
end
$$;

create or replace function public.enforce_service_category_kind()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- NULL is allowed: category_id is nullable on both tables, and the inbound FKs are
  -- ON DELETE SET NULL. Guarding NULL here would reject every legitimate
  -- uncategorised row (2 exist today) on any later update.
  if new.category_id is not null
     and not exists (
       select 1
         from public.categories c
        where c.id = new.category_id
          and c.kind in ('service', 'both')
     )
  then
    raise exception 'Catégorie invalide : une prestation doit être rattachée à une catégorie de service.';
  end if;

  return new;
end;
$fn$;

comment on function public.enforce_service_category_kind() is
  'Cross-table guard: service_listings.category_id and job_posts.category_id must '
  'resolve to a categories row with kind in (''service'',''both''). A CHECK cannot '
  'reference another table; this trigger is the equivalent guarantee.';

drop trigger if exists trg_enforce_service_category_kind on public.service_listings;
create trigger trg_enforce_service_category_kind
  before insert or update of category_id on public.service_listings
  for each row execute function public.enforce_service_category_kind();

drop trigger if exists trg_enforce_service_category_kind on public.job_posts;
create trigger trg_enforce_service_category_kind
  before insert or update of category_id on public.job_posts
  for each row execute function public.enforce_service_category_kind();

-- ─────────────────────────────────────────────────────────────────────────────────
-- 8. Final verification — raises (and rolls back) rather than reporting after the fact
-- ─────────────────────────────────────────────────────────────────────────────────

do $$
declare
  -- job_posts that were ALREADY uncategorised before this migration. Both are 'test'
  -- fixtures; neither ruling maps them, so they stay NULL. Pinned by id so a third
  -- null job_post fails this assertion instead of hiding inside a count.
  v_known_null_jobs uuid[] := array[
    '6be2aa96-b29e-4a4b-af52-001f85009776'::uuid,  -- "test" (filled)
    '10e2901b-6d50-4cdd-a63a-3204b670178f'::uuid   -- "test" (open)
  ];
  v_sectors      integer;
  v_subs         integer;
  v_legacy       integer;
  v_null_listing integer;
  v_null_jobs    integer;
  v_wrong_kind   integer;
  v_orphan_sub   integer;
begin
  select count(*) into v_sectors
    from public.categories where kind = 'service' and parent_id is null;
  if v_sectors <> 13 then
    raise exception 'expected 13 service sectors, found %', v_sectors;
  end if;

  select count(*) into v_subs
    from public.categories c
    join public.categories p on p.id = c.parent_id
   where c.kind = 'service' and p.parent_id is null;
  if v_subs <> 91 then
    raise exception 'expected 91 service subcategories, found %', v_subs;
  end if;

  -- No ROOT category still carries a legacy slug. Scoped to parent_id is null: 'montage-video'
  -- is BOTH an old root sector slug (deleted in step 5) AND, by design, the new subcategory slug
  -- under 'montage-video-motion' (inserted in step 6) — that reuse is the documented, intentional
  -- collision from the ORDERING note at the top of this file, not a survivor of the delete. An
  -- unscoped slug-only check cannot tell those apart and would false-positive on exactly this row.
  select count(*) into v_legacy
    from public.categories
   where slug in ('business-conseil','data-science-analyse','design-creation','developpement','marketing','montage-video','redaction','ugc')
     and parent_id is null;
  if v_legacy <> 0 then
    raise exception '% legacy service categories survived the delete', v_legacy;
  end if;

  -- Every service_listing kept a category (all 21 had one going in).
  select count(*) into v_null_listing
    from public.service_listings where category_id is null;
  if v_null_listing <> 0 then
    raise exception '% service_listings lost their category', v_null_listing;
  end if;

  -- No job_post LOST a category: the only nulls are the two pre-existing fixtures.
  select count(*) into v_null_jobs
    from public.job_posts
   where category_id is null and not (id = any(v_known_null_jobs));
  if v_null_jobs <> 0 then
    raise exception '% job_posts lost their category (excluding the 2 known-null test fixtures)', v_null_jobs;
  end if;

  -- Nothing is filed under a product-only category.
  select count(*) into v_wrong_kind
    from (
      select sl.category_id from public.service_listings sl
      union all
      select jp.category_id from public.job_posts jp
    ) r
    join public.categories c on c.id = r.category_id
   where c.kind not in ('service', 'both');
  if v_wrong_kind <> 0 then
    raise exception '% rows are filed under a non-service category', v_wrong_kind;
  end if;

  -- No subcategory was orphaned by the delete (parent_id is ON DELETE SET NULL).
  select count(*) into v_orphan_sub
    from public.categories
   where kind = 'service' and parent_id is null and slug <> all (array[
     'developpement-web-mobile','design-graphique-logo','design-ui-ux','marketing-digital',
     'community-management','redaction-contenu','traduction','montage-video-motion',
     'voix-off-doublage','consulting-assistanat','personal-branding','coaching-meta-ads',
     'coaching-ecommerce'
   ]);
  if v_orphan_sub <> 0 then
    raise exception '% service categories sit at root but are not one of the 13 sectors', v_orphan_sub;
  end if;

  raise notice 'taxonomy cutover verified: 13 sectors, 91 subcategories, 21 listings + 4 job_posts re-filed, 0 orphans';
end
$$;

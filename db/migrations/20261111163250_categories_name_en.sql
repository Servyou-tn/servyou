-- English names for categories (founder decision 2026-11-11: « Add a DB column »).
-- Applied by the architect 2026-11-11 (founder-approved in chat: « ok apply »); 111/111 rows filled.
-- Nullable on purpose: the admin category form stays French-only, so a category created later has no English name;
-- the app then shows name_fr (localName() in src/lib/i18n/local-name.ts). No policy change: RLS « Categories are viewable by
-- everyone » and the table-level SELECT grants to anon/authenticated already cover a new column. No view or function selects
-- categories by column list except the admin RPCs, which stay French.
alter table public.categories add column name_en text;

update public.categories c set name_en = v.name_en
from (values
  -- top level
  ('maison', 'Home'),
  ('automobile-accessoires', 'Cars & accessories'),
  ('beaute-soins', 'Beauty & care'),
  ('electronique', 'Electronics'),
  ('mode', 'Fashion'),
  ('sante', 'Health'),
  ('coaching-ecommerce', 'E-commerce coaching'),
  ('coaching-meta-ads', 'Meta Ads coaching'),
  ('community-management', 'Community management'),
  ('consulting-assistanat', 'Consulting & admin support'),
  ('design-graphique-logo', 'Graphic design & logo'),
  ('design-ui-ux', 'UI/UX design'),
  ('developpement-web-mobile', 'Web & mobile development'),
  ('marketing-digital', 'Digital marketing'),
  ('montage-video-motion', 'Video editing & motion'),
  ('personal-branding', 'Personal branding'),
  ('redaction-contenu', 'Writing & content'),
  ('traduction', 'Translation'),
  ('voix-off-doublage', 'Voice-over & dubbing'),
  -- coaching-ecommerce
  ('audit-boutique-existante', 'Existing shop audit'),
  ('choix-de-produit-gagnant', 'Picking a winning product'),
  ('coaching-lancement-boutique', 'Shop launch coaching'),
  ('initiation-shopify-debutant', 'Shopify basics (beginner)'),
  ('initiation-woocommerce-debutant', 'WooCommerce basics (beginner)'),
  ('logistique-cod-tunisie', 'Logistics & cash on delivery in Tunisia'),
  ('optimisation-tunnel-de-vente', 'Sales funnel optimisation'),
  ('strategie-dropshipping', 'Dropshipping strategy'),
  -- coaching-meta-ads
  ('audit-compte-meta-ads-existant', 'Existing Meta Ads account audit'),
  ('coaching-campagne-en-cours-live', 'Live campaign coaching'),
  ('configuration-business-manager', 'Business Manager setup'),
  ('formation-dropshipping-avec-meta', 'Dropshipping with Meta training'),
  ('initiation-meta-ads-debutant', 'Meta Ads basics (beginner)'),
  ('meta-ads-avance', 'Advanced Meta Ads (scaling & optimisation)'),
  ('pixel-api-conversions', 'Pixel & Conversions API'),
  -- community-management
  ('calendrier-editorial-planification', 'Content calendar & scheduling'),
  ('creation-de-contenu', 'Content creation (posts, reels, stories)'),
  ('gestion-instagram-facebook', 'Instagram & Facebook management'),
  ('gestion-linkedin-professionnel', 'Professional LinkedIn management'),
  ('gestion-tiktok-youtube-shorts', 'TikTok & YouTube Shorts management'),
  ('influence-partenariats', 'Influencers & partnerships'),
  ('moderation-reponse-aux-commentaires', 'Moderation & replying to comments'),
  -- consulting-assistanat
  ('assistance-administrative-a-distance', 'Remote admin support'),
  ('business-plan-etude-de-marche', 'Business plan & market research'),
  ('comptabilite-a-distance', 'Remote bookkeeping (tax returns, VAT)'),
  ('cv-lettre-de-motivation', 'CV & cover letter'),
  ('dossier-bancaire-financement', 'Bank & funding applications (ANETI, BFPME)'),
  ('recherche-veille-concurrentielle', 'Research & competitor monitoring'),
  ('saisie-mise-en-forme-documents', 'Data entry & document formatting'),
  -- design-graphique-logo
  ('bannieres-reseaux-sociaux', 'Social media banners'),
  ('cartes-de-visite-papeterie', 'Business cards & stationery'),
  ('flyer-affiche-print', 'Flyers, posters & print'),
  ('illustration-sur-mesure', 'Custom illustration'),
  ('logo-identite-visuelle', 'Logo & visual identity'),
  ('menu-restaurant-signaletique', 'Restaurant menus & signage'),
  ('packaging-etiquette-produit', 'Packaging & product labels'),
  ('photographie-retouche-produit', 'Product photography & retouching'),
  ('pitch-deck-presentation', 'Pitch deck & presentation'),
  -- design-ui-ux
  ('audit-ux-recommandations', 'UX audit & recommendations'),
  ('design-system-composants', 'Design system & components'),
  ('maquette-application-mobile', 'Mobile app mock-up'),
  ('maquette-site-web', 'Website mock-up (Figma)'),
  ('refonte-dinterface-existante', 'Redesign of an existing interface'),
  ('wireframe-prototype-interactif', 'Wireframe & interactive prototype'),
  -- developpement-web-mobile
  ('application-mobile', 'Mobile app (iOS, Android, Flutter, React Native)'),
  ('application-web-sur-mesure', 'Custom web app (React, Next.js, Laravel)'),
  ('correction-de-bug-maintenance', 'Bug fixing & maintenance'),
  ('e-commerce', 'E-commerce (Shopify, WooCommerce, PrestaShop)'),
  ('integration-api-automatisation', 'API integration & automation'),
  ('landing-page-tunnel-de-vente', 'Landing page & sales funnel'),
  ('site-vitrine', 'Business website (WordPress, Webflow)'),
  -- marketing-digital
  ('audit-analytics', 'Audit & analytics (GA4, Meta Pixel)'),
  ('automatisation', 'Automation (Zapier, Make, HubSpot)'),
  ('email-marketing-newsletter', 'Email marketing & newsletter'),
  ('google-ads', 'Google Ads (Search, Shopping, YouTube)'),
  ('linkedin-ads-tiktok-ads', 'LinkedIn Ads & TikTok Ads'),
  ('referencement-seo', 'SEO'),
  ('strategie-marketing-digital', 'Digital marketing strategy'),
  -- montage-video-motion
  ('animation-logo-intro', 'Logo animation & intro'),
  ('etalonnage-colorimetrique', 'Colour grading'),
  ('explainer-video-tutoriel', 'Explainer video & tutorial'),
  ('montage-video', 'Video editing (YouTube, TikTok, Reels)'),
  ('motion-graphics-animation-2d', 'Motion graphics & 2D animation'),
  ('sound-design', 'Sound design'),
  ('video-publicitaire-ads', 'Video ads'),
  -- personal-branding
  ('bio-storytelling-professionnel', 'Professional bio & storytelling'),
  ('coaching-prise-de-parole-video', 'On-camera speaking coaching'),
  ('ligne-editoriale-personnelle', 'Personal content strategy'),
  ('optimisation-profil-linkedin', 'LinkedIn profile optimisation'),
  ('photo-de-profil', 'Profile photo (retouching & optimisation)'),
  ('strategie-positionnement-marque-personnelle', 'Personal brand strategy & positioning'),
  -- redaction-contenu
  ('article-de-blog-seo', 'Blog articles (SEO)'),
  ('copywriting', 'Copywriting (sales page, funnel)'),
  ('correction-relecture', 'Editing & proofreading'),
  ('fiche-produit-e-commerce', 'E-commerce product descriptions'),
  ('livre-blanc-guide', 'White paper & guide'),
  ('redaction-linkedin-posts-sociaux', 'LinkedIn & social media posts'),
  ('script-video-podcast', 'Video & podcast scripts'),
  -- traduction
  ('sous-titrage-video', 'Video subtitling'),
  ('traduction-administrative', 'Official document translation'),
  ('traduction-ar-en', 'AR ↔ EN'),
  ('traduction-fr-ar', 'FR ↔ AR'),
  ('traduction-fr-en', 'FR ↔ EN'),
  ('traduction-technique', 'Technical translation (IT, legal, medical)'),
  ('transcription-audio', 'Audio transcription'),
  -- voix-off-doublage
  ('chant-jingle-publicitaire', 'Singing & advertising jingles'),
  ('doublage-mena', 'MENA dubbing (dialects)'),
  ('narration-documentaire-audiobook', 'Documentary & audiobook narration'),
  ('voix-ivr-repondeur', 'IVR & voicemail voice'),
  ('voix-off-publicite-ar', 'Arabic advertising voice-over'),
  ('voix-off-publicite-en', 'English advertising voice-over'),
  ('voix-off-publicite-fr', 'French advertising voice-over')
) as v(slug, name_en)
where c.slug = v.slug;

-- Rollback:
-- alter table public.categories drop column name_en;

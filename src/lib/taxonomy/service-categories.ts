/**
 * Servyou — Service taxonomy (SINGLE SOURCE OF TRUTH)
 * ====================================================
 * The data backbone consumed by: H6 (service create — cascading dropdowns + skill
 * combo), /marche/services (browse + category/skill filters), the search engine,
 * and every category/skill filter across the app. Import from here — do not
 * re-declare this data anywhere else.
 *
 * SCOPE: Servyou is DIGITAL / REMOTE services only. No in-person trades (no
 * plumbing, no local services). Every service is delivered online. In-person /
 * local trades are explicitly out of MVP scope (see docs/follow-ups.md).
 *
 * ── STABLE-SLUG CONTRACT ──────────────────────────────────────────────────────
 * Every `id` (sector AND subcategory) is a stable slug. These become URL params
 * (e.g. /marche/services?categorie=dev-web-mobile&sous=sites-web) AND DB values.
 * They MUST NEVER change casually — changing one is a MIGRATION, not an edit.
 * Slug derivation rule (applied to every id): deburr accents → lowercase →
 * non-alphanumeric runs to a single hyphen → trim hyphens.
 *   "Correction & relecture" → "correction-relecture"
 *   "Plan d'affaires"        → "plan-daffaires"
 *   "API & intégrations"     → "api-integrations"
 * Subcategory ids below are the CONCEPT, not the doc's full parenthetical example
 * text (e.g. "Site vitrine (WordPress, Webflow)" → `site-vitrine`, not a slug
 * carrying every tool name) — those examples stay in `labelFr` where a freelancer
 * reads them, but a slug that long is unusable as a `categories.slug` DB value.
 *
 * ── 2026-09-07 reconciliation (feat/taxonomy-13-sectors) ───────────────────────
 * Brought from 10 sectors to the 13 locked in docs/design/taxonomy-services.md:
 * added Community management, Voix off & doublage, Personal branding, Coaching
 * Meta Ads, Coaching e-commerce; retired `ia-automatisation` and `data-analyse`
 * (in no other list, no Figma frame). Every surviving sector's subcategory list
 * was replaced with the doc's content — not just the two spot-checked for a count
 * mismatch, several others (marketing-digital, design-graphique-logo, design-ui-ux,
 * redaction-contenu, traduction, montage-video-motion) had also drifted from the
 * doc in content, not only count.
 *
 * Sector `id`s were renamed to match the doc's naming exactly: `dev-web-mobile` →
 * `developpement-web-mobile`, `design-graphique` → `design-graphique-logo`,
 * `traduction-langues` → `traduction`, `video-animation` → `montage-video-motion`,
 * `conseil-assistance` → `consulting-assistanat`. Done now, before PR2 persists
 * real `category_id` values against these — nothing in `src/` imports this file
 * yet, so this is the last point a rename is a diff, not a migration.
 * `coaching-ecommerce` was NOT renamed to `coaching-e-commerce` even though the
 * doc's heading hyphenates "e-commerce" — that's a hyphenation variant, not a
 * naming mismatch like the five above, and wasn't on the approved list. Flagged
 * in the PR body; still free to change now if the founder wants it.
 *
 * Skills pools for the 8 continuing sectors are UNCHANGED — the doc has no skills
 * content, this pass didn't touch them. Skills pools for the 5 new sectors are a
 * first-pass starter list, not sourced from anywhere, and marked
 * FOUNDER-UNREVIEWED per-sector below — they feed H6's type-ahead, so a
 * freelancer sees them as-is; review when H6's picker is actually on screen
 * (H6 isn't built yet).
 *
 * Icons for the 5 new sectors (message-circle, mic, user-round, target,
 * shopping-cart) are founder-approved 2026-09-07, but founder-RULED rather than
 * measured against a Figma frame — the same status H5's own `CATEGORY_ICONS` map
 * carries (docs/follow-ups.md, "Service Row's category-specific thumb icon").
 *
 * Provenance: Coaching Meta Ads is the ONLY one of the 13 sectors whose
 * subcategory list also exists in Figma (specimen "H6 — Nouvelle taxonomie",
 * 653:53710) — it matched the doc exactly. The other 90 of the 91 subcategories
 * were reconciled against doc text alone; there is no competing Figma source for
 * them.
 *
 * ── 2026-10-23 (H6 PR-2, founder rulings) ─────────────────────────────────────
 * • Subcategory « Photographie & retouche produit » added under design-graphique-logo
 *   (migration 20261023212933) — 13 sectors · 92 subcategories.
 * • Every skill gained a stable `id` (same slug rule as above, applied to its labelFr
 *   ONCE — from here on the id is fixed and the labels may be reworded freely).
 *   168 entries → 148 distinct ids; a recurring skill carries one id everywhere.
 *
 * ── SKILLS ────────────────────────────────────────────────────────────────────
 * `skills` is the per-sector type-ahead pool: the combo suggests from the ACTIVE
 * sector's pool as the freelancer types, and allows add-your-own beyond the list.
 * `service_listings.tags` stores a pool skill as its `id` and an add-your-own skill
 * as typed; `getSkill` resolves an id against ALL pools (a freelancer may change
 * sector after picking skills), so anything it doesn't resolve is a custom skill.
 * Recurring skills (Python, Figma, Excel, réseaux sociaux, TikTok, français,
 * arabe, anglais, sous-titrage, …) are kept BYTE-IDENTICAL (FR + AR) across every
 * pool so one skill never becomes two.
 *
 * ── AR PARITY ─────────────────────────────────────────────────────────────────
 * Labels are FR + AR; the app renders per language toggle. Tool / brand / tech
 * names (React, Figma, SEO, Photoshop, …) keep the Latin term in AR — that's how
 * Tunisian professionals refer to them (don't force-translate). Lines marked
 * `REVIEW_AR_TRANSLATION` are judgment calls that need a human/native review —
 * every subcategory newly added or newly reworded in the 2026-09-07 pass above
 * carries this marker unless it reuses an AR phrase already established
 * elsewhere in this file.
 */

export interface TaxonomySkill {
  /** Stable slug — the value stored in `service_listings.tags`. Never change casually. A skill that
   *  recurs in several pools carries the SAME id (and the same labels) in each. */
  id: string;
  /** French label. */
  labelFr: string;
  /** Arabic label — Latin term kept for tool/brand names. */
  labelAr: string;
}

export interface TaxonomySubcategory {
  /** Stable slug — URL param + DB value. Never change casually. */
  id: string;
  labelFr: string;
  labelAr: string;
}

export interface ServiceSector {
  /** Stable slug — URL param + DB value. Never change casually. */
  id: string;
  labelFr: string;
  labelAr: string;
  /** lucide-react icon name (kebab-case). Verified against the installed version. */
  icon: string;
  subcategories: TaxonomySubcategory[];
  /** Type-ahead pool scoped to this sector (add-your-own allowed beyond it). */
  skills: TaxonomySkill[];
}

export const serviceCategories: ServiceSector[] = [
  {
    id: 'developpement-web-mobile',
    labelFr: 'Développement web & mobile',
    labelAr: 'تطوير الويب والموبايل', // REVIEW_AR_TRANSLATION: "الموبايل" (Tunisian usage) vs MSA "التطبيقات الجوّالة"
    icon: 'code',
    subcategories: [
      { id: 'site-vitrine', labelFr: 'Site vitrine (WordPress, Webflow)', labelAr: 'موقع تعريفي (WordPress, Webflow)' }, // REVIEW_AR_TRANSLATION
      { id: 'e-commerce', labelFr: 'E-commerce (Shopify, WooCommerce, PrestaShop)', labelAr: 'التجارة الإلكترونية (Shopify, WooCommerce, PrestaShop)' },
      { id: 'application-web-sur-mesure', labelFr: 'Application web sur mesure (React, Next.js, Laravel)', labelAr: 'تطبيق ويب مخصص (React, Next.js, Laravel)' }, // REVIEW_AR_TRANSLATION
      { id: 'application-mobile', labelFr: 'Application mobile (iOS, Android, Flutter, React Native)', labelAr: 'تطبيق موبايل (iOS, Android, Flutter, React Native)' }, // REVIEW_AR_TRANSLATION
      { id: 'landing-page-tunnel-de-vente', labelFr: 'Landing page & tunnel de vente', labelAr: 'صفحة هبوط وقمع مبيعات' }, // REVIEW_AR_TRANSLATION
      { id: 'integration-api-automatisation', labelFr: 'Intégration API & automatisation', labelAr: 'دمج API والأتمتة' }, // REVIEW_AR_TRANSLATION
      { id: 'correction-de-bug-maintenance', labelFr: 'Correction de bug & maintenance', labelAr: 'إصلاح الأخطاء والصيانة' }, // REVIEW_AR_TRANSLATION
    ],
    skills: [
      { id: 'react', labelFr: 'React', labelAr: 'React' },
      { id: 'next-js', labelFr: 'Next.js', labelAr: 'Next.js' },
      { id: 'vue', labelFr: 'Vue', labelAr: 'Vue' },
      { id: 'node-js', labelFr: 'Node.js', labelAr: 'Node.js' },
      { id: 'php', labelFr: 'PHP', labelAr: 'PHP' },
      { id: 'laravel', labelFr: 'Laravel', labelAr: 'Laravel' },
      { id: 'wordpress', labelFr: 'WordPress', labelAr: 'WordPress' },
      { id: 'flutter', labelFr: 'Flutter', labelAr: 'Flutter' },
      { id: 'react-native', labelFr: 'React Native', labelAr: 'React Native' },
      { id: 'typescript', labelFr: 'TypeScript', labelAr: 'TypeScript' },
      { id: 'python', labelFr: 'Python', labelAr: 'Python' },
      { id: 'html-css', labelFr: 'HTML/CSS', labelAr: 'HTML/CSS' },
      { id: 'tailwind', labelFr: 'Tailwind', labelAr: 'Tailwind' },
      { id: 'supabase', labelFr: 'Supabase', labelAr: 'Supabase' },
      { id: 'firebase', labelFr: 'Firebase', labelAr: 'Firebase' },
      { id: 'mysql', labelFr: 'MySQL', labelAr: 'MySQL' },
      { id: 'rest-api', labelFr: 'REST API', labelAr: 'REST API' },
      { id: 'shopify', labelFr: 'Shopify', labelAr: 'Shopify' },
      { id: 'woocommerce', labelFr: 'WooCommerce', labelAr: 'WooCommerce' },
      { id: 'git', labelFr: 'Git', labelAr: 'Git' },
    ],
  },
  {
    id: 'design-graphique-logo',
    labelFr: 'Design graphique & logo',
    labelAr: 'التصميم الغرافيكي والشعارات', // REVIEW_AR_TRANSLATION: extended from existing "التصميم الغرافيكي" to cover "& logo"
    icon: 'palette',
    subcategories: [
      { id: 'logo-identite-visuelle', labelFr: 'Logo & identité visuelle', labelAr: 'الشعار والهوية البصرية' },
      { id: 'flyer-affiche-print', labelFr: 'Flyer, affiche & print', labelAr: 'منشورات وملصقات وطباعة' }, // REVIEW_AR_TRANSLATION
      { id: 'cartes-de-visite-papeterie', labelFr: 'Cartes de visite & papeterie', labelAr: 'بطاقات العمل والقرطاسية' }, // REVIEW_AR_TRANSLATION
      { id: 'packaging-etiquette-produit', labelFr: 'Packaging & étiquette produit', labelAr: 'التغليف وملصقات المنتج' }, // REVIEW_AR_TRANSLATION: étiquette=ملصق overlaps affiche=ملصق
      { id: 'menu-restaurant-signaletique', labelFr: 'Menu restaurant & signalétique', labelAr: 'قوائم المطاعم واللافتات' }, // REVIEW_AR_TRANSLATION
      { id: 'bannieres-reseaux-sociaux', labelFr: 'Bannières réseaux sociaux', labelAr: 'بانرات وسائل التواصل الاجتماعي' }, // REVIEW_AR_TRANSLATION
      { id: 'pitch-deck-presentation', labelFr: 'Pitch deck & présentation', labelAr: 'عرض تقديمي (Pitch Deck)' }, // REVIEW_AR_TRANSLATION
      { id: 'illustration-sur-mesure', labelFr: 'Illustration sur mesure', labelAr: 'الرسم التوضيحي المخصص' }, // REVIEW_AR_TRANSLATION
      // Founder ruling 2026-10-23 (H6 PR-2): product photography lives here, not in a 14th sector.
      { id: 'photographie-retouche-produit', labelFr: 'Photographie & retouche produit', labelAr: 'تصوير المنتجات وتعديل الصور' }, // REVIEW_AR_TRANSLATION
    ],
    skills: [
      { id: 'photoshop', labelFr: 'Photoshop', labelAr: 'Photoshop' },
      { id: 'illustrator', labelFr: 'Illustrator', labelAr: 'Illustrator' },
      { id: 'indesign', labelFr: 'InDesign', labelAr: 'InDesign' },
      { id: 'logo', labelFr: 'logo', labelAr: 'شعار' },
      { id: 'identite-de-marque', labelFr: 'identité de marque', labelAr: 'هوية العلامة التجارية' },
      { id: 'charte-graphique', labelFr: 'charte graphique', labelAr: 'دليل الهوية البصرية' },
      { id: 'typographie', labelFr: 'typographie', labelAr: 'التيبوغرافيا' }, // REVIEW_AR_TRANSLATION: loanword vs "فن الطباعة"
      { id: 'retouche', labelFr: 'retouche', labelAr: 'تعديل الصور' },
      { id: 'vectorisation', labelFr: 'vectorisation', labelAr: 'الرسم المتّجه' }, // REVIEW_AR_TRANSLATION
      { id: 'print', labelFr: 'print', labelAr: 'الطباعة' },
      { id: 'flyer', labelFr: 'flyer', labelAr: 'منشور' },
      { id: 'packaging', labelFr: 'packaging', labelAr: 'التغليف' },
      { id: 'illustration', labelFr: 'illustration', labelAr: 'الرسم التوضيحي' },
      { id: 'canva', labelFr: 'Canva', labelAr: 'Canva' },
      { id: 'figma', labelFr: 'Figma', labelAr: 'Figma' },
    ],
  },
  {
    id: 'design-ui-ux',
    labelFr: 'Design UI/UX',
    labelAr: 'تصميم UI/UX', // reused verbatim from landing.categories.items.uiux (ar.ts)
    icon: 'layout-template',
    subcategories: [
      { id: 'maquette-site-web', labelFr: 'Maquette site web (Figma)', labelAr: 'نموذج موقع ويب (Figma)' },
      { id: 'maquette-application-mobile', labelFr: 'Maquette application mobile', labelAr: 'نموذج تطبيق موبايل' },
      { id: 'wireframe-prototype-interactif', labelFr: 'Wireframe & prototype interactif', labelAr: 'مخطط هيكلي ونموذج أولي تفاعلي' }, // REVIEW_AR_TRANSLATION
      { id: 'audit-ux-recommandations', labelFr: 'Audit UX & recommandations', labelAr: 'تدقيق تجربة المستخدم وتوصيات' }, // REVIEW_AR_TRANSLATION
      { id: 'design-system-composants', labelFr: 'Design system & composants', labelAr: 'نظام التصميم والمكوّنات' }, // REVIEW_AR_TRANSLATION
      { id: 'refonte-dinterface-existante', labelFr: "Refonte d'interface existante", labelAr: 'إعادة تصميم واجهة قائمة' }, // REVIEW_AR_TRANSLATION
    ],
    skills: [
      { id: 'figma', labelFr: 'Figma', labelAr: 'Figma' },
      { id: 'adobe-xd', labelFr: 'Adobe XD', labelAr: 'Adobe XD' },
      { id: 'sketch', labelFr: 'Sketch', labelAr: 'Sketch' },
      { id: 'wireframe', labelFr: 'wireframe', labelAr: 'مخطط هيكلي' }, // REVIEW_AR_TRANSLATION
      { id: 'prototype', labelFr: 'prototype', labelAr: 'نموذج أولي' },
      { id: 'maquette', labelFr: 'maquette', labelAr: 'نموذج تصميم' },
      { id: 'ui', labelFr: 'UI', labelAr: 'UI' },
      { id: 'ux', labelFr: 'UX', labelAr: 'UX' },
      { id: 'design-system', labelFr: 'design system', labelAr: 'نظام التصميم' },
      { id: 'responsive', labelFr: 'responsive', labelAr: 'تصميم متجاوب' },
      { id: 'parcours-utilisateur', labelFr: 'parcours utilisateur', labelAr: 'رحلة المستخدم' },
      { id: 'accessibilite', labelFr: 'accessibilité', labelAr: 'إمكانية الوصول' },
      { id: 'framer', labelFr: 'Framer', labelAr: 'Framer' },
    ],
  },
  {
    id: 'marketing-digital',
    labelFr: 'Marketing digital',
    labelAr: 'التسويق الرقمي', // landing uses coarser "التسويق ووسائل التواصل" for its category
    icon: 'megaphone',
    subcategories: [
      // "Community management" moved OUT to its own sector below, per the doc — no longer a
      // marketing-digital subcategory. The skill pool below keeps the term; a freelancer can
      // still tag it here even though it no longer picks this sector as its parent.
      { id: 'strategie-marketing-digital', labelFr: 'Stratégie marketing digital', labelAr: 'استراتيجية التسويق الرقمي' },
      { id: 'referencement-seo', labelFr: 'Référencement SEO', labelAr: 'تحسين محركات البحث (SEO)' },
      { id: 'google-ads', labelFr: 'Google Ads (Search, Shopping, YouTube)', labelAr: 'إعلانات جوجل (Search, Shopping, YouTube)' },
      { id: 'linkedin-ads-tiktok-ads', labelFr: 'LinkedIn Ads & TikTok Ads', labelAr: 'إعلانات LinkedIn وTikTok' },
      { id: 'email-marketing-newsletter', labelFr: 'Email marketing & newsletter', labelAr: 'التسويق عبر البريد الإلكتروني والنشرات' }, // REVIEW_AR_TRANSLATION
      { id: 'automatisation', labelFr: 'Automatisation (Zapier, Make, HubSpot)', labelAr: 'الأتمتة (Zapier, Make, HubSpot)' },
      { id: 'audit-analytics', labelFr: 'Audit & analytics (GA4, Meta Pixel)', labelAr: 'تدقيق وتحليلات (GA4, Meta Pixel)' }, // REVIEW_AR_TRANSLATION
    ],
    skills: [
      { id: 'seo', labelFr: 'SEO', labelAr: 'SEO' },
      { id: 'google-ads', labelFr: 'Google Ads', labelAr: 'Google Ads' },
      { id: 'facebook-ads', labelFr: 'Facebook Ads', labelAr: 'Facebook Ads' },
      { id: 'instagram', labelFr: 'Instagram', labelAr: 'Instagram' },
      { id: 'community-management', labelFr: 'community management', labelAr: 'إدارة المجتمعات' }, // REVIEW_AR_TRANSLATION
      { id: 'content-strategy', labelFr: 'content strategy', labelAr: 'استراتيجية المحتوى' },
      { id: 'google-analytics', labelFr: 'Google Analytics', labelAr: 'Google Analytics' },
      { id: 'meta-business', labelFr: 'Meta Business', labelAr: 'Meta Business' },
      { id: 'emailing', labelFr: 'emailing', labelAr: 'التسويق عبر البريد الإلكتروني' },
      { id: 'mailchimp', labelFr: 'Mailchimp', labelAr: 'Mailchimp' },
      { id: 'referencement', labelFr: 'référencement', labelAr: 'تحسين محركات البحث' }, // REVIEW_AR_TRANSLATION: référencement≈SEO
      { id: 'reseaux-sociaux', labelFr: 'réseaux sociaux', labelAr: 'وسائل التواصل الاجتماعي' },
      { id: 'tiktok', labelFr: 'TikTok', labelAr: 'TikTok' },
      { id: 'linkedin', labelFr: 'LinkedIn', labelAr: 'LinkedIn' },
      { id: 'copywriting-publicitaire', labelFr: 'copywriting publicitaire', labelAr: 'الكتابة الإعلانية' }, // REVIEW_AR_TRANSLATION: same AR as redaction-contenu's `copywriting` — two skills, one AR label
    ],
  },
  {
    // NEW sector, 2026-09-07 reconciliation. Was previously a marketing-digital subcategory;
    // the doc promotes it to a full sector with its own 7 subcategories. Icon founder-approved
    // 2026-09-07; skills pool is FOUNDER-UNREVIEWED — see flags below.
    id: 'community-management',
    labelFr: 'Community management',
    labelAr: 'إدارة المجتمعات', // reused verbatim from the existing marketing-digital skill entry
    icon: 'message-circle', // FOUNDER-RULED, not measured — approved 2026-09-07, same status as H5's CATEGORY_ICONS map
    subcategories: [
      { id: 'gestion-instagram-facebook', labelFr: 'Gestion Instagram & Facebook', labelAr: 'إدارة Instagram وFacebook' },
      { id: 'gestion-tiktok-youtube-shorts', labelFr: 'Gestion TikTok & YouTube Shorts', labelAr: 'إدارة TikTok وYouTube Shorts' },
      { id: 'gestion-linkedin-professionnel', labelFr: 'Gestion LinkedIn professionnel', labelAr: 'إدارة LinkedIn الاحترافي' }, // REVIEW_AR_TRANSLATION
      { id: 'creation-de-contenu', labelFr: 'Création de contenu (posts, reels, stories)', labelAr: 'إنشاء المحتوى (منشورات، ريلز، ستوري)' }, // REVIEW_AR_TRANSLATION
      { id: 'calendrier-editorial-planification', labelFr: 'Calendrier éditorial & planification', labelAr: 'التقويم التحريري والتخطيط' }, // REVIEW_AR_TRANSLATION
      { id: 'moderation-reponse-aux-commentaires', labelFr: 'Modération & réponse aux commentaires', labelAr: 'الإشراف والرد على التعليقات' }, // REVIEW_AR_TRANSLATION
      { id: 'influence-partenariats', labelFr: 'Influence & partenariats', labelAr: 'التأثير والشراكات' }, // REVIEW_AR_TRANSLATION
    ],
    skills: [
      // FOUNDER-UNREVIEWED — starter list, not sourced from a measured frame or prior art. Feeds
      // H6's type-ahead, so a freelancer sees it as-is — review when H6's picker ships.
      { id: 'instagram', labelFr: 'Instagram', labelAr: 'Instagram' },
      { id: 'facebook', labelFr: 'Facebook', labelAr: 'Facebook' },
      { id: 'tiktok', labelFr: 'TikTok', labelAr: 'TikTok' },
      { id: 'youtube-shorts', labelFr: 'YouTube Shorts', labelAr: 'YouTube Shorts' },
      { id: 'linkedin', labelFr: 'LinkedIn', labelAr: 'LinkedIn' },
      { id: 'meta-business-suite', labelFr: 'Meta Business Suite', labelAr: 'Meta Business Suite' },
      { id: 'canva', labelFr: 'Canva', labelAr: 'Canva' },
      { id: 'calendrier-editorial', labelFr: 'calendrier éditorial', labelAr: 'التقويم التحريري' }, // REVIEW_AR_TRANSLATION
      { id: 'community-management', labelFr: 'community management', labelAr: 'إدارة المجتمعات' },
      { id: 'moderation', labelFr: 'modération', labelAr: 'الإشراف' }, // REVIEW_AR_TRANSLATION
      { id: 'reels', labelFr: 'Reels', labelAr: 'Reels' },
      { id: 'stories', labelFr: 'Stories', labelAr: 'Stories' },
      { id: 'influenceurs', labelFr: 'influenceurs', labelAr: 'المؤثرون' },
      { id: 'later', labelFr: 'Later', labelAr: 'Later' },
      { id: 'hootsuite', labelFr: 'Hootsuite', labelAr: 'Hootsuite' },
    ],
  },
  {
    id: 'redaction-contenu',
    labelFr: 'Rédaction & contenu',
    labelAr: 'الكتابة والمحتوى',
    icon: 'pen-line',
    subcategories: [
      { id: 'article-de-blog-seo', labelFr: 'Article de blog (SEO)', labelAr: 'مقال مدونة (SEO)' },
      { id: 'fiche-produit-e-commerce', labelFr: 'Fiche produit e-commerce', labelAr: 'وصف منتج للتجارة الإلكترونية' }, // REVIEW_AR_TRANSLATION
      { id: 'copywriting', labelFr: 'Copywriting (page de vente, tunnel)', labelAr: 'الكتابة الإعلانية (صفحة مبيعات، قمع تحويل)' }, // REVIEW_AR_TRANSLATION
      { id: 'script-video-podcast', labelFr: 'Script vidéo & podcast', labelAr: 'نص فيديو وبودكاست' }, // REVIEW_AR_TRANSLATION
      { id: 'redaction-linkedin-posts-sociaux', labelFr: 'Rédaction LinkedIn & posts sociaux', labelAr: 'كتابة LinkedIn ومنشورات اجتماعية' }, // REVIEW_AR_TRANSLATION
      { id: 'livre-blanc-guide', labelFr: 'Livre blanc & guide', labelAr: 'كتاب أبيض ودليل إرشادي' }, // REVIEW_AR_TRANSLATION
      { id: 'correction-relecture', labelFr: 'Correction & relecture', labelAr: 'التصحيح والمراجعة' },
    ],
    skills: [
      { id: 'redaction-web', labelFr: 'rédaction web', labelAr: 'الكتابة للويب' },
      { id: 'copywriting', labelFr: 'copywriting', labelAr: 'الكتابة الإعلانية' }, // REVIEW_AR_TRANSLATION: same AR as marketing-digital's `copywriting-publicitaire`
      { id: 'seo-writing', labelFr: 'SEO writing', labelAr: 'الكتابة المحسّنة لمحركات البحث' }, // REVIEW_AR_TRANSLATION
      { id: 'article', labelFr: 'article', labelAr: 'مقال' },
      { id: 'blog', labelFr: 'blog', labelAr: 'مدوّنة' },
      { id: 'storytelling', labelFr: 'storytelling', labelAr: 'السرد القصصي' },
      { id: 'correction', labelFr: 'correction', labelAr: 'التصحيح' },
      { id: 'relecture', labelFr: 'relecture', labelAr: 'المراجعة' },
      { id: 'ghostwriting', labelFr: 'ghostwriting', labelAr: 'الكتابة بأسماء الآخرين' }, // REVIEW_AR_TRANSLATION: term often kept "ghostwriting"
      { id: 'content', labelFr: 'content', labelAr: 'المحتوى' },
      { id: 'script', labelFr: 'script', labelAr: 'النص' },
      { id: 'francais', labelFr: 'français', labelAr: 'الفرنسية' },
      { id: 'arabe', labelFr: 'arabe', labelAr: 'العربية' },
      { id: 'anglais', labelFr: 'anglais', labelAr: 'الإنجليزية' },
    ],
  },
  {
    id: 'traduction',
    labelFr: 'Traduction',
    labelAr: 'الترجمة', // simplified from "الترجمة واللغات" to match the doc's plain "Traduction"
    icon: 'languages',
    subcategories: [
      { id: 'traduction-fr-ar', labelFr: 'FR ↔ AR', labelAr: 'فرنسي ↔ عربي' },
      { id: 'traduction-fr-en', labelFr: 'FR ↔ EN', labelAr: 'فرنسي ↔ إنجليزي' },
      { id: 'traduction-ar-en', labelFr: 'AR ↔ EN', labelAr: 'عربي ↔ إنجليزي' },
      { id: 'traduction-technique', labelFr: 'Traduction technique (IT, juridique, médical)', labelAr: 'ترجمة تقنية (معلوماتية، قانونية، طبية)' }, // REVIEW_AR_TRANSLATION
      { id: 'traduction-administrative', labelFr: 'Traduction administrative', labelAr: 'ترجمة إدارية' },
      { id: 'sous-titrage-video', labelFr: 'Sous-titrage vidéo', labelAr: 'سترجة الفيديو' }, // REVIEW_AR_TRANSLATION: loanword; vs "الترجمة النصية"
      { id: 'transcription-audio', labelFr: 'Transcription audio', labelAr: 'النسخ الصوتي' },
    ],
    skills: [
      { id: 'traduction', labelFr: 'traduction', labelAr: 'الترجمة' },
      { id: 'francais', labelFr: 'français', labelAr: 'الفرنسية' },
      { id: 'arabe', labelFr: 'arabe', labelAr: 'العربية' },
      { id: 'anglais', labelFr: 'anglais', labelAr: 'الإنجليزية' },
      { id: 'localisation', labelFr: 'localisation', labelAr: 'التوطين' }, // REVIEW_AR_TRANSLATION
      { id: 'transcription', labelFr: 'transcription', labelAr: 'النسخ الصوتي' },
      { id: 'sous-titrage', labelFr: 'sous-titrage', labelAr: 'السترجة' }, // REVIEW_AR_TRANSLATION
      { id: 'relecture-bilingue', labelFr: 'relecture bilingue', labelAr: 'المراجعة ثنائية اللغة' },
      { id: 'interpretation', labelFr: 'interprétation', labelAr: 'الترجمة الفورية' },
      { id: 'mtpe', labelFr: 'MTPE', labelAr: 'MTPE' },
      { id: 'terminologie', labelFr: 'terminologie', labelAr: 'المصطلحات' },
    ],
  },
  {
    id: 'montage-video-motion',
    labelFr: 'Montage vidéo & motion',
    labelAr: 'مونتاج الفيديو والموشن', // REVIEW_AR_TRANSLATION: reworded from "الفيديو والرسوم المتحركة" to track the doc's narrower "Montage vidéo & motion"
    icon: 'clapperboard',
    subcategories: [
      { id: 'montage-video', labelFr: 'Montage vidéo (YouTube, TikTok, Reels)', labelAr: 'مونتاج الفيديو (YouTube, TikTok, Reels)' },
      { id: 'motion-graphics-animation-2d', labelFr: 'Motion graphics & animation 2D', labelAr: 'موشن غرافيك ورسوم متحركة 2D' }, // REVIEW_AR_TRANSLATION
      { id: 'explainer-video-tutoriel', labelFr: 'Explainer video & tutoriel', labelAr: 'فيديو تعريفي وتعليمي' }, // REVIEW_AR_TRANSLATION
      { id: 'animation-logo-intro', labelFr: 'Animation logo & intro', labelAr: 'تحريك الشعار والمقدمة' }, // REVIEW_AR_TRANSLATION
      { id: 'video-publicitaire-ads', labelFr: 'Vidéo publicitaire (ads)', labelAr: 'فيديو إعلاني (Ads)' },
      { id: 'etalonnage-colorimetrique', labelFr: 'Étalonnage colorimétrique', labelAr: 'تصحيح الألوان' }, // REVIEW_AR_TRANSLATION
      { id: 'sound-design', labelFr: 'Sound design', labelAr: 'تصميم صوتي' }, // REVIEW_AR_TRANSLATION
    ],
    skills: [
      { id: 'premiere-pro', labelFr: 'Premiere Pro', labelAr: 'Premiere Pro' },
      { id: 'after-effects', labelFr: 'After Effects', labelAr: 'After Effects' },
      { id: 'davinci-resolve', labelFr: 'DaVinci Resolve', labelAr: 'DaVinci Resolve' },
      { id: 'final-cut', labelFr: 'Final Cut', labelAr: 'Final Cut' },
      { id: 'montage', labelFr: 'montage', labelAr: 'المونتاج' }, // REVIEW_AR_TRANSLATION
      { id: 'motion-design', labelFr: 'motion design', labelAr: 'تصميم الحركة' }, // REVIEW_AR_TRANSLATION
      { id: 'animation-2d', labelFr: 'animation 2D', labelAr: 'الرسوم المتحركة 2D' },
      { id: 'animation-3d', labelFr: 'animation 3D', labelAr: 'الرسوم المتحركة 3D' },
      { id: 'sous-titrage', labelFr: 'sous-titrage', labelAr: 'السترجة' }, // REVIEW_AR_TRANSLATION (byte-identical with traduction pool)
      { id: 'color-grading', labelFr: 'color grading', labelAr: 'تدريج الألوان' },
      { id: 'blender', labelFr: 'Blender', labelAr: 'Blender' },
      { id: 'reseaux-sociaux', labelFr: 'réseaux sociaux', labelAr: 'وسائل التواصل الاجتماعي' },
      { id: 'reels', labelFr: 'Reels', labelAr: 'Reels' },
      { id: 'tiktok', labelFr: 'TikTok', labelAr: 'TikTok' },
    ],
  },
  {
    // NEW sector, 2026-09-07 reconciliation. Icon founder-approved 2026-09-07; skills pool is
    // FOUNDER-UNREVIEWED — see flags below.
    id: 'voix-off-doublage',
    labelFr: 'Voix off & doublage',
    labelAr: 'التعليق الصوتي والدبلجة', // REVIEW_AR_TRANSLATION
    icon: 'mic', // FOUNDER-RULED, not measured — approved 2026-09-07, same status as H5's CATEGORY_ICONS map
    subcategories: [
      { id: 'voix-off-publicite-fr', labelFr: 'Voix off publicité FR', labelAr: 'تعليق صوتي إعلاني بالفرنسية' }, // REVIEW_AR_TRANSLATION
      { id: 'voix-off-publicite-ar', labelFr: 'Voix off publicité AR', labelAr: 'تعليق صوتي إعلاني بالعربية' }, // REVIEW_AR_TRANSLATION
      { id: 'voix-off-publicite-en', labelFr: 'Voix off publicité EN', labelAr: 'تعليق صوتي إعلاني بالإنجليزية' }, // REVIEW_AR_TRANSLATION
      { id: 'doublage-mena', labelFr: 'Doublage MENA (dialectes)', labelAr: 'دبلجة بلهجات الشرق الأوسط وشمال أفريقيا' }, // REVIEW_AR_TRANSLATION
      { id: 'narration-documentaire-audiobook', labelFr: 'Narration documentaire & audiobook', labelAr: 'سرد وثائقي وكتاب صوتي' }, // REVIEW_AR_TRANSLATION
      { id: 'voix-ivr-repondeur', labelFr: 'Voix IVR & répondeur téléphonique', labelAr: 'صوت IVR ورد آلي هاتفي' }, // REVIEW_AR_TRANSLATION
      { id: 'chant-jingle-publicitaire', labelFr: 'Chant & jingle publicitaire', labelAr: 'غناء وجينغل إعلاني' }, // REVIEW_AR_TRANSLATION
    ],
    skills: [
      // FOUNDER-UNREVIEWED — starter list, not sourced from a measured frame or prior art. Feeds
      // H6's type-ahead, so a freelancer sees it as-is — review when H6's picker ships.
      { id: 'voix-off', labelFr: 'voix off', labelAr: 'تعليق صوتي' }, // REVIEW_AR_TRANSLATION
      { id: 'doublage', labelFr: 'doublage', labelAr: 'الدبلجة' },
      { id: 'narration', labelFr: 'narration', labelAr: 'السرد' }, // REVIEW_AR_TRANSLATION
      { id: 'audiobook', labelFr: 'audiobook', labelAr: 'كتاب صوتي' },
      { id: 'jingle', labelFr: 'jingle', labelAr: 'جينغل' },
      { id: 'ivr', labelFr: 'IVR', labelAr: 'IVR' },
      { id: 'dialecte-tunisien', labelFr: 'dialecte tunisien', labelAr: 'اللهجة التونسية' },
      { id: 'home-studio', labelFr: 'home studio', labelAr: 'استوديو منزلي' }, // REVIEW_AR_TRANSLATION
      { id: 'adobe-audition', labelFr: 'Adobe Audition', labelAr: 'Adobe Audition' },
      { id: 'montage-audio', labelFr: 'montage audio', labelAr: 'مونتاج صوتي' }, // REVIEW_AR_TRANSLATION
    ],
  },
  {
    id: 'consulting-assistanat',
    labelFr: 'Consulting & assistanat',
    labelAr: 'الاستشارة والمساعدة', // "استشارة" established in ar.ts
    icon: 'briefcase',
    subcategories: [
      { id: 'business-plan-etude-de-marche', labelFr: 'Business plan & étude de marché', labelAr: 'خطة العمل ودراسة السوق' },
      { id: 'dossier-bancaire-financement', labelFr: 'Dossier bancaire & financement (ANETI, BFPME)', labelAr: 'ملف بنكي وتمويل (ANETI, BFPME)' }, // REVIEW_AR_TRANSLATION
      { id: 'assistance-administrative-a-distance', labelFr: 'Assistance administrative à distance', labelAr: 'مساعدة إدارية عن بعد' }, // REVIEW_AR_TRANSLATION
      { id: 'saisie-mise-en-forme-documents', labelFr: 'Saisie & mise en forme documents', labelAr: 'إدخال وتنسيق الوثائق' }, // REVIEW_AR_TRANSLATION
      { id: 'comptabilite-a-distance', labelFr: 'Comptabilité à distance (déclarations, TVA)', labelAr: 'محاسبة عن بعد (تصريحات، ضريبة القيمة المضافة)' }, // REVIEW_AR_TRANSLATION
      { id: 'recherche-veille-concurrentielle', labelFr: 'Recherche & veille concurrentielle', labelAr: 'البحث ورصد المنافسين' }, // REVIEW_AR_TRANSLATION
      { id: 'cv-lettre-de-motivation', labelFr: 'CV & lettre de motivation', labelAr: 'السيرة الذاتية ورسالة تحفيزية' }, // REVIEW_AR_TRANSLATION
    ],
    skills: [
      { id: 'business-plan', labelFr: 'business plan', labelAr: 'خطة العمل' },
      { id: 'etude-de-marche', labelFr: 'étude de marché', labelAr: 'دراسة السوق' },
      { id: 'assistance-virtuelle', labelFr: 'assistance virtuelle', labelAr: 'المساعدة الافتراضية' },
      { id: 'comptabilite', labelFr: 'comptabilité', labelAr: 'المحاسبة' },
      { id: 'gestion-de-projet', labelFr: 'gestion de projet', labelAr: 'إدارة المشاريع' },
      { id: 'excel', labelFr: 'Excel', labelAr: 'Excel' },
      { id: 'presentation', labelFr: 'présentation', labelAr: 'العروض التقديمية' },
      { id: 'powerpoint', labelFr: 'PowerPoint', labelAr: 'PowerPoint' },
      { id: 'conseil', labelFr: 'conseil', labelAr: 'الاستشارة' },
      { id: 'strategie', labelFr: 'stratégie', labelAr: 'الاستراتيجية' },
      { id: 'administratif', labelFr: 'administratif', labelAr: 'الأعمال الإدارية' },
      { id: 'crm', labelFr: 'CRM', labelAr: 'CRM' },
      { id: 'notion', labelFr: 'Notion', labelAr: 'Notion' },
    ],
  },
  {
    // NEW sector, 2026-09-07 reconciliation. Icon founder-approved 2026-09-07; skills pool is
    // FOUNDER-UNREVIEWED — see flags below.
    id: 'personal-branding',
    labelFr: 'Personal branding',
    labelAr: 'العلامة الشخصية', // REVIEW_AR_TRANSLATION
    icon: 'user-round', // FOUNDER-RULED, not measured — approved 2026-09-07, same status as H5's CATEGORY_ICONS map
    subcategories: [
      { id: 'strategie-positionnement-marque-personnelle', labelFr: 'Stratégie & positionnement marque personnelle', labelAr: 'استراتيجية وتموضع العلامة الشخصية' }, // REVIEW_AR_TRANSLATION
      { id: 'optimisation-profil-linkedin', labelFr: 'Optimisation profil LinkedIn', labelAr: 'تحسين ملف LinkedIn الشخصي' }, // REVIEW_AR_TRANSLATION
      { id: 'ligne-editoriale-personnelle', labelFr: 'Ligne éditoriale personnelle', labelAr: 'الخط التحريري الشخصي' }, // REVIEW_AR_TRANSLATION
      { id: 'bio-storytelling-professionnel', labelFr: 'Bio & storytelling professionnel', labelAr: 'السيرة والسرد القصصي المهني' }, // REVIEW_AR_TRANSLATION
      { id: 'photo-de-profil', labelFr: 'Photo de profil (retouche & optimisation)', labelAr: 'صورة الملف الشخصي (تعديل وتحسين)' },
      { id: 'coaching-prise-de-parole-video', labelFr: 'Coaching prise de parole vidéo', labelAr: 'تدريب على التحدث أمام الكاميرا' }, // REVIEW_AR_TRANSLATION
    ],
    skills: [
      // FOUNDER-UNREVIEWED — starter list, not sourced from a measured frame or prior art. Feeds
      // H6's type-ahead, so a freelancer sees it as-is — review when H6's picker ships.
      { id: 'linkedin', labelFr: 'LinkedIn', labelAr: 'LinkedIn' },
      { id: 'personal-branding', labelFr: 'personal branding', labelAr: 'العلامة الشخصية' }, // REVIEW_AR_TRANSLATION
      { id: 'storytelling', labelFr: 'storytelling', labelAr: 'السرد القصصي' },
      { id: 'bio-professionnelle', labelFr: 'bio professionnelle', labelAr: 'السيرة المهنية' }, // REVIEW_AR_TRANSLATION
      { id: 'photo-de-profil', labelFr: 'photo de profil', labelAr: 'صورة الملف الشخصي' },
      { id: 'prise-de-parole', labelFr: 'prise de parole', labelAr: 'التحدث أمام الجمهور' }, // REVIEW_AR_TRANSLATION
      { id: 'coaching-video', labelFr: 'coaching vidéo', labelAr: 'تدريب فيديو' }, // REVIEW_AR_TRANSLATION
      { id: 'positionnement-de-marque', labelFr: 'positionnement de marque', labelAr: 'تموضع العلامة' }, // REVIEW_AR_TRANSLATION
    ],
  },
  {
    // NEW sector, 2026-09-07 reconciliation. Subcategories DOM-verified against the Figma
    // specimen "H6 — Nouvelle taxonomie" (653:53710) — exact match, 7 items, same wording as
    // the doc. This is the ONLY one of the 5 new sectors whose subcategory list also exists in
    // Figma; every other sector was reconciled against doc text alone (see file header). Icon
    // founder-approved 2026-09-07; skills pool is FOUNDER-UNREVIEWED — see flags below.
    id: 'coaching-meta-ads',
    labelFr: 'Coaching Meta Ads',
    labelAr: 'تدريب على إعلانات Meta', // REVIEW_AR_TRANSLATION
    icon: 'target', // FOUNDER-RULED, not measured — approved 2026-09-07, same status as H5's CATEGORY_ICONS map
    subcategories: [
      { id: 'initiation-meta-ads-debutant', labelFr: 'Initiation Meta Ads (débutant)', labelAr: 'مبادئ إعلانات Meta (مبتدئ)' }, // REVIEW_AR_TRANSLATION
      { id: 'meta-ads-avance', labelFr: 'Meta Ads avancé (scaling & optimisation)', labelAr: 'إعلانات Meta متقدم (توسيع وتحسين)' }, // REVIEW_AR_TRANSLATION
      { id: 'configuration-business-manager', labelFr: 'Configuration Business Manager', labelAr: 'إعداد Business Manager' },
      { id: 'pixel-api-conversions', labelFr: 'Pixel & API Conversions', labelAr: 'Pixel وAPI التحويلات' },
      { id: 'formation-dropshipping-avec-meta', labelFr: 'Formation dropshipping avec Meta', labelAr: 'تدريب على الدروبشيبينغ عبر Meta' }, // REVIEW_AR_TRANSLATION
      { id: 'audit-compte-meta-ads-existant', labelFr: 'Audit compte Meta Ads existant', labelAr: 'تدقيق حساب Meta Ads قائم' }, // REVIEW_AR_TRANSLATION
      { id: 'coaching-campagne-en-cours-live', labelFr: 'Coaching campagne en cours (live)', labelAr: 'تدريب مباشر على حملة جارية' }, // REVIEW_AR_TRANSLATION
    ],
    skills: [
      // FOUNDER-UNREVIEWED — starter list, not sourced from a measured frame or prior art. Feeds
      // H6's type-ahead, so a freelancer sees it as-is — review when H6's picker ships.
      { id: 'meta-ads', labelFr: 'Meta Ads', labelAr: 'Meta Ads' },
      { id: 'facebook-ads', labelFr: 'Facebook Ads', labelAr: 'Facebook Ads' },
      { id: 'instagram-ads', labelFr: 'Instagram Ads', labelAr: 'Instagram Ads' },
      { id: 'business-manager', labelFr: 'Business Manager', labelAr: 'Business Manager' },
      { id: 'pixel', labelFr: 'Pixel', labelAr: 'Pixel' },
      { id: 'conversions-api', labelFr: 'Conversions API', labelAr: 'Conversions API' },
      { id: 'dropshipping', labelFr: 'dropshipping', labelAr: 'الدروبشيبينغ' },
      { id: 'scaling', labelFr: 'scaling', labelAr: 'التوسيع' }, // REVIEW_AR_TRANSLATION
      { id: 'retargeting', labelFr: 'retargeting', labelAr: 'إعادة الاستهداف' }, // REVIEW_AR_TRANSLATION
      { id: 'audience-lookalike', labelFr: 'audience lookalike', labelAr: 'جمهور مشابه' }, // REVIEW_AR_TRANSLATION
    ],
  },
  {
    // NEW sector, 2026-09-07 reconciliation. Icon founder-approved 2026-09-07; skills pool is
    // FOUNDER-UNREVIEWED — see flags below.
    id: 'coaching-ecommerce',
    labelFr: 'Coaching e-commerce',
    labelAr: 'تدريب على التجارة الإلكترونية', // REVIEW_AR_TRANSLATION
    icon: 'shopping-cart', // FOUNDER-RULED, not measured — approved 2026-09-07, same status as H5's CATEGORY_ICONS map
    subcategories: [
      { id: 'initiation-shopify-debutant', labelFr: 'Initiation Shopify (débutant)', labelAr: 'مبادئ Shopify (مبتدئ)' },
      { id: 'initiation-woocommerce-debutant', labelFr: 'Initiation WooCommerce (débutant)', labelAr: 'مبادئ WooCommerce (مبتدئ)' },
      { id: 'strategie-dropshipping', labelFr: 'Stratégie dropshipping', labelAr: 'استراتيجية الدروبشيبينغ' }, // REVIEW_AR_TRANSLATION
      { id: 'choix-de-produit-gagnant', labelFr: 'Choix de produit gagnant', labelAr: 'اختيار المنتج الرابح' }, // REVIEW_AR_TRANSLATION
      { id: 'optimisation-tunnel-de-vente', labelFr: 'Optimisation tunnel de vente', labelAr: 'تحسين قمع المبيعات' }, // REVIEW_AR_TRANSLATION
      { id: 'logistique-cod-tunisie', labelFr: 'Logistique & COD Tunisie', labelAr: 'اللوجستيات والدفع عند الاستلام في تونس' }, // REVIEW_AR_TRANSLATION
      { id: 'audit-boutique-existante', labelFr: 'Audit boutique existante', labelAr: 'تدقيق متجر قائم' }, // REVIEW_AR_TRANSLATION
      { id: 'coaching-lancement-boutique', labelFr: 'Coaching lancement boutique', labelAr: 'تدريب على إطلاق متجر' }, // REVIEW_AR_TRANSLATION
    ],
    skills: [
      // FOUNDER-UNREVIEWED — starter list, not sourced from a measured frame or prior art. Feeds
      // H6's type-ahead, so a freelancer sees it as-is — review when H6's picker ships.
      { id: 'shopify', labelFr: 'Shopify', labelAr: 'Shopify' },
      { id: 'woocommerce', labelFr: 'WooCommerce', labelAr: 'WooCommerce' },
      { id: 'dropshipping', labelFr: 'dropshipping', labelAr: 'الدروبشيبينغ' },
      { id: 'cod', labelFr: 'COD', labelAr: 'الدفع عند الاستلام' }, // REVIEW_AR_TRANSLATION
      { id: 'produit-gagnant', labelFr: 'produit gagnant', labelAr: 'المنتج الرابح' }, // REVIEW_AR_TRANSLATION
      { id: 'tunnel-de-vente', labelFr: 'tunnel de vente', labelAr: 'قمع المبيعات' }, // REVIEW_AR_TRANSLATION
      { id: 'logistique', labelFr: 'logistique', labelAr: 'اللوجستيات' },
      { id: 'e-commerce-tunisie', labelFr: 'e-commerce Tunisie', labelAr: 'التجارة الإلكترونية في تونس' }, // REVIEW_AR_TRANSLATION
      { id: 'fournisseurs', labelFr: 'fournisseurs', labelAr: 'الموردون' }, // REVIEW_AR_TRANSLATION
      { id: 'meta-ads', labelFr: 'Meta Ads', labelAr: 'Meta Ads' },
    ],
  },
];

// ── Consumer helpers (keep lean — these are the only ones the app needs) ──────

/** Look up a sector by its stable slug. */
export const getSector = (id: string): ServiceSector | undefined =>
  serviceCategories.find((s) => s.id === id);

/** Look up a subcategory within a sector by their stable slugs. */
export const getSubcategory = (
  sectorId: string,
  subcategoryId: string,
): TaxonomySubcategory | undefined =>
  getSector(sectorId)?.subcategories.find((sub) => sub.id === subcategoryId);

/** The type-ahead skill pool for a sector (empty array if the sector is unknown). */
export const getSkillPool = (sectorId: string): TaxonomySkill[] =>
  getSector(sectorId)?.skills ?? [];

/** All sector slugs, in canonical display order. */
export const allSectorIds: string[] = serviceCategories.map((s) => s.id);

// One index over every pool: a stored tag resolves whatever sector the service now sits in. A
// recurring skill is byte-identical in each pool, so keeping the first occurrence loses nothing.
const skillsById = new Map<string, TaxonomySkill>();
for (const sector of serviceCategories) {
  for (const skill of sector.skills) if (!skillsById.has(skill.id)) skillsById.set(skill.id, skill);
}

const foldLabel = (s: string): string => s.trim().toLocaleLowerCase('fr');
const matchesLabel = (skill: TaxonomySkill, folded: string): boolean =>
  foldLabel(skill.labelFr) === folded || foldLabel(skill.labelAr) === folded;

/** A pool skill by its stable id, from any sector (undefined for a custom, typed skill). */
export const getSkill = (id: string): TaxonomySkill | undefined => skillsById.get(id);

/**
 * The pool skill whose French OR Arabic label equals `text` (case-insensitive), if any — looked up
 * in `preferSectorId`'s pool first. Two DIFFERENT skills can share a label in one language
 * (`copywriting` and `copywriting-publicitaire` are both « الكتابة الإعلانية » in AR), so the
 * freelancer's own sector decides; any other sector's pool is the fallback.
 */
export function findSkillByLabel(text: string, preferSectorId?: string): TaxonomySkill | undefined {
  const folded = foldLabel(text);
  if (!folded) return undefined;
  const preferred = preferSectorId ? getSkillPool(preferSectorId).find((s) => matchesLabel(s, folded)) : undefined;
  if (preferred) return preferred;
  for (const skill of skillsById.values()) if (matchesLabel(skill, folded)) return skill;
  return undefined;
}

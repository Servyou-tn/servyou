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
 * ── SKILLS ────────────────────────────────────────────────────────────────────
 * `skills` is the per-sector type-ahead pool: the combo suggests from the ACTIVE
 * sector's pool as the freelancer types, and allows add-your-own beyond the list.
 * Skills are matched BY STRING (label) today — there is no skill slug/entity.
 * Recurring skills (Python, Figma, Excel, réseaux sociaux, TikTok, français,
 * arabe, anglais, sous-titrage, …) are kept BYTE-IDENTICAL (FR + AR) across every
 * pool so the /marche/services filter never treats one skill as two.
 * OPEN QUESTION (raise before /marche/services is built): if that filter ever
 * needs canonical skill ENTITIES (rename-safe, dedup by id), skills need a stable
 * slug. Not added now — free-text add-your-own is the current product reality.
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
  /** French label (also the value stored/matched today). */
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
      { labelFr: 'React', labelAr: 'React' },
      { labelFr: 'Next.js', labelAr: 'Next.js' },
      { labelFr: 'Vue', labelAr: 'Vue' },
      { labelFr: 'Node.js', labelAr: 'Node.js' },
      { labelFr: 'PHP', labelAr: 'PHP' },
      { labelFr: 'Laravel', labelAr: 'Laravel' },
      { labelFr: 'WordPress', labelAr: 'WordPress' },
      { labelFr: 'Flutter', labelAr: 'Flutter' },
      { labelFr: 'React Native', labelAr: 'React Native' },
      { labelFr: 'TypeScript', labelAr: 'TypeScript' },
      { labelFr: 'Python', labelAr: 'Python' },
      { labelFr: 'HTML/CSS', labelAr: 'HTML/CSS' },
      { labelFr: 'Tailwind', labelAr: 'Tailwind' },
      { labelFr: 'Supabase', labelAr: 'Supabase' },
      { labelFr: 'Firebase', labelAr: 'Firebase' },
      { labelFr: 'MySQL', labelAr: 'MySQL' },
      { labelFr: 'REST API', labelAr: 'REST API' },
      { labelFr: 'Shopify', labelAr: 'Shopify' },
      { labelFr: 'WooCommerce', labelAr: 'WooCommerce' },
      { labelFr: 'Git', labelAr: 'Git' },
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
    ],
    skills: [
      { labelFr: 'Photoshop', labelAr: 'Photoshop' },
      { labelFr: 'Illustrator', labelAr: 'Illustrator' },
      { labelFr: 'InDesign', labelAr: 'InDesign' },
      { labelFr: 'logo', labelAr: 'شعار' },
      { labelFr: 'identité de marque', labelAr: 'هوية العلامة التجارية' },
      { labelFr: 'charte graphique', labelAr: 'دليل الهوية البصرية' },
      { labelFr: 'typographie', labelAr: 'التيبوغرافيا' }, // REVIEW_AR_TRANSLATION: loanword vs "فن الطباعة"
      { labelFr: 'retouche', labelAr: 'تعديل الصور' },
      { labelFr: 'vectorisation', labelAr: 'الرسم المتّجه' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'print', labelAr: 'الطباعة' },
      { labelFr: 'flyer', labelAr: 'منشور' },
      { labelFr: 'packaging', labelAr: 'التغليف' },
      { labelFr: 'illustration', labelAr: 'الرسم التوضيحي' },
      { labelFr: 'Canva', labelAr: 'Canva' },
      { labelFr: 'Figma', labelAr: 'Figma' },
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
      { labelFr: 'Figma', labelAr: 'Figma' },
      { labelFr: 'Adobe XD', labelAr: 'Adobe XD' },
      { labelFr: 'Sketch', labelAr: 'Sketch' },
      { labelFr: 'wireframe', labelAr: 'مخطط هيكلي' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'prototype', labelAr: 'نموذج أولي' },
      { labelFr: 'maquette', labelAr: 'نموذج تصميم' },
      { labelFr: 'UI', labelAr: 'UI' },
      { labelFr: 'UX', labelAr: 'UX' },
      { labelFr: 'design system', labelAr: 'نظام التصميم' },
      { labelFr: 'responsive', labelAr: 'تصميم متجاوب' },
      { labelFr: 'parcours utilisateur', labelAr: 'رحلة المستخدم' },
      { labelFr: 'accessibilité', labelAr: 'إمكانية الوصول' },
      { labelFr: 'Framer', labelAr: 'Framer' },
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
      { labelFr: 'SEO', labelAr: 'SEO' },
      { labelFr: 'Google Ads', labelAr: 'Google Ads' },
      { labelFr: 'Facebook Ads', labelAr: 'Facebook Ads' },
      { labelFr: 'Instagram', labelAr: 'Instagram' },
      { labelFr: 'community management', labelAr: 'إدارة المجتمعات' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'content strategy', labelAr: 'استراتيجية المحتوى' },
      { labelFr: 'Google Analytics', labelAr: 'Google Analytics' },
      { labelFr: 'Meta Business', labelAr: 'Meta Business' },
      { labelFr: 'emailing', labelAr: 'التسويق عبر البريد الإلكتروني' },
      { labelFr: 'Mailchimp', labelAr: 'Mailchimp' },
      { labelFr: 'référencement', labelAr: 'تحسين محركات البحث' }, // REVIEW_AR_TRANSLATION: référencement≈SEO
      { labelFr: 'réseaux sociaux', labelAr: 'وسائل التواصل الاجتماعي' },
      { labelFr: 'TikTok', labelAr: 'TikTok' },
      { labelFr: 'LinkedIn', labelAr: 'LinkedIn' },
      { labelFr: 'copywriting publicitaire', labelAr: 'الكتابة الإعلانية' },
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
      { labelFr: 'Instagram', labelAr: 'Instagram' },
      { labelFr: 'Facebook', labelAr: 'Facebook' },
      { labelFr: 'TikTok', labelAr: 'TikTok' },
      { labelFr: 'YouTube Shorts', labelAr: 'YouTube Shorts' },
      { labelFr: 'LinkedIn', labelAr: 'LinkedIn' },
      { labelFr: 'Meta Business Suite', labelAr: 'Meta Business Suite' },
      { labelFr: 'Canva', labelAr: 'Canva' },
      { labelFr: 'calendrier éditorial', labelAr: 'التقويم التحريري' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'community management', labelAr: 'إدارة المجتمعات' },
      { labelFr: 'modération', labelAr: 'الإشراف' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'Reels', labelAr: 'Reels' },
      { labelFr: 'Stories', labelAr: 'Stories' },
      { labelFr: 'influenceurs', labelAr: 'المؤثرون' },
      { labelFr: 'Later', labelAr: 'Later' },
      { labelFr: 'Hootsuite', labelAr: 'Hootsuite' },
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
      { labelFr: 'rédaction web', labelAr: 'الكتابة للويب' },
      { labelFr: 'copywriting', labelAr: 'الكتابة الإعلانية' },
      { labelFr: 'SEO writing', labelAr: 'الكتابة المحسّنة لمحركات البحث' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'article', labelAr: 'مقال' },
      { labelFr: 'blog', labelAr: 'مدوّنة' },
      { labelFr: 'storytelling', labelAr: 'السرد القصصي' },
      { labelFr: 'correction', labelAr: 'التصحيح' },
      { labelFr: 'relecture', labelAr: 'المراجعة' },
      { labelFr: 'ghostwriting', labelAr: 'الكتابة بأسماء الآخرين' }, // REVIEW_AR_TRANSLATION: term often kept "ghostwriting"
      { labelFr: 'content', labelAr: 'المحتوى' },
      { labelFr: 'script', labelAr: 'النص' },
      { labelFr: 'français', labelAr: 'الفرنسية' },
      { labelFr: 'arabe', labelAr: 'العربية' },
      { labelFr: 'anglais', labelAr: 'الإنجليزية' },
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
      { labelFr: 'traduction', labelAr: 'الترجمة' },
      { labelFr: 'français', labelAr: 'الفرنسية' },
      { labelFr: 'arabe', labelAr: 'العربية' },
      { labelFr: 'anglais', labelAr: 'الإنجليزية' },
      { labelFr: 'localisation', labelAr: 'التوطين' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'transcription', labelAr: 'النسخ الصوتي' },
      { labelFr: 'sous-titrage', labelAr: 'السترجة' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'relecture bilingue', labelAr: 'المراجعة ثنائية اللغة' },
      { labelFr: 'interprétation', labelAr: 'الترجمة الفورية' },
      { labelFr: 'MTPE', labelAr: 'MTPE' },
      { labelFr: 'terminologie', labelAr: 'المصطلحات' },
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
      { labelFr: 'Premiere Pro', labelAr: 'Premiere Pro' },
      { labelFr: 'After Effects', labelAr: 'After Effects' },
      { labelFr: 'DaVinci Resolve', labelAr: 'DaVinci Resolve' },
      { labelFr: 'Final Cut', labelAr: 'Final Cut' },
      { labelFr: 'montage', labelAr: 'المونتاج' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'motion design', labelAr: 'تصميم الحركة' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'animation 2D', labelAr: 'الرسوم المتحركة 2D' },
      { labelFr: 'animation 3D', labelAr: 'الرسوم المتحركة 3D' },
      { labelFr: 'sous-titrage', labelAr: 'السترجة' }, // REVIEW_AR_TRANSLATION (byte-identical with traduction pool)
      { labelFr: 'color grading', labelAr: 'تدريج الألوان' },
      { labelFr: 'Blender', labelAr: 'Blender' },
      { labelFr: 'réseaux sociaux', labelAr: 'وسائل التواصل الاجتماعي' },
      { labelFr: 'Reels', labelAr: 'Reels' },
      { labelFr: 'TikTok', labelAr: 'TikTok' },
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
      { labelFr: 'voix off', labelAr: 'تعليق صوتي' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'doublage', labelAr: 'الدبلجة' },
      { labelFr: 'narration', labelAr: 'السرد' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'audiobook', labelAr: 'كتاب صوتي' },
      { labelFr: 'jingle', labelAr: 'جينغل' },
      { labelFr: 'IVR', labelAr: 'IVR' },
      { labelFr: 'dialecte tunisien', labelAr: 'اللهجة التونسية' },
      { labelFr: 'home studio', labelAr: 'استوديو منزلي' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'Adobe Audition', labelAr: 'Adobe Audition' },
      { labelFr: 'montage audio', labelAr: 'مونتاج صوتي' }, // REVIEW_AR_TRANSLATION
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
      { labelFr: 'business plan', labelAr: 'خطة العمل' },
      { labelFr: 'étude de marché', labelAr: 'دراسة السوق' },
      { labelFr: 'assistance virtuelle', labelAr: 'المساعدة الافتراضية' },
      { labelFr: 'comptabilité', labelAr: 'المحاسبة' },
      { labelFr: 'gestion de projet', labelAr: 'إدارة المشاريع' },
      { labelFr: 'Excel', labelAr: 'Excel' },
      { labelFr: 'présentation', labelAr: 'العروض التقديمية' },
      { labelFr: 'PowerPoint', labelAr: 'PowerPoint' },
      { labelFr: 'conseil', labelAr: 'الاستشارة' },
      { labelFr: 'stratégie', labelAr: 'الاستراتيجية' },
      { labelFr: 'administratif', labelAr: 'الأعمال الإدارية' },
      { labelFr: 'CRM', labelAr: 'CRM' },
      { labelFr: 'Notion', labelAr: 'Notion' },
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
      { labelFr: 'LinkedIn', labelAr: 'LinkedIn' },
      { labelFr: 'personal branding', labelAr: 'العلامة الشخصية' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'storytelling', labelAr: 'السرد القصصي' },
      { labelFr: 'bio professionnelle', labelAr: 'السيرة المهنية' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'photo de profil', labelAr: 'صورة الملف الشخصي' },
      { labelFr: 'prise de parole', labelAr: 'التحدث أمام الجمهور' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'coaching vidéo', labelAr: 'تدريب فيديو' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'positionnement de marque', labelAr: 'تموضع العلامة' }, // REVIEW_AR_TRANSLATION
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
      { labelFr: 'Meta Ads', labelAr: 'Meta Ads' },
      { labelFr: 'Facebook Ads', labelAr: 'Facebook Ads' },
      { labelFr: 'Instagram Ads', labelAr: 'Instagram Ads' },
      { labelFr: 'Business Manager', labelAr: 'Business Manager' },
      { labelFr: 'Pixel', labelAr: 'Pixel' },
      { labelFr: 'Conversions API', labelAr: 'Conversions API' },
      { labelFr: 'dropshipping', labelAr: 'الدروبشيبينغ' },
      { labelFr: 'scaling', labelAr: 'التوسيع' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'retargeting', labelAr: 'إعادة الاستهداف' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'audience lookalike', labelAr: 'جمهور مشابه' }, // REVIEW_AR_TRANSLATION
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
      { labelFr: 'Shopify', labelAr: 'Shopify' },
      { labelFr: 'WooCommerce', labelAr: 'WooCommerce' },
      { labelFr: 'dropshipping', labelAr: 'الدروبشيبينغ' },
      { labelFr: 'COD', labelAr: 'الدفع عند الاستلام' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'produit gagnant', labelAr: 'المنتج الرابح' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'tunnel de vente', labelAr: 'قمع المبيعات' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'logistique', labelAr: 'اللوجستيات' },
      { labelFr: 'e-commerce Tunisie', labelAr: 'التجارة الإلكترونية في تونس' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'fournisseurs', labelAr: 'الموردون' }, // REVIEW_AR_TRANSLATION
      { labelFr: 'Meta Ads', labelAr: 'Meta Ads' },
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

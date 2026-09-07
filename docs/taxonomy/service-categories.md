# Servyou — Service taxonomy (reference)

> **Generated from `src/lib/taxonomy/service-categories.ts` — do NOT edit by hand.**
> Regenerate: `node scripts/taxonomy-gen-md.mjs`

**Scope:** DIGITAL / REMOTE services only — no in-person / local trades (out of MVP scope).

**Stable-slug contract:** every sector & subcategory `id` is a stable slug used as a URL param
(`/marche/services?categorie=<sector>&sous=<sub>`) **and** a DB value. Changing one is a migration,
not an edit. Derivation: deburr accents → lowercase → non-alphanumeric → single hyphen → trim.

**Skills** = per-sector type-ahead pool (add-your-own allowed). Matched by string; recurring skills are
byte-identical across pools. Tool/brand names keep the Latin term in AR. AR judgment calls are marked
`REVIEW_AR_TRANSLATION` in the `.ts` source.

**Counts:** 13 sectors · 91 subcategories · 168 skill entries.

---

## 1. Développement web & mobile
- **id:** `developpement-web-mobile`
- **AR:** تطوير الويب والموبايل
- **icon:** `code` (lucide-react)

**Subcategories (7):**

| id | FR | AR |
|---|---|---|
| `site-vitrine` | Site vitrine (WordPress, Webflow) | موقع تعريفي (WordPress, Webflow) |
| `e-commerce` | E-commerce (Shopify, WooCommerce, PrestaShop) | التجارة الإلكترونية (Shopify, WooCommerce, PrestaShop) |
| `application-web-sur-mesure` | Application web sur mesure (React, Next.js, Laravel) | تطبيق ويب مخصص (React, Next.js, Laravel) |
| `application-mobile` | Application mobile (iOS, Android, Flutter, React Native) | تطبيق موبايل (iOS, Android, Flutter, React Native) |
| `landing-page-tunnel-de-vente` | Landing page & tunnel de vente | صفحة هبوط وقمع مبيعات |
| `integration-api-automatisation` | Intégration API & automatisation | دمج API والأتمتة |
| `correction-de-bug-maintenance` | Correction de bug & maintenance | إصلاح الأخطاء والصيانة |

**Skill pool (20):**

React · Next.js · Vue · Node.js · PHP · Laravel · WordPress · Flutter · React Native · TypeScript · Python · HTML/CSS · Tailwind · Supabase · Firebase · MySQL · REST API · Shopify · WooCommerce · Git

---

## 2. Design graphique & logo
- **id:** `design-graphique-logo`
- **AR:** التصميم الغرافيكي والشعارات
- **icon:** `palette` (lucide-react)

**Subcategories (8):**

| id | FR | AR |
|---|---|---|
| `logo-identite-visuelle` | Logo & identité visuelle | الشعار والهوية البصرية |
| `flyer-affiche-print` | Flyer, affiche & print | منشورات وملصقات وطباعة |
| `cartes-de-visite-papeterie` | Cartes de visite & papeterie | بطاقات العمل والقرطاسية |
| `packaging-etiquette-produit` | Packaging & étiquette produit | التغليف وملصقات المنتج |
| `menu-restaurant-signaletique` | Menu restaurant & signalétique | قوائم المطاعم واللافتات |
| `bannieres-reseaux-sociaux` | Bannières réseaux sociaux | بانرات وسائل التواصل الاجتماعي |
| `pitch-deck-presentation` | Pitch deck & présentation | عرض تقديمي (Pitch Deck) |
| `illustration-sur-mesure` | Illustration sur mesure | الرسم التوضيحي المخصص |

**Skill pool (15):**

Photoshop · Illustrator · InDesign · logo — شعار · identité de marque — هوية العلامة التجارية · charte graphique — دليل الهوية البصرية · typographie — التيبوغرافيا · retouche — تعديل الصور · vectorisation — الرسم المتّجه · print — الطباعة · flyer — منشور · packaging — التغليف · illustration — الرسم التوضيحي · Canva · Figma

---

## 3. Design UI/UX
- **id:** `design-ui-ux`
- **AR:** تصميم UI/UX
- **icon:** `layout-template` (lucide-react)

**Subcategories (6):**

| id | FR | AR |
|---|---|---|
| `maquette-site-web` | Maquette site web (Figma) | نموذج موقع ويب (Figma) |
| `maquette-application-mobile` | Maquette application mobile | نموذج تطبيق موبايل |
| `wireframe-prototype-interactif` | Wireframe & prototype interactif | مخطط هيكلي ونموذج أولي تفاعلي |
| `audit-ux-recommandations` | Audit UX & recommandations | تدقيق تجربة المستخدم وتوصيات |
| `design-system-composants` | Design system & composants | نظام التصميم والمكوّنات |
| `refonte-dinterface-existante` | Refonte d'interface existante | إعادة تصميم واجهة قائمة |

**Skill pool (13):**

Figma · Adobe XD · Sketch · wireframe — مخطط هيكلي · prototype — نموذج أولي · maquette — نموذج تصميم · UI · UX · design system — نظام التصميم · responsive — تصميم متجاوب · parcours utilisateur — رحلة المستخدم · accessibilité — إمكانية الوصول · Framer

---

## 4. Marketing digital
- **id:** `marketing-digital`
- **AR:** التسويق الرقمي
- **icon:** `megaphone` (lucide-react)

**Subcategories (7):**

| id | FR | AR |
|---|---|---|
| `strategie-marketing-digital` | Stratégie marketing digital | استراتيجية التسويق الرقمي |
| `referencement-seo` | Référencement SEO | تحسين محركات البحث (SEO) |
| `google-ads` | Google Ads (Search, Shopping, YouTube) | إعلانات جوجل (Search, Shopping, YouTube) |
| `linkedin-ads-tiktok-ads` | LinkedIn Ads & TikTok Ads | إعلانات LinkedIn وTikTok |
| `email-marketing-newsletter` | Email marketing & newsletter | التسويق عبر البريد الإلكتروني والنشرات |
| `automatisation` | Automatisation (Zapier, Make, HubSpot) | الأتمتة (Zapier, Make, HubSpot) |
| `audit-analytics` | Audit & analytics (GA4, Meta Pixel) | تدقيق وتحليلات (GA4, Meta Pixel) |

**Skill pool (15):**

SEO · Google Ads · Facebook Ads · Instagram · community management — إدارة المجتمعات · content strategy — استراتيجية المحتوى · Google Analytics · Meta Business · emailing — التسويق عبر البريد الإلكتروني · Mailchimp · référencement — تحسين محركات البحث · réseaux sociaux — وسائل التواصل الاجتماعي · TikTok · LinkedIn · copywriting publicitaire — الكتابة الإعلانية

---

## 5. Community management
- **id:** `community-management`
- **AR:** إدارة المجتمعات
- **icon:** `message-circle` (lucide-react)

**Subcategories (7):**

| id | FR | AR |
|---|---|---|
| `gestion-instagram-facebook` | Gestion Instagram & Facebook | إدارة Instagram وFacebook |
| `gestion-tiktok-youtube-shorts` | Gestion TikTok & YouTube Shorts | إدارة TikTok وYouTube Shorts |
| `gestion-linkedin-professionnel` | Gestion LinkedIn professionnel | إدارة LinkedIn الاحترافي |
| `creation-de-contenu` | Création de contenu (posts, reels, stories) | إنشاء المحتوى (منشورات، ريلز، ستوري) |
| `calendrier-editorial-planification` | Calendrier éditorial & planification | التقويم التحريري والتخطيط |
| `moderation-reponse-aux-commentaires` | Modération & réponse aux commentaires | الإشراف والرد على التعليقات |
| `influence-partenariats` | Influence & partenariats | التأثير والشراكات |

**Skill pool (15):**

Instagram · Facebook · TikTok · YouTube Shorts · LinkedIn · Meta Business Suite · Canva · calendrier éditorial — التقويم التحريري · community management — إدارة المجتمعات · modération — الإشراف · Reels · Stories · influenceurs — المؤثرون · Later · Hootsuite

---

## 6. Rédaction & contenu
- **id:** `redaction-contenu`
- **AR:** الكتابة والمحتوى
- **icon:** `pen-line` (lucide-react)

**Subcategories (7):**

| id | FR | AR |
|---|---|---|
| `article-de-blog-seo` | Article de blog (SEO) | مقال مدونة (SEO) |
| `fiche-produit-e-commerce` | Fiche produit e-commerce | وصف منتج للتجارة الإلكترونية |
| `copywriting` | Copywriting (page de vente, tunnel) | الكتابة الإعلانية (صفحة مبيعات، قمع تحويل) |
| `script-video-podcast` | Script vidéo & podcast | نص فيديو وبودكاست |
| `redaction-linkedin-posts-sociaux` | Rédaction LinkedIn & posts sociaux | كتابة LinkedIn ومنشورات اجتماعية |
| `livre-blanc-guide` | Livre blanc & guide | كتاب أبيض ودليل إرشادي |
| `correction-relecture` | Correction & relecture | التصحيح والمراجعة |

**Skill pool (14):**

rédaction web — الكتابة للويب · copywriting — الكتابة الإعلانية · SEO writing — الكتابة المحسّنة لمحركات البحث · article — مقال · blog — مدوّنة · storytelling — السرد القصصي · correction — التصحيح · relecture — المراجعة · ghostwriting — الكتابة بأسماء الآخرين · content — المحتوى · script — النص · français — الفرنسية · arabe — العربية · anglais — الإنجليزية

---

## 7. Traduction
- **id:** `traduction`
- **AR:** الترجمة
- **icon:** `languages` (lucide-react)

**Subcategories (7):**

| id | FR | AR |
|---|---|---|
| `traduction-fr-ar` | FR ↔ AR | فرنسي ↔ عربي |
| `traduction-fr-en` | FR ↔ EN | فرنسي ↔ إنجليزي |
| `traduction-ar-en` | AR ↔ EN | عربي ↔ إنجليزي |
| `traduction-technique` | Traduction technique (IT, juridique, médical) | ترجمة تقنية (معلوماتية، قانونية، طبية) |
| `traduction-administrative` | Traduction administrative | ترجمة إدارية |
| `sous-titrage-video` | Sous-titrage vidéo | سترجة الفيديو |
| `transcription-audio` | Transcription audio | النسخ الصوتي |

**Skill pool (11):**

traduction — الترجمة · français — الفرنسية · arabe — العربية · anglais — الإنجليزية · localisation — التوطين · transcription — النسخ الصوتي · sous-titrage — السترجة · relecture bilingue — المراجعة ثنائية اللغة · interprétation — الترجمة الفورية · MTPE · terminologie — المصطلحات

---

## 8. Montage vidéo & motion
- **id:** `montage-video-motion`
- **AR:** مونتاج الفيديو والموشن
- **icon:** `clapperboard` (lucide-react)

**Subcategories (7):**

| id | FR | AR |
|---|---|---|
| `montage-video` | Montage vidéo (YouTube, TikTok, Reels) | مونتاج الفيديو (YouTube, TikTok, Reels) |
| `motion-graphics-animation-2d` | Motion graphics & animation 2D | موشن غرافيك ورسوم متحركة 2D |
| `explainer-video-tutoriel` | Explainer video & tutoriel | فيديو تعريفي وتعليمي |
| `animation-logo-intro` | Animation logo & intro | تحريك الشعار والمقدمة |
| `video-publicitaire-ads` | Vidéo publicitaire (ads) | فيديو إعلاني (Ads) |
| `etalonnage-colorimetrique` | Étalonnage colorimétrique | تصحيح الألوان |
| `sound-design` | Sound design | تصميم صوتي |

**Skill pool (14):**

Premiere Pro · After Effects · DaVinci Resolve · Final Cut · montage — المونتاج · motion design — تصميم الحركة · animation 2D — الرسوم المتحركة 2D · animation 3D — الرسوم المتحركة 3D · sous-titrage — السترجة · color grading — تدريج الألوان · Blender · réseaux sociaux — وسائل التواصل الاجتماعي · Reels · TikTok

---

## 9. Voix off & doublage
- **id:** `voix-off-doublage`
- **AR:** التعليق الصوتي والدبلجة
- **icon:** `mic` (lucide-react)

**Subcategories (7):**

| id | FR | AR |
|---|---|---|
| `voix-off-publicite-fr` | Voix off publicité FR | تعليق صوتي إعلاني بالفرنسية |
| `voix-off-publicite-ar` | Voix off publicité AR | تعليق صوتي إعلاني بالعربية |
| `voix-off-publicite-en` | Voix off publicité EN | تعليق صوتي إعلاني بالإنجليزية |
| `doublage-mena` | Doublage MENA (dialectes) | دبلجة بلهجات الشرق الأوسط وشمال أفريقيا |
| `narration-documentaire-audiobook` | Narration documentaire & audiobook | سرد وثائقي وكتاب صوتي |
| `voix-ivr-repondeur` | Voix IVR & répondeur téléphonique | صوت IVR ورد آلي هاتفي |
| `chant-jingle-publicitaire` | Chant & jingle publicitaire | غناء وجينغل إعلاني |

**Skill pool (10):**

voix off — تعليق صوتي · doublage — الدبلجة · narration — السرد · audiobook — كتاب صوتي · jingle — جينغل · IVR · dialecte tunisien — اللهجة التونسية · home studio — استوديو منزلي · Adobe Audition · montage audio — مونتاج صوتي

---

## 10. Consulting & assistanat
- **id:** `consulting-assistanat`
- **AR:** الاستشارة والمساعدة
- **icon:** `briefcase` (lucide-react)

**Subcategories (7):**

| id | FR | AR |
|---|---|---|
| `business-plan-etude-de-marche` | Business plan & étude de marché | خطة العمل ودراسة السوق |
| `dossier-bancaire-financement` | Dossier bancaire & financement (ANETI, BFPME) | ملف بنكي وتمويل (ANETI, BFPME) |
| `assistance-administrative-a-distance` | Assistance administrative à distance | مساعدة إدارية عن بعد |
| `saisie-mise-en-forme-documents` | Saisie & mise en forme documents | إدخال وتنسيق الوثائق |
| `comptabilite-a-distance` | Comptabilité à distance (déclarations, TVA) | محاسبة عن بعد (تصريحات، ضريبة القيمة المضافة) |
| `recherche-veille-concurrentielle` | Recherche & veille concurrentielle | البحث ورصد المنافسين |
| `cv-lettre-de-motivation` | CV & lettre de motivation | السيرة الذاتية ورسالة تحفيزية |

**Skill pool (13):**

business plan — خطة العمل · étude de marché — دراسة السوق · assistance virtuelle — المساعدة الافتراضية · comptabilité — المحاسبة · gestion de projet — إدارة المشاريع · Excel · présentation — العروض التقديمية · PowerPoint · conseil — الاستشارة · stratégie — الاستراتيجية · administratif — الأعمال الإدارية · CRM · Notion

---

## 11. Personal branding
- **id:** `personal-branding`
- **AR:** العلامة الشخصية
- **icon:** `user-round` (lucide-react)

**Subcategories (6):**

| id | FR | AR |
|---|---|---|
| `strategie-positionnement-marque-personnelle` | Stratégie & positionnement marque personnelle | استراتيجية وتموضع العلامة الشخصية |
| `optimisation-profil-linkedin` | Optimisation profil LinkedIn | تحسين ملف LinkedIn الشخصي |
| `ligne-editoriale-personnelle` | Ligne éditoriale personnelle | الخط التحريري الشخصي |
| `bio-storytelling-professionnel` | Bio & storytelling professionnel | السيرة والسرد القصصي المهني |
| `photo-de-profil` | Photo de profil (retouche & optimisation) | صورة الملف الشخصي (تعديل وتحسين) |
| `coaching-prise-de-parole-video` | Coaching prise de parole vidéo | تدريب على التحدث أمام الكاميرا |

**Skill pool (8):**

LinkedIn · personal branding — العلامة الشخصية · storytelling — السرد القصصي · bio professionnelle — السيرة المهنية · photo de profil — صورة الملف الشخصي · prise de parole — التحدث أمام الجمهور · coaching vidéo — تدريب فيديو · positionnement de marque — تموضع العلامة

---

## 12. Coaching Meta Ads
- **id:** `coaching-meta-ads`
- **AR:** تدريب على إعلانات Meta
- **icon:** `target` (lucide-react)

**Subcategories (7):**

| id | FR | AR |
|---|---|---|
| `initiation-meta-ads-debutant` | Initiation Meta Ads (débutant) | مبادئ إعلانات Meta (مبتدئ) |
| `meta-ads-avance` | Meta Ads avancé (scaling & optimisation) | إعلانات Meta متقدم (توسيع وتحسين) |
| `configuration-business-manager` | Configuration Business Manager | إعداد Business Manager |
| `pixel-api-conversions` | Pixel & API Conversions | Pixel وAPI التحويلات |
| `formation-dropshipping-avec-meta` | Formation dropshipping avec Meta | تدريب على الدروبشيبينغ عبر Meta |
| `audit-compte-meta-ads-existant` | Audit compte Meta Ads existant | تدقيق حساب Meta Ads قائم |
| `coaching-campagne-en-cours-live` | Coaching campagne en cours (live) | تدريب مباشر على حملة جارية |

**Skill pool (10):**

Meta Ads · Facebook Ads · Instagram Ads · Business Manager · Pixel · Conversions API · dropshipping — الدروبشيبينغ · scaling — التوسيع · retargeting — إعادة الاستهداف · audience lookalike — جمهور مشابه

---

## 13. Coaching e-commerce
- **id:** `coaching-ecommerce`
- **AR:** تدريب على التجارة الإلكترونية
- **icon:** `shopping-cart` (lucide-react)

**Subcategories (8):**

| id | FR | AR |
|---|---|---|
| `initiation-shopify-debutant` | Initiation Shopify (débutant) | مبادئ Shopify (مبتدئ) |
| `initiation-woocommerce-debutant` | Initiation WooCommerce (débutant) | مبادئ WooCommerce (مبتدئ) |
| `strategie-dropshipping` | Stratégie dropshipping | استراتيجية الدروبشيبينغ |
| `choix-de-produit-gagnant` | Choix de produit gagnant | اختيار المنتج الرابح |
| `optimisation-tunnel-de-vente` | Optimisation tunnel de vente | تحسين قمع المبيعات |
| `logistique-cod-tunisie` | Logistique & COD Tunisie | اللوجستيات والدفع عند الاستلام في تونس |
| `audit-boutique-existante` | Audit boutique existante | تدقيق متجر قائم |
| `coaching-lancement-boutique` | Coaching lancement boutique | تدريب على إطلاق متجر |

**Skill pool (10):**

Shopify · WooCommerce · dropshipping — الدروبشيبينغ · COD — الدفع عند الاستلام · produit gagnant — المنتج الرابح · tunnel de vente — قمع المبيعات · logistique — اللوجستيات · e-commerce Tunisie — التجارة الإلكترونية في تونس · fournisseurs — الموردون · Meta Ads

---

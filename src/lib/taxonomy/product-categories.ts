/**
 * Servyou — Product taxonomy (SINGLE SOURCE OF TRUTH)
 * ====================================================
 * The data backbone consumed by: G6 (add product — category picker), G5
 * (/mes-produits catalog filter), D3 (public shop categories), and the
 * marketplace product browse (/marche/produits, /categories/[slug]). Import from
 * here — do not re-declare this data anywhere else.
 *
 * SCOPE: PHYSICAL products sold by Tunisian shops (COD, Tunisia). Market-grounded
 * from 2026 data (analysis of ~600 Tunisian e-commerce sites): the market is
 * dominated by mode & accessoires (~35%), électronique + électroménager (~27%),
 * and beauté (~15%) — ~77% in three blocs — then a long tail, with artisanat and
 * alimentation/terroir kept because they are Tunisian-distinctive (artisans,
 * terroir sellers) and auto/moto kept as a high-growth niche. Sectors are ordered
 * MARKET-WEIGHTED (dominant first).
 *
 * SIBLING: `src/lib/taxonomy/service-categories.ts` follows the same pattern.
 * Products and services stay DISTINCT files (different shapes — products have no
 * skill pool). If the marketplace ever unifies product + service browse, the two
 * reconcile then; for now they are independent.
 *
 * ── STABLE-SLUG CONTRACT ──────────────────────────────────────────────────────
 * Every `id` (sector AND subcategory) is a stable slug. These become URL params
 * (e.g. /marche/produits?categorie=mode-accessoires&sous=chaussures) AND DB
 * values. They MUST NEVER change casually — changing one is a MIGRATION, not an
 * edit. Slug derivation rule (applied to every id): deburr accents → lowercase →
 * non-alphanumeric runs to a single hyphen → trim hyphens.
 *   "Sacs & maroquinerie"    → "sacs-maroquinerie"
 *   "Huile d'olive & dérivés" → "huile-olive-derives"
 *
 * ── NO SKILLS (products ≠ services) ───────────────────────────────────────────
 * Products are sector + subcategory only — there is no per-sector "skill pool"
 * like services have. Per-sector product ATTRIBUTES (size/colour for fashion,
 * capacity for électroménager, …) are DEFERRED: MVP is category-only. If product
 * variants/attributes land, add an optional `attributes` field to ProductSector
 * here (single source of truth) — do not scatter attribute lists elsewhere.
 *
 * ── AR PARITY ─────────────────────────────────────────────────────────────────
 * Labels are FR + AR; the app renders per language toggle. Brand / tech terms
 * keep the Latin term in AR (iPhone, Gaming, …) — that's how Tunisians refer to
 * them. Lines marked `REVIEW_AR_TRANSLATION` are judgment calls that need a
 * human/native review. Repeating Arabic stems (ملابس, إكسسوارات, العناية بـ) are
 * kept byte-identical so a future product filter never treats one label as two.
 *
 * ── DELIBERATE SOFT OVERLAPS ──────────────────────────────────────────────────
 * - Kids clothing is age-split to avoid a hard duplicate: Mode › "Vêtements
 *   enfant" (older kids' fashion) vs Bébé & enfant › "Vêtements bébé" (0–3 layette).
 * - Jewelry is context-split on purpose: Mode › "Bijoux & montres" (commercial /
 *   fashion) vs Artisanat › "Bijoux artisanaux" (handmade). Deliberate, not
 *   accidental — a shop owner picks by what they sell (resold vs made-by-hand).
 */

export interface ProductSubcategory {
  /** Stable slug — URL param + DB value. Never change casually. */
  id: string;
  labelFr: string;
  labelAr: string;
}

export interface ProductSector {
  /** Stable slug — URL param + DB value. Never change casually. */
  id: string;
  labelFr: string;
  labelAr: string;
  /** lucide-react icon name (kebab-case). Verified against the installed version. */
  icon: string;
  subcategories: ProductSubcategory[];
}

export const productCategories: ProductSector[] = [
  {
    id: 'mode-accessoires',
    labelFr: 'Mode & accessoires',
    labelAr: 'الموضة والإكسسوارات', // إكسسوارات = established loanword in Tunisian commerce
    icon: 'shirt',
    subcategories: [
      { id: 'vetements-femme', labelFr: 'Vêtements femme', labelAr: 'ملابس نسائية' },
      { id: 'vetements-homme', labelFr: 'Vêtements homme', labelAr: 'ملابس رجالية' },
      { id: 'chaussures', labelFr: 'Chaussures', labelAr: 'أحذية' },
      { id: 'sacs-maroquinerie', labelFr: 'Sacs & maroquinerie', labelAr: 'حقائب ومصنوعات جلدية' }, // REVIEW_AR_TRANSLATION: maroquinerie = leather goods; "مصنوعات جلدية" vs shorter "جلود"
      { id: 'bijoux-montres', labelFr: 'Bijoux & montres', labelAr: 'مجوهرات وساعات' }, // commercial jewelry (vs artisanat › bijoux-artisanaux)
      { id: 'accessoires', labelFr: 'Accessoires', labelAr: 'إكسسوارات' }, // REVIEW_AR_TRANSLATION: écharpes/ceintures/lunettes — loanword kept
      { id: 'vetements-enfant', labelFr: 'Vêtements enfant', labelAr: 'ملابس أطفال' }, // older kids (bébé layette → bebe-enfant)
    ],
  },
  {
    id: 'electronique',
    labelFr: 'Électronique & high-tech',
    labelAr: 'الإلكترونيات والتكنولوجيا',
    icon: 'smartphone',
    subcategories: [
      { id: 'telephones-tablettes', labelFr: 'Téléphones & tablettes', labelAr: 'هواتف وأجهزة لوحية' },
      { id: 'accessoires-telephone', labelFr: 'Accessoires téléphone', labelAr: 'إكسسوارات الهاتف' },
      { id: 'informatique-ordinateurs', labelFr: 'Informatique & ordinateurs', labelAr: 'المعلوماتية والحواسيب' }, // REVIEW_AR_TRANSLATION: informatique = المعلوماتية (MSA) vs Tunisian "الإعلامية"
      { id: 'audio-ecouteurs', labelFr: 'Audio & écouteurs', labelAr: 'الصوتيات وسماعات الأذن' },
      { id: 'objets-connectes-montres', labelFr: 'Objets connectés & montres', labelAr: 'الأجهزة المتصلة والساعات الذكية' }, // REVIEW_AR_TRANSLATION: objets connectés = smart/IoT devices
      { id: 'gaming', labelFr: 'Gaming', labelAr: 'Gaming' }, // tech term kept Latin (per AR-parity rule)
      { id: 'tv-image', labelFr: 'TV & image', labelAr: 'التلفزيون والصورة' },
    ],
  },
  {
    id: 'electromenager',
    labelFr: 'Électroménager',
    labelAr: 'الأجهزة الكهرومنزلية',
    icon: 'washing-machine',
    subcategories: [
      { id: 'gros-electromenager', labelFr: 'Gros électroménager', labelAr: 'الأجهزة الكهرومنزلية الكبيرة' },
      { id: 'petit-electromenager', labelFr: 'Petit électroménager', labelAr: 'الأجهزة الكهرومنزلية الصغيرة' },
      { id: 'cuisine-electrique', labelFr: 'Cuisine électrique', labelAr: 'أجهزة المطبخ الكهربائية' },
      { id: 'climatisation-chauffage', labelFr: 'Climatisation & chauffage', labelAr: 'التكييف والتدفئة' },
    ],
  },
  {
    id: 'beaute-cosmetique',
    labelFr: 'Beauté & cosmétique',
    labelAr: 'الجمال ومستحضرات التجميل',
    icon: 'sparkles',
    subcategories: [
      { id: 'maquillage', labelFr: 'Maquillage', labelAr: 'مكياج' },
      { id: 'soins-visage', labelFr: 'Soins visage', labelAr: 'العناية بالبشرة' },
      { id: 'soins-cheveux', labelFr: 'Soins cheveux', labelAr: 'العناية بالشعر' },
      { id: 'parfums', labelFr: 'Parfums', labelAr: 'عطور' },
      { id: 'soins-corps', labelFr: 'Soins corps', labelAr: 'العناية بالجسم' },
      { id: 'produits-naturels', labelFr: 'Produits naturels', labelAr: 'منتجات طبيعية' }, // huiles, savons
    ],
  },
  {
    id: 'maison-deco',
    labelFr: 'Maison & décoration',
    labelAr: 'المنزل والديكور',
    icon: 'sofa',
    subcategories: [
      { id: 'decoration', labelFr: 'Décoration', labelAr: 'ديكور' },
      { id: 'linge-de-maison', labelFr: 'Linge de maison', labelAr: 'بياضات المنزل' }, // REVIEW_AR_TRANSLATION: household linen; بياضات vs مفروشات
      { id: 'meubles', labelFr: 'Meubles', labelAr: 'أثاث' },
      { id: 'cuisine-arts-de-la-table', labelFr: 'Cuisine & arts de la table', labelAr: 'المطبخ وأدوات المائدة' },
      { id: 'rangement', labelFr: 'Rangement', labelAr: 'التخزين والترتيب' },
      { id: 'luminaires', labelFr: 'Luminaires', labelAr: 'الإضاءة' },
    ],
  },
  {
    id: 'artisanat',
    labelFr: 'Artisanat & fait main',
    labelAr: 'الحرف اليدوية والصناعات التقليدية',
    icon: 'hand', // fait-main / handmade (conceptual, not a literal craft glyph)
    subcategories: [
      { id: 'poterie-ceramique', labelFr: 'Poterie & céramique', labelAr: 'الفخار والخزف' },
      { id: 'textile-artisanal', labelFr: 'Textile artisanal', labelAr: 'النسيج التقليدي' },
      { id: 'tapis-tissage', labelFr: 'Tapis & tissage', labelAr: 'السجاد والنسيج' }, // Tunisian craft (kilim/margoum)
      { id: 'cuir-artisanal', labelFr: 'Cuir artisanal', labelAr: 'الجلود التقليدية' },
      { id: 'bijoux-artisanaux', labelFr: 'Bijoux artisanaux', labelAr: 'المجوهرات التقليدية' }, // handmade (vs mode › bijoux-montres)
      { id: 'decoration-artisanale', labelFr: 'Décoration artisanale', labelAr: 'الديكور التقليدي' },
    ],
  },
  {
    id: 'alimentation',
    labelFr: 'Alimentation & produits du terroir',
    labelAr: 'المواد الغذائية والمنتجات المحلية', // REVIEW_AR_TRANSLATION: "produits du terroir" ≈ المنتجات المحلية / منتجات الأرض
    icon: 'utensils',
    subcategories: [
      { id: 'epicerie', labelFr: 'Épicerie', labelAr: 'بقالة' },
      { id: 'produits-bio-naturels', labelFr: 'Produits bio & naturels', labelAr: 'منتجات عضوية وطبيعية' },
      { id: 'huile-olive-derives', labelFr: "Huile d'olive & dérivés", labelAr: 'زيت الزيتون ومشتقاته' },
      { id: 'dattes-fruits-secs', labelFr: 'Dattes & fruits secs', labelAr: 'تمور وفواكه جافة' },
      { id: 'epices', labelFr: 'Épices', labelAr: 'بهارات وتوابل' },
      { id: 'miel-confitures', labelFr: 'Miel & confitures', labelAr: 'عسل ومربى' },
    ],
  },
  {
    id: 'bebe-enfant',
    labelFr: 'Bébé & enfant',
    labelAr: 'الرضّع والأطفال',
    icon: 'baby',
    subcategories: [
      { id: 'vetements-bebe', labelFr: 'Vêtements bébé', labelAr: 'ملابس الرضّع' }, // 0–3 layette (older kids → mode › vetements-enfant)
      { id: 'jouets', labelFr: 'Jouets', labelAr: 'ألعاب' },
      { id: 'puericulture', labelFr: 'Puériculture', labelAr: 'مستلزمات الرضّع' }, // REVIEW_AR_TRANSLATION: puériculture = baby-care goods
      { id: 'articles-scolaires', labelFr: 'Articles scolaires', labelAr: 'أدوات مدرسية' },
    ],
  },
  {
    id: 'sport-loisirs',
    labelFr: 'Sport & loisirs',
    labelAr: 'الرياضة والترفيه',
    icon: 'dumbbell',
    subcategories: [
      { id: 'vetements-sport', labelFr: 'Vêtements de sport', labelAr: 'ملابس رياضية' },
      { id: 'equipement-fitness', labelFr: 'Équipement fitness', labelAr: 'معدات اللياقة البدنية' },
      { id: 'plein-air', labelFr: 'Plein air', labelAr: 'أنشطة الهواء الطلق' }, // REVIEW_AR_TRANSLATION: plein air = outdoor
      { id: 'velos-trottinettes', labelFr: 'Vélos & trottinettes', labelAr: 'دراجات وسكوترات' }, // REVIEW_AR_TRANSLATION: trottinette = سكوتر (loanword)
    ],
  },
  {
    id: 'auto-moto',
    labelFr: 'Auto & moto',
    labelAr: 'السيارات والدراجات النارية',
    icon: 'car',
    subcategories: [
      { id: 'accessoires-auto', labelFr: 'Accessoires auto', labelAr: 'إكسسوارات السيارات' },
      { id: 'pieces-entretien', labelFr: 'Pièces & entretien', labelAr: 'قطع الغيار والصيانة' },
      { id: 'accessoires-moto', labelFr: 'Accessoires moto', labelAr: 'إكسسوارات الدراجات النارية' },
    ],
  },
  {
    id: 'sante-parapharmacie',
    labelFr: 'Santé & parapharmacie',
    labelAr: 'الصحة والمنتجات شبه الصيدلانية', // REVIEW_AR_TRANSLATION: parapharmacie has no settled MSA; شبه صيدلانية
    icon: 'heart-pulse',
    subcategories: [
      { id: 'complements', labelFr: 'Compléments', labelAr: 'مكمّلات غذائية' },
      { id: 'materiel-medical', labelFr: 'Matériel médical', labelAr: 'معدات طبية' },
      { id: 'hygiene', labelFr: 'Hygiène', labelAr: 'النظافة والعناية' },
      { id: 'parapharmacie', labelFr: 'Parapharmacie', labelAr: 'منتجات شبه صيدلانية' }, // REVIEW_AR_TRANSLATION: see sector label
    ],
  },
];

// ── Consumer helpers (mirror service-categories.ts; no skill-pool helper) ──────

/** Look up a product sector by its stable slug. */
export const getProductSector = (id: string): ProductSector | undefined =>
  productCategories.find((s) => s.id === id);

/** Look up a subcategory within a sector by their stable slugs. */
export const getProductSubcategory = (
  sectorId: string,
  subcategoryId: string,
): ProductSubcategory | undefined =>
  getProductSector(sectorId)?.subcategories.find((sub) => sub.id === subcategoryId);

/** All product sector slugs, in canonical (market-weighted) display order. */
export const allProductSectorIds: string[] = productCategories.map((s) => s.id);

import type { Lang } from './index'

// CLDR distinguishes six categories (zero/one/two/few/many/other), but Intl.PluralRules only ever
// returns 'few'/'many' for Arabic 3-10 / 11-99 — this app folds both into `other` (see
// selectCategory), so a variants object only ever needs zero/one/two/other. French never produces
// 'two', 'few', or 'many' at all — it only needs one/other.
export type PluralVariants = {
  zero?: string
  one?: string
  two?: string
  other: string
}

const RULES: Record<Lang, Intl.PluralRules> = {
  fr: new Intl.PluralRules('fr'),
  ar: new Intl.PluralRules('ar'),
}

/**
 * Selects which variant key applies for `count` in `lang`.
 *
 * FRENCH ZERO OVERRIDE: CLDR's fr rule puts n=0 in the `one` category
 * (Intl.PluralRules('fr').select(0) === 'one'), which would print "0 produit". Every French
 * commerce site prints "0 produits" instead, so n=0 is forced to `other` for French. Arabic keeps
 * its own real `zero` category (CLDR gives it a distinct bucket) for any string that supplies a
 * `zero` variant; strings that don't fall back to `other`.
 */
export function pluralCategory(lang: Lang, count: number): 'zero' | 'one' | 'two' | 'other' {
  if (lang === 'fr' && count === 0) return 'other'
  const raw = RULES[lang].select(count)
  if (raw === 'few' || raw === 'many') return 'other'
  return raw
}

function pickVariant(variants: PluralVariants, lang: Lang, count: number): string {
  const category = pluralCategory(lang, count)
  return variants[category] ?? variants.other
}

// ─── Variants ──────────────────────────────────────────────────────────────────
// Each entry needs real number agreement, not a mechanical noun swap: Arabic non-human plurals
// take feminine-singular adjective agreement (broken-plural rule), and duals/plurals following a
// preposition (من/خلال/منذ) take the oblique form (طلبين, not طلبان) — both are applied below where
// the string has an adjective or sits after a preposition.

const frPlurals: Record<string, PluralVariants> = {
  'mesannonces.count':                     { one: '{count} annonce',  other: '{count} annonces' },
  'mesfavoris.count':                      { one: '{count} favori',   other: '{count} favoris' },

  'page_header.recherche.subtitle':        { one: '{count} résultat pour « {query} »', other: '{count} résultats pour « {query} »' },
  'page_header.recherche.emphasis':        { one: '{count} résultat', other: '{count} résultats' },
  'page_header.categories.subtitle':       { one: '{count} produit dans {category}',   other: '{count} produits dans {category}' },
  'page_header.categories.emphasis':       { one: '{count} produit', other: '{count} produits' },
  'boutique.public.products_count':        { one: '{count} produit', other: '{count} produits' },

  'seller.orders.count':                   { one: '{count} commande', other: '{count} commandes' },
  'seller.dashboard.tile.profit_sub':      { one: 'Sur {count} commande livrée', other: 'Sur {count} commandes livrées' },

  'product.bulk.selected_count':           { one: '{count} sélectionné', other: '{count} sélectionnés' },
  'product.bulk.confirm_delete':           {
    one:   'Supprimer {count} produit sélectionné ? Cette action est irréversible.',
    other: 'Supprimer {count} produits sélectionnés ? Cette action est irréversible.',
  },

  // "j" is an invariant abbreviation in French (1 j, 2 j, 10 j) — one/other are identical on
  // purpose. Migrated anyway so the AR side (which spells the word out and DOES need agreement)
  // shares one call site and one selection table with the rest of this file.
  'mesannonces.expiry_countdown':          { one: 'Expire dans {count} j', other: 'Expire dans {count} j' },
  'annonces.detail.responded_days_ago':    { one: 'Répondu il y a {count} j', other: 'Répondu il y a {count} j' },

  'consumer.dashboard.orders.count':       { one: '{count} commande en cours', other: '{count} commandes en cours' },

  // H4 Ecosystem widget (docs/design/h4-discovery.md §3).
  'ecosysteme.consumers_count':            { one: '{count} consommateur', other: '{count} consommateurs' },
  'ecosysteme.shops_count':                { one: '{count} boutique', other: '{count} boutiques' },

  // Relative timestamps, shared by Missions récentes ("Publié") and Activité récente. "h" is the
  // invariant abbreviation (same convention as the "j" pair above: 1h, 3h) — 📐 MEASURED against
  // 232:7602 (h4-discovery.md §9): the frame reads "il y a 2h", NO SPACE before the h. Days are
  // SPELLED OUT ("il y a 2 jours", WITH a space) — that half is still 🔨 founder-ruled copy
  // (Ruling 8), Missions récentes' own frame never seeds a days-old post to confirm it, and
  // there's no reason to assume the same no-space treatment carries over to a different unit.
  'activite.time_ago_hours':               { one: 'il y a {count}h', other: 'il y a {count}h' },
  'activite.time_ago_days':                { one: 'il y a {count} jour', other: 'il y a {count} jours' },
}

const arPlurals: Record<string, PluralVariants> = {
  'mesannonces.count':                     { one: '{count} إعلان', two: '{count} إعلانان', other: '{count} إعلانات' },
  'mesfavoris.count':                      { one: '{count} مفضّلة', two: '{count} مفضّلتان', other: '{count} مفضّلات' },

  'page_header.recherche.subtitle':        {
    one:   '{count} نتيجة عن « {query} »',
    two:   '{count} نتيجتان عن « {query} »',
    other: '{count} نتائج عن « {query} »',
  },
  'page_header.recherche.emphasis':        { one: '{count} نتيجة', two: '{count} نتيجتان', other: '{count} نتائج' },
  'page_header.categories.subtitle':       {
    one:   '{count} منتج في {category}',
    two:   '{count} منتجان في {category}',
    other: '{count} منتجات في {category}',
  },
  'page_header.categories.emphasis':       { one: '{count} منتج', two: '{count} منتجان', other: '{count} منتجات' },
  'boutique.public.products_count':        { one: '{count} منتج', two: '{count} منتجان', other: '{count} منتجات' },

  'seller.orders.count':                   { one: '{count} طلب', two: '{count} طلبان', other: '{count} طلبات' },
  // Preceded by "من" (from) → dual takes the oblique form (طلبين, not طلبان). Non-human plural
  // "طلبات" takes feminine-singular adjective agreement ("مُستلَمة", not "مُستلَمين").
  'seller.dashboard.tile.profit_sub':      {
    one:   'من {count} طلب مُستلَم',
    two:   'من {count} طلبين مُستلَمين',
    other: 'من {count} طلبات مُستلَمة',
  },

  // Implied noun is "منتج(ات)" (product/s); adjective agrees with it even though the noun itself
  // never appears in this string. Non-human plural → feminine-singular adjective ("محددة").
  'product.bulk.selected_count':           { one: '{count} محدد', two: '{count} محددان', other: '{count} محددة' },
  // Direct object of "حذف" (delete) → accusative dual endings (منتجين محددين, not منتجان محددان).
  // Replaces the literal "منتج(ات)" parenthetical, which mimicked the French (s) trick and isn't
  // standard Arabic.
  'product.bulk.confirm_delete':           {
    one:   'حذف {count} منتج محدد؟ هذا الإجراء لا يمكن التراجع عنه.',
    two:   'حذف {count} منتجين محددين؟ هذا الإجراء لا يمكن التراجع عنه.',
    other: 'حذف {count} منتجات محددة؟ هذا الإجراء لا يمكن التراجع عنه.',
  },

  // Preceded by "خلال"/"منذ" → dual takes the oblique form (يومين, not يومان).
  'mesannonces.expiry_countdown':          { one: 'تنتهي خلال {count} يوم', two: 'تنتهي خلال {count} يومين', other: 'تنتهي خلال {count} أيام' },
  'annonces.detail.responded_days_ago':    { one: 'ردّ منذ {count} يوم', two: 'ردّ منذ {count} يومين', other: 'ردّ منذ {count} أيام' },

  // "قيد التنفيذ" (in progress) is an invariant prepositional phrase — it doesn't take number
  // agreement, so only the noun changes across categories.
  'consumer.dashboard.orders.count':       { one: '{count} طلب قيد التنفيذ', two: '{count} طلبان قيد التنفيذ', other: '{count} طلبات قيد التنفيذ' },

  // H4 Ecosystem widget. Both nouns are human/rational (مستهلك) or place (متجر) — sound masculine
  // plural for the former, broken plural for the latter, same split the glossary already uses
  // between people-nouns and thing-nouns elsewhere in this file. Not preceded by a preposition →
  // nominative dual/plural, not the oblique forms used after "من"/"منذ"/"خلال".
  // REVIEW_AR_TRANSLATION: "مستهلك" (consumer) is not in the locked glossary (ar.ts:5-23) — best-
  // effort MSA, no native pass yet.
  'ecosysteme.consumers_count':            { one: '{count} مستهلك', two: '{count} مستهلكان', other: '{count} مستهلكون' },
  'ecosysteme.shops_count':                { one: '{count} متجر', two: '{count} متجران', other: '{count} متاجر' },

  // H4 Activité récente relative timestamps (Ruling 8). Not preceded by a preposition here
  // ("منذ" IS the preposition itself, not a modifier of it) — but "منذ" still governs an oblique
  // dual by the same rule as the "خلال"/"منذ" pair above (يومين/ساعتين, not يومان/ساعتان).
  'activite.time_ago_hours':               { one: 'منذ {count} ساعة', two: 'منذ {count} ساعتين', other: 'منذ {count} ساعات' },
  'activite.time_ago_days':                { one: 'منذ {count} يوم', two: 'منذ {count} يومين', other: 'منذ {count} أيام' },
}

const pluralDicts: Record<Lang, Record<string, PluralVariants>> = { fr: frPlurals, ar: arPlurals }

/**
 * Translate a pluralized key: picks the count-appropriate variant, then interpolates `{count}`
 * (auto-injected) plus any extra `vars`. Falls back to the raw key if missing — same loud failure
 * in dev as t().
 */
export function tn(
  key: string,
  lang: Lang,
  count: number,
  vars?: Record<string, string | number>,
): string {
  const variants = pluralDicts[lang][key]
  if (!variants) return key
  let str = pickVariant(variants, lang, count)
  const merged: Record<string, string | number> = { count, ...vars }
  for (const [k, v] of Object.entries(merged)) {
    str = str.replace(`{${k}}`, String(v))
  }
  return str
}

// Langue/niveau option lists for H2 step 2 "Compétences & langues" — founder-ruled, not measured
// (docs/design/h2-discovery.md §3c: the Figma quota was exhausted before either Select's option
// list could be read off the frame). Stored codes are unaccented ASCII, matching
// freelancer_languages' CHECK constraints (db/migrations/20260814114009_freelancer_languages.sql)
// — `value` is exactly what gets written to the column, never the accented display label.
//
// Shape mirrors GOVERNORATES (src/lib/tunisia-governorates.ts): inline {value, fr, ar}, not the
// labelKey-into-fr.ts/ar.ts indirection shop-config.ts uses for its enums. Chosen for consistency
// with the field one column over in the same wizard — step 1's own Ville select already renders
// `lang === 'ar' ? g.ar : g.fr` directly off this shape.

export type LanguageOption = {
  /** Canonical stored value (freelancer_languages.language). Never change — would drift data. */
  value: string
  fr: string
  ar: string
}

export const LANGUAGES: readonly LanguageOption[] = [
  { value: 'fr', fr: 'Français', ar: 'الفرنسية' },
  { value: 'ar', fr: 'Arabe', ar: 'العربية' },
  { value: 'en', fr: 'Anglais', ar: 'الإنجليزية' },
  { value: 'it', fr: 'Italien', ar: 'الإيطالية' },
  { value: 'de', fr: 'Allemand', ar: 'الألمانية' },
  { value: 'es', fr: 'Espagnol', ar: 'الإسبانية' },
  { value: 'autre', fr: 'Autre', ar: 'أخرى' },
] as const

export type ProficiencyOption = {
  /** Canonical stored value (freelancer_languages.proficiency). Never change — would drift data. */
  value: string
  fr: string
  ar: string
}

export const PROFICIENCY_LEVELS: readonly ProficiencyOption[] = [
  { value: 'natif', fr: 'Natif', ar: 'اللغة الأم' },
  { value: 'courant', fr: 'Courant', ar: 'بطلاقة' },
  { value: 'intermediaire', fr: 'Intermédiaire', ar: 'متوسط' },
  { value: 'notions', fr: 'Notions', ar: 'أساسي' },
] as const

// z.enum needs a non-empty literal tuple — derived here once so the server action's validation
// can never drift from the option lists rendered in the UI.
export const LANGUAGE_CODES = LANGUAGES.map((l) => l.value) as [string, ...string[]]
export const PROFICIENCY_CODES = PROFICIENCY_LEVELS.map((p) => p.value) as [string, ...string[]]

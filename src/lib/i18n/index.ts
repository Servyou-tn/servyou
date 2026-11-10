import { fr } from './fr'
import { ar } from './ar'
import { en } from './en'

export type Lang = 'fr' | 'ar' | 'en'
export const LANG_COOKIE = 'servyou_lang'

/** Display order of every language switch (founder 2026-11-10: FR | EN | AR). */
export const LANGS: readonly Lang[] = ['fr', 'en', 'ar']

/** Any stored / submitted value → a supported language (unknown → French). */
export function toLang(value: unknown): Lang {
  return value === 'ar' || value === 'en' ? value : 'fr'
}

/** BCP 47 locale for dates and numbers. English = international « 10 Nov 2026 » (founder 2026-11-10). */
export const LOCALES: Record<Lang, string> = { fr: 'fr-TN', ar: 'ar-TN', en: 'en-GB' }

export { tn, pluralCategory, type PluralVariants } from './plurals'

const dicts: Record<Lang, Record<string, string>> = { fr, ar, en }

/**
 * Translate a key to the given language.
 * English is filled page by page (see en/ownership.ts): a key with no English yet shows the French text.
 * Otherwise falls back to the raw key if the key is missing — loud failure in dev.
 * Supports {placeholder} interpolation via the vars argument.
 */
export function t(
  key: string,
  lang: Lang = 'fr',
  vars?: Record<string, string | number>,
): string {
  let str = dicts[lang][key] ?? (lang === 'en' ? fr[key] : undefined) ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      // A replacer FUNCTION: a string replacement treats `$&` and `$$` as patterns, and /aide is the first
      // place raw user input (the search query) goes through t().
      str = str.replace(`{${k}}`, () => String(v))
    }
  }
  return str
}

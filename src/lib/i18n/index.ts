import { fr } from './fr'
import { ar } from './ar'

export type Lang = 'fr' | 'ar'
export const LANG_COOKIE = 'servyou_lang'

export { tn, pluralCategory, type PluralVariants } from './plurals'

const dicts: Record<Lang, Record<string, string>> = { fr, ar }

/**
 * Translate a key to the given language.
 * Falls back to the raw key if the key is missing — loud failure in dev.
 * Supports {placeholder} interpolation via the vars argument.
 */
export function t(
  key: string,
  lang: Lang = 'fr',
  vars?: Record<string, string | number>,
): string {
  let str = dicts[lang][key] ?? key
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v))
    }
  }
  return str
}

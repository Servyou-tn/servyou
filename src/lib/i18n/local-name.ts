import type { Lang } from './index'

/** A row that stores its display name per language (categories: name_fr NOT NULL, name_ar / name_en nullable). */
export type LocalNamed = { name_fr: string; name_ar?: string | null; name_en?: string | null }

/**
 * The row's name in the interface language. A missing Arabic or English name falls back to French —
 * the admin category form is French-only, so a category added later has no name_en until someone fills it.
 */
export function localName(row: LocalNamed, lang: Lang): string {
  if (lang === 'ar') return row.name_ar || row.name_fr
  if (lang === 'en') return row.name_en || row.name_fr
  return row.name_fr
}

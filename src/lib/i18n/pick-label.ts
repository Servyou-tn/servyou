import type { Lang } from './index'

/** A code-side option list entry with a label per language (governorates, languages, levels…). `en` is optional: missing → French. */
export type Labelled = { fr: string; ar: string; en?: string }

/** The entry's label in the interface language. */
export function pickLabel(item: Labelled, lang: Lang): string {
  if (lang === 'ar') return item.ar
  if (lang === 'en') return item.en || item.fr
  return item.fr
}

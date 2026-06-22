// FAQ structure (category → questions, by i18n key) + the pure search filter. The flat
// i18n dict can't hold arrays, so the shape lives here and the strings live in fr.ts/ar.ts.
// The page resolves the keys to text (per lang) and passes resolved categories to FaqView,
// which filters + renders. filterFaq operates on resolved text so it's i18n-agnostic.

export type FaqCategoryKeys = {
  titleKey: string
  questions: { qKey: string; aKey: string }[]
}

export type ResolvedQuestion = { id: string; q: string; a: string }
export type ResolvedCategory = { title: string; questions: ResolvedQuestion[] }

export const FAQ_CATEGORIES: FaqCategoryKeys[] = [
  {
    titleKey: 'faq.cat.compte.title',
    questions: [
      { qKey: 'faq.compte.q1.q', aKey: 'faq.compte.q1.a' },
      { qKey: 'faq.compte.q2.q', aKey: 'faq.compte.q2.a' },
      { qKey: 'faq.compte.q3.q', aKey: 'faq.compte.q3.a' },
    ],
  },
  {
    titleKey: 'faq.cat.acheter.title',
    questions: [
      { qKey: 'faq.acheter.q1.q', aKey: 'faq.acheter.q1.a' },
      { qKey: 'faq.acheter.q2.q', aKey: 'faq.acheter.q2.a' },
      { qKey: 'faq.acheter.q3.q', aKey: 'faq.acheter.q3.a' },
      { qKey: 'faq.acheter.q4.q', aKey: 'faq.acheter.q4.a' },
    ],
  },
  {
    titleKey: 'faq.cat.vendre.title',
    questions: [
      { qKey: 'faq.vendre.q1.q', aKey: 'faq.vendre.q1.a' },
      { qKey: 'faq.vendre.q2.q', aKey: 'faq.vendre.q2.a' },
      { qKey: 'faq.vendre.q3.q', aKey: 'faq.vendre.q3.a' },
    ],
  },
  {
    titleKey: 'faq.cat.confidentialite.title',
    questions: [
      { qKey: 'faq.confidentialite.q1.q', aKey: 'faq.confidentialite.q1.a' },
      { qKey: 'faq.confidentialite.q2.q', aKey: 'faq.confidentialite.q2.a' },
      { qKey: 'faq.confidentialite.q3.q', aKey: 'faq.confidentialite.q3.a' },
    ],
  },
  {
    titleKey: 'faq.cat.langues.title',
    questions: [{ qKey: 'faq.langues.q1.q', aKey: 'faq.langues.q1.a' }],
  },
]

/**
 * Filter resolved categories by a free-text query (matches question OR answer text,
 * case-insensitive). Empty/whitespace query → all categories unchanged. Categories with
 * no surviving questions are dropped, so the UI shows only non-empty groups.
 */
export function filterFaq(categories: ResolvedCategory[], query: string): ResolvedCategory[] {
  const needle = query.trim().toLowerCase()
  if (!needle) return categories
  return categories
    .map((cat) => ({
      title: cat.title,
      questions: cat.questions.filter(
        (item) => item.q.toLowerCase().includes(needle) || item.a.toLowerCase().includes(needle),
      ),
    }))
    .filter((cat) => cat.questions.length > 0)
}

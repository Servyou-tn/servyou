import type { AideIcon } from './groups'

// /aide search — client-side, instant, no full-text engine (24 questions is nothing). Matches the
// question AND its answer, so « commande » finds the engagement-status answer that explains it (the
// Figma search specimen 449:18312 shows exactly that cross-group behaviour).

export type AideItem = { id: string; q: string; a: string }
export type AideGroupView = { id: string; icon: AideIcon; title: string; items: AideItem[] }

// Case-, accent- and Arabic-diacritic-insensitive. NFD + stripping U+0300–036F covers French; the
// Arabic block needs its own pass: harakat U+064B–065F + U+0670, tatweel U+0640, and the alef family
// folded to a bare alef so أ / إ / آ / ا all match (a user rarely types the hamza).
export function normalizeForSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
}

/**
 * Keeps only the questions matching EVERY whitespace-separated term of `query` (in the question or the
 * answer), and drops groups left empty. A blank query returns the groups untouched.
 */
export function filterAideGroups(groups: AideGroupView[], query: string): AideGroupView[] {
  const terms = normalizeForSearch(query).split(/\s+/).filter(Boolean)
  if (terms.length === 0) return groups
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => {
        const haystack = normalizeForSearch(`${item.q} ${item.a}`)
        return terms.every((term) => haystack.includes(term))
      }),
    }))
    .filter((g) => g.items.length > 0)
}

export function countAideItems(groups: AideGroupView[]): number {
  return groups.reduce((n, g) => n + g.items.length, 0)
}

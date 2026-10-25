// The one initials helper for the Avatar's `initials` variant — and for the monogram badges that are
// not an Avatar (shop badge, profile card). Lives in shared/ui (not re-exported from a feature
// component) so account chips can render the signed-in user's own initials without depending on a
// deletion-path module.
//
// "Moatez Zaier" → "MZ" · "Ahmed Ben Salah" → "AS" (first + last word) · single word → one letter ·
// "moatez@servyou.tn" → "M" (an email falls back to its local part) · nothing usable → "?".
//
// ⚑ A WORD CONTRIBUTES ITS FIRST *LETTER*, NOT ITS FIRST CHARACTER. The old rule took `word[0]`, so a
// seed name « Acheteur E3 (seed) » rendered « A( » (« A) » in AR: the last word's first character is
// the bracket). Here a word's first Unicode letter (`\p{L}`) is used, and a word with no letter at all
// (« (3) », « 🙂 », « - ») is dropped before first/last is picked. That covers brackets, digits-only
// tokens, emoji and punctuation, and Arabic letters pass as they are (no case, so toUpperCase is a no-op).
// Unicode property escapes need the `u` flag; the first CODE POINT is taken (not UTF-16 unit), so an
// astral-plane letter is never cut in half.
const LETTER = /\p{L}/u

function firstLetter(word: string): string | null {
  const m = LETTER.exec(word)
  if (!m) return null
  // toUpperCase can expand (« ß » → « SS »): keep a single code point so the badge stays one glyph per word.
  return Array.from(m[0].toUpperCase())[0] ?? null
}

export function getInitials(nameOrEmail: string | null | undefined): string {
  const source = (nameOrEmail ?? '').trim()
  if (!source) return '?'
  const base = source.includes('@') ? source.split('@')[0] : source
  const letters = base
    .split(/\s+/)
    .map(firstLetter)
    .filter((l): l is string => l !== null)
  if (letters.length === 0) return '?'
  if (letters.length === 1) return letters[0]
  return letters[0] + letters[letters.length - 1]
}

// Shared initials helper for the Avatar's `initials` variant. Lives in shared/ui (not re-exported
// from a feature component) so account chips can render the signed-in user's own initials without
// depending on a deletion-path module. "Moatez Zaier" → "MZ", "moatez@servyou.tn" → "M", single word
// → first letter, empty → "?". An email falls back to its local part before deriving the letter.
export function getInitials(nameOrEmail: string | null | undefined): string {
  const source = (nameOrEmail ?? '').trim()
  if (!source) return '?'
  const base = source.includes('@') ? source.split('@')[0] : source
  const parts = base.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

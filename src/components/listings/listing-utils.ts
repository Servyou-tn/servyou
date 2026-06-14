// Pure helpers for the listing cards. Kept render-free so the relative-time logic
// is unit-testable (see listing-utils.test.ts).

/** Avatar initials: first letter of up to the first two words, uppercase. */
export function initials(name: string | null): string {
  if (!name) return '?'
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/** French "time ago" phrase (the {time} half of "ajouté il y a {time}"), at
 *  hour/day/month/year granularity. `now` is injectable for testing. */
export function frenchRelativeAdded(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return "moins d'une heure"
  const hours = Math.floor(mins / 60)
  if (hours < 24) return hours === 1 ? '1 heure' : `${hours} heures`
  const days = Math.floor(hours / 24)
  if (days < 30) return days === 1 ? '1 jour' : `${days} jours`
  const months = Math.floor(days / 30)
  if (months < 12) return months === 1 ? '1 mois' : `${months} mois`
  const years = Math.floor(months / 12)
  return years === 1 ? '1 an' : `${years} ans`
}

/** Price as a plain "{n} TND" string — currency code, not translatable copy. */
export function tndPrice(value: number | string | null): string {
  const n = Number(value ?? 0)
  return `${Number.isInteger(n) ? n : n.toFixed(2)} TND`
}

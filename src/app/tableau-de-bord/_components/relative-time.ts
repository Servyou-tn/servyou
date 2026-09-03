import { t, tn, type Lang } from '@/lib/i18n'

// Shared by Activité récente and Missions récentes — both live in this one route/PR, so this is
// an in-scope shared helper, not the cross-route duplication StatTile/Panel avoid. Three bands:
// "il y a 2h" (hours, abbreviated, NO space before the h, invariant one=other — 📐 MEASURED
// against 232:7602, h4-discovery.md §9; Ruling 8's own illustrative copy had a space, the actual
// frame doesn't), "il y a 2 jours" (days, spelled out, real one/other agreement, WITH a space — a
// DIFFERENT convention from the hours band, still 🔨 founder-ruled copy, no frame ever seeds a
// days-old row to measure it against), and "Hier" (a plain t() key, not tn() — exactly one day is
// its own band, not "il y a 1 jour"). No date library added.
export function relativeTimeLabel(iso: string, lang: Lang, now = Date.now()): string {
  const diffMs = Math.max(0, now - new Date(iso).getTime())
  const hours = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)

  if (hours < 1) return t('activite.time_ago_just_now', lang)
  if (hours < 24) return tn('activite.time_ago_hours', lang, hours)
  if (days === 1) return t('activite.time_ago_yesterday', lang)
  return tn('activite.time_ago_days', lang, days)
}

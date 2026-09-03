import { t, tn, type Lang } from '@/lib/i18n'

// Shared by Activité récente and Missions récentes — both live in this one route/PR, so this is
// an in-scope shared helper, not the cross-route duplication StatTile/Panel avoid. Three bands,
// matching the founder's own examples verbatim (Ruling 8): "il y a 3 h" (hours, abbreviated,
// invariant one=other — same convention as the existing 'mesannonces.expiry_countdown' "j"),
// "il y a 2 jours" (days, spelled out, real one/other agreement — a DIFFERENT convention from the
// hours band, deliberately, because that is what the ruling's own copy shows), and "hier" (a
// plain t() key, not tn() — exactly one day is its own band, not "il y a 1 jour"). No date
// library added.
export function relativeTimeLabel(iso: string, lang: Lang, now = Date.now()): string {
  const diffMs = Math.max(0, now - new Date(iso).getTime())
  const hours = Math.floor(diffMs / 3_600_000)
  const days = Math.floor(diffMs / 86_400_000)

  if (hours < 1) return t('activite.time_ago_just_now', lang)
  if (hours < 24) return tn('activite.time_ago_hours', lang, hours)
  if (days === 1) return t('activite.time_ago_yesterday', lang)
  return tn('activite.time_ago_days', lang, days)
}

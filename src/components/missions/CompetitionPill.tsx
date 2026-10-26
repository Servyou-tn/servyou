import { t, type Lang } from '@/lib/i18n'
import { competitionLevel, type CompetitionLevel } from '@/lib/marche/missions'

// Competition Pill — Figma 310:10162 (docs/design/h9-h13-measurements.md §1.3): radius-full pill, 10/4 padding, gap 6,
// an 8 px dot + Semi Bold 12 label. The thresholds (0–3 / 4–7 / 8–10) are not in the frame; they come from the
// design note and match all six examples. Plain class strings, not cn(): twMerge evicts the text-size token next
// to a text-colour class (docs memory: reference_twmerge_text_size_color_footgun).
const LEVEL: Record<CompetitionLevel, { pill: string; dot: string }> = {
  low: { pill: 'bg-success-100 text-success-700', dot: 'bg-success-500' },
  medium: { pill: 'bg-warning-100 text-warning-700', dot: 'bg-warning-500' },
  high: { pill: 'bg-danger-100 text-danger-700', dot: 'bg-danger-500' },
}

export function CompetitionPill({ responseCount, lang }: { responseCount: number; lang: Lang }) {
  const level = competitionLevel(responseCount)
  const s = LEVEL[level]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold whitespace-nowrap ${s.pill}`}>
      <span aria-hidden="true" className={`size-2 rounded-full ${s.dot}`} />
      {t(`competition.${level}`, lang)}
    </span>
  )
}

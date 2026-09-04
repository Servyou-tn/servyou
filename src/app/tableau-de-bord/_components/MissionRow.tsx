import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'
import { tndAmount } from '@/components/listings/listing-utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { relativeTimeLabel } from './relative-time'
import type { MissionMatch } from '@/lib/marche/freelancer-dashboard'

// Ruling 6 — no shared ListRow exists in code (Figma only), so this is a dedicated, route-local,
// hand-built row per the ProductRow.tsx precedent, not a parameterized shared component.
//
// Layout per the founder's literal spec (Figma quota exhausted, description-as-spec): title +
// an inline "Urgent" chip on the left, a two-column "Budget"/"Publié" meta block on the right —
// same StatCol shape ProductRow.tsx uses for its own Prix/Stock/Vendus columns.
//
// Two things this pass could NOT back with data (flagged, not fabricated):
//   - "Urgent": job_posts has no urgency/priority column, so `mission.isUrgent` does not exist
//     and this chip never renders. The slot is built so it drops in the moment that data exists.
//   - city/is_remote ("place") is no longer shown — the founder's description only names Budget
//     and Publié as the two meta columns, and a third value has nowhere to go in that shape.
//
// Read-only: the whole row links to /trouver-des-missions (a real route — a ComingSoon stub
// today, but a stub is a page, not a 404), unchanged from before this pass.
function budgetValue(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${tndAmount(min)} – ${tndAmount(max)} TND`
  if (min != null) return `≥ ${tndAmount(min)} TND`
  if (max != null) return `≤ ${tndAmount(max)} TND`
  return null
}

function MetaCol({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <p className="text-caption text-text-muted">{label}</p>
      <p
        dir={ltr ? 'ltr' : undefined}
        className="text-end text-body-sm font-semibold text-text-primary"
      >
        {value}
      </p>
    </div>
  )
}

export function MissionRow({ mission, lang }: { mission: MissionMatch; lang: Lang }) {
  const budget = budgetValue(mission.budgetMin, mission.budgetMax)
  // Structurally present, never true today — see the file header note.
  const isUrgent = false as boolean

  return (
    <Link
      href="/trouver-des-missions"
      className={`flex items-center justify-between gap-4 rounded-lg py-3 transition-colors hover:bg-surface-sunken ${FOCUS_RING}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <p className="truncate text-body text-text-primary">{mission.title}</p>
        {isUrgent ? (
          <span className="shrink-0 rounded-full bg-danger-100 px-2 py-0.5 text-caption font-semibold text-danger-700">
            {t('mission.urgent', lang)}
          </span>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-6">
        {/* ltr on Budget only — reference_rtl_numeric_run_reversal: a bidi-neutral-separated
            number pair ("800 – 1500") visually reorders in AR unless pinned. "Publié" is a full
            relative-time PHRASE (Arabic prose in AR mode, e.g. "منذ 39 يومًا") — forcing ltr on
            that would flip real RTL text backwards, so it stays unpinned. */}
        <MetaCol label={t('mission.col_budget', lang)} value={budget ?? '—'} ltr />
        <MetaCol
          label={t('mission.col_published', lang)}
          value={relativeTimeLabel(mission.createdAt, lang)}
        />
      </div>
    </Link>
  )
}

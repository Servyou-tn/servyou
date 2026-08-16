'use client'

import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import { tndPrice } from '@/components/listings/listing-utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import type { MyMission } from '@/lib/marche/my-data'

function budgetLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${tndPrice(min)} – ${tndPrice(max)}`
  if (min != null) return `≥ ${tndPrice(min)}`
  if (max != null) return `≤ ${tndPrice(max)}`
  return null
}

// job_posts.status → (StatusPill status, i18n label key). 'deleted' never reaches this card —
// getMyMissions excludes it at the query.
const STATUS_MAP: Record<'open' | 'filled' | 'expired', { status: StatusValue; labelKey: string }> = {
  open: { status: 'ouverte', labelKey: 'mesmissions.status.open' },
  filled: { status: 'pourvue', labelKey: 'mesmissions.status.filled' },
  expired: { status: 'expiree', labelKey: 'mesmissions.status.expired' },
}

// Full-width mission row (consumer's own posts). Same visual DNA as the order cards. The
// responses badge turns amber once the 10-response fairness cap is reached. The whole row
// links to the mission detail page (/mes-missions/[id]).
export function MissionCard({ mission }: { mission: MyMission }) {
  const lang = useLang()

  const { status: pillStatus, labelKey } = STATUS_MAP[mission.status as 'open' | 'filled' | 'expired']
  const statusLabel = t(labelKey, lang)
  const capReached = mission.response_count >= MAX_RESPONSES_PER_POST
  const dateLabel = new Date(mission.created_at).toLocaleDateString('fr-TN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const budget = budgetLabel(mission.budget_min, mission.budget_max)

  return (
    <Link
      href={`/mes-missions/${mission.id}`}
      className={`block card-premium p-6 transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">
          {mission.title}
        </p>
        <StatusPill status={pillStatus} className="shrink-0">
          {statusLabel}
        </StatusPill>
      </div>

      {mission.description && (
        <p className="mt-2 line-clamp-2 text-sm text-text-muted">{mission.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span className="text-text-muted">{dateLabel}</span>
        <span
          className={`rounded-full px-2.5 py-1 font-medium ${
            capReached ? 'bg-amber-100 text-amber-700' : 'bg-brand-blue-600/10 text-brand-blue-600'
          }`}
        >
          {t('mesmissions.responses', lang, { n: mission.response_count, max: MAX_RESPONSES_PER_POST })}
        </span>
        {budget && <span className="text-text-muted">{budget}</span>}
        {mission.city && <span className="text-text-muted">{mission.city}</span>}
        {mission.is_remote && <span className="text-text-muted">{t('mission.form.remote_label', lang)}</span>}
      </div>
    </Link>
  )
}

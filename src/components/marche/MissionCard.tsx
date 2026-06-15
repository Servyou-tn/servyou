'use client'

import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import { tndPrice } from '@/components/listings/listing-utils'
import type { MyMission } from '@/lib/marche/my-data'

function budgetLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${tndPrice(min)} – ${tndPrice(max)}`
  if (min != null) return `≥ ${tndPrice(min)}`
  if (max != null) return `≤ ${tndPrice(max)}`
  return null
}

// Full-width mission row (consumer's own posts). Same visual DNA as the order cards. The
// responses badge turns amber once the 10-response fairness cap is reached. The card does
// not link anywhere — a mission detail page is a later pass (no dead links).
export function MissionCard({ mission }: { mission: MyMission }) {
  const lang = useLang()

  const isOpen = mission.status === 'open'
  const statusLabel = t(isOpen ? 'mesmissions.status.open' : 'mesmissions.status.closed', lang)
  const capReached = mission.response_count >= MAX_RESPONSES_PER_POST
  const dateLabel = new Date(mission.created_at).toLocaleDateString('fr-TN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const budget = budgetLabel(mission.budget_min, mission.budget_max)

  return (
    <div className="card-premium p-6">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">
          {mission.title}
        </p>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            isOpen ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {mission.description && (
        <p className="mt-2 line-clamp-2 text-sm text-text-muted">{mission.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span className="text-text-muted">{dateLabel}</span>
        <span
          className={`rounded-full px-2.5 py-1 font-medium ${
            capReached ? 'bg-amber-100 text-amber-700' : 'bg-brand-accent/10 text-brand-accent'
          }`}
        >
          {t('mesmissions.responses', lang, { n: mission.response_count, max: MAX_RESPONSES_PER_POST })}
        </span>
        {budget && <span className="text-text-muted">{budget}</span>}
        {mission.city && <span className="text-text-muted">{mission.city}</span>}
        {mission.is_remote && <span className="text-text-muted">{t('mission.form.remote_label', lang)}</span>}
      </div>
    </div>
  )
}

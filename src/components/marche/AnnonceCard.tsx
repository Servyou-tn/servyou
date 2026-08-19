'use client'

import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import { tndPrice } from '@/components/listings/listing-utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import { ModerationBanner } from '@/components/ModerationBanner'
import type { MyAnnonce } from '@/lib/marche/my-data'

function budgetLabel(min: number | null, max: number | null): string | null {
  if (min != null && max != null) return `${tndPrice(min)} – ${tndPrice(max)}`
  if (min != null) return `≥ ${tndPrice(min)}`
  if (max != null) return `≤ ${tndPrice(max)}`
  return null
}

// AnnonceDisplayStatus (my_data's resolveAnnonceStatus, folding raw status + computed expiry) →
// (StatusPill status, i18n label key). 'deleted' never reaches this card — getMyAnnonces excludes
// it at the query.
const STATUS_MAP: Record<'open' | 'filled' | 'expired', { status: StatusValue; labelKey: string }> = {
  open: { status: 'ouverte', labelKey: 'mesannonces.status.open' },
  filled: { status: 'pourvue', labelKey: 'mesannonces.status.filled' },
  expired: { status: 'expiree', labelKey: 'mesannonces.status.expired' },
}

// Full-width annonce row (consumer's own posts). Same visual DNA as the order cards. The
// responses badge turns amber once the 10-response fairness cap is reached. The whole row
// links to the annonce detail page (/mes-annonces/[id]).
export function AnnonceCard({ annonce }: { annonce: MyAnnonce }) {
  const lang = useLang()

  const { status: pillStatus, labelKey } = STATUS_MAP[annonce.display_status]
  const statusLabel = t(labelKey, lang)
  const capReached = annonce.response_count >= MAX_RESPONSES_PER_POST
  const dateLabel = new Date(annonce.created_at).toLocaleDateString('fr-TN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const budget = budgetLabel(annonce.budget_min, annonce.budget_max)

  return (
    <Link
      href={`/mes-annonces/${annonce.id}`}
      className={`block card-premium p-6 transition-colors hover:bg-slate-50 ${FOCUS_RING}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 flex-1 truncate text-base font-semibold text-text-primary">
          {annonce.title}
        </p>
        <StatusPill status={pillStatus} className="shrink-0">
          {statusLabel}
        </StatusPill>
      </div>

      {/* alert={false}: N moderated rows on this list would otherwise fire N assertive
          announcements for what is, to the user, one glanceable state per row. The detail page
          keeps the default (one page-level role="alert"). */}
      {annonce.admin_hidden_at && (
        <div className="mt-3">
          <ModerationBanner variant="job_post" alert={false} />
        </div>
      )}

      {annonce.description && (
        <p className="mt-2 line-clamp-2 text-sm text-text-muted">{annonce.description}</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
        <span dir="ltr" className="text-text-muted">{dateLabel}</span>
        <span
          className={`rounded-full px-2.5 py-1 font-medium ${
            capReached ? 'bg-amber-100 text-amber-700' : 'bg-brand-blue-600/10 text-brand-blue-600'
          }`}
        >
          {/* The rule is the numeric run itself, not the sentence around it: "{n} / {max}" is
              bare digits/slash/spaces with no strong-directional anchor, so under RTL it can
              reverse to "{max} / {n}" (reference_rtl_numeric_run_reversal). "réponses"/"ردود" is
              real translated text and must stay outside the isolated run, in the ambient RTL
              flow, or it would get mirrored to the wrong side of the number. */}
          <span dir="ltr">
            {annonce.response_count} / {MAX_RESPONSES_PER_POST}
          </span>{' '}
          {t('mesannonces.responses_suffix', lang)}
        </span>
        {budget && <span dir="ltr" className="text-text-muted">{budget}</span>}
        {annonce.city && <span className="text-text-muted">{annonce.city}</span>}
        {annonce.is_remote && <span className="text-text-muted">{t('annonce.form.remote_label', lang)}</span>}
      </div>
    </Link>
  )
}

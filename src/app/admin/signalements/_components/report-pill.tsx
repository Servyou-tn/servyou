import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import { t, type Lang } from '@/lib/i18n'
import { Fragment } from 'react'
import { cn } from '@/lib/utils'
import type { SeverityTone } from '../_lib/queue'

// Shared by the J5 queue and the J6 detail. Report status → the frame's StatusPill tones:
// Ouvert = pending (warning), En cours = acceptee (blue), Résolu = success, Rejeté = danger.
const STATUS_PILL: Record<string, { status: StatusValue; key: string }> = {
  open: { status: 'pending', key: 'admin.reports.status_open' },
  under_review: { status: 'acceptee', key: 'admin.reports.pill_under_review' },
  resolved: { status: 'reçue', key: 'admin.reports.status_resolved' },
  dismissed: { status: 'annulée', key: 'admin.reports.status_dismissed' },
}

export function ReportStatusPill({ status, lang }: { status: string; lang: Lang }) {
  const pill = STATUS_PILL[status] ?? { status: 'paused' as StatusValue, key: `admin.reports.status_${status}` }
  return <StatusPill status={pill.status}>{t(pill.key, lang)}</StatusPill>
}

// The severity bar beside the reason (4 wide, radius 2): danger / warning / info -500.
const BAR: Record<SeverityTone, string> = {
  danger: 'bg-danger-500',
  warning: 'bg-warning-500',
  info: 'bg-info-500',
}

export function SeverityBar({ tone, className }: { tone: SeverityTone; className?: string }) {
  return <span aria-hidden="true" className={cn('w-1 shrink-0 rounded-sm', BAR[tone], className)} />
}

// A « · »-joined meta line whose parts are data (shop, person, city): each part is isolated in <bdi> so a
// Latin name keeps its trailing period in Arabic (« Mehdi C. », not « .Mehdi C »).
export function MetaParts({ parts }: { parts: string[] }) {
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 ? ' · ' : null}
          <bdi>{part}</bdi>
        </Fragment>
      ))}
    </>
  )
}

// The reason as a pill (J6 « Motif et description »): danger for scams, warning / blue for the rest.
const REASON_PILL: Record<SeverityTone, StatusValue> = { danger: 'annulée', warning: 'pending', info: 'acceptee' }

export function ReasonPill({ tone, label }: { tone: SeverityTone; label: string }) {
  return <StatusPill status={REASON_PILL[tone]}>{label}</StatusPill>
}

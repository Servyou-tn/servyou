import type { LucideIcon } from 'lucide-react'
import { FilePlus2, CheckCircle2, Send, History } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { statusPillFor } from '@/lib/orders/order-status'
import type { ActivityEvent } from '@/lib/marche/freelancer-dashboard'
import { Panel, PanelEmpty } from './Panel'
import { relativeTimeLabel } from './relative-time'

// Ruling 8 (docs/design/h4-discovery.md) — founder-ruled from the event tables, NOT
// Figma-measured: the frame only ever drew the panel header (167:12333), its "Voir tout" link
// points at no real route (omitted here, not fake-disabled — see the link-destination rule,
// h4-discovery.md §4), and the panel body itself has never been drawn. PROVISIONAL: gets
// corrected against Figma if/when quota resets and the body is ever actually authored there.

// Tone/icon per event kind. `status` events all use CheckCircle2 regardless of tone (the ruling
// fixes the icon, only the colour varies) — `received` reads success, `cancelled` reads danger
// (a cancelled order is not a success, "success on terminal states" as a blanket rule would have
// painted it green), anything else (accepted/arrived) reads the same info-blue as a new request.
const TONE = {
  info: 'bg-brand-blue-100 text-brand-blue-600',
  success: 'bg-success-100 text-success-500',
  danger: 'bg-danger-100 text-danger-500',
  accent: 'bg-brand-indigo-100 text-brand-indigo-500',
} as const

function presentationFor(item: ActivityEvent): { Icon: LucideIcon; toneClass: string } {
  switch (item.kind) {
    case 'request':
      return { Icon: FilePlus2, toneClass: TONE.info }
    case 'proposal':
      return { Icon: Send, toneClass: TONE.accent }
    case 'status':
      if (item.status === 'received') return { Icon: CheckCircle2, toneClass: TONE.success }
      if (item.status === 'cancelled') return { Icon: CheckCircle2, toneClass: TONE.danger }
      return { Icon: CheckCircle2, toneClass: TONE.info }
  }
}

/**
 * "Engagement {status}" reusing statusPillFor()/PILL_BASE — no invented strings. All rows here
 * are service orders (the query filters order_type='service'), so orderType is always 'service'.
 *
 * Flagged, not fixed: `statusPillFor('arrived', 'service')` yields "Travail livré", so this row
 * can read "Engagement Travail livré" — slightly odd French, but that string is shipped and
 * locked elsewhere (E3/G8/G9); this panel does not get its own copy of it.
 */
function primaryLabel(item: ActivityEvent, lang: Lang): string {
  switch (item.kind) {
    case 'request':
      return t('activite.request_title', lang)
    case 'proposal':
      return t('activite.proposal_title', lang)
    case 'status': {
      const mapped = statusPillFor(item.status, 'service')
      const statusLabel = mapped ? t(mapped.labelKey, lang) : item.status
      return t('activite.engagement_status', lang, { status: statusLabel })
    }
  }
}

function secondaryLabel(item: ActivityEvent): string | null {
  return item.title || null
}

function ActivityRow({ item, lang }: { item: ActivityEvent; lang: Lang }) {
  const { Icon, toneClass } = presentationFor(item)
  const secondary = secondaryLabel(item)
  return (
    <li className="flex items-center gap-3 py-3">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body text-text-primary">{primaryLabel(item, lang)}</p>
        {secondary ? <p className="truncate text-body-sm text-text-muted">{secondary}</p> : null}
      </div>
      <span className="shrink-0 text-caption text-text-muted">
        {relativeTimeLabel(item.createdAt, lang)}
      </span>
    </li>
  )
}

export function ActiviteRecente({ items, lang }: { items: ActivityEvent[]; lang: Lang }) {
  return (
    <Panel title={t('activite.title', lang)}>
      {items.length === 0 ? (
        <PanelEmpty
          icon={History}
          title={t('activite.empty_title', lang)}
          body={t('activite.empty_body', lang)}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-border-subtle">
          {items.map((item, i) => (
            // createdAt + kind is not guaranteed unique (two status rows on the same order could
            // in principle share a timestamp at second resolution) — index is stable within one
            // render of one already-sorted, capped-at-4 array, so it is safe here specifically.
            <ActivityRow key={`${item.kind}-${item.createdAt}-${i}`} item={item} lang={lang} />
          ))}
        </ul>
      )}
    </Panel>
  )
}

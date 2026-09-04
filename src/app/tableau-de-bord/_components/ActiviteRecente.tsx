import type { LucideIcon } from 'lucide-react'
import { Package, CheckCircle2, FileCheck2, Send, History } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { statusPillFor } from '@/lib/orders/order-status'
import type { ActivityEvent } from '@/lib/marche/freelancer-dashboard'
import { Panel, PanelEmpty } from './Panel'
import { relativeTimeLabel } from './relative-time'

// Pass 4 (167:12333, figma-cli Safe Mode read) — Ruling 8 is SUPERSEDED. The frame draws this
// panel's body after all; it did not when Ruling 8 was written (quota exhausted before reaching
// it). Structural facts from the measured read:
//   - icon circle is 32px, not 36.
//   - each row is ONE stack: primary line, then relative time directly beneath it, both
//     left-aligned. Not a primary/secondary pair with time pushed to a separate right column.
//   - there is no secondary line at all — event detail (a title, a name) is inlined into the
//     primary sentence with guillemets, not shown as a second line.
//   - rows are GAP-separated (16px), not divided by a hairline border — Missions récentes' rows
//     use dividers, this panel's rows do not.
//
// Three of the four measured kinds are built: `request`, `proposal`, and the `status`==='received'
// case ("Engagement terminé avec {name}" — buyer name via the G8 public_profiles pattern, see
// freelancer-dashboard.ts). The fourth ("Service «title» publié") is NOT built:
// service_listings has no honest publish-transition timestamp, only created_at, which conflates
// a drafted listing with a published one — logged in docs/follow-ups.md, waits for a migration.
// A 'received' row whose buyer-name lookup came back empty, or any other status, falls back to
// the pre-Pass-4 generic CheckCircle2/"Engagement {status}" rendering — never "avec " with
// nothing after it.
const TONE = {
  info: 'bg-brand-blue-100 text-brand-blue-600',
  success: 'bg-success-100 text-success-500',
  danger: 'bg-danger-100 text-danger-500',
  accent: 'bg-brand-indigo-100 text-brand-indigo-500',
  // 📐 167:12333 — measured pairing is the reverse of Pass 1-3's guess: "Réponse envoyée" is
  // grey, "Engagement terminé" is indigo (not send=indigo, done=success as shipped before).
  neutral: 'bg-surface-sunken text-icon-muted',
} as const

function presentationFor(item: ActivityEvent): { Icon: LucideIcon; toneClass: string } {
  switch (item.kind) {
    case 'request':
      return { Icon: Package, toneClass: TONE.info } // 📐 167:12333 — was FilePlus2
    case 'proposal':
      return { Icon: Send, toneClass: TONE.neutral } // 📐 was accent/indigo — measured grey
    case 'status':
      if (item.status === 'received' && item.buyerName) {
        return { Icon: FileCheck2, toneClass: TONE.accent } // 📐 the measured "terminé" kind
      }
      if (item.status === 'received') return { Icon: CheckCircle2, toneClass: TONE.success }
      if (item.status === 'cancelled') return { Icon: CheckCircle2, toneClass: TONE.danger }
      return { Icon: CheckCircle2, toneClass: TONE.info }
  }
}

/**
 * `request`, `proposal`, and 'received'-with-a-name are 📐 MEASURED exact templates (167:12333).
 * Every other `status` value keeps reusing statusPillFor()/PILL_BASE — no invented strings there
 * either, but it's the pre-Pass-4 ruled template (not part of the four measured kinds). All rows
 * here are service orders (the query filters order_type='service'), so orderType is always
 * 'service'.
 *
 * Flagged, not fixed: `statusPillFor('arrived', 'service')` yields "Travail livré", so this row
 * can read "Engagement Travail livré" — slightly odd French, but that string is shipped and
 * locked elsewhere (E3/G8/G9); this panel does not get its own copy of it.
 */
function primaryLabel(item: ActivityEvent, lang: Lang): string {
  switch (item.kind) {
    case 'request':
      return t('activite.request_title', lang) // bare — Figma has no interpolation for this kind
    case 'proposal':
      return item.title
        ? t('activite.proposal_title', lang, { title: item.title })
        : t('activite.proposal_title_untitled', lang)
    case 'status': {
      if (item.status === 'received' && item.buyerName) {
        return t('activite.engagement_termine', lang, { name: item.buyerName })
      }
      const mapped = statusPillFor(item.status, 'service')
      const statusLabel = mapped ? t(mapped.labelKey, lang) : item.status
      return t('activite.engagement_status', lang, { status: statusLabel })
    }
  }
}

function ActivityRow({ item, lang }: { item: ActivityEvent; lang: Lang }) {
  const { Icon, toneClass } = presentationFor(item)
  return (
    <li className="flex items-center gap-3">
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneClass}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body-sm leading-[normal] text-text-primary">{primaryLabel(item, lang)}</p>
        <p className="text-caption leading-[normal] text-text-muted">
          {relativeTimeLabel(item.createdAt, lang)}
        </p>
      </div>
    </li>
  )
}

export function ActiviteRecente({ items, lang }: { items: ActivityEvent[]; lang: Lang }) {
  return (
    <Panel
      title={t('activite.title', lang)}
      // Pass 3: the frame does draw this header link. Activité récente still has no dedicated
      // full-list route, so `href: null` renders it inert rather than a 404 Link.
      link={{ href: null, label: t('activite.view_all', lang) }}
    >
      {items.length === 0 ? (
        <PanelEmpty
          icon={History}
          title={t('activite.empty_title', lang)}
          body={t('activite.empty_body', lang)}
        />
      ) : (
        <ul className="flex flex-col gap-4">
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

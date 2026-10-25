import { Briefcase, Store, User, Wrench } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { getInitials } from '@/components/ui/initials'
import { StatusPill } from '@/components/ui/status-pill'
import { t, type Lang } from '@/lib/i18n'
import { formatServicePrice } from '@/lib/freelance/service-price'
import { statusPillFor, shortDate, shortRef } from '@/lib/orders/order-status'
import { getSector } from '@/lib/taxonomy/service-categories'
import type { Engagement, EngagementClientType } from '@/lib/marche/engagements'
import { CATEGORY_ICONS } from '@/app/mes-services/_components/category-icons'
import { EngagementActions } from './EngagementActions'

// Engagement Row — Figma 274:9204 (state default; hover not measured), docs/design/h8-measurements.md.
// A FLAT divided table row: h 96, px 24, py 20, gap 16, `surface/base`, bottom 1 px `border/subtle`.
//   client  200 · avatar 40 + [name Semi Bold 16 · clientType icon 16 + Medium 12]
//   service flex · serviceIcon 32 (blue/50, r 8, glyph 20) + [title Regular 16 · category Medium 12 muted]
//   statut  105 · StatusPill
//   budget  95→140 · Bold 16
//   délai   160 · date Regular 14 muted over a Semi Bold 14 line (or one note)
//   actions 205→208 · [next 120 · whatsapp 36 · kebab 36]
//
// Deviations from the frame, each an architect ruling (D1–D10) or a necessity:
//   • Budget reads « Dès 300 TND » (D3): orders.unit_price_tnd is the listing's STARTING price, so a bare
//     « 300 TND » would claim a negotiated amount. The column is 140 wide, not 95, to hold « Dès 3 500 TND » and the longer Arabic « ابتداءً من 350 د.ت » on one line.
//   • The échéance column is « Délai souhaité » (D4): there is no deadline column yet (PR-3). The two lines
//     are « Demandée le {date} » over what the buyer asked for; terminal states keep the frame's single note.
//   • The actions cell is 208, not 205: the frame's own content (120+8+36+8+36) is 208 and the frame clips it.
//   • Pills are `statusPillFor`, unchanged (D2): lifecycle colours stay as E3 / G8 draw them.
//   • Below `lg` the row stacks as a card (no mobile frame exists): client + pill, service, then the two
//     value cells with captions, then the actions — the same shape as H5's ServiceRow.
//
// Server Component: only the actions cell is interactive.
//
// ⚑ NO `cn()` around a `text-<size>` next to a `text-<colour>`: tailwind-merge treats them as one group and
// evicts the size (reference_twmerge_text_size_color_footgun) — those classes are plain template strings here.

const CLIENT_TYPE: Record<EngagementClientType, { icon: LucideIcon; labelKey: string; tone: string }> = {
  consumer: { icon: User, labelKey: 'engagements.client_type.consumer', tone: 'text-text-secondary' },
  shop: { icon: Store, labelKey: 'engagements.client_type.shop', tone: 'text-brand-blue-600' },
  freelancer: { icon: Briefcase, labelKey: 'engagements.client_type.freelancer', tone: 'text-text-secondary' },
}

export function EngagementRow({ engagement: e, lang }: { engagement: Engagement; lang: Lang }) {
  const pill = statusPillFor(e.status, 'service')
  const sector = e.categorySlug ? getSector(e.categorySlug) : undefined
  const category = sector ? (lang === 'ar' ? sector.labelAr : sector.labelFr) : null
  const CategoryIcon = (e.categorySlug && CATEGORY_ICONS[e.categorySlug]) || Wrench
  const client = CLIENT_TYPE[e.clientType]
  const ClientIcon = client.icon
  const clientName = e.clientName || t('engagements.client_unknown', lang)

  const whatsappMessage = t('engagements.whatsapp_message', lang, {
    buyer: clientName,
    ref: shortRef(e.id),
    service: e.title,
  })

  return (
    <li className="flex flex-col gap-3 border-b border-border-subtle bg-surface-base p-4 last:border-b-0 lg:flex-row lg:items-center lg:gap-4 lg:px-6 lg:py-5">
      {/* client + (below lg) the pill on the same line */}
      <div className="flex items-center justify-between gap-3 lg:w-[200px] lg:shrink-0 lg:justify-start">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="md" src={e.clientAvatarUrl} name={clientName} initials={getInitials(e.clientName)} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <p dir="auto" className="truncate text-body font-semibold leading-6 text-text-primary">
              {clientName}
            </p>
            <p className={`flex items-center gap-1 text-caption font-medium ${client.tone}`}>
              <ClientIcon className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t(client.labelKey, lang)}</span>
            </p>
          </div>
        </div>
        {pill ? (
          <span className="lg:hidden">
            <StatusPill status={pill.pill}>{t(pill.labelKey, lang)}</StatusPill>
          </span>
        ) : null}
      </div>

      {/* service */}
      <div className="flex min-w-0 items-center gap-3 lg:flex-1">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue-50">
          <CategoryIcon className="size-5 text-brand-blue-300" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* dir="auto": a French title inside an Arabic row takes its own direction, so it truncates at its END
              (a <bdi> inside an RTL paragraph clips the HEAD of the string — measured). */}
          <p dir="auto" className="truncate text-body leading-6 text-text-primary">
            {e.title}
          </p>
          {category ? <p className="truncate text-caption font-medium text-text-muted">{category}</p> : null}
        </div>
      </div>

      {/* statut — its own column from lg */}
      <div className="hidden lg:flex lg:w-[105px] lg:shrink-0">
        {pill ? <StatusPill status={pill.pill}>{t(pill.labelKey, lang)}</StatusPill> : null}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:contents">
        {/* budget */}
        <div className="flex flex-col gap-0.5 lg:w-[140px] lg:shrink-0">
          <p className="text-caption text-text-muted lg:hidden">{t('engagements.col.budget', lang)}</p>
          <p className="whitespace-nowrap text-body font-bold leading-6 text-text-primary">
            {e.startingPrice != null
              ? t('engagements.budget_from', lang, { price: formatServicePrice(e.startingPrice, lang) })
              : '—'}
          </p>
        </div>

        {/* délai souhaité */}
        <div className="flex min-w-0 flex-col gap-0.5 lg:w-[160px] lg:shrink-0">
          <p className="text-caption text-text-muted lg:hidden">{t('engagements.col.timeframe', lang)}</p>
          <TimeframeCell engagement={e} lang={lang} />
        </div>
      </div>

      {/* actions */}
      <div className="lg:w-[208px] lg:shrink-0">
        <EngagementActions
          orderId={e.id}
          status={e.status}
          clientId={e.clientId}
          title={e.title}
          lang={lang}
          whatsappMessage={whatsappMessage}
          detailHref={`/mes-engagements/${e.id}`}
        />
      </div>
    </li>
  )
}

// The frame's two-line cell for rows still moving, one note for rows that are not (Figma 273:9163 vs 273:9165).
function TimeframeCell({ engagement: e, lang }: { engagement: Engagement; lang: Lang }) {
  const muted = 'text-body-sm leading-5 text-text-muted'
  switch (e.status) {
    case 'pending':
    case 'accepted':
      return (
        <>
          <p className={`${muted} truncate`}>{t('engagements.requested_on', lang, { date: shortDate(e.createdAt, lang) })}</p>
          <p className={`${muted} truncate font-semibold`}>
            {e.requestedTimeframe ? <bdi>{e.requestedTimeframe}</bdi> : t('engagements.timeframe_none', lang)}
          </p>
        </>
      )
    case 'arrived':
      return <p className={`${muted} font-semibold`}>{t('engagements.note.awaiting_confirmation', lang)}</p>
    case 'received':
      return (
        <p className={`${muted} font-semibold`}>
          {e.receivedAt
            ? t('engagements.note.done_on', lang, { date: shortDate(e.receivedAt, lang) })
            : t('engagements.note.done', lang)}
        </p>
      )
    case 'cancelled':
      return (
        <>
          <p className={`${muted} font-semibold`}>
            {e.cancelledAt
              ? t('engagements.note.cancelled_on', lang, { date: shortDate(e.cancelledAt, lang) })
              : t('engagements.note.cancelled', lang)}
          </p>
          {e.cancellationReason ? (
            <p className="truncate text-caption text-text-muted" title={e.cancellationReason}>
              <bdi>{e.cancellationReason}</bdi>
            </p>
          ) : null}
        </>
      )
    default:
      return null
  }
}

import { User, Wrench } from 'lucide-react'
import { StatusPill } from '@/components/ui/status-pill'
import { CATEGORY_ICONS } from '@/components/shared/service-category-icons'
import { t, type Lang } from '@/lib/i18n'
import { ANNONCE_STATUS_PILL } from '@/lib/marche/annonce-status'
import { localizeCity } from '@/lib/marche/missions'
import type { Proposal } from '@/lib/marche/proposals'
import { formatServicePrice, servicePriceLabel } from '@/lib/freelance/service-price'
import { shortDate } from '@/lib/orders/order-status'
import { relativeTimeLabel } from '@/app/tableau-de-bord/_components/relative-time'
import { ProposalActions } from './ProposalActions'
import { COL } from './proposal-columns'

// Proposition Row — Figma 296:9022 (instances 299:9761…), docs/design/h9-h13-measurements.md §5.2. A FLAT divided table row: h 96,
// px 24, py 20, gap 16, `surface/base`, bottom 1 px `border/subtle`.
//   mission  FILL · iconBox 32 (blue/50, r 8, glyph 20) + [title Regular 16 · category Medium 12 muted]
//   client   170  · « Karim · Tunis » Semi Bold 16 + user icon 16 + « Consommateur » Medium 12
//   terms    120  · price Bold 16 over délai Regular 14 muted; no price → « Selon budget » Regular 14 muted
//   statut   120  · « Envoyée » Medium 12 muted over the StatusPill of the POST state
//   sentOn   120  · « 14 juil » Regular 14 over « il y a 2 jours » Regular 13 muted
//   actions  207  · ProposalActions
//
// Deviations, each a numbered decision in the PR: a post the responder can no longer read (`unavailable`) has no title / client /
// category — the row says so instead of printing blanks (D-H11-11); the délai line is printed whenever there is one, price or not
// (the frame's specimen with no price has no délai either, which is a property of that specimen, not a rule); « il y a N jours » is
// the existing helper's spelled-out form (D-H11-10). Below `xl` the row stacks as a labelled card (the frame has no mobile).
//
// Server Component: only the actions cell is interactive.
// ⚑ No `cn()` around a `text-<size>` next to a `text-<colour>` (reference_twmerge_text_size_color_footgun): plain template strings.

const STATE_PILL = {
  open: ANNONCE_STATUS_PILL.open,
  filled: ANNONCE_STATUS_PILL.filled,
  expired: ANNONCE_STATUS_PILL.expired,
  unavailable: { status: 'withdrawn', labelKey: 'propositions.status.unavailable' },
} as const

export function ProposalRow({ proposal: p, lang }: { proposal: Proposal; lang: Lang }) {
  const pill = STATE_PILL[p.state]
  const gone = p.state === 'unavailable'
  const title = p.title ?? t('propositions.mission_unavailable', lang)
  const category = lang === 'ar' ? (p.categoryNameAr ?? p.categoryNameFr) : p.categoryNameFr
  const CategoryIcon = (p.categorySlug && CATEGORY_ICONS[p.categorySlug]) || Wrench
  const city = localizeCity(p.clientCity, lang)
  const clientName = p.clientFirstName || t('propositions.client_unknown', lang)

  return (
    <li className={`flex flex-col gap-3 border-b border-border-subtle bg-surface-base p-4 last:border-b-0 xl:py-5 ${COL.line}`}>
      {/* mission + (below xl) the pill on the same line */}
      <div className={`flex items-center justify-between gap-3 ${COL.mission}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue-50">
            <CategoryIcon className="size-5 text-brand-blue-300" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            {/* dir="auto": a French title inside an Arabic row takes its own direction; line-clamp-2, not a one-line ellipsis. */}
            <p dir="auto" className={`line-clamp-2 break-words text-body leading-6 ${gone ? 'text-text-muted' : 'text-text-primary'}`}>
              {title}
            </p>
            {category ? <p className="truncate text-caption font-medium text-text-muted">{category}</p> : null}
          </div>
        </div>
        <span className="shrink-0 xl:hidden">
          <StatusPill status={pill.status}>{t(pill.labelKey, lang)}</StatusPill>
        </span>
      </div>

      {/* client */}
      <div className={`flex min-w-0 flex-col gap-0.5 ${COL.client}`}>
        <p className="text-caption text-text-muted xl:hidden">{t('propositions.col.client', lang)}</p>
        {gone ? (
          <p className="text-body leading-6 text-text-muted">—</p>
        ) : (
          <>
            {/* <bdi> around each part, no dir="auto" on the <p>: a Latin first name beside an Arabic city must not flip the whole
                line's direction or reorder (reference_ar_latin_adjacency_bidi). */}
            <p className="line-clamp-2 break-words text-body font-semibold leading-6 text-text-primary">
              <bdi>{clientName}</bdi>
              {city ? (
                <>
                  {' · '}
                  <bdi>{city}</bdi>
                </>
              ) : null}
            </p>
            <p className="flex items-center gap-1 text-caption font-medium text-text-secondary">
              <User className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{t('propositions.client_type', lang)}</span>
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 xl:contents">
        {/* ma proposition */}
        <div className={`flex min-w-0 flex-col gap-0.5 ${COL.terms}`}>
          <p className="text-caption text-text-muted xl:hidden">{t('propositions.col.terms', lang)}</p>
          {p.price != null ? (
            <p className="whitespace-nowrap text-body font-bold leading-6 text-text-primary">
              {servicePriceLabel(formatServicePrice(p.price, lang), null, lang)}
            </p>
          ) : (
            <p className="text-body-sm leading-5 text-text-muted">{t('propositions.price_by_budget', lang)}</p>
          )}
          {p.timeframe ? (
            <p dir="auto" className="truncate text-body-sm leading-5 text-text-muted">
              {p.timeframe}
            </p>
          ) : null}
        </div>

        {/* envoyée le */}
        <div className={`flex min-w-0 flex-col gap-0.5 ${COL.sentOn}`}>
          <p className="text-caption text-text-muted xl:hidden">{t('propositions.col.sent_on', lang)}</p>
          <p className="truncate text-body-sm leading-5 text-text-muted">{shortDate(p.createdAt, lang)}</p>
          <p className="truncate text-[13px] leading-5 text-text-muted">{relativeTimeLabel(p.createdAt, lang)}</p>
        </div>
      </div>

      {/* statut — its own column from xl; the « Envoyée » caption sits above the post-state pill */}
      <div className={`hidden flex-col items-start gap-1 xl:flex ${COL.statut}`}>
        <p className="text-caption font-medium text-text-muted">{t('propositions.sent_caption', lang)}</p>
        <StatusPill status={pill.status}>{t(pill.labelKey, lang)}</StatusPill>
      </div>

      {/* actions */}
      <div className={COL.actions}>
        <ProposalActions
          responseId={p.id}
          jobPostId={p.jobPostId}
          state={p.state}
          clientId={p.clientId}
          title={title}
          lang={lang}
          whatsappMessage={t('proposal.sent.whatsapp_message', lang, { name: clientName, title })}
        />
      </div>
    </li>
  )
}

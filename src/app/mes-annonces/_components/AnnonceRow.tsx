import { Briefcase } from 'lucide-react'
import { StatusPill } from '@/components/ui/status-pill'
import { ModerationBanner } from '@/components/ModerationBanner'
import { CATEGORY_ICONS } from '@/components/shared/service-category-icons'
import { t, tn, type Lang } from '@/lib/i18n'
import { annonceProposalsNote } from '@/lib/marche/annonces-list'
import { getExpiryCountdownDays } from '@/lib/marche/annonce-expiry-countdown'
import { ANNONCE_STATUS_PILL, isAnnoncePastExpiry } from '@/lib/marche/annonce-status'
import { formatJobBudget, hasJobBudget } from '@/lib/marche/format-job-budget'
import type { MyAnnonce } from '@/lib/marche/my-data'
import { shortDate } from '@/lib/orders/order-status'
import { relativeTimeLabel } from '@/lib/relative-time'
import { AnnonceRowActions } from './AnnonceRowActions'
import { COL } from './annonce-columns'

// Annonce row — Figma 1476:27949 « PropositionRow » (instances 1476:28001…), docs/design/mes-annonces-measurements.md §F3. A FLAT divided
// table row: h 96, px 24, py 20, gap 16, `surface/base`, bottom 1 px `border/subtle`.
//   mission     FILL · iconBox 32 (blue/50, r 8, glyph 20) + [title Regular 16 · category Medium 12 muted]
//   propositions 170 · « 5 propositions » Semi Bold 16 over a Medium 12 note (sur 10 maximum · en attente · freelance choisi · aucune retenue)
//   budget      120  · « 800 TND » Bold 16 over the deadline (14 muted); no budget → « Selon budget » Regular 14 muted
//   statut      120  · « Annonce » Medium 12 muted over the StatusPill
//   publiée le  120  · « 14 juil » Regular 14 over « il y a 2h » Regular 13 muted
//   actions     207  · AnnonceRowActions
// Below `xl` the row stacks as the 375 frame's card-row: same order, no column labels (the frame has none).
//
// Kept from the card this replaces (not drawn): the moderation notice (`admin_hidden_at`) under the title and the last-7-days expiry
// countdown under the pill — the owner must still see them. Server Component: only the actions cell is interactive.
// ⚑ No `cn()` around a `text-<size>` next to a `text-<colour>` (reference_twmerge_text_size_color_footgun): plain template strings.

export function AnnonceRow({ annonce: a, lang }: { annonce: MyAnnonce; lang: Lang }) {
  const pill = ANNONCE_STATUS_PILL[a.display_status]
  const category = lang === 'ar' ? (a.category_ar ?? a.category) : a.category
  const CategoryIcon = (a.category_slug && CATEGORY_ICONS[a.category_slug]) || Briefcase
  const note = annonceProposalsNote(a)
  const hasBudget = hasJobBudget(a.budget_min, a.budget_max)
  const countdownDays = a.display_status === 'open' ? getExpiryCountdownDays(a.created_at) : null
  const canClose = a.display_status === 'open'
  // Mirrors reopenMissionAction: only a filled post still inside its 30 days (the server action re-checks).
  const canReopen = a.status === 'filled' && !isAnnoncePastExpiry(a.created_at)

  return (
    <li className={`flex flex-col gap-4 border-b border-border-subtle bg-surface-base px-4 py-5 last:border-b-0 ${COL.line}`}>
      {/* mission */}
      <div className={`flex min-w-0 flex-col gap-2 ${COL.mission}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue-50">
            <CategoryIcon className="size-5 text-brand-blue-300" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            {/* dir="auto": a French title inside an Arabic row takes its own direction; line-clamp-2, not a one-line ellipsis. */}
            <p dir="auto" className="line-clamp-2 break-words text-body leading-6 text-text-primary">
              {a.title}
            </p>
            {category ? <p className="truncate text-caption font-medium text-text-muted">{category}</p> : null}
          </div>
        </div>
        {/* alert={false}: N moderated rows would otherwise fire N assertive announcements. */}
        {a.admin_hidden_at ? <ModerationBanner variant="job_post" alert={false} /> : null}
      </div>

      {/* propositions */}
      <div className={`flex min-w-0 flex-col gap-0.5 ${COL.proposals}`}>
        <p className="truncate text-body font-semibold leading-6 text-text-primary">
          {a.response_count === 0
            ? t('mesannonces.row.proposals_zero', lang)
            : tn('mesannonces.row.proposals', lang, a.response_count)}
        </p>
        <p className="truncate text-caption font-medium text-text-secondary">
          {note.key === 'of_max'
            ? t('mesannonces.row.of_max', lang, { max: note.max ?? 0 })
            : t(`mesannonces.row.${note.key}`, lang)}
        </p>
      </div>

      {/* budget */}
      <div className={`flex min-w-0 flex-col gap-0.5 ${COL.budget}`}>
        {hasBudget ? (
          // dir="ltr": « 200 – 400 TND » reorders in an RTL row otherwise (format-job-budget.ts).
          <p dir="ltr" className="whitespace-nowrap text-start text-body font-bold leading-6 text-text-primary">
            {formatJobBudget(a.budget_min, a.budget_max, lang)}
          </p>
        ) : (
          <p className="text-body-sm leading-6 text-text-muted">{t('mesannonces.row.budget_none', lang)}</p>
        )}
        {a.deadline ? (
          <p className="truncate text-body-sm leading-5 text-text-muted">
            {t('mesannonces.row.deadline', lang, { date: shortDate(a.deadline, lang) })}
          </p>
        ) : null}
      </div>

      {/* statut — the « Annonce » caption sits above the pill */}
      <div className={`flex flex-col items-start gap-1 ${COL.statut}`}>
        <p className="text-caption font-medium text-text-muted">{t('mesannonces.row.status_caption', lang)}</p>
        <StatusPill status={pill.status}>{t(pill.labelKey, lang)}</StatusPill>
        {countdownDays != null ? (
          <p className="text-caption font-semibold text-warning-700">{tn('mesannonces.expiry_countdown', lang, countdownDays)}</p>
        ) : null}
      </div>

      {/* publiée le */}
      <div className={`flex min-w-0 flex-col gap-0.5 ${COL.publishedOn}`}>
        <p className="truncate text-body-sm leading-5 text-text-muted">{shortDate(a.created_at, lang)}</p>
        <p className="truncate text-[13px] leading-5 text-text-muted">{relativeTimeLabel(a.created_at, lang)}</p>
      </div>

      <div className={COL.actions}>
        <AnnonceRowActions id={a.id} title={a.title} canClose={canClose} canReopen={canReopen} lang={lang} />
      </div>
    </li>
  )
}

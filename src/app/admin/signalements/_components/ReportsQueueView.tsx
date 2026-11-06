import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { SortSelect } from '@/components/orders/SortSelect'
import { ErrorState } from '@/components/marche/ErrorState'
import type { ReportTab, SeverityTone } from '../_lib/queue'
import { MetaParts, ReportStatusPill, SeverityBar } from './report-pill'
import { ReportSearch } from './ReportSearch'

// J5 « Signalements » (Figma NOV 4 — Admin, 1440 + admin-m375-reports). Presentational: the page
// resolves the data into rows and hrefs. lg+ draws the table; below lg the frame's cards. User-generated
// text (titles, names) sits in <bdi> so a Latin name keeps its punctuation in Arabic (« Sami R. »).

export type QueueRow = {
  id: string
  href: string
  status: string
  tone: SeverityTone
  reasonLabel: string
  title: string
  meta: string[]
  reporterName: string
  reporterInitials: string
  /** « 3 signalements envoyés » — null when the count read failed. */
  reporterSent: string | null
  /** The 375 card line: « Signalé par … · il y a 2h ». */
  cardBy: string
  received: string
}

export type QueueTab = { key: ReportTab; href: string; active: boolean; count?: number }
export type QueueSelect = { value: string; label: string; options: { value: string; label: string; href: string }[] }

export function ReportsQueueView({
  lang,
  tabs,
  q,
  selects,
  rows,
  failed,
  emptyKey,
}: {
  lang: Lang
  tabs: QueueTab[]
  q: string
  selects: QueueSelect[]
  rows: QueueRow[]
  failed: boolean
  emptyKey: string
}) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('admin.reports.title', lang)}</h1>
        <p className="text-body-sm text-text-secondary">
          <span className="lg:hidden">{t('admin.reports.subtitle_short', lang)}</span>
          <span className="hidden lg:inline">{t('admin.reports.subtitle', lang)}</span>
        </p>
      </header>

      {/* Tabs — a <nav> of links (each is a navigation, the /mes-annonces reasoning). Tab Item h44 px16 gap8;
          active Semi Bold blue-600 + 2px indicator; inactive Medium muted; count badge 16 blue-600. */}
      <nav
        aria-label={t('admin.reports.tabs_aria', lang)}
        className="flex min-w-0 overflow-x-auto border-b border-border-subtle bg-surface-base [scrollbar-width:none]"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={tab.active ? 'page' : undefined}
            // text-body is appended OUTSIDE cn(): twMerge would evict it next to the text colour.
            className={`${cn(
              'relative flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-4 transition-colors',
              tab.active ? 'font-semibold text-brand-blue-600' : 'font-medium text-text-muted hover:text-text-primary',
              FOCUS_RING,
            )} text-body`}
          >
            {t(`admin.reports.tab.${tab.key}`, lang)}
            {tab.count ? (
              <span dir="ltr" className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-blue-600 px-1 text-xs font-semibold text-white">
                {tab.count}
              </span>
            ) : null}
            {tab.active ? <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-blue-600" /> : null}
          </Link>
        ))}
      </nav>

      {/* Filters — search FILL + three 180 selects, gap 12. Not drawn at 375 (admin-m375-reports). */}
      <div className="hidden items-center gap-3 lg:flex">
        <ReportSearch key={q} q={q} lang={lang} />
        {/* Select trigger 180 wide (frame) — the shared SortSelect hugs at min 148, so the wrapper sizes it. */}
        {selects.map((s) => (
          <div key={s.label} className="w-[180px] shrink-0 [&>button]:w-full [&>button]:max-w-none">
            <SortSelect value={s.value} options={s.options} label={s.label} />
          </div>
        ))}
      </div>

      {failed ? (
        <ErrorState lang={lang} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-border-subtle bg-surface-base px-5 py-8 text-center text-body-sm text-text-muted">
          {t(emptyKey, lang)}
        </p>
      ) : (
        <>
          <QueueTable lang={lang} rows={rows} />
          <ul className="flex flex-col gap-4 lg:hidden">
            {rows.map((row, i) => (
              <li key={row.id}>
                <QueueCard lang={lang} row={row} primary={i === 0} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function actionLabel(row: QueueRow, lang: Lang): string {
  return t(row.status === 'under_review' ? 'admin.reports.action_resume' : 'admin.reports.action_examine', lang)
}

function buttonClass(primary: boolean, size: 'sm' | 'md'): string {
  const variant = primary ? 'primary' : 'secondary'
  return cn(BUTTON_BASE, BUTTON_SIZE[size], VARIANT_BASE[variant], VARIANT_STATE[variant])
}

// Table — container radius 12, border-subtle; thead pad 10/20 on surface-subtle, 12 Medium muted
// uppercase; rows pad 14/20, gap 16. Column widths are the frame's (190 · fill · 240 · 90 · 150 · 110),
// each plus its share of the 16 gap and the 20 edge pad.
function QueueTable({ lang, rows }: { lang: Lang; rows: QueueRow[] }) {
  const th = 'px-2 py-2.5 text-start text-caption font-medium uppercase text-text-muted first:ps-5 last:pe-5'
  const td = 'px-2 py-3.5 align-middle first:ps-5 last:pe-5'
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border-subtle bg-surface-base lg:block">
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-[218px]" />
          <col />
          <col className="w-[256px]" />
          <col className="w-[106px]" />
          <col className="w-[166px]" />
          <col className="w-[138px]" />
        </colgroup>
        <thead className="border-b border-border-subtle bg-surface-subtle">
          <tr>
            <th scope="col" className={th}>{t('admin.reports.field_reason', lang)}</th>
            <th scope="col" className={th}>{t('admin.reports.col_content', lang)}</th>
            <th scope="col" className={th}>{t('admin.reports.field_reporter', lang)}</th>
            <th scope="col" className={th}>{t('admin.reports.col_received', lang)}</th>
            <th scope="col" className={th}>{t('admin.reports.field_status', lang)}</th>
            <th scope="col" className={th}><span className="sr-only">{t('admin.reports.col_action', lang)}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row, i) => (
            <tr key={row.id}>
              <td className={td}>
                <div className="flex items-center gap-2">
                  <SeverityBar tone={row.tone} className="h-7" />
                  <span className="truncate text-body-sm font-semibold text-text-primary">{row.reasonLabel}</span>
                </div>
              </td>
              <td className={td}>
                <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{row.title}</bdi></p>
                <p className="truncate text-caption font-medium text-text-muted"><MetaParts parts={row.meta} /></p>
              </td>
              <td className={td}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar size="sm" initials={row.reporterInitials} />
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{row.reporterName}</bdi></p>
                    {row.reporterSent ? <p className="truncate text-caption font-medium text-text-muted">{row.reporterSent}</p> : null}
                  </div>
                </div>
              </td>
              {/* Type tokens stay off cn(): twMerge evicts text-body-sm next to a text colour. */}
              <td className={td}>
                <span className="text-body-sm text-text-secondary">{row.received}</span>
              </td>
              <td className={td}>
                <ReportStatusPill status={row.status} lang={lang} />
              </td>
              <td className={cn(td, 'text-end')}>
                <Link href={row.href} className={buttonClass(i === 0, 'sm')}>
                  {actionLabel(row, lang)}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// 375 card — pad 16, gap 10, radius 12, border-subtle: [bar 4×20 · reason · pill] · title 16 Medium ·
// meta 12 muted · « Signalé par … » 12 secondary · full-width md button (primary on the first card).
function QueueCard({ lang, row, primary }: { lang: Lang; row: QueueRow; primary: boolean }) {
  return (
    <article className="flex flex-col gap-2.5 rounded-xl border border-border-subtle bg-surface-base p-4">
      <div className="flex items-center gap-2">
        <SeverityBar tone={row.tone} className="h-5" />
        <span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-text-primary">{row.reasonLabel}</span>
        <ReportStatusPill status={row.status} lang={lang} />
      </div>
      <h2 className="text-body font-medium text-text-primary"><bdi>{row.title}</bdi></h2>
      <p className="text-caption font-medium text-text-muted"><MetaParts parts={row.meta} /></p>
      <p className="text-caption font-medium text-text-secondary">{row.cardBy}</p>
      <Link href={row.href} className={cn(buttonClass(primary, 'md'), 'w-full')}>
        {actionLabel(row, lang)}
      </Link>
    </article>
  )
}

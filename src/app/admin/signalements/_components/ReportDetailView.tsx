import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowUpRight, Briefcase, Megaphone, Package, Store, User, type LucideIcon } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import type { SeverityTone } from '../_lib/queue'
import { MetaParts, ReasonPill, ReportStatusPill } from './report-pill'

// J6 « Signalement détail » (Figma NOV 4 — Admin, 1440). Presentational: the page resolves every
// string-shaped datum; the Décision panel arrives as a slot (client component). Two columns at lg+
// (main FILL · rail 380, gap 24); stacked below.

export type DetailPerson = {
  name: string
  initials: string
  line: string | null
  stats: string | null
  statsDanger?: boolean
  href?: string
}

export type DetailContent = {
  type: string
  title: string
  meta: string[]
  excerpt: string | null
  pill: { status: StatusValue; label: string } | null
  hiddenNote: string | null
  missing: boolean
  /** The read failed (reported server-side): « — », never « introuvable ». */
  unreadable: boolean
}

export type DetailOther = { id: string; reasonLabel: string; by: string; when: string; status: string }

const KIND_ICON: Record<string, LucideIcon> = {
  product: Package,
  service: Briefcase,
  shop: Store,
  job_post: Megaphone,
  freelancer_profile: User,
  user: User,
}

const panel = 'flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6'
const panelTitle = 'text-body-lg font-semibold text-text-primary'
// Plain strings, never through cn(): twMerge would evict the text-body-* tokens next to a text colour.
const link = `rounded-sm text-body-sm font-medium text-brand-indigo-600 hover:underline ${FOCUS_RING}`

export function ReportDetailView({
  lang,
  refLabel,
  subtitle,
  status,
  claim,
  openPage,
  content,
  reasonTone,
  reasonLabel,
  description,
  others,
  decision,
  closed,
  reporter,
  owner,
}: {
  lang: Lang
  refLabel: string
  subtitle: string
  status: string
  claim: ReactNode
  openPage: { href: string; external: boolean; labelKey: string } | null
  content: DetailContent
  reasonTone: SeverityTone
  reasonLabel: string
  description: string | null
  others: DetailOther[]
  decision: ReactNode
  closed: { headerKey: string; note: string | null; date: string } | null
  reporter: DetailPerson
  owner: DetailPerson | null
}) {
  const KindIcon = KIND_ICON[content.type] ?? Package
  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb — 14 Medium indigo-600 · › · ref 14 secondary, gap 8. */}
      <nav aria-label={t('admin.reports.breadcrumb_aria', lang)}>
        <ol className="flex items-center gap-2 text-body-sm">
          <li>
            <Link href="/admin/signalements" className={link}>{t('admin.reports.title', lang)}</Link>
          </li>
          <li aria-hidden="true" className="text-text-muted">›</li>
          <li aria-current="page" className="text-text-secondary" dir="ltr">#{refLabel}</li>
        </ol>
      </nav>

      <header className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-h1 text-text-primary">
            {t('admin.reports.detail_title', lang)} <bdi dir="ltr">#{refLabel}</bdi>
          </h1>
          <p className="text-body-sm text-text-secondary">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {claim}
          <ReportStatusPill status={status} lang={lang} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Contenu signalé */}
          <section className={panel} aria-labelledby="panel-content">
            <div className="flex items-center gap-2">
              <h2 id="panel-content" className={`${panelTitle} flex-1`}>{t('admin.reports.panel_content', lang)}</h2>
              {openPage ? (
                <Link
                  href={openPage.href}
                  {...(openPage.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={`${link} inline-flex items-center gap-1`}
                >
                  {t(openPage.labelKey, lang)}
                  {openPage.external ? <ArrowUpRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" /> : null}
                </Link>
              ) : null}
            </div>
            <div className="flex items-center gap-4 rounded-xl bg-surface-subtle p-4">
              {/* Thumb 88 — dropped below sm, where it would squeeze the text column (no 375 frame for J6). */}
              <div className="hidden size-[88px] shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-text-muted sm:flex" aria-hidden="true">
                <KindIcon className="size-7" />
              </div>
              {content.missing ? (
                <p className="flex-1 text-body-sm text-text-muted">{content.unreadable ? '—' : t('admin.moderation.target_not_found', lang)}</p>
              ) : (
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-body font-semibold text-text-primary"><bdi>{content.title}</bdi></p>
                  <p className="text-body-sm text-text-secondary"><MetaParts parts={content.meta} /></p>
                  {content.excerpt ? <p className="truncate text-caption font-medium text-text-muted"><bdi>« {content.excerpt} »</bdi></p> : null}
                  {content.hiddenNote ? <p className="text-caption font-medium text-danger-700">{content.hiddenNote}</p> : null}
                </div>
              )}
              {content.pill ? <StatusPill status={content.pill.status}>{content.pill.label}</StatusPill> : null}
            </div>
          </section>

          {/* Motif et description */}
          <section className={panel} aria-labelledby="panel-reason">
            <h2 id="panel-reason" className={panelTitle}>{t('admin.reports.panel_reason', lang)}</h2>
            <div>
              <ReasonPill tone={reasonTone} label={reasonLabel} />
            </div>
            <p className="max-w-[640px] whitespace-pre-wrap text-body-sm text-text-primary">
              {description ? <bdi>« {description} »</bdi> : t('admin.reports.no_description', lang)}
            </p>
          </section>

          {/* Autres signalements sur ce contenu */}
          <section className={panel} aria-labelledby="panel-others">
            <h2 id="panel-others" className={panelTitle}>{t('admin.reports.panel_others', lang)}</h2>
            {others.length === 0 ? (
              <p className="text-body-sm text-text-muted">{t('admin.reports.others_empty', lang)}</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border-subtle">
                <table className="w-full min-w-[520px] table-fixed">
                  <colgroup>
                    <col className="w-[158px]" />
                    <col />
                    <col className="w-[106px]" />
                    <col className="w-[138px]" />
                  </colgroup>
                  <thead className="border-b border-border-subtle bg-surface-subtle">
                    <tr>
                      {(['field_reason', 'col_by', 'col_when', 'field_status'] as const).map((k) => (
                        <th key={k} scope="col" className="px-2 py-2.5 text-start text-caption font-medium uppercase text-text-muted first:ps-5 last:pe-5">
                          {t(`admin.reports.${k}`, lang)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {others.map((o) => (
                      <tr key={o.id}>
                        <td className="truncate px-2 py-3.5 ps-5 text-body-sm font-medium text-text-primary">
                          <Link href={`/admin/signalements/${o.id}`} className={cn('rounded-sm hover:underline', FOCUS_RING)}>{o.reasonLabel}</Link>
                        </td>
                        <td className="truncate px-2 py-3.5 text-body-sm text-text-secondary"><bdi>{o.by}</bdi></td>
                        <td className="px-2 py-3.5 text-body-sm text-text-secondary">{o.when}</td>
                        <td className="px-2 py-3.5 pe-5"><ReportStatusPill status={o.status} lang={lang} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-6">
          {/* Décision */}
          <section className={panel} aria-labelledby="panel-decision">
            <h2 id="panel-decision" className={panelTitle}>{t('admin.reports.panel_decision', lang)}</h2>
            {closed ? (
              <div className="flex flex-col gap-1 rounded-lg bg-surface-subtle p-4">
                <p className="text-body-sm font-medium text-text-secondary">{t(closed.headerKey, lang)}</p>
                <p className="whitespace-pre-wrap text-body-sm text-text-primary">{closed.note}</p>
                <p className="text-caption text-text-muted">{closed.date}</p>
              </div>
            ) : null}
            {decision}
          </section>

          <PersonPanel id="panel-reporter" title={t('admin.reports.field_reporter', lang)} person={reporter} lang={lang} />
          {owner ? <PersonPanel id="panel-owner" title={t('admin.reports.panel_owner', lang)} person={owner} lang={lang} /> : null}
        </div>
      </div>
    </div>
  )
}

function PersonPanel({ id, title, person, lang }: { id: string; title: string; person: DetailPerson; lang: Lang }) {
  return (
    <section className={panel} aria-labelledby={id}>
      <h2 id={id} className={panelTitle}>{title}</h2>
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar size="sm" initials={person.initials} />
        <div className="min-w-0">
          <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{person.name}</bdi></p>
          {person.line ? <p className="text-caption font-medium text-text-muted">{person.line}</p> : null}
        </div>
      </div>
      {person.stats ? (
        <p className={person.statsDanger ? 'text-caption font-medium text-danger-700' : 'text-caption font-medium text-text-muted'}>{person.stats}</p>
      ) : null}
      {person.href ? (
        <Link href={person.href} className={`${link} self-start`}>
          {t('admin.reports.view_user', lang)}
        </Link>
      ) : null}
    </section>
  )
}

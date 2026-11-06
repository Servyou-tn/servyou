import Link from 'next/link'
import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { ButtonLink } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import { AdminTabs, type AdminTab } from '@/components/AdminTabs'
import { ReportStatusPill } from '@/app/admin/signalements/_components/report-pill'
import type { UserStatus } from '../_lib/users'
import { USER_STATUS_PILL, type UserRolePill } from './UsersListView'

// J3 « Utilisateur détail » (Figma NOV 4 — Admin, 1440). Presentational: the page resolves every datum; the
// suspend / reactivate control arrives as a slot (client). Main FILL + rail 360 at lg+ on « Activité »;
// stacked below lg (no 375 frame). Sections whose read failed render « — », never an empty « aucun ».

export type DetailTile = { label: string; value: string; subtitle: string | null; accent: 'blue' | 'neutral' }
export type OrderRow = { id: string; ref: string; item: string; counterpart: string; pill: { status: StatusValue; label: string } | null; date: string }
export type OrdersPanel = { titleKey: string; counterpartKey: string; rows: OrderRow[]; failed: boolean; allHref: string | null }
export type ReportRow = { id: string; reasonLabel: string; content: string; status: string }
export type ContentRow = { id: string; typeLabel: string; title: string; pill: { status: StatusValue; label: string }; href: string | null }
export type JournalRow = { id: string; title: string; sub: string }
export type InfoRow = { label: string; value: string; ltr?: boolean }
export type DetailTabKey = 'activite' | 'commandes' | 'contenu' | 'signalements' | 'journal'

const panel = 'flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6'
const panelTitle = 'text-body-lg font-semibold text-text-primary'
const link = `rounded-sm text-body-sm font-medium text-brand-indigo-600 hover:underline ${FOCUS_RING}`
const th = 'px-2 py-2.5 text-start text-caption font-medium uppercase text-text-muted first:ps-5 last:pe-5'
const td = 'px-2 py-3.5 align-middle first:ps-5 last:pe-5'
const cell = 'text-body-sm text-text-secondary'

export function UserDetailView(props: {
  lang: Lang
  name: string
  initials: string
  roles: UserRolePill[]
  /** null = the status could not be read: no pill rather than a false « Actif ». */
  status: UserStatus | null
  meta: Array<{ text: string; ltr?: boolean }>
  publicPage: { href: string; labelKey: string } | null
  action: ReactNode
  tiles: DetailTile[]
  tabs: AdminTab[]
  tab: DetailTabKey
  orders: OrdersPanel[]
  reports: { rows: ReportRow[]; failed: boolean; allHref: string | null }
  content: { rows: ContentRow[]; failed: boolean }
  info: InfoRow[]
  journal: { rows: JournalRow[]; failed: boolean; allHref: string | null }
}) {
  const { lang, tab } = props
  return (
    <div className="flex flex-col gap-6">
      <nav aria-label={t('admin.reports.breadcrumb_aria', lang)}>
        <ol className="flex items-center gap-2 text-body-sm">
          <li><Link href="/admin/utilisateurs" className={link}>{t('admin.users.title', lang)}</Link></li>
          <li aria-hidden="true" className="text-text-muted">›</li>
          <li aria-current="page" className="truncate text-text-secondary"><bdi>{props.name}</bdi></li>
        </ol>
      </nav>

      {/* profileHead — pad 24, gap 20, radius 12: avatar 56 · name 24 Bold + pills · meta 14 secondary · actions. */}
      <section className="flex flex-col gap-5 rounded-xl border border-border-subtle bg-surface-base p-6 lg:flex-row lg:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-5">
          <Avatar size="lg" initials={props.initials} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-h2 text-text-primary"><bdi>{props.name}</bdi></h1>
              {props.roles.map((r) => <StatusPill key={r.key} status={r.pill}>{r.label}</StatusPill>)}
              {props.status ? <StatusPill status={USER_STATUS_PILL[props.status].pill}>{t(USER_STATUS_PILL[props.status].key, lang)}</StatusPill> : null}
            </div>
            <p className="text-body-sm text-text-secondary">
              {props.meta.map((m, i) => (
                <span key={i}>{i > 0 ? ' · ' : null}{m.ltr ? <bdi dir="ltr" className="whitespace-nowrap">{m.text}</bdi> : <bdi>{m.text}</bdi>}</span>
              ))}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {props.publicPage ? (
            <ButtonLink href={props.publicPage.href} target="_blank" rel="noopener noreferrer" variant="secondary" size="md">
              {t(props.publicPage.labelKey, lang)}
              <span className="sr-only"> {t('admin.users.opens_new_tab', lang)}</span>
            </ButtonLink>
          ) : null}
          {props.action}
        </div>
      </section>

      {/* kpis — 4 tiles, gap 16: pad 24, gap 16, icon circle 48, label 14 Medium, value 28 Bold blue-800, subtitle 14 muted. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {props.tiles.map((tile) => (
          <div key={tile.label} className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
            <span className={`flex size-12 items-center justify-center rounded-full ${tile.accent === 'blue' ? 'bg-brand-blue-100 text-brand-blue-600' : 'bg-surface-sunken text-text-secondary'}`}>
              <Inbox className="size-6" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-body-sm font-medium text-text-secondary">{tile.label}</p>
              <p className="text-[28px] font-bold leading-[34px] text-brand-blue-800"><bdi dir="ltr">{tile.value}</bdi></p>
              {tile.subtitle ? <p className="text-body-sm text-text-muted">{tile.subtitle}</p> : null}
            </div>
          </div>
        ))}
      </div>

      <AdminTabs tabs={props.tabs} label={t('admin.users.detail_tabs_aria', lang)} />

      {tab === 'activite' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            {props.orders.slice(0, 1).map((o) => <OrdersTable key={o.titleKey} lang={lang} panel={o} />)}
            <ReportsTable lang={lang} reports={props.reports} />
          </div>
          <div className="flex flex-col gap-6">
            <InfoPanel lang={lang} rows={props.info} />
            <JournalPanel lang={lang} journal={props.journal} />
          </div>
        </div>
      ) : tab === 'commandes' ? (
        <div className="flex flex-col gap-6">
          {props.orders.map((o) => <OrdersTable key={o.titleKey} lang={lang} panel={o} />)}
        </div>
      ) : tab === 'contenu' ? (
        <ContentTable lang={lang} content={props.content} />
      ) : tab === 'signalements' ? (
        <ReportsTable lang={lang} reports={props.reports} />
      ) : (
        <JournalPanel lang={lang} journal={props.journal} />
      )}
    </div>
  )
}

function PanelHead({ title, allHref, lang }: { title: string; allHref: string | null; lang: Lang }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className={`${panelTitle} flex-1`}>{title}</h2>
      {allHref ? <Link href={allHref} className={link}>{t('admin.users.see_all', lang)}</Link> : null}
    </div>
  )
}

function Empty({ failed, emptyKey, lang }: { failed: boolean; emptyKey: string; lang: Lang }) {
  return <p className="text-body-sm text-text-muted">{failed ? '—' : t(emptyKey, lang)}</p>
}

function OrdersTable({ lang, panel: o }: { lang: Lang; panel: OrdersPanel }) {
  return (
    <section className={panel}>
      <PanelHead title={t(o.titleKey, lang)} allHref={o.allHref} lang={lang} />
      {o.rows.length === 0 ? (
        <Empty failed={o.failed} emptyKey="admin.users.orders_empty" lang={lang} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full min-w-[560px] table-fixed">
            <colgroup>
              <col className="w-[126px]" /><col /><col className="w-[136px]" /><col className="w-[126px]" /><col className="w-[98px]" />
            </colgroup>
            <thead className="border-b border-border-subtle bg-surface-subtle">
              <tr>
                <th scope="col" className={th}>{t('admin.users.col_order', lang)}</th>
                <th scope="col" className={th}>{t('admin.users.col_item', lang)}</th>
                <th scope="col" className={th}>{t(o.counterpartKey, lang)}</th>
                <th scope="col" className={th}>{t('admin.users.field_status', lang)}</th>
                <th scope="col" className={`${th} text-end`}>{t('admin.users.col_date', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {o.rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}><span className="text-body-sm font-medium text-text-primary" dir="ltr">#{r.ref}</span></td>
                  <td className={`${td} truncate`}><span className={cell}><bdi>{r.item}</bdi></span></td>
                  <td className={`${td} truncate`}><span className={cell}><bdi>{r.counterpart}</bdi></span></td>
                  <td className={td}>{r.pill ? <StatusPill status={r.pill.status}>{r.pill.label}</StatusPill> : '—'}</td>
                  <td className={`${td} text-end`}><span className={cell}>{r.date}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ReportsTable({ lang, reports }: { lang: Lang; reports: { rows: ReportRow[]; failed: boolean; allHref: string | null } }) {
  return (
    <section className={panel}>
      <PanelHead title={t('admin.users.activity_reports_against', lang)} allHref={reports.allHref} lang={lang} />
      {reports.rows.length === 0 ? (
        <Empty failed={reports.failed} emptyKey="admin.users.reports_empty" lang={lang} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full min-w-[480px] table-fixed">
            <colgroup><col className="w-[156px]" /><col /><col className="w-[146px]" /></colgroup>
            <thead className="border-b border-border-subtle bg-surface-subtle">
              <tr>
                <th scope="col" className={th}>{t('admin.reports.field_reason', lang)}</th>
                <th scope="col" className={th}>{t('admin.users.col_content', lang)}</th>
                <th scope="col" className={th}>{t('admin.users.field_status', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {reports.rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}>
                    <Link href={`/admin/signalements/${r.id}`} className={`rounded-sm text-body-sm font-medium text-text-primary hover:underline ${FOCUS_RING}`}>{r.reasonLabel}</Link>
                  </td>
                  <td className={`${td} truncate`}><span className={cell}><bdi>{r.content}</bdi></span></td>
                  <td className={td}><ReportStatusPill status={r.status} lang={lang} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ContentTable({ lang, content }: { lang: Lang; content: { rows: ContentRow[]; failed: boolean } }) {
  return (
    <section className={panel}>
      <PanelHead title={t('admin.users.tab.content', lang)} allHref={null} lang={lang} />
      {content.rows.length === 0 ? (
        <Empty failed={content.failed} emptyKey="admin.users.content_empty" lang={lang} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full min-w-[480px] table-fixed">
            <colgroup><col className="w-[156px]" /><col /><col className="w-[146px]" /></colgroup>
            <thead className="border-b border-border-subtle bg-surface-subtle">
              <tr>
                <th scope="col" className={th}>{t('admin.users.col_type', lang)}</th>
                <th scope="col" className={th}>{t('admin.users.col_title', lang)}</th>
                <th scope="col" className={th}>{t('admin.users.field_status', lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {content.rows.map((r) => (
                <tr key={r.id}>
                  <td className={td}><span className={cell}>{r.typeLabel}</span></td>
                  <td className={`${td} truncate`}>
                    {r.href ? (
                      <Link href={r.href} target="_blank" rel="noopener noreferrer" className={`rounded-sm text-body-sm font-medium text-text-primary hover:underline ${FOCUS_RING}`}><bdi>{r.title}</bdi></Link>
                    ) : (
                      <span className="text-body-sm font-medium text-text-primary"><bdi>{r.title}</bdi></span>
                    )}
                  </td>
                  <td className={td}><StatusPill status={r.pill.status}>{r.pill.label}</StatusPill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function InfoPanel({ lang, rows }: { lang: Lang; rows: InfoRow[] }) {
  return (
    <section className={panel}>
      <h2 className={panelTitle}>{t('admin.users.panel_info', lang)}</h2>
      <dl className="flex flex-col gap-4">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-0.5">
            <dt className="text-caption font-medium uppercase text-text-muted">{r.label}</dt>
            <dd className="text-body-sm font-medium text-text-primary">{r.ltr ? <bdi dir="ltr" className="whitespace-nowrap">{r.value}</bdi> : <bdi>{r.value}</bdi>}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function JournalPanel({ lang, journal }: { lang: Lang; journal: { rows: JournalRow[]; failed: boolean; allHref: string | null } }) {
  return (
    <section className={panel}>
      <PanelHead title={t('admin.users.panel_journal', lang)} allHref={journal.allHref} lang={lang} />
      {journal.rows.length === 0 ? (
        <Empty failed={journal.failed} emptyKey="admin.users.journal_empty" lang={lang} />
      ) : (
        <ul className="flex flex-col gap-4">
          {journal.rows.map((j) => (
            <li key={j.id} className="flex flex-col gap-0.5">
              <p className="text-body-sm font-medium text-text-primary"><bdi>{j.title}</bdi></p>
              <p className="text-caption font-medium text-text-muted"><bdi>{j.sub}</bdi></p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

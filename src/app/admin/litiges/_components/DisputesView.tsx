import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { Avatar } from '@/components/ui/avatar'
import { ErrorState } from '@/components/marche/ErrorState'
import { AdminTabs, type AdminTab } from '@/components/AdminTabs'
import { ReportStatusPill } from '@/app/admin/signalements/_components/report-pill'

// J7 « Litiges » (Figma NOV 4 — Admin, 1440): the queue and the selected dispute on one screen — disputes
// table + its order card (parties, amount, « Historique ») in the main column, « Décision » in the 380 rail.
// /admin/litiges selects the first dispute of the tab; /admin/litiges/[id] selects that one. Presentational:
// the loader resolves every string. Stacked below lg (no 375 frame).

export type DisputeListRow = {
  id: string
  href: string
  ref: string
  selected: boolean
  openerName: string
  openerInitials: string
  openerLine: string
  motif: string
  status: string
}
export type Party = { name: string; initials: string; line: string }
export type TimelineRow = { id: string; when: string; label: string; actor: string }
export type SelectedDispute = {
  orderRef: string
  item: string
  buyer: Party | null
  seller: Party | null
  amount: string | null
  timeline: TimelineRow[]
  cancellation: string | null
  timelineFailed: boolean
  status: string
  decision: ReactNode
  claim: ReactNode
  closed: { headerKey: string; outcome: string | null; note: string | null; date: string } | null
}

const panel = 'flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6'
const panelTitle = 'text-body-lg font-semibold text-text-primary'
const th = 'px-2 py-2.5 text-start text-caption font-medium uppercase text-text-muted first:ps-5 last:pe-5'
const td = 'px-2 py-3.5 align-middle first:ps-5 last:pe-5'

export function DisputesView({
  lang,
  tabs,
  rows,
  failed,
  emptyKey,
  selected,
}: {
  lang: Lang
  tabs: AdminTab[]
  rows: DisputeListRow[]
  failed: boolean
  emptyKey: string
  selected: SelectedDispute | null
}) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('admin.disputes.title', lang)}</h1>
        <p className="text-body-sm text-text-secondary">{t('admin.disputes.subtitle', lang)}</p>
      </header>

      <AdminTabs tabs={tabs} label={t('admin.disputes.tabs_aria', lang)} />

      {failed ? (
        <ErrorState lang={lang} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-border-subtle bg-surface-base px-5 py-8 text-center text-body-sm text-text-muted">{t(emptyKey, lang)}</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
          <div className="flex min-w-0 flex-col gap-6">
            <DisputesTable lang={lang} rows={rows} />
            {selected ? <OrderCard lang={lang} d={selected} /> : null}
          </div>
          {selected ? (
            <section className={panel} aria-labelledby="dispute-decision">
              <div className="flex items-center gap-3">
                <h2 id="dispute-decision" className={`${panelTitle} flex-1`}>{t('admin.disputes.panel_decision', lang)}</h2>
                {selected.claim}
                <ReportStatusPill status={selected.status} lang={lang} />
              </div>
              {selected.closed ? (
                <div className="flex flex-col gap-1 rounded-lg bg-surface-subtle p-4">
                  <p className="text-body-sm font-medium text-text-secondary">{t(selected.closed.headerKey, lang)}</p>
                  {selected.closed.outcome ? <p className="text-body-sm font-semibold text-text-primary">{selected.closed.outcome}</p> : null}
                  <p className="whitespace-pre-wrap text-body-sm text-text-primary">{selected.closed.note}</p>
                  <p className="text-caption text-text-muted">{selected.closed.date}</p>
                </div>
              ) : (
                selected.decision
              )}
            </section>
          ) : null}
        </div>
      )}
    </div>
  )
}

// Table — radius 12; thead pad 10/20, 12 Medium muted uppercase; rows pad 14/20, gap 16. Columns as drawn:
// 80 · 170 · fill · 90 (+ the 16 gap / 20 edge). The selected row is tinted; each row links to its detail.
function DisputesTable({ lang, rows }: { lang: Lang; rows: DisputeListRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface-base">
      <table className="w-full min-w-[560px] table-fixed">
        <colgroup>
          <col className="w-[116px]" />
          <col className="w-[186px]" />
          <col />
          <col className="w-[126px]" />
        </colgroup>
        <thead className="border-b border-border-subtle bg-surface-subtle">
          <tr>
            <th scope="col" className={th}>{t('admin.disputes.col_dispute', lang)}</th>
            <th scope="col" className={th}>{t('admin.disputes.col_opened_by', lang)}</th>
            <th scope="col" className={th}>{t('admin.disputes.col_motif', lang)}</th>
            <th scope="col" className={th}>{t('admin.disputes.col_status', lang)}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((r) => (
            <tr key={r.id} className={r.selected ? 'bg-surface-subtle' : undefined}>
              <td className={td}>
                <Link
                  href={r.href}
                  aria-current={r.selected ? 'true' : undefined}
                  className={`rounded-sm text-body-sm font-medium text-text-primary hover:underline ${FOCUS_RING}`}
                >
                  <span dir="ltr">#{r.ref}</span>
                </Link>
              </td>
              <td className={td}>
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar size="sm" initials={r.openerInitials} />
                  <div className="min-w-0">
                    <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{r.openerName}</bdi></p>
                    <p className="truncate text-caption font-medium text-text-muted">{r.openerLine}</p>
                  </div>
                </div>
              </td>
              <td className={`${td} truncate`}><span className="text-body-sm text-text-secondary"><bdi>{r.motif}</bdi></span></td>
              <td className={td}><ReportStatusPill status={r.status} lang={lang} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PartyChip({ p }: { p: Party }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar size="sm" initials={p.initials} />
      <div className="min-w-0">
        <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{p.name}</bdi></p>
        <p className="truncate text-caption font-medium text-text-muted">{p.line}</p>
      </div>
    </div>
  )
}

// Order card — pad 24, gap 16: title 18 Semi Bold · parties (buyer → seller, gap 24) + amount · HISTORIQUE
// (8px indigo dot · 110 date caption · label FILL · actor caption, gap 12).
function OrderCard({ lang, d }: { lang: Lang; d: SelectedDispute }) {
  return (
    <section className={panel} aria-labelledby="dispute-order">
      {/* « Commande #A4F729 · Création de logo » — the ref and the item are isolated so the # never escapes in Arabic. */}
      <h2 id="dispute-order" className={panelTitle}>
        {t('admin.disputes.order_label', lang)} <bdi dir="ltr">#{d.orderRef}</bdi> · <bdi>{d.item}</bdi>
      </h2>
      <div className="flex flex-wrap items-center gap-6">
        {d.buyer ? <PartyChip p={d.buyer} /> : null}
        <ArrowRight className="size-4 shrink-0 text-text-muted rtl:-scale-x-100" aria-hidden="true" />
        {d.seller ? <PartyChip p={d.seller} /> : null}
        {d.amount ? <p className="ms-auto text-body-sm text-text-secondary">{d.amount}</p> : null}
      </div>
      {d.cancellation ? <p className="text-body-sm text-text-secondary"><bdi>{d.cancellation}</bdi></p> : null}
      <p className="text-caption font-medium uppercase text-text-muted">{t('admin.disputes.history', lang)}</p>
      {d.timeline.length === 0 ? (
        <p className="text-body-sm text-text-muted">{d.timelineFailed ? '—' : t('admin.disputes.history_empty', lang)}</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {d.timeline.map((e) => (
            <li key={e.id} className="flex items-center gap-3">
              <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-brand-indigo-500" />
              <span className="w-[110px] shrink-0 text-caption font-medium text-text-muted">{e.when}</span>
              <span className="min-w-0 flex-1 text-body-sm text-text-primary"><bdi>{e.label}</bdi></span>
              <span className="shrink-0 text-caption font-medium text-text-secondary"><bdi>{e.actor}</bdi></span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

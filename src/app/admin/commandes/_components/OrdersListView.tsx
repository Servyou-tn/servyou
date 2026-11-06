import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { t, tn, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { BASE as BUTTON_BASE, SIZE as BUTTON_SIZE, VARIANT_BASE, VARIANT_STATE } from '@/components/ui/button'
import { SortSelect } from '@/components/orders/SortSelect'
import { ErrorState } from '@/components/marche/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { AdminTabs, type AdminTab } from '@/components/AdminTabs'
import { AdminSearch } from '@/components/AdminSearch'
import { OrderStatusPill, figureDir } from '../../_components/parts'

// J9 « Commandes » (Figma NOV 4 — Admin, 1440). Presentational: the page resolves rows, counts and hrefs. xl+ the
// table (columns 90 · fill · 150 · 170 · 64 · 84 · 110 · 60); below xl a card per order (the table needs ~1 000 px; at 1100 the content is 796). No delivery
// address, phone or e-mail anywhere (the RPC returns none). No « Exporter CSV » and no « Voir » column: the brief
// rules out the export, and there is no admin order page to open (deltas doc).

export type OrderRowVM = {
  id: string
  ref: string
  article: string
  buyer: { name: string; initials: string; line: string | null }
  seller: { name: string; initials: string; line: string }
  type: string
  typeLabel: string
  amount: string
  status: string
  since: string
  blocked: boolean
}
export type OrderSelect = { value: string; label: string; options: { value: string; label: string; href: string }[] }

export function OrdersListView({
  lang, tabs, q, selects, rows, failed, emptyKey, blocked, pagination, basePath,
}: {
  lang: Lang
  tabs: AdminTab[]
  q: string
  selects: OrderSelect[]
  rows: OrderRowVM[]
  failed: boolean
  emptyKey: string
  /** The blocked count under the current filters, with its tab link; null hides the banner. */
  blocked: { count: number; href: string } | null
  pagination: { page: number; totalPages: number; totalItems: number; perPage: number }
  basePath: string
}) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('admin.nav.orders', lang)}</h1>
        <p className="text-body-sm text-text-secondary">{t('admin.orders.subtitle', lang)}</p>
      </header>
      <AdminTabs tabs={tabs} label={t('admin.orders.tabs_aria', lang)} />
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <AdminSearch key={q} route={basePath} q={q} label={t('admin.orders.search_placeholder', lang)} />
        <div className="flex flex-wrap gap-3">
          {selects.map((s) => (
            <div key={s.label} className="w-full sm:w-[170px] [&>button]:w-full [&>button]:max-w-none">
              <SortSelect value={s.value} options={s.options} label={s.label} />
            </div>
          ))}
        </div>
      </div>

      {blocked && blocked.count > 0 ? (
        // alert — warning-50 fill, warning-500 1 px border, radius 12, pad 14/16, gap 12; 14 Semi Bold + 12 Medium warning-700.
        <div role="status" className="flex flex-col gap-3 rounded-xl border border-warning-500 bg-warning-50 px-4 py-3.5 sm:flex-row sm:items-center">
          <TriangleAlert className="size-5 shrink-0 text-warning-700 max-sm:hidden" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-body-sm font-semibold text-warning-700">{tn('admin.orders.blocked_title', lang, blocked.count)}</p>
            <p className="text-caption font-medium text-warning-700">{t('admin.orders.blocked_body', lang)}</p>
          </div>
          <Link href={blocked.href} className={cn(BUTTON_BASE, BUTTON_SIZE.sm, VARIANT_BASE.secondary, VARIANT_STATE.secondary, 'shrink-0 self-start sm:self-auto')}>
            {t('admin.orders.blocked_cta', lang)}
          </Link>
        </div>
      ) : null}

      {failed ? (
        <ErrorState lang={lang} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-border-subtle bg-surface-base px-5 py-8 text-center text-body-sm text-text-muted">{t(emptyKey, lang)}</p>
      ) : (
        <>
          <OrdersTable lang={lang} rows={rows} />
          <ul className="grid gap-4 sm:grid-cols-2 xl:hidden">
            {rows.map((r) => <li key={r.id}><OrderCard lang={lang} r={r} /></li>)}
          </ul>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} basePath={basePath} totalItems={pagination.totalItems} perPage={pagination.perPage} />
        </>
      )}
    </div>
  )
}

function Who({ p }: { p: { name: string; initials: string; line: string | null } }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar size="sm" initials={p.initials} />
      <div className="min-w-0">
        <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{p.name}</bdi></p>
        {p.line ? <p className="truncate text-caption font-medium text-text-muted"><bdi>{p.line}</bdi></p> : null}
      </div>
    </div>
  )
}

// text-body-sm joins by template string, never cn(): twMerge would evict it next to a text colour.
const sinceClass = (blocked: boolean) => `${blocked ? 'inline-flex items-center gap-1 font-semibold text-danger-700' : 'text-text-secondary'} text-body-sm`

/** « Depuis », with a non-colour cue for a blocked order (icon + sr-only « bloquée », WCAG 1.4.1). */
function Since({ lang, r }: { lang: Lang; r: OrderRowVM }) {
  return (
    <span className={sinceClass(r.blocked)}>
      {r.blocked ? <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" /> : null}
      <bdi dir={figureDir(r.since)}>{r.since}</bdi>
      {r.blocked ? <span className="sr-only">{t('admin.orders.blocked_sr', lang)}</span> : null}
    </span>
  )
}

function OrdersTable({ lang, rows }: { lang: Lang; rows: OrderRowVM[] }) {
  const th = 'px-2 py-2.5 text-caption font-medium uppercase text-text-muted first:ps-5 last:pe-5'
  const td = 'px-2 py-3.5 align-middle text-body-sm first:ps-5 last:pe-5'
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border-subtle bg-surface-base xl:block">
      <table className="w-full table-fixed">
        <colgroup>
          <col className="w-[106px]" /><col /><col className="w-[166px]" /><col className="w-[186px]" /><col className="w-[80px]" /><col className="w-[110px]" /><col className="w-[126px]" /><col className="w-[80px]" />
        </colgroup>
        <thead className="border-b border-border-subtle bg-surface-subtle">
          <tr>
            <th scope="col" className={`${th} text-start`}>{t('admin.home.col_order', lang)}</th>
            <th scope="col" className={`${th} text-start`}>{t('admin.home.col_item', lang)}</th>
            <th scope="col" className={`${th} text-start`}>{t('admin.orders.col_buyer', lang)}</th>
            <th scope="col" className={`${th} text-start`}>{t('admin.orders.col_seller', lang)}</th>
            <th scope="col" className={`${th} text-start`}>{t('admin.orders.col_type', lang)}</th>
            <th scope="col" className={`${th} text-end`}>{t('admin.orders.col_amount', lang)}</th>
            <th scope="col" className={`${th} text-start`}>{t('admin.users.field_status', lang)}</th>
            <th scope="col" className={`${th} text-end`}>{t('admin.home.col_since', lang)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border-subtle last:border-b-0">
              <td className={`${td} font-medium text-text-primary`}><bdi dir="ltr">{r.ref}</bdi></td>
              <td className={`${td} text-text-secondary`}><bdi>{r.article}</bdi></td>
              <td className={td}><Who p={r.buyer} /></td>
              <td className={td}><Who p={r.seller} /></td>
              <td className={`${td} text-text-secondary`}>{r.typeLabel}</td>
              <td className={`${td} text-end text-text-secondary`}><bdi dir="ltr">{r.amount}</bdi></td>
              <td className={td}><OrderStatusPill status={r.status} type={r.type} lang={lang} /></td>
              <td className={`${td} text-end`}><Since lang={lang} r={r} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OrderCard({ lang, r }: { lang: Lang; r: OrderRowVM }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border border-border-subtle bg-surface-base p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-text-primary"><bdi>{r.article}</bdi></p>
          <p className="text-caption font-medium text-text-muted"><bdi dir="ltr">{r.ref}</bdi> · {r.typeLabel} · <bdi dir="ltr">{r.amount}</bdi></p>
        </div>
        <OrderStatusPill status={r.status} type={r.type} lang={lang} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Who p={r.buyer} />
        <Who p={r.seller} />
      </div>
      <p className="text-caption font-medium text-text-muted">
        {t('admin.orders.since_label', lang)} <Since lang={lang} r={r} />
      </p>
    </article>
  )
}

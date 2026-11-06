import Link from 'next/link'
import { Briefcase, Megaphone, Package, Store, User, type LucideIcon } from 'lucide-react'
import { t, tn, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import { SortSelect } from '@/components/orders/SortSelect'
import { ErrorState } from '@/components/marche/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { AdminTabs, type AdminTab } from '@/components/AdminTabs'
import { AdminSearch } from '@/components/AdminSearch'
import type { ContentStatus, ContentTab } from '../_lib/content'
import { HideContentButton, UnhideContentButton } from './ModerationButtons'

// J4 « Contenu » (Figma NOV 4 — Admin, 1440). Presentational: the page resolves rows, counts and hrefs. lg+
// draws the table; below lg (no 375 frame) each item is a card and the filters stack.

export type ContentRow = {
  id: string
  type: ContentTab
  title: string
  meta: string | null
  ownerName: string
  ownerInitials: string
  ownerLine: string | null
  published: string
  /** Open reports — null when the count read failed (« — »). */
  reports: number | null
  status: ContentStatus
  href: string | null
}
export type ContentSelect = { value: string; label: string; options: { value: string; label: string; href: string }[] }

const KIND_ICON: Record<ContentTab, LucideIcon> = { product: Package, service: Briefcase, shop: Store, job_post: Megaphone, freelancer_profile: User }
export const CONTENT_STATUS_PILL: Record<ContentStatus, { pill: StatusValue; key: string }> = {
  visible: { pill: 'reçue', key: 'admin.reports.pill_visible' },
  hidden: { pill: 'annulée', key: 'admin.reports.pill_hidden' },
  draft: { pill: 'pending', key: 'admin.content.status_draft' },
  inactive: { pill: 'paused', key: 'admin.content.status_inactive' },
}
const link = `rounded-sm text-body-sm font-medium text-brand-indigo-600 hover:underline ${FOCUS_RING}`

export function ContentListView({
  lang, tabs, q, selects, rows, failed, emptyKey, pagination, basePath,
}: {
  lang: Lang
  tabs: AdminTab[]
  q: string
  selects: ContentSelect[]
  rows: ContentRow[]
  failed: boolean
  emptyKey: string
  pagination: { page: number; totalPages: number; totalItems: number; perPage: number }
  basePath: string
}) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('admin.content.title', lang)}</h1>
        <p className="text-body-sm text-text-secondary">{t('admin.content.subtitle', lang)}</p>
      </header>
      <AdminTabs tabs={tabs} label={t('admin.content.tabs_aria', lang)} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <AdminSearch key={q} route={basePath} q={q} label={t('admin.content.search_placeholder', lang)} />
        <div className="flex flex-wrap gap-3">
          {selects.map((s) => (
            <div key={s.label} className="w-full sm:w-[190px] [&>button]:w-full [&>button]:max-w-none">
              <SortSelect value={s.value} options={s.options} label={s.label} />
            </div>
          ))}
        </div>
      </div>

      {failed ? (
        <ErrorState lang={lang} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-border-subtle bg-surface-base px-5 py-8 text-center text-body-sm text-text-muted">{t(emptyKey, lang)}</p>
      ) : (
        <>
          <ContentTable lang={lang} rows={rows} />
          <ul className="flex flex-col gap-4 lg:hidden">
            {rows.map((r) => <li key={r.id}><ContentCard lang={lang} r={r} /></li>)}
          </ul>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} basePath={basePath} totalItems={pagination.totalItems} perPage={pagination.perPage} />
        </>
      )}
    </div>
  )
}

function Item({ r }: { r: ContentRow }) {
  const Icon = KIND_ICON[r.type]
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-sunken text-text-muted" aria-hidden="true">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{r.title}</bdi></p>
        {r.meta ? <p className="truncate text-caption font-medium text-text-muted"><bdi>{r.meta}</bdi></p> : null}
      </div>
    </div>
  )
}

function Owner({ r }: { r: ContentRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar size="sm" initials={r.ownerInitials} />
      <div className="min-w-0">
        <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{r.ownerName}</bdi></p>
        {r.ownerLine ? <p className="truncate text-caption font-medium text-text-muted"><bdi>{r.ownerLine}</bdi></p> : null}
      </div>
    </div>
  )
}

function Reports({ lang, n }: { lang: Lang; n: number | null }) {
  if (n === null) return <span className="text-body-sm text-text-muted">—</span>
  if (n === 0) return <span className="text-body-sm text-text-muted">—</span>
  return <StatusPill status="annulée">{tn('admin.content.reports_count', lang, n)}</StatusPill>
}

// Masquer only on VISIBLE content: admin_unhide_content restores products / services as status 'active', so hiding
// a draft, seller-paused or sold-out item and then restoring it would publish it. Réafficher on admin-hidden items.
function Actions({ r }: { r: ContentRow }) {
  if (r.status === 'hidden') return <UnhideContentButton targetType={r.type} targetId={r.id} title={r.title} />
  if (r.status === 'visible') return <HideContentButton targetType={r.type} targetId={r.id} title={r.title} />
  return null
}

// Table — rows 77 (48 thumb), pad 14/20, gap 16. Columns as drawn: fill · 200 · 80 · 140 · 110 · 40 · 110.
function ContentTable({ lang, rows }: { lang: Lang; rows: ContentRow[] }) {
  const th = 'px-2 py-2.5 text-start text-caption font-medium uppercase text-text-muted first:ps-5 last:pe-5'
  const td = 'px-2 py-3.5 align-middle first:ps-5 last:pe-5'
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border-subtle bg-surface-base lg:block">
      <table className="w-full table-fixed">
        <colgroup>
          <col /><col className="w-[216px]" /><col className="w-[96px]" /><col className="w-[156px]" /><col className="w-[126px]" /><col className="w-[56px]" /><col className="w-[138px]" />
        </colgroup>
        <thead className="border-b border-border-subtle bg-surface-subtle">
          <tr>
            <th scope="col" className={th}>{t('admin.content.col_content', lang)}</th>
            <th scope="col" className={th}>{t('admin.content.col_owner', lang)}</th>
            <th scope="col" className={th}>{t('admin.content.col_published', lang)}</th>
            <th scope="col" className={th}>{t('admin.content.col_reports', lang)}</th>
            <th scope="col" className={th}>{t('admin.users.field_status', lang)}</th>
            <th scope="col" className={th}><span className="sr-only">{t('admin.content.action_view', lang)}</span></th>
            <th scope="col" className={th}><span className="sr-only">{t('admin.content.col_action', lang)}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={td}><Item r={r} /></td>
              <td className={td}><Owner r={r} /></td>
              <td className={td}><span className="text-body-sm text-text-secondary">{r.published}</span></td>
              <td className={td}><Reports lang={lang} n={r.reports} /></td>
              <td className={td}><StatusPill status={CONTENT_STATUS_PILL[r.status].pill}>{t(CONTENT_STATUS_PILL[r.status].key, lang)}</StatusPill></td>
              <td className={td}>
                {r.href ? (
                  <Link href={r.href} target="_blank" rel="noopener noreferrer" className={link}>
                    {t('admin.content.action_view', lang)}<span className="sr-only"> — {r.title} {t('admin.users.opens_new_tab', lang)}</span>
                  </Link>
                ) : null}
              </td>
              <td className={`${td} text-end`}><Actions r={r} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ContentCard({ lang, r }: { lang: Lang; r: ContentRow }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-base p-4">
      <div className="flex items-start justify-between gap-3">
        <Item r={r} />
        <StatusPill status={CONTENT_STATUS_PILL[r.status].pill}>{t(CONTENT_STATUS_PILL[r.status].key, lang)}</StatusPill>
      </div>
      <Owner r={r} />
      <div className="flex flex-wrap items-center gap-3 text-caption text-text-muted">
        <span>{r.published}</span>
        <Reports lang={lang} n={r.reports} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {r.href ? (
          <Link href={r.href} target="_blank" rel="noopener noreferrer" className={link}>
            {t('admin.content.action_view', lang)}<span className="sr-only"> — {r.title} {t('admin.users.opens_new_tab', lang)}</span>
          </Link>
        ) : <span />}
        <Actions r={r} />
      </div>
    </article>
  )
}

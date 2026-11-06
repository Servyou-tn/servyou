import Link from 'next/link'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import { SortSelect } from '@/components/orders/SortSelect'
import { ErrorState } from '@/components/marche/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { AdminTabs, type AdminTab } from '@/components/AdminTabs'
import { AdminSearch } from '@/components/AdminSearch'
import type { UserStatus } from '../_lib/users'

// J2 « Utilisateurs » (Figma NOV 4 — Admin, 1440). Presentational: the page resolves rows, counts and hrefs.
// lg+ draws the table; below lg (no 375 frame) each user is a card and the filters stack.

export type UserRolePill = { key: string; label: string; pill: StatusValue }
export type UserListRow = {
  id: string
  href: string
  name: string
  initials: string
  email: string | null
  roles: UserRolePill[]
  shop: { id: string; name: string } | null
  city: string | null
  joined: string
  /** « 6 commandes » — null when the count read failed (« — »). */
  activity: string | null
  status: UserStatus
}
export type UsersSelect = { value: string; label: string; options: { value: string; label: string; href: string }[] }

export const USER_STATUS_PILL: Record<UserStatus, { pill: StatusValue; key: string }> = {
  active: { pill: 'reçue', key: 'admin.users.status_active' },
  suspended: { pill: 'annulée', key: 'admin.users.status_suspended' },
  deletion_pending: { pill: 'pending', key: 'admin.users.status_deletion_pending' },
}

const link = `rounded-sm text-body-sm font-medium text-brand-indigo-600 hover:underline ${FOCUS_RING}`
const shopLink = `rounded-sm text-caption font-medium text-brand-indigo-600 hover:underline ${FOCUS_RING}`

export function UsersListView({
  lang,
  subtitle,
  tabs,
  q,
  selects,
  rows,
  failed,
  emptyKey,
  pagination,
}: {
  lang: Lang
  subtitle: string | null
  tabs: AdminTab[]
  q: string
  selects: UsersSelect[]
  rows: UserListRow[]
  failed: boolean
  emptyKey: string
  pagination: { page: number; totalPages: number; totalItems: number; perPage: number }
}) {
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('admin.users.title', lang)}</h1>
        {subtitle ? <p className="text-body-sm text-text-secondary">{subtitle}</p> : null}
      </header>

      {failed ? null : <AdminTabs tabs={tabs} label={t('admin.users.filter_label', lang)} />}

      {/* Filters — search FILL + three 190 selects, gap 12; they stack below lg. */}
      {failed ? null : (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <AdminSearch key={q} route="/admin/utilisateurs" q={q} label={t('admin.users.search_placeholder', lang)} />
          <div className="flex flex-wrap gap-3">
            {selects.map((s) => (
              <div key={s.label} className="w-full sm:w-[190px] [&>button]:w-full [&>button]:max-w-none">
                <SortSelect value={s.value} options={s.options} label={s.label} />
              </div>
            ))}
          </div>
        </div>
      )}

      {failed ? (
        <ErrorState lang={lang} />
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-border-subtle bg-surface-base px-5 py-8 text-center text-body-sm text-text-muted">{t(emptyKey, lang)}</p>
      ) : (
        <>
          <UsersTable lang={lang} rows={rows} />
          <ul className="flex flex-col gap-4 lg:hidden">
            {rows.map((row) => (
              <li key={row.id}>
                <UserCard lang={lang} row={row} />
              </li>
            ))}
          </ul>
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            basePath="/admin/utilisateurs"
            totalItems={pagination.totalItems}
            perPage={pagination.perPage}
          />
        </>
      )}
    </div>
  )
}

function Who({ row }: { row: UserListRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar size="sm" initials={row.initials} />
      <div className="min-w-0">
        <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{row.name}</bdi></p>
        {row.email ? <p className="truncate text-caption font-medium text-text-muted"><bdi dir="ltr">{row.email}</bdi></p> : null}
      </div>
    </div>
  )
}

function Roles({ lang, row }: { lang: Lang; row: UserListRow }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap gap-1">
        {row.roles.map((r) => (
          <StatusPill key={r.key} status={r.pill}>{r.label}</StatusPill>
        ))}
      </div>
      {/* Kept from the built list: the owner's shop opens its public page. */}
      {row.shop ? (
        <Link href={`/boutique/${row.shop.id}`} target="_blank" rel="noopener noreferrer" dir="auto" className={shopLink}>
          {row.shop.name}
          <span className="sr-only"> {t('admin.users.opens_new_tab', lang)}</span>
        </Link>
      ) : null}
    </div>
  )
}

// Table — radius 12, border-subtle; thead pad 10/20 on surface-subtle, 12 Medium muted uppercase; rows 67,
// pad 14/20, gap 16. Columns as drawn: fill · 120 · 100 · 100 · 120 · 190 · 40 (+ the 16 gap / 20 edge).
function UsersTable({ lang, rows }: { lang: Lang; rows: UserListRow[] }) {
  const th = 'px-2 py-2.5 text-start text-caption font-medium uppercase text-text-muted first:ps-5 last:pe-5'
  const td = 'px-2 py-3.5 align-middle first:ps-5 last:pe-5'
  const cell = 'text-body-sm text-text-secondary'
  return (
    <div className="hidden overflow-hidden rounded-xl border border-border-subtle bg-surface-base lg:block">
      <table className="w-full table-fixed">
        <colgroup>
          <col />
          <col className="w-[136px]" />
          <col className="w-[116px]" />
          <col className="w-[116px]" />
          <col className="w-[136px]" />
          <col className="w-[206px]" />
          <col className="w-[68px]" />
        </colgroup>
        <thead className="border-b border-border-subtle bg-surface-subtle">
          <tr>
            <th scope="col" className={th}>{t('admin.users.col_user', lang)}</th>
            <th scope="col" className={th}>{t('admin.users.field_role', lang)}</th>
            <th scope="col" className={th}>{t('admin.users.field_city', lang)}</th>
            <th scope="col" className={th}>{t('admin.users.field_created_at', lang)}</th>
            <th scope="col" className={th}>{t('admin.users.col_activity', lang)}</th>
            <th scope="col" className={th}>{t('admin.users.field_status', lang)}</th>
            <th scope="col" className={th}><span className="sr-only">{t('admin.users.col_action', lang)}</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={td}><Who row={row} /></td>
              <td className={td}><Roles lang={lang} row={row} /></td>
              <td className={td}><span className={cell}><bdi>{row.city ?? '—'}</bdi></span></td>
              <td className={td}><span className={cell}>{row.joined}</span></td>
              <td className={td}><span className={cell}>{row.activity ?? '—'}</span></td>
              <td className={td}><StatusPill status={USER_STATUS_PILL[row.status].pill}>{t(USER_STATUS_PILL[row.status].key, lang)}</StatusPill></td>
              <td className={`${td} text-end`}>
                <Link href={row.href} className={link}>
                  {t('admin.users.action_view', lang)}
                  <span className="sr-only"> — {row.name}</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function UserCard({ lang, row }: { lang: Lang; row: UserListRow }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-base p-4">
      <div className="flex items-start justify-between gap-3">
        <Who row={row} />
        <StatusPill status={USER_STATUS_PILL[row.status].pill}>{t(USER_STATUS_PILL[row.status].key, lang)}</StatusPill>
      </div>
      <Roles lang={lang} row={row} />
      <p className="text-caption font-medium text-text-muted">
        {[row.city, row.joined, row.activity].filter(Boolean).map((part, i) => (
          <span key={i}>{i > 0 ? ' · ' : null}<bdi>{part}</bdi></span>
        ))}
      </p>
      <Link href={row.href} className={`${link} self-start`}>{t('admin.users.action_view', lang)}</Link>
    </article>
  )
}

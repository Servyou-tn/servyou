import { ArrowRight } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import { SortSelect } from '@/components/orders/SortSelect'
import { ErrorState } from '@/components/marche/ErrorState'
import { Pagination } from '@/components/shared/Pagination'
import { AdminSearch } from '@/components/AdminSearch'
import type { LogTone } from '../_lib/log'

// J11 « Journal » (Figma NOV 4 — Admin, 1440). Presentational: the page resolves every string. lg+ draws the
// table; below lg (no 375 frame) each entry is a card and the filters stack.

export type LogRow = {
  id: string
  date: string
  actionLabel: string
  tone: LogTone
  target: string
  transition: { from: string; to: string } | null
  note: string | null
  adminName: string
  adminInitials: string
}
export type LogSelect = { value: string; label: string; options: { value: string; label: string; href: string }[] }

const TONE_PILL: Record<LogTone, StatusValue> = { danger: 'annulée', success: 'reçue', info: 'acceptee' }

export function JournalView({
  lang, q, selects, rows, failed, emptyKey, pagination,
}: {
  lang: Lang
  q: string
  selects: LogSelect[]
  rows: LogRow[]
  failed: boolean
  emptyKey: string
  pagination: { page: number; totalPages: number; totalItems: number; perPage: number }
}) {
  const th = 'px-2 py-2.5 text-start text-caption font-medium uppercase text-text-muted first:ps-5 last:pe-5'
  const td = 'px-2 py-3.5 align-middle first:ps-5 last:pe-5'
  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('admin.log.title', lang)}</h1>
        <p className="text-body-sm text-text-secondary">{t('admin.log.subtitle', lang)}</p>
      </header>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <AdminSearch key={q} route="/admin/journal" q={q} label={t('admin.log.search_placeholder', lang)} />
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
          {/* Table — thead 38, rows ~71, cols 106 · 166 · 200 · 172 · fill · 130 (+ 16 gap / 20 edge). */}
          <div className="hidden overflow-hidden rounded-xl border border-border-subtle bg-surface-base lg:block">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[126px]" /><col className="w-[186px]" /><col className="w-[220px]" /><col className="w-[196px]" /><col /><col className="w-[162px]" />
              </colgroup>
              <thead className="border-b border-border-subtle bg-surface-subtle">
                <tr>
                  <th scope="col" className={th}>{t('admin.log.col_date', lang)}</th>
                  <th scope="col" className={th}>{t('admin.log.col_action', lang)}</th>
                  <th scope="col" className={th}>{t('admin.log.col_target', lang)}</th>
                  <th scope="col" className={th}>{t('admin.log.col_transition', lang)}</th>
                  <th scope="col" className={th}>{t('admin.log.col_note', lang)}</th>
                  <th scope="col" className={th}>{t('admin.log.col_by', lang)}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className={td}><span className="text-body-sm text-text-secondary">{r.date}</span></td>
                    <td className={td}><StatusPill status={TONE_PILL[r.tone]}>{r.actionLabel}</StatusPill></td>
                    <td className={td}><span className="line-clamp-2 text-body-sm text-text-secondary"><bdi>{r.target}</bdi></span></td>
                    <td className={td}><Transition t={r.transition} /></td>
                    <td className={td}><span className="line-clamp-2 text-body-sm text-text-secondary"><bdi>{r.note ?? '—'}</bdi></span></td>
                    <td className={td}><Admin r={r} lang={lang} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-4 lg:hidden">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-surface-base p-4">
                <div className="flex items-center justify-between gap-3">
                  <StatusPill status={TONE_PILL[r.tone]}>{r.actionLabel}</StatusPill>
                  <span className="text-caption font-medium text-text-muted">{r.date}</span>
                </div>
                <p className="text-body-sm text-text-primary"><bdi>{r.target}</bdi></p>
                <Transition t={r.transition} />
                {r.note ? <p className="text-body-sm text-text-secondary"><bdi>{r.note}</bdi></p> : null}
                <Admin r={r} lang={lang} />
              </li>
            ))}
          </ul>
          <Pagination page={pagination.page} totalPages={pagination.totalPages} basePath="/admin/journal" totalItems={pagination.totalItems} perPage={pagination.perPage} />
        </>
      )}
    </div>
  )
}

function Transition({ t: tr }: { t: { from: string; to: string } | null }) {
  if (!tr) return <span className="text-body-sm text-text-muted">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 text-body-sm font-medium text-text-primary">
      {tr.from}
      <ArrowRight className="size-3.5 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
      {tr.to}
    </span>
  )
}

function Admin({ r, lang }: { r: LogRow; lang: Lang }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar size="sm" initials={r.adminInitials} />
      <div className="min-w-0">
        <p className="truncate text-body-sm font-medium text-text-primary"><bdi>{r.adminName}</bdi></p>
        <p className="text-caption font-medium text-text-muted">{t('admin.mobile.tag', lang)}</p>
      </div>
    </div>
  )
}

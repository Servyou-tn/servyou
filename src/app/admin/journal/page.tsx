import { redirect } from 'next/navigation'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { reportQueryError } from '@/lib/supabase/query-error'
import { formatTunisDate, formatTunisTime } from '@/lib/datetime'
import { getInitials } from '@/components/ui/initials'
import { ALL_TIME, auditTargetText, type AdminAuditRow } from '../_lib/format'
import {
  LOG_ACTION_GROUPS,
  LOG_PERIODS,
  LOG_TARGETS,
  logActionGroup,
  logActionKey,
  logTone,
  parseOne,
  stateTransition,
  type LogPeriod,
} from './_lib/log'
import { JournalView, type LogRow, type LogSelect } from './_components/JournalView'

// J11 « Journal » (Figma NOV 4 — Admin): every admin action, newest first, with « avant → après » read from
// before_state / after_state. Data: the admin_list_audit_log RPC (migration 20261106093535, is_admin()-gated),
// which resolves each target's label and the acting admin's name in the database — one call instead of the
// table read + per-table label resolver. Period, target type and search (note, label, action code) are filtered
// and paged by the RPC. An action GROUP (several action codes, e.g. « Masquage » = hide_content_*) has no RPC
// parameter, so with a group selected the page reads the newest 200 matches and filters / pages them here.

const ROUTE = '/admin/journal'
const PER_PAGE = 10
const GROUP_LIMIT = 200
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const PERIOD_DAYS: Record<LogPeriod, number> = { '7d': 7, '30d': 30, '90d': 90, all: ALL_TIME }

function stamp(iso: string, lang: Lang): string {
  return `${formatTunisDate(iso, lang, 'short')} ${formatTunisTime(iso, lang)}`
}

export default async function JournalPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin(ROUTE)
  const sp = await searchParams
  const lang = await getLang()
  const supabase = await createClient()

  const group = parseOne(one(sp.action), [...LOG_ACTION_GROUPS, 'all'] as const, 'all')
  const target = parseOne(one(sp.cible), [...LOG_TARGETS, 'all'] as const, 'all')
  const period = parseOne(one(sp.periode), LOG_PERIODS, '30d')
  const q = (one(sp.q) ?? '').slice(0, 80)
  const pageParam = Math.max(1, Math.floor(Number(one(sp.page) ?? '1')) || 1)
  const grouped = group !== 'all'

  const { data, error } = await supabase.rpc('admin_list_audit_log', {
    p_search: q.trim() || undefined,
    p_target_type: target === 'all' ? undefined : target,
    p_days: PERIOD_DAYS[period],
    p_limit: grouped ? GROUP_LIMIT : PER_PAGE,
    p_offset: grouped ? 0 : (pageParam - 1) * PER_PAGE,
  })
  if (error) reportQueryError('admin/journal admin_list_audit_log', error)
  const fetched = (data ?? []) as AdminAuditRow[]
  const matching = grouped ? fetched.filter((r) => logActionGroup(r.action) === group) : fetched
  const totalItems = grouped ? matching.length : (fetched[0]?.total_count ?? 0)
  const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE))
  const page = Math.min(pageParam, totalPages)
  const items = grouped ? matching.slice((page - 1) * PER_PAGE, page * PER_PAGE) : matching

  const rows: LogRow[] = items.map((r) => {
    const tr = stateTransition(r.before_state, r.after_state)
    const adminName = r.admin_name ?? '—'
    return {
      id: r.id,
      date: stamp(r.created_at, lang),
      actionLabel: t(logActionKey(r.action), lang),
      tone: logTone(r.action),
      target: auditTargetText(r, lang),
      transition: tr ? { from: t(tr.from, lang), to: t(tr.to, lang) } : null,
      note: r.note,
      adminName,
      adminInitials: getInitials(adminName),
    }
  })

  const current: Record<string, string | null> = { action: group === 'all' ? null : group, cible: target === 'all' ? null : target, periode: period === '30d' ? null : period, q: q || null }
  const hrefFor = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) next.set(k, v)
    const qs = next.toString()
    return qs ? `${ROUTE}?${qs}` : ROUTE
  }
  // A page past the end (only knowable when the RPC returns no row) goes back to page 1 of the same filters.
  if (!error && !grouped && fetched.length === 0 && pageParam > 1) redirect(hrefFor({}))

  const selects: LogSelect[] = [
    {
      value: group,
      label: t('admin.log.filter_action_aria', lang),
      options: [
        { value: 'all', label: t('admin.log.filter_action_all', lang), href: hrefFor({ action: null }) },
        ...LOG_ACTION_GROUPS.map((g) => ({ value: g, label: t(`admin.log.group.${g}`, lang), href: hrefFor({ action: g }) })),
      ],
    },
    {
      value: target,
      label: t('admin.log.filter_target_aria', lang),
      options: [
        { value: 'all', label: t('admin.log.filter_target_all', lang), href: hrefFor({ cible: null }) },
        ...LOG_TARGETS.map((g) => ({ value: g, label: t(`admin.log.target.${g}`, lang), href: hrefFor({ cible: g }) })),
      ],
    },
    {
      value: period,
      label: t('admin.log.filter_period_aria', lang),
      options: LOG_PERIODS.map((p) => ({ value: p, label: t(`admin.log.period.${p}`, lang), href: hrefFor({ periode: p === '30d' ? null : p }) })),
    },
  ]

  return (
    <JournalView
      lang={lang}
      q={q}
      selects={selects}
      rows={rows}
      failed={Boolean(error)}
      emptyKey={q || group !== 'all' || target !== 'all' ? 'admin.log.empty_filtered' : 'admin.log.empty'}
      pagination={{ page, totalPages, totalItems, perPage: PER_PAGE }}
    />
  )
}

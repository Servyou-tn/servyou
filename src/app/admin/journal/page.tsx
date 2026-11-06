import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { reportQueryError } from '@/lib/supabase/query-error'
import { formatTunisDate, formatTunisTime } from '@/lib/datetime'
import { getInitials } from '@/components/ui/initials'
import { resolveTargets, targetKey, targetTitle } from '../signalements/_lib/targets'
import {
  LOG_ACTION_GROUPS,
  LOG_PERIODS,
  LOG_TARGETS,
  logActionGroup,
  logActionKey,
  logTone,
  matchesLogQuery,
  parseOne,
  periodSince,
  stateTransition,
} from './_lib/log'
import { JournalView, type LogRow, type LogSelect } from './_components/JournalView'

// J11 « Journal » (Figma NOV 4 — Admin): every admin action from admin_audit_log, newest first, with « avant →
// après » read from before_state / after_state. Admins read the table through the « Admins read audit log »
// SELECT policy (is_admin(); SELECT is revoked from anon only). Target labels resolve through the reports page's
// flat resolver (one query per table, no embeds); names come from `profiles`, never phone / e-mail / date of birth.

const ROUTE = '/admin/journal'
const PER_PAGE = 10
const LIMIT = 500
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const CONTENT_TYPES = new Set(['product', 'service', 'shop', 'freelancer_profile', 'job_post'])

type AuditRow = { id: string; action: string; admin_id: string; target_type: string; target_id: string | null; before_state: unknown; after_state: unknown; note: string | null; created_at: string }

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
  const q = (one(sp.q) ?? '').slice(0, 100)
  const pageParam = Number(one(sp.page) ?? '1')
  // eslint-disable-next-line react-hooks/purity -- request-time evaluation in an async Server Component (rendered once per request), the admin/statistiques precedent.
  const now = Date.now()

  let query = supabase
    .from('admin_audit_log')
    .select('id, action, admin_id, target_type, target_id, before_state, after_state, note, created_at')
    .order('created_at', { ascending: false })
    .limit(LIMIT)
  const since = periodSince(period, now)
  if (since) query = query.gte('created_at', since)
  if (target !== 'all') query = query.eq('target_type', target)
  const { data, error } = await query
  if (error) reportQueryError('admin/journal list', error)
  const audit = ((data as AuditRow[] | null) ?? []).filter((r) => group === 'all' || logActionGroup(r.action) === group)

  // Target labels: content titles + user names through the flat resolver; reports / disputes by their id fragment.
  const refs = audit
    .filter((r) => r.target_id && (CONTENT_TYPES.has(r.target_type) || r.target_type === 'user'))
    .map((r) => ({ target_type: r.target_type, target_id: r.target_id as string }))
  const { targets, profiles } = await resolveTargets(supabase, refs, [...new Set(audit.map((r) => r.admin_id))], 'admin/journal')

  const labelOf = (r: AuditRow): string => {
    if (!r.target_id) return t(`admin.log.target.${r.target_type}`, lang)
    if (CONTENT_TYPES.has(r.target_type) || r.target_type === 'user') {
      const tg = targets.get(targetKey(r.target_type, r.target_id))
      const owner = tg?.ownerId ? profiles.get(tg.ownerId) : undefined
      const title = targetTitle(tg, owner)
      return r.target_type === 'user' ? title : `${t(`admin.log.target.${r.target_type}`, lang)} « ${title} »`
    }
    return `${t(`admin.log.target.${LOG_TARGETS.includes(r.target_type as never) ? r.target_type : 'other'}`, lang)} #${r.target_id.slice(0, 8)}`
  }

  const enriched = audit.map((r) => ({
    r,
    label: labelOf(r),
    actionLabel: t(logActionKey(r.action), lang),
    adminName: profiles.get(r.admin_id)?.full_name ?? '—',
  }))
  const filtered = enriched.filter((e) => matchesLogQuery([e.label, e.r.note, e.actionLabel, e.adminName], q))
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const page = Math.min(Math.max(1, Math.floor(pageParam) || 1), totalPages)
  const items = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const rows: LogRow[] = items.map(({ r, label, actionLabel, adminName }) => {
    const tr = stateTransition(r.before_state, r.after_state)
    return {
      id: r.id,
      date: stamp(r.created_at, lang),
      actionLabel,
      tone: logTone(r.action),
      target: label,
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
      pagination={{ page, totalPages, totalItems: filtered.length, perPage: PER_PAGE }}
    />
  )
}

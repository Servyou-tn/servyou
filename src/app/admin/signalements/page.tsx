import { getLang } from '@/lib/i18n/server'
import { t, tn, type Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { reportQueryError } from '@/lib/supabase/query-error'
import { relativeTimeLabel } from '@/lib/relative-time'
import { getInitials } from '@/components/ui/initials'
import {
  REPORT_REASONS,
  REPORT_SORTS,
  REPORT_TABS,
  REPORT_TARGET_TYPES,
  matchesReportQuery,
  parseOption,
  parseSort,
  parseTab,
  severityTone,
  sortReports,
  statusesForTab,
} from './_lib/queue'
import { countReportsBy, resolveTargets, targetKey, targetSecondary, targetTitle } from './_lib/targets'
import { ReportsQueueView, type QueueRow, type QueueSelect, type QueueTab } from './_components/ReportsQueueView'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

const ROUTE = '/admin/signalements'
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function ReportsQueuePage({ searchParams }: Props) {
  await requireAdmin(ROUTE)
  const sp = await searchParams
  const lang = await getLang()
  const supabase = await createClient()

  const tab = parseTab(one(sp.statut))
  const reason = parseOption(one(sp.motif), REPORT_REASONS)
  const type = parseOption(one(sp.type), REPORT_TARGET_TYPES)
  const sort = parseSort(one(sp.tri))
  const q = (one(sp.q) ?? '').slice(0, 100)

  // RLS grants admin SELECT-all on reports. Filtered in the database by tab / motif / type; the search
  // then runs over the resolved names (titles and owners live in five other tables).
  let query = supabase
    .from('reports')
    .select('id, reporter_id, target_type, target_id, reason, description, status, created_at')
    .in('status', statusesForTab(tab))
  if (reason) query = query.eq('reason', reason)
  if (type) query = query.eq('target_type', type)

  const [list, openCount, reviewCount] = await Promise.all([
    query.order('created_at', { ascending: true }).limit(500),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'under_review'),
  ])
  // A failed read is an error state, never the « no reports » empty queue.
  if (list.error) reportQueryError('admin/signalements list', list.error)
  if (openCount.error) reportQueryError('admin/signalements open count', openCount.error)
  if (reviewCount.error) reportQueryError('admin/signalements under_review count', reviewCount.error)

  const reports = list.data ?? []
  const reporterIds = [...new Set(reports.map((r) => r.reporter_id))]
  const [{ targets, profiles }, sentCounts] = await Promise.all([
    resolveTargets(supabase, reports, reporterIds, 'admin/signalements'),
    countReportsBy(supabase, reporterIds, 'admin/signalements reporter counts'),
  ])

  // eslint-disable-next-line react-hooks/purity -- request-time evaluation in an async Server Component (rendered once per request), the admin/statistiques precedent.
  const now = Date.now()
  const rows: Array<QueueRow & { reason: string; created_at: string; haystack: Array<string | null> }> = reports.map((r) => {
    const target = targets.get(targetKey(r.target_type, r.target_id))
    const owner = target?.ownerId ? profiles.get(target.ownerId) : undefined
    const reporter = profiles.get(r.reporter_id)
    const reporterName = reporter?.full_name ?? '—'
    const sent = sentCounts?.sent.get(r.reporter_id) ?? null
    const typeLabel = t(`admin.reports.target_type_${r.target_type}`, lang)
    const meta = [typeLabel, targetSecondary(r.target_type, target, owner)].filter((p): p is string => Boolean(p))
    const title = targetTitle(target, owner)
    const reasonLabel = t(`admin.reports.reason_${r.reason}`, lang)
    const received = relativeTimeLabel(r.created_at, lang, now)
    return {
      id: r.id,
      href: `${ROUTE}/${r.id}`,
      status: r.status,
      tone: severityTone(r.reason),
      reasonLabel,
      title,
      meta,
      reporterName,
      reporterInitials: getInitials(reporter?.full_name),
      reporterSent: sent === null ? null : tn('admin.reports.sent_count', lang, sent),
      cardBy:
        sent !== null && sent > 1
          ? tn('admin.reports.card_by_count', lang, sent, { name: reporterName, time: received })
          : t('admin.reports.card_by', lang, { name: reporterName, time: received }),
      received,
      reason: r.reason,
      created_at: r.created_at,
      haystack: [title, ...meta, reporterName, owner?.full_name ?? null, reasonLabel, r.description],
    }
  })
  const visible = sortReports(rows.filter((row) => matchesReportQuery(row.haystack, q)), sort)

  const current = new URLSearchParams()
  for (const [k, v] of Object.entries({ statut: tab === 'open' ? null : tab, motif: reason, type, tri: sort === 'severity' ? null : sort, q: q || null })) {
    if (v) current.set(k, v)
  }
  const hrefFor = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(current)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    const qs = next.toString()
    return qs ? `${ROUTE}?${qs}` : ROUTE
  }

  const tabs: QueueTab[] = REPORT_TABS.map((key) => ({
    key,
    href: hrefFor({ statut: key === 'open' ? null : key }),
    active: key === tab,
    count:
      key === 'open' ? (openCount.error ? undefined : (openCount.count ?? undefined))
      : key === 'under_review' ? (reviewCount.error ? undefined : (reviewCount.count ?? undefined))
      : undefined,
  }))

  const selects: QueueSelect[] = [
    {
      value: reason ?? 'all',
      label: t('admin.reports.filter_reason_aria', lang),
      options: [
        { value: 'all', label: t('admin.reports.filter_reason_all', lang), href: hrefFor({ motif: null }) },
        ...REPORT_REASONS.map((value) => ({
          value,
          label: prefixed('admin.reports.filter_reason_prefix', t(`admin.reports.reason_${value}`, lang), lang),
          href: hrefFor({ motif: value }),
        })),
      ],
    },
    {
      value: type ?? 'all',
      label: t('admin.reports.filter_type_aria', lang),
      options: [
        { value: 'all', label: t('admin.reports.filter_type_all', lang), href: hrefFor({ type: null }) },
        ...REPORT_TARGET_TYPES.map((value) => ({
          value,
          label: prefixed('admin.reports.filter_type_prefix', t(`admin.reports.target_type_${value}`, lang), lang),
          href: hrefFor({ type: value }),
        })),
      ],
    },
    {
      value: sort,
      label: t('admin.reports.sort_aria', lang),
      options: REPORT_SORTS.map((value) => ({
        value,
        label: t(`admin.reports.sort_${value}`, lang),
        href: hrefFor({ tri: value === 'severity' ? null : value }),
      })),
    },
  ]

  const filtered = Boolean(q || reason || type)
  const emptyKey = filtered ? 'admin.reports.empty_filtered' : tab === 'open' ? 'admin.reports.empty' : 'admin.reports.empty_tab'

  return (
    <ReportsQueueView
      lang={lang}
      tabs={tabs}
      q={q}
      selects={selects}
      rows={visible}
      failed={Boolean(list.error)}
      emptyKey={emptyKey}
    />
  )
}

function prefixed(key: string, label: string, lang: Lang): string {
  return t(key, lang, { label })
}

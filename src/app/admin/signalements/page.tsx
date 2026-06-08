import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import type { Lang } from '@/lib/i18n'

type ReportRow = {
  id: string
  reporter_id: string
  target_type: string
  target_id: string
  reason: string
  description: string | null
  status: string
  created_at: string
}

function formatDate(value: string, lang: Lang): string {
  return new Date(value).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function truncate(value: string | null, max = 80): string {
  if (!value) return '—'
  return value.length > max ? value.slice(0, max).trimEnd() + '…' : value
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700',
  under_review: 'bg-blue-50 text-blue-700',
  resolved: 'bg-green-50 text-green-700',
}

function StatusBadge({ status, tr }: { status: string; tr: (k: string) => string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {tr('admin.reports.status_' + status)}
    </span>
  )
}

export default async function ReportsQueuePage() {
  const lang = await getLang()
  const tr = (key: string): string => t(key, lang)
  const supabase = await createClient()

  // Pending reports only (open + under_review). RLS grants admin SELECT-all.
  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, reporter_id, target_type, target_id, reason, description, status, created_at')
    .in('status', ['open', 'under_review'])
    .order('created_at', { ascending: false })

  if (error) console.error('[admin/signalements] list fetch error:', error)
  const rows = (reports as ReportRow[] | null) ?? []

  // Batch-resolve reporter names via public_profiles (robust against PostgREST
  // view-embed quirks; one query for the whole page).
  const reporterIds = [...new Set(rows.map(r => r.reporter_id))]
  const nameById = new Map<string, string>()
  if (reporterIds.length > 0) {
    const { data: profiles, error: pErr } = await supabase
      .from('public_profiles').select('id, full_name').in('id', reporterIds)
    if (pErr) console.error('[admin/signalements] reporter names fetch error:', pErr)
    for (const p of (profiles ?? []) as Array<{ id: string; full_name: string }>) {
      nameById.set(p.id, p.full_name)
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">{tr('admin.reports.title')}</h1>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">{tr('admin.reports.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-start text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.reports.field_reporter')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.reports.field_target')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.reports.field_reason')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.reports.field_description')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.reports.field_status')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.reports.field_created_at')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(r => (
                <tr key={r.id} className="relative cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {/* Stretched link: after:absolute after:inset-0 makes this anchor's
                        hit area cover the whole (relative) row, so the entire row
                        navigates while staying a real, keyboard-activatable <a>. */}
                    <Link href={`/admin/signalements/${r.id}`} className="font-medium text-blue-600 after:absolute after:inset-0 hover:underline">
                      {nameById.get(r.reporter_id) ?? '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{tr('admin.reports.target_type_' + r.target_type)}</td>
                  <td className="px-4 py-3 text-gray-700">{tr('admin.reports.reason_' + r.reason)}</td>
                  <td className="px-4 py-3 text-gray-600">{truncate(r.description)}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} tr={tr} /></td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(r.created_at, lang)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

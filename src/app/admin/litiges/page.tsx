import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import type { Lang } from '@/lib/i18n'
import type { DisputeRow } from '@/lib/types/dispute'

// created_by_role is a literal ('buyer'/'seller'), not a user id — so unlike the
// reports queue this list needs no public_profiles name resolution. The role renders
// straight through admin.disputes.role_*.
type DisputeListRow = Pick<DisputeRow, 'id' | 'order_id' | 'created_by_role' | 'reason' | 'created_at' | 'status'>

function formatDate(value: string, lang: Lang): string {
  return new Date(value).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700',
  under_review: 'bg-brand-blue-50 text-brand-blue-700',
  resolved: 'bg-green-50 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
}

function StatusBadge({ status, tr }: { status: string; tr: (k: string) => string }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {tr('admin.disputes.status_' + status)}
    </span>
  )
}

export default async function DisputesQueuePage() {
  const lang = await getLang()
  const tr = (key: string): string => t(key, lang)
  const supabase = await createClient()

  // Pending disputes only (open + under_review) — resolved/dismissed drop off the
  // queue. RLS grants admin SELECT-all on disputes.
  const { data: disputes, error } = await supabase
    .from('disputes')
    .select('id, order_id, created_by_role, reason, created_at, status')
    .in('status', ['open', 'under_review'])
    .order('created_at', { ascending: false })

  if (error) console.error('[admin/litiges] list fetch error:', error)
  const rows = (disputes as DisputeListRow[] | null) ?? []

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">{tr('admin.disputes.title')}</h1>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">{tr('admin.disputes.empty')}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-start text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.disputes.col_id')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.disputes.col_order')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.disputes.col_reason')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.disputes.col_created_by')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.disputes.col_created_at')}</th>
                <th className="px-4 py-3 text-start font-medium">{tr('admin.disputes.col_status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map(d => (
                <tr key={d.id} className="relative cursor-pointer hover:bg-gray-50">
                  <td className="px-4 py-3">
                    {/* Stretched link: after:absolute after:inset-0 makes this anchor's
                        hit area cover the whole (relative) row while staying a real,
                        keyboard-activatable <a>. */}
                    <Link href={`/admin/litiges/${d.id}`} className="font-mono text-xs font-medium text-brand-blue-600 after:absolute after:inset-0 hover:underline">
                      {d.id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{d.order_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-700">{tr('admin.disputes.reason_' + d.reason)}</td>
                  <td className="px-4 py-3 text-gray-700">{tr('admin.disputes.role_' + d.created_by_role)}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-600">{formatDate(d.created_at, lang)}</td>
                  <td className="px-4 py-3"><StatusBadge status={d.status} tr={tr} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

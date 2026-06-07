import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { ClaimButton } from './ClaimButton'
import { ResolveForm } from './ResolveForm'

type Props = { params: Promise<{ id: string }> }

type Report = {
  id: string
  reporter_id: string
  target_type: string
  target_id: string
  reason: string
  description: string | null
  status: string
  admin_note: string | null
  created_at: string
  updated_at: string
}

// Base route per target_type. target_id maps to each route's natural id
// (shop id, product id, freelancer_profile id, service_listing id, job_post id),
// consistent with the existing public routes. 'user' has no page yet (PR-L adds it).
const TARGET_ROUTES: Record<string, string> = {
  shop: '/boutique',
  product: '/produit',
  freelancer_profile: '/freelance',
  service: '/service',
  job_post: '/missions',
}

function formatDate(value: string, lang: Lang): string {
  return new Date(value).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700',
  under_review: 'bg-blue-50 text-blue-700',
  resolved: 'bg-green-50 text-green-700',
}

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params
  const lang = await getLang()
  const tr = (key: string): string => t(key, lang)
  const supabase = await createClient()

  const { data: report, error } = await supabase
    .from('reports')
    .select('id, reporter_id, target_type, target_id, reason, description, status, admin_note, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) console.error('[admin/signalements/[id]] fetch error:', error)

  if (!report) {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-gray-700">{tr('admin.reports.error_not_found')}</p>
        <Link href="/admin/signalements" className="inline-block text-sm text-blue-600 hover:underline">
          {tr('admin.reports.back_to_queue')}
        </Link>
      </div>
    )
  }

  const r = report as Report

  const { data: reporter } = await supabase
    .from('public_profiles').select('full_name').eq('id', r.reporter_id).single()
  const reporterName = (reporter as { full_name: string } | null)?.full_name ?? '—'

  const targetBase = TARGET_ROUTES[r.target_type]
  const targetUrl = targetBase ? `${targetBase}/${r.target_id}` : null

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/signalements" className="inline-block text-sm text-blue-600 hover:underline">
        {tr('admin.reports.back_to_queue')}
      </Link>

      <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">{tr('admin.reports.title')}</h1>
          <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {tr('admin.reports.status_' + r.status)}
          </span>
        </div>

        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-gray-500">{tr('admin.reports.field_reporter')}</dt>
            <dd className="mt-1 text-gray-800">{reporterName}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{tr('admin.reports.field_target')}</dt>
            <dd className="mt-1 text-gray-800">
              {tr('admin.reports.target_type_' + r.target_type)}
              {targetUrl ? (
                <Link href={targetUrl} target="_blank" rel="noopener noreferrer" className="ms-2 text-blue-600 hover:underline">
                  {tr('admin.reports.target_view')}
                </Link>
              ) : (
                <span className="ms-2 text-gray-500">{r.target_id}</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{tr('admin.reports.field_reason')}</dt>
            <dd className="mt-1 text-gray-800">{tr('admin.reports.reason_' + r.reason)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{tr('admin.reports.field_description')}</dt>
            <dd className="mt-1 whitespace-pre-wrap text-gray-800">{r.description ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{tr('admin.reports.field_created_at')}</dt>
            <dd className="mt-1 text-gray-800">{formatDate(r.created_at, lang)}</dd>
          </div>
        </dl>

        {r.status === 'resolved' ? (
          <div className="space-y-1 rounded border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">{tr('admin.reports.field_admin_note')}</p>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{r.admin_note}</p>
            <p className="text-xs text-gray-400">{tr('admin.reports.error_resolved_at')} {formatDate(r.updated_at, lang)}</p>
          </div>
        ) : (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            {r.status === 'open' && <ClaimButton reportId={r.id} />}
            <ResolveForm reportId={r.id} />
          </div>
        )}
      </div>
    </div>
  )
}

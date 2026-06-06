import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { AdminMetricCard } from '@/components/AdminMetricCard'

// Overview shell. PR-I1 ships placeholders only (value defaults to '—').
// Live counts arrive in PR-I-stats via the admin_overview_stats() RPC —
// client-side count(*) would silently under-count under current RLS.
const METRIC_KEYS = [
  'admin.metrics.total_users',
  'admin.metrics.total_shops',
  'admin.metrics.total_freelancers',
  'admin.metrics.total_products',
  'admin.metrics.total_services',
  'admin.metrics.total_job_posts',
  'admin.metrics.completed_orders',
  'admin.metrics.pending_reports',
]

export default async function AdminOverviewPage() {
  const lang = await getLang()

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('admin.overview.title', lang)}</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {METRIC_KEYS.map(key => (
          <AdminMetricCard key={key} label={t(key, lang)} />
        ))}
      </div>
    </div>
  )
}

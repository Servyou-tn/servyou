import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { AdminMetricCard } from '@/components/AdminMetricCard'

// Live counts arrive via the admin_overview_stats() RPC (PR-I-stats).
// The RPC is SECURITY DEFINER + is_admin()-gated, so it bypasses RLS to
// count accurately — a client-side count(*) would silently under-count
// on the 7 of 8 source tables whose RLS restricts row visibility.
// Each key's suffix after 'admin.metrics.' matches an RPC column 1:1.
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

const KEY_PREFIX = 'admin.metrics.'

export default async function AdminOverviewPage() {
  const lang = await getLang()
  const supabase = await createClient()

  // Single RPC call returns one row with the 8 aggregate counts. bigint
  // columns arrive as strings from PostgREST; we render them as strings.
  // On any error (incl. the is_admin() gate raising for a non-admin), fall
  // back to undefined so each card shows its built-in '—' placeholder
  // rather than breaking the page.
  const { data, error } = await supabase.rpc('admin_overview_stats')
  if (error) console.error('[admin/overview] admin_overview_stats RPC error:', error)
  const stats = (!error && Array.isArray(data) && data.length > 0) ? data[0] : null

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('admin.overview.title', lang)}</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {METRIC_KEYS.map(key => {
          const col = key.slice(KEY_PREFIX.length)
          const raw = stats ? stats[col] : null
          const value = raw != null ? String(raw) : undefined
          return <AdminMetricCard key={key} label={t(key, lang)} value={value} />
        })}
      </div>
    </div>
  )
}

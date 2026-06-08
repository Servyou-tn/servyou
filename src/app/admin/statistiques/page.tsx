import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { AdminMetricCard } from '@/components/AdminMetricCard'
import { CsvExportButton } from './CsvExportButton'

// Deeper statistics page (J.8). Direct count queries on a server client — no new RPC.
// Every read is covered by an existing admin SELECT policy (profiles + orders via
// PR-L, job_posts via PR-N) or a public-read table. No charts: at 1 completed order
// there is nothing to chart; trend charts are post-MVP per the spec.

type CountResult = { count: number | null; error: unknown }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{children}</div>
    </section>
  )
}

export default async function StatistiquesPage() {
  const lang = await getLang()
  const tr = (key: string): string => t(key, lang)
  const supabase = await createClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    usersTotal,
    usersLast7d,
    shops,
    freelancers,
    products,
    services,
    jobsOpen,
    ordersTotal,
    ordersReceived,
    ordersReceivedLast7d,
    ordersCancelled,
    receivedSellerRows,
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('shops').select('id', { count: 'exact', head: true }),
    supabase.from('freelancer_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('service_listings').select('id', { count: 'exact', head: true }),
    supabase.from('job_posts').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'received'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'received').gte('received_at', sevenDaysAgo),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'cancelled'),
    // Future: promote to admin_extended_stats RPC when received-order volume grows
    // (fetching every received-order row to Set-dedupe sellers is fine at MVP scale,
    // wasteful at thousand-order volume).
    supabase.from('orders').select('seller_id').eq('status', 'received'),
  ])

  // Surface any query error rather than silently showing 0 (CLAUDE.md rule).
  const named: Record<string, { error: unknown }> = {
    usersTotal, usersLast7d, shops, freelancers, products, services, jobsOpen,
    ordersTotal, ordersReceived, ordersReceivedLast7d, ordersCancelled, receivedSellerRows,
  }
  for (const [key, res] of Object.entries(named)) {
    if (res.error) console.error(`[admin/statistiques] ${key} query error:`, res.error)
  }

  const n = (r: CountResult) => r.count ?? 0
  const totalOrders = n(ordersTotal)
  const cancelledOrders = n(ordersCancelled)
  const sellersWithSales = new Set(
    ((receivedSellerRows.data ?? []) as { seller_id: string }[]).map(r => r.seller_id),
  ).size
  const cancellationRate = totalOrders > 0
    ? `${((cancelledOrders / totalOrders) * 100).toFixed(1)} %`
    : '—'

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-800">{tr('admin.statistiques.page_title')}</h1>

      <Section title={tr('admin.statistiques.section_users')}>
        <AdminMetricCard label={tr('admin.statistiques.label_users_total')} value={String(n(usersTotal))} />
        <AdminMetricCard label={tr('admin.statistiques.label_users_last_7d')} value={String(n(usersLast7d))} />
      </Section>

      <Section title={tr('admin.statistiques.section_marketplace')}>
        <AdminMetricCard label={tr('admin.statistiques.label_shops')} value={String(n(shops))} />
        <AdminMetricCard label={tr('admin.statistiques.label_freelancers')} value={String(n(freelancers))} />
        <AdminMetricCard label={tr('admin.statistiques.label_products')} value={String(n(products))} />
        <AdminMetricCard label={tr('admin.statistiques.label_services')} value={String(n(services))} />
        <AdminMetricCard label={tr('admin.statistiques.label_jobs_open')} value={String(n(jobsOpen))} />
      </Section>

      <Section title={tr('admin.statistiques.section_transactions')}>
        <AdminMetricCard label={tr('admin.statistiques.label_orders_total')} value={String(totalOrders)} />
        <AdminMetricCard label={tr('admin.statistiques.label_orders_completed_total')} value={String(n(ordersReceived))} />
        <AdminMetricCard label={tr('admin.statistiques.label_orders_completed_last_7d')} value={String(n(ordersReceivedLast7d))} />
        <AdminMetricCard label={tr('admin.statistiques.label_orders_cancelled')} value={String(cancelledOrders)} />
        <AdminMetricCard label={tr('admin.statistiques.label_cancellation_rate')} value={cancellationRate} />
        <AdminMetricCard label={tr('admin.statistiques.label_sellers_completed')} value={String(sellersWithSales)} />
      </Section>

      <p className="mb-8 text-xs text-gray-400">{tr('admin.statistiques.updated_now')}</p>

      <CsvExportButton />
    </div>
  )
}

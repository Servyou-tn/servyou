import { getLang } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { reportQueryError } from '@/lib/supabase/query-error'
import { loadDashboardStats } from './_lib/load'
import { ALL_TIME, type AdminAuditRow, type AdminOrderRow } from './_lib/format'
import { buildOverview } from './_lib/overview-vm'
import { OverviewView } from './_components/OverviewView'

// J1 « Vue d'ensemble » + M1 375 (Figma NOV 4 — Admin) on the live read RPCs (migration 20261106093535,
// docs/discovery/admin-dashboard-stats.md): admin_dashboard_stats(7) for the queue, the tiles and the cities (the
// layout's sidebar pills share the call through the per-request cache); « Commandes récentes » =
// admin_list_orders(p_limit 5) and « Dernières actions » = admin_list_audit_log(p_limit 3) (D12), both across all
// time so the panels show the latest rows, not an empty week. Every RPC is is_admin()-gated; none returns a
// phone, an e-mail or a delivery field.

export default async function AdminOverviewPage() {
  await requireAdmin('/admin')
  const lang = await getLang()
  const supabase = await createClient()
  // eslint-disable-next-line react-hooks/purity -- request-time evaluation in an async Server Component (rendered once per request), the admin/statistiques precedent.
  const now = Date.now()

  const [stats, ordersRes, logRes] = await Promise.all([
    loadDashboardStats(7),
    supabase.rpc('admin_list_orders', { p_tab: 'all', p_days: ALL_TIME, p_sort: 'newest', p_limit: 5 }),
    supabase.rpc('admin_list_audit_log', { p_days: ALL_TIME, p_limit: 3 }),
  ])
  if (ordersRes.error) reportQueryError('admin/overview admin_list_orders', ordersRes.error)
  if (logRes.error) reportQueryError('admin/overview admin_list_audit_log', logRes.error)

  const vm = buildOverview({
    stats,
    orders: (ordersRes.data ?? []) as AdminOrderRow[],
    log: (logRes.data ?? []) as AdminAuditRow[],
    now,
    lang,
  })
  return <OverviewView lang={lang} {...vm} recentFailed={Boolean(ordersRes.error)} actionsFailed={Boolean(logRes.error)} />
}

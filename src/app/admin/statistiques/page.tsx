import { getLang } from '@/lib/i18n/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { loadDashboardStats } from '../_lib/load'
import { parsePeriod } from '../_lib/dashboard'
import { buildStats } from './_lib/stats-vm'
import { StatsView } from './_components/StatsView'

// J8 « Statistiques » (Figma NOV 4 — Admin) on admin_dashboard_stats(p_days 7|30|90) (migration 20261106093535,
// docs/discovery/admin-dashboard-stats.md D1–D10). ?periode=7|30|90, default 7. Every delta compares the same span
// just before (`previous`); a % shows only over a non-zero previous value, « pts » only when both periods had
// orders, and a null median is « — » with no delta. The declared value is cash on delivery (D1), never collected.
// No « Exporter CSV » (brief) — the old count page's CsvExportButton is no longer rendered (deltas doc).

const ROUTE = '/admin/statistiques'
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function StatistiquesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin(ROUTE)
  const sp = await searchParams
  const lang = await getLang()
  const period = parsePeriod(one(sp.periode))
  // eslint-disable-next-line react-hooks/purity -- request-time evaluation in an async Server Component (rendered once per request).
  const now = Date.now()
  const stats = await loadDashboardStats(period)
  return <StatsView lang={lang} {...buildStats({ stats, period, now, lang, route: ROUTE })} />
}

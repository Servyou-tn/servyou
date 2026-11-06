import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { reportQueryError } from '@/lib/supabase/query-error'
import { parseDashboardStats, type DashboardStats, type StatPeriod } from './dashboard'

// One `admin_dashboard_stats` read per request and period: the layout (sidebar pills, p_days 7) and the
// overview page (p_days 7) share the call through React's per-request cache(). A failed RPC — or a reply whose
// shape does not parse — is reported and returns null; callers render « — » / their error state, never 0.
export const loadDashboardStats = cache(async (days: StatPeriod): Promise<DashboardStats | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('admin_dashboard_stats', { p_days: days })
  if (error) {
    reportQueryError(`admin_dashboard_stats(${days})`, error)
    return null
  }
  const stats = parseDashboardStats(data)
  if (!stats) reportQueryError(`admin_dashboard_stats(${days})`, { message: 'unexpected reply shape' })
  return stats
})

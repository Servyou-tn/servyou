import { requireAdmin } from '@/lib/auth/require-admin'
import { getShellUser } from '@/lib/marche/shell-user'
import type { AdminCounts } from '@/components/AdminSidebar'
import { AdminShell } from './AdminShell'
import { loadDashboardStats } from './_lib/load'
import { sidebarCounts } from './_lib/dashboard'

// Server-side admin gate for the whole /admin tree. Replaces the old client-side useEffect check,
// which rendered a loading state and then redirected from the browser — the server now redirects
// before any admin markup is sent. Every admin page also calls requireAdmin itself (a layout does
// not re-render on client-side navigation), and every admin server action calls checkAdmin; the
// RLS / is_admin()-gated RPCs remain the real boundary underneath all three.
//
// After the gate it loads the shell's data: the topbar user and the sidebar count pills, all from
// admin_dashboard_stats(7).queue (Signalements = open + under review, Litiges = open + under review,
// Commandes = blocked, Demandes = pending deletions + pending exports + new contact messages). The overview
// page reads the same call through the per-request cache. A failed read leaves every pill off — never 0.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin('/admin')

  const [shellUser, stats] = await Promise.all([getShellUser(), loadDashboardStats(7)])
  const counts: AdminCounts = stats ? sidebarCounts(stats.queue) : {}

  return (
    <AdminShell user={shellUser?.topBarUser ?? null} counts={counts}>
      {children}
    </AdminShell>
  )
}

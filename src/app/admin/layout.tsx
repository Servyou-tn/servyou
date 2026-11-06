import { requireAdmin } from '@/lib/auth/require-admin'
import { createClient } from '@/lib/supabase/server'
import { reportQueryError } from '@/lib/supabase/query-error'
import { getShellUser } from '@/lib/marche/shell-user'
import type { AdminCounts } from '@/components/AdminSidebar'
import { AdminShell } from './AdminShell'

// Server-side admin gate for the whole /admin tree. Replaces the old client-side useEffect check,
// which rendered a loading state and then redirected from the browser — the server now redirects
// before any admin markup is sent. Every admin page also calls requireAdmin itself (a layout does
// not re-render on client-side navigation), and every admin server action calls checkAdmin; the
// RLS / is_admin()-gated RPCs remain the real boundary underneath all three.
//
// After the gate it loads the shell's data: the topbar user and the sidebar count pills — the two
// counts the brief names as already sourced (unclaimed reports, open disputes). A failed count is
// reported and leaves its pill off; it never renders as 0.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin('/admin')
  const supabase = await createClient()

  const [shellUser, reports, disputes] = await Promise.all([
    getShellUser(),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ])
  if (reports.error) reportQueryError('admin layout open reports count', reports.error)
  if (disputes.error) reportQueryError('admin layout open disputes count', disputes.error)

  const counts: AdminCounts = {
    reports: reports.error ? undefined : (reports.count ?? undefined),
    disputes: disputes.error ? undefined : (disputes.count ?? undefined),
  }

  return (
    <AdminShell user={shellUser?.topBarUser ?? null} counts={counts}>
      {children}
    </AdminShell>
  )
}

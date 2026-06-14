import { redirect } from 'next/navigation'
import { getDashboardUser, getDashboardProfile } from '@/lib/dashboard/data'
import { DashboardShellClient } from '@/components/dashboard/shell/DashboardShellClient'
import { DashboardRightRail } from '@/components/dashboard/shell/DashboardRightRail'

// Shared shell for the dashboard route group. Owns the auth + role guards and the
// chrome (sidebar / top bar / right rail); the global Header is hidden on these
// routes via selectVariant, so this layout owns all navigation.
//
// Consumer-only in this commit. Future commits add the freelancer/shop-owner routes
// under this same shell with the role check adjusted; for now non-consumers (any
// seller_type) are sent home.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getDashboardUser()
  if (!user) redirect('/connexion')

  const profile = await getDashboardProfile(user.id)
  if (profile?.seller_type != null) redirect('/')

  return (
    <div className="min-h-screen bg-surface-subtle">
      <DashboardShellClient rightRail={<DashboardRightRail userId={user.id} />}>
        {children}
      </DashboardShellClient>
    </div>
  )
}

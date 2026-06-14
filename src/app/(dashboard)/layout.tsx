import { redirect } from 'next/navigation'
import { Manrope } from 'next/font/google'
import { getDashboardUser, getDashboardProfile } from '@/lib/dashboard/data'
import { DashboardShellClient } from '@/components/dashboard/shell/DashboardShellClient'
import { DashboardRightRail } from '@/components/dashboard/shell/DashboardRightRail'

// Display voice for the shell chrome (the sidebar wordmark). Set on the shell root
// so descendants inherit --font-display via the `display` class.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

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
    <div className={`${manrope.variable} min-h-screen bg-surface-subtle`}>
      <DashboardShellClient rightRail={<DashboardRightRail userId={user.id} />}>
        {children}
      </DashboardShellClient>
    </div>
  )
}

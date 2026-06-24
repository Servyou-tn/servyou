import type { ReactNode } from 'react'
import { FreelancerSidebar } from './FreelancerSidebar'
import { MarcheTopBar } from '@/components/marche/MarcheTopBar'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import { PageHeader } from '@/components/shared/PageHeader'
import { Footer } from '@/components/layout/Footer'
import { getLang } from '@/lib/i18n/server'

// The freelancer workspace shell — mirrors MarcheLayout structurally: the shared MarcheTopBar
// across the full width, the role sidebar (left) + page content (right) beneath it both starting
// at the same Y, and the shared Footer below. Only the sidebar differs (FreelancerSidebar instead
// of MarcheSidebar).
//
// DIVERGENCE from MarcheLayout (authorized by the Freelancer Design Constitution): MarcheLayout
// leaves the animated PageHeader for each page to mount; this shell OWNS it, rendering
// shared/PageHeader from its subtitle/emphasisWord props so every freelancer page gets a
// consistent header for free. It's mounted per page.tsx (a component, not a Next route layout),
// so the reveal still replays on navigation.
export async function FreelancerLayout({
  user,
  subtitle,
  emphasisWord,
  children,
}: {
  user: TopBarUser | null
  subtitle: string
  emphasisWord?: string
  children: ReactNode
}) {
  const lang = await getLang()
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <MarcheTopBar user={user} initialType="product" initialQuery="" />
      <div className="flex flex-1">
        <FreelancerSidebar />
        <main className="min-w-0 flex-1">
          {/* Tight top inset so content sits just under the navbar; the sidebar's pt matches. */}
          <div className="mx-auto max-w-7xl px-6 pb-6 pt-4 lg:px-8 lg:pb-8">
            <PageHeader subtitle={subtitle} emphasisWord={emphasisWord} />
            {children}
          </div>
        </main>
      </div>
      {/* Shared site footer — full-width below the sidebar+content row, on every freelancer page. */}
      <Footer lang={lang} />
    </div>
  )
}

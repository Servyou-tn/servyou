import { Suspense, type ReactNode } from 'react'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import { AppShellClient } from './AppShellClient'
import { TopbarBell } from './TopbarBell'
import { TopbarNotificationsFallback } from './TopbarNotifications'
import { roleToShellRole } from '@/lib/roles'

// The v2 workspace shell (design system Sections 3.1–3.4): a dark-navy sidebar with a
// role-conditional IA + a white topbar. Originally auth-only (the two shells coexisting per
// founder direction 2026-06-27), but the marketplace rebuild moves PUBLIC pages onto it too —
// so `user` is now nullable: logged-out renders the consumer IA + a "Se connecter" topbar
// affordance (Topbar / TopbarUserMenu handle the null). Legacy public pages still on MarcheLayout
// migrate as they're rebuilt. This Server wrapper derives the role from seller_type (consumer
// when logged-out) and hands off to the client frame. `user` is fetched by each page (getShellUser).
//
// The bell (bell v1, plan §3 decision 3): read here on the server for a signed-in user, on every page load, and streamed
// in its own Suspense slot so the page never waits for it (the fallback is the same bell, without a badge). Signed out =
// no bell and no read (anon has no SELECT grant on notifications).
export function AppShell({
  user,
  pageToolbar,
  rightRail,
  children,
}: {
  user: TopBarUser | null
  pageToolbar?: ReactNode
  rightRail?: ReactNode
  children: ReactNode
}) {
  return (
    <AppShellClient
      user={user}
      role={roleToShellRole(user?.seller_type ?? null)}
      pageToolbar={pageToolbar}
      rightRail={rightRail}
      notifications={
        user ? (
          <Suspense fallback={<TopbarNotificationsFallback />}>
            <TopbarBell readerId={user.id} />
          </Suspense>
        ) : null
      }
    >
      {children}
    </AppShellClient>
  )
}

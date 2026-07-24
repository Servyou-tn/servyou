import type { ReactNode } from 'react'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import { AppShellClient } from './AppShellClient'
import type { ShellRole } from './sidebar-items'

// The v2 workspace shell (design system Sections 3.1–3.4): a dark-navy sidebar with a
// role-conditional IA + a white topbar. Originally auth-only (the two shells coexisting per
// founder direction 2026-06-27), but the marketplace rebuild moves PUBLIC pages onto it too —
// so `user` is now nullable: logged-out renders the consumer IA + a "Se connecter" topbar
// affordance (Topbar / TopbarUserMenu handle the null). Legacy public pages still on MarcheLayout
// migrate as they're rebuilt. This Server wrapper derives the role from seller_type (consumer
// when logged-out) and hands off to the client frame. `user` is fetched by each page (getShellUser).
function roleFromSellerType(sellerType: TopBarUser['seller_type']): ShellRole {
  if (sellerType === 'freelancer') return 'freelancer'
  if (sellerType === 'shop_owner') return 'shop_owner'
  return 'consumer'
}

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
      role={roleFromSellerType(user?.seller_type ?? null)}
      pageToolbar={pageToolbar}
      rightRail={rightRail}
    >
      {children}
    </AppShellClient>
  )
}

import type { ReactNode } from 'react'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import { AppShellClient } from './AppShellClient'
import type { ShellRole } from './sidebar-items'

// The authenticated workspace shell (design system Sections 3.1–3.4): a dark-navy sidebar with a
// role-conditional IA + a white topbar, wrapping the personal workspace pages. PUBLIC marketplace
// pages keep MarcheLayout — the two shells coexist by founder direction 2026-06-27. This Server
// wrapper derives the role from seller_type and hands off to the client frame (drawer + active
// route). `user` is fetched by each page (getShellUser), mirroring the old MarcheLayout contract.
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
  user: TopBarUser
  pageToolbar?: ReactNode
  rightRail?: ReactNode
  children: ReactNode
}) {
  return (
    <AppShellClient
      user={user}
      role={roleFromSellerType(user.seller_type)}
      pageToolbar={pageToolbar}
      rightRail={rightRail}
    >
      {children}
    </AppShellClient>
  )
}

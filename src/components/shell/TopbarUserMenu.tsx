'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { LogOut, Settings, User, ChevronDown } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/avatar'
import { getInitials } from '@/components/ui/initials'
import { SURFACE_HOVER, FOCUS_RING } from '@/components/ui/interactive-surface'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import type { ShellRole } from './sidebar-items'

const ROLE_KEY: Record<ShellRole, string> = {
  consumer: 'shell.topbar.role.consumer',
  freelancer: 'shell.topbar.role.freelance',
  shop_owner: 'shell.topbar.role.shopOwner',
}

// Topbar user cluster (design system Section 3.3): avatar + name + role label + caret, opening a
// Radix dropdown (View public profile / Settings / Logout). Below md the name + role + caret hide
// and only the avatar shows. Logout reuses the existing /auth/signout route via a hidden form.
export function TopbarUserMenu({ user, role }: { user: TopBarUser | null; role: ShellRole }) {
  const lang = useLang()
  const signOutFormRef = useRef<HTMLFormElement>(null)

  // Public marketplace pages (e.g. /marche/services) render this shell logged-out: no menu,
  // just a "Se connecter" affordance — the person glyph linking to /connexion, mirroring the
  // legacy ProfileAvatarMenu. Authenticated workspace pages always pass a non-null user.
  if (!user) {
    return (
      <Link
        href="/connexion"
        aria-label={t('nav.login', lang)}
        className={cn(
          'inline-flex w-11 shrink-0 items-center justify-center rounded-full',
          SURFACE_HOVER,
          FOCUS_RING,
        )}
      >
        <User className="h-5 w-5 text-text-primary" aria-hidden="true" />
      </Link>
    )
  }

  const displayName = user.full_name?.trim() || user.email.split('@')[0]
  const itemBase = 'cursor-pointer text-text-primary focus:bg-surface-subtle focus:text-text-primary'

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t('nav.account', lang)}
            className={cn('flex items-center gap-2 rounded-full p-1 md:pe-2.5', SURFACE_HOVER, FOCUS_RING)}
          >
            <Avatar size="md" initials={getInitials(user.full_name || user.email)} />
            <span className="hidden text-start md:flex md:flex-col md:leading-tight">
              <span className="text-body-sm font-medium text-text-primary">{displayName}</span>
              <span className="text-caption text-text-muted">{t(ROLE_KEY[role], lang)}</span>
            </span>
            <ChevronDown className="hidden h-4 w-4 shrink-0 text-text-muted md:block" aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-56 rounded-2xl border border-border-subtle bg-white p-1 shadow-lg"
        >
          <div className="border-b border-border-subtle px-3 py-2.5">
            <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
            <p className="truncate text-xs text-text-muted">{user.email}</p>
          </div>

          <DropdownMenuItem asChild className={itemBase}>
            <Link href="/profil">
              <User className="me-2 h-4 w-4 text-text-muted" aria-hidden="true" />
              {t('shell.topbar.menu.viewPublicProfile', lang)}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild className={itemBase}>
            <Link href="/parametres">
              <Settings className="me-2 h-4 w-4 text-text-muted" aria-hidden="true" />
              {t('shell.topbar.menu.settings', lang)}
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="bg-border-subtle" />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              signOutFormRef.current?.requestSubmit()
            }}
            className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600"
          >
            <LogOut className="me-2 h-4 w-4 text-red-600" aria-hidden="true" />
            {t('shell.topbar.menu.logout', lang)}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Hidden form target for logout — posts to the existing signout route. */}
      <form ref={signOutFormRef} action="/auth/signout" method="POST" className="hidden" />
    </>
  )
}

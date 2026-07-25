'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Ref } from 'react'
import { Menu } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { interactiveSurface } from '@/components/ui/interactive-surface'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import type { ShellRole } from './sidebar-items'
import { TopbarSearch } from './TopbarSearch'
import { TopbarNotifications } from './TopbarNotifications'
import { TopbarUserMenu } from './TopbarUserMenu'

// The app-shell topbar (design system Section 3.3): white, 64px, bottom border. Desktop is a
// single row [search | spacer | language · bell · avatar]; the sidebar carries the logo there.
// Below lg the row leads with the hamburger + logo (the sidebar is a drawer), and the search
// drops to its own full-width row beneath — robust at 375px without a collapse-to-icon dance.
export function Topbar({
  user,
  role,
  onOpenDrawer,
  hamburgerRef,
}: {
  user: TopBarUser | null
  role: ShellRole
  onOpenDrawer: () => void
  hamburgerRef: Ref<HTMLButtonElement>
}) {
  const lang = useLang()
  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-white">
      <div className="flex h-16 items-center gap-4 px-4 md:px-6">
        {/* Hamburger — below lg, where the sidebar is a drawer. */}
        <button
          ref={hamburgerRef}
          type="button"
          onClick={onOpenDrawer}
          aria-label={t('shell.mobile.menu.open', lang)}
          className={cn(
            'inline-flex w-11 shrink-0 items-center justify-center rounded-full lg:hidden',
            interactiveSurface(false),
          )}
        >
          <Menu className="h-6 w-6 text-text-primary" aria-hidden="true" />
        </button>

        {/* Logo — mobile/tablet only; the navy sidebar carries the wordmark on desktop. */}
        <Link href="/" aria-label="Servyou" className="shrink-0 lg:hidden">
          <Image
            src="/brand/logo/servyou-navbar.png"
            alt="Servyou"
            width={110}
            height={32}
            priority
            className="h-8 w-auto"
          />
        </Link>

        {/* Search — inline on md+, fills the row (Figma 611:45640 search sz=FILL). */}
        <div className="hidden min-w-0 flex-1 md:block">
          <TopbarSearch />
        </div>

        {/* Mobile spacer — pushes the cluster to the end when the inline search is hidden. */}
        <div className="flex-1 md:hidden" aria-hidden="true" />

        {/* Icon cluster — language · notifications (auth only) · user. gap 16 per the Figma. */}
        <div className="flex shrink-0 items-center gap-4">
          <LanguageToggle />
          {user ? <TopbarNotifications /> : null}
          <TopbarUserMenu user={user} role={role} />
        </div>
      </div>

      {/* Mobile search row — full-width beneath the bar below md. */}
      <div className="px-4 pb-3 md:hidden">
        <TopbarSearch />
      </div>
    </header>
  )
}

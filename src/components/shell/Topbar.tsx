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

        {/* Logo — mobile/tablet only; the navy sidebar carries the wordmark on desktop. Below
            `sm` the full lockup (110px) is part of what makes row 1 overflow 375px alongside the
            hamburger + icon cluster (measured: 431px content in a 359px box — see
            docs/follow-ups.md "The AppShell topbar overflows..."), so the smallest breakpoint
            gets the icon-only S-mark instead — the same 32px asset the open drawer already uses
            (Sidebar.tsx) — and the full wordmark returns at `sm:` where the row has room. No
            mobile Figma frame exists for this topbar to contradict; this is a functional fix, not
            a redraw. */}
        <Link href="/" aria-label="Servyou" className="shrink-0 lg:hidden">
          <Image
            src="/brand/logo/servyou-s-mark.png"
            alt="Servyou"
            width={32}
            height={32}
            priority
            className="h-8 w-8 sm:hidden"
          />
          <Image
            src="/brand/logo/servyou-navbar.png"
            alt="Servyou"
            width={110}
            height={32}
            priority
            className="hidden h-8 w-auto sm:block"
          />
        </Link>

        {/* Search — inline on md+, filling the row (Figma 611:45640 search sz=FILL). */}
        <div className="hidden min-w-0 flex-1 md:block">
          <TopbarSearch />
        </div>

        {/* Mobile spacer — pushes the cluster to the end when the inline search is hidden. */}
        <div className="flex-1 md:hidden" aria-hidden="true" />

        {/* Icon cluster — language · notifications (auth only) · user. gap 16 per the Figma at
            md+; below md the row also carries the hamburger + logo with nothing left to shrink
            (the spacer at :69 is already at its floor), so the cluster's own gap tightens to 8px
            there — part of the same 375px fix as the logo swap above, not a Figma deviation
            (no mobile frame exists for this topbar). */}
        <div className="flex shrink-0 items-center gap-2 md:gap-4">
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

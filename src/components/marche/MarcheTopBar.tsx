'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Bell, Settings } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { SharedSearchBar } from '@/components/dashboard/shell/SharedSearchBar'
import { ProfileAvatarMenu, type TopBarUser } from './ProfileAvatarMenu'

type SearchType = 'product' | 'service'

// True once the marketplace content has scrolled more than 8px under the bar — the
// trigger for the translucent backdrop-blur surface. Plain window-scroll listener:
// /marche scrolls the window (the main column is normal flow), so scrollY is the
// signal. setState bails out when the boolean is unchanged, so this stays cheap.
function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

// The /marche sticky top bar: the existing search pill (left, visually unchanged)
// and a circular icon cluster (right) — Settings, a visual-only notification bell,
// and the profile avatar menu. Both float as one unit, pinned at top:16px, and gain
// a bg-white/80 + backdrop-blur surface once cards scroll underneath so they stay
// legible. Mobile (<768px) hides the cluster; that pass comes after this commit.
export function MarcheTopBar({
  user,
  initialType,
  initialQuery,
}: {
  user: TopBarUser | null
  initialType: SearchType
  initialQuery: string
}) {
  const lang = useLang()
  const scrolled = useScrolled()

  // Shared 44×44 circular button surface (WCAG-safe touch target). The hover scale
  // and active press are motion-safe (the prefers-reduced-motion query) so they
  // self-disable for users who ask for reduced motion. The resting surface tracks
  // the scroll state so the cluster blurs in step with the pill.
  const iconButtonClass = cn(
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
    'border border-border-subtle shadow-sm transition-all duration-150 ease-out',
    'hover:bg-slate-50 hover:shadow-md',
    'motion-safe:hover:scale-[1.04] motion-safe:active:scale-[0.96]',
    FOCUS_RING,
    scrolled ? 'bg-white/80 backdrop-blur-md' : 'bg-white',
  )

  return (
    <div className="sticky top-4 z-40 flex items-center gap-4">
      {/* Left element — the existing pill, kept visually identical; only the scroll
          surface is threaded through so it blurs with the cluster. */}
      <div className="min-w-0 max-w-2xl flex-1">
        <SharedSearchBar
          basePath="/marche"
          initialType={initialType}
          initialQuery={initialQuery}
          scrolled={scrolled}
        />
      </div>

      {/* Right element — the icon cluster. Hidden below md (mobile gets a dedicated
          pass after this commit); shown on tablet and desktop. */}
      <div className="hidden shrink-0 items-center gap-3 md:flex">
        <Link
          href="/parametres"
          aria-label={t('marche.sidebar.parametres', lang)}
          className={iconButtonClass}
        >
          <Settings className="h-5 w-5 text-text-primary" aria-hidden="true" />
        </Link>

        <button
          type="button"
          // TODO: Real notifications system — see roadmap.md, post-MVP. Visual-only
          // for now: the bell shows an unread dot but opens no panel.
          onClick={() => console.log('Notifications coming soon')}
          aria-label={`${t('dashboard.topbar.notifications', lang)} — ${t('marche.sidebar.coming_soon', lang)}`}
          className={cn(iconButtonClass, 'relative')}
        >
          <Bell className="h-5 w-5 text-text-primary" aria-hidden="true" />
          <span
            aria-hidden="true"
            className="absolute right-[10px] top-[10px] h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
          />
        </button>

        <ProfileAvatarMenu user={user} triggerClassName={iconButtonClass} />
      </div>
    </div>
  )
}

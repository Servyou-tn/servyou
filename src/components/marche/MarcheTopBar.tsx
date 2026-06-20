'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { interactiveSurface, SURFACE_HOVER, FOCUS_RING } from '@/components/ui/interactive-surface'
import { toggleDestination } from '@/lib/marche/marche-routing'
import type { SearchType, ToggleType } from '@/lib/search/search-params'
import { SegmentedToggle } from './SegmentedToggle'
import { ExpandableSearch } from './ExpandableSearch'
import { ProfileAvatarMenu, type TopBarUser } from './ProfileAvatarMenu'

// True once content has scrolled more than 8px under the bar — the trigger for the bar's
// translucent surface. The marche shell scrolls the window, so scrollY is the signal.
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

// The marche shell's sticky top bar.
//
// Layout — at md+ a single flex row split into two anchored clusters: LEFT (the homepage
// welcome, when present, + the compact search) and RIGHT (the 4-option segmented toggle + bell
// + avatar), pushed apart by the toggle's auto-margin so empty space sits between them. The
// welcome never truncates on desktop. On mobile it's a two-row grid: welcome + bell/avatar on
// the first row, full-width search + the (horizontally-scrolling) toggle on the second.
export function MarcheTopBar({
  user,
  initialType,
  initialQuery,
  heading,
  subtitle,
}: {
  user: TopBarUser | null
  initialType: SearchType
  initialQuery: string
  heading?: string
  subtitle?: string
}) {
  const lang = useLang()
  const scrolled = useScrolled()
  const pathname = usePathname()
  const onHome = pathname === '/'
  const hasWelcome = Boolean(heading || subtitle)

  // The active toggle option — the catalog type the page is on (fed by the page), or the
  // navigation-only type when the user is on its route.
  const activeToggle: ToggleType = pathname.startsWith('/boutiques')
    ? 'shop'
    : pathname.startsWith('/freelances')
      ? 'freelance'
      : initialType
  const hrefFor = (type: ToggleType) => toggleDestination(type, { onHome })

  // Bell — same white circular surface as the pills (idle + hover + focus). Avatar — the
  // brand-blue circle inside IS the visual, so its wrapper carries only the shared hover lift
  // + focus ring (no white bg/border) for keyboard-nav consistency.
  const bellBtn = cn(
    'relative inline-flex w-11 shrink-0 items-center justify-center rounded-full',
    interactiveSurface(false),
  )
  const avatarBtn = cn(
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
    SURFACE_HOVER,
    FOCUS_RING,
  )

  return (
    <div
      className={cn(
        'sticky top-0 z-40 border-b transition-colors duration-200 ease-out',
        scrolled
          ? 'border-border-subtle bg-white/80 backdrop-blur-md'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 px-4 py-3 md:flex md:gap-4 md:px-6 lg:gap-6 lg:px-8">
        {/* Welcome — home only. Mobile: row 1 / col 1. Desktop: leftmost, and never truncates
            (it truncates on mobile only, where space is genuinely tight). */}
        {hasWelcome && (
          <div className="col-start-1 row-start-1 min-w-0 md:order-1 md:shrink-0">
            {heading && (
              <h1 className="truncate text-xl font-bold leading-tight text-[#0A0A0A] md:overflow-visible md:text-2xl lg:text-3xl">
                {heading}
              </h1>
            )}
            {subtitle && <p className="mt-0.5 truncate text-xs text-[#6B6B6B]">{subtitle}</p>}
          </div>
        )}

        {/* Search — mobile: row 2 / col 1 (full width). Desktop: next to the welcome. */}
        <div className="col-start-1 row-start-2 min-w-0 md:order-2 md:shrink-0">
          <ExpandableSearch currentType={activeToggle} initialQuery={initialQuery} />
        </div>

        {/* Toggle — mobile: row 2 / col 2 (scrolls if its pills overflow). Desktop: pushed to the
            right edge via ml-auto, sitting next to the bell. It's the only cluster allowed to
            shrink/scroll, so the welcome + search never get squeezed. */}
        <div className="col-start-2 row-start-2 min-w-0 max-w-[44vw] justify-self-end md:order-3 md:ml-auto md:max-w-none md:justify-self-auto">
          <SegmentedToggle value={activeToggle} hrefFor={hrefFor} />
        </div>

        {/* Bell + avatar — mobile: row 1 / col 2. Desktop: rightmost. */}
        <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-2 md:order-4 md:gap-3">
          <button
            type="button"
            // TODO: Real notifications system — see roadmap.md, post-MVP. Visual-only for now.
            onClick={() => console.log('Notifications coming soon')}
            aria-label={`${t('dashboard.topbar.notifications', lang)} — ${t('marche.sidebar.coming_soon', lang)}`}
            className={bellBtn}
          >
            <Bell className="h-5 w-5 text-text-primary" aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute right-[10px] top-[10px] h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
            />
          </button>

          <div className="shrink-0">
            <ProfileAvatarMenu user={user} triggerClassName={avatarBtn} />
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
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

// The marche shell's sticky top bar. Three zones at ≥md — left (the homepage welcome, when
// present), center (the 4-option segmented toggle + a compact expandable search), right (bell +
// avatar). The two outer zones share equal flex-grow so the center cluster stays mathematically
// centered whether or not a welcome is present. On mobile the welcome stacks above and the
// toggle + search + bell + avatar share one row (the toggle scrolls if the pills overflow).
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

  // The active toggle option — the catalog type the page is on (product/service, fed by the
  // page), or the navigation-only type when the user is on its route.
  const activeToggle: ToggleType = pathname.startsWith('/boutiques')
    ? 'shop'
    : pathname.startsWith('/freelances')
      ? 'freelance'
      : initialType
  const hrefFor = (type: ToggleType) => toggleDestination(type, { onHome })

  // Shared circular-button surface (44px tall, WCAG touch target).
  const circleBtn = cn(
    'inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm',
    'transition-all duration-150 ease-out hover:bg-slate-50 hover:shadow-md',
    'motion-safe:hover:scale-[1.04] motion-safe:active:scale-[0.96]',
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
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4 md:px-6 lg:px-8">
        {/* Left zone — the homepage welcome (greeting + quiet subtitle). On mobile it's its own
            row above (only when present); at md+ it always takes an equal flex share (empty when
            absent) so the centered cluster never shifts. */}
        <div className={cn('min-w-0 md:flex-1', hasWelcome ? 'block' : 'hidden md:block')}>
          {hasWelcome && (
            <div className="min-w-0">
              {heading && (
                <h1 className="truncate text-2xl font-bold text-[#0A0A0A] md:text-3xl">{heading}</h1>
              )}
              {subtitle && <p className="mt-0.5 truncate text-xs text-[#6B6B6B]">{subtitle}</p>}
            </div>
          )}
        </div>

        {/* Controls — on mobile one flex row (toggle + search grow, bell + avatar pinned right);
            at md+ `md:contents` dissolves this wrapper so the center and right become direct zones
            of the outer row, completing the left/center/right centering. */}
        <div className="flex min-w-0 items-center gap-2 md:contents">
          {/* Center zone — segmented toggle + compact expandable search. */}
          <div className="flex min-w-0 flex-1 items-center gap-2 md:flex-none md:justify-center md:gap-3">
            <SegmentedToggle value={activeToggle} hrefFor={hrefFor} />
            <ExpandableSearch currentType={activeToggle} initialQuery={initialQuery} />
          </div>

          {/* Right zone — bell + avatar, pinned to the far-right edge. */}
          <div className="flex shrink-0 items-center justify-end gap-2 md:flex-1 md:gap-3">
            <button
              type="button"
              // TODO: Real notifications system — see roadmap.md, post-MVP. Visual-only for now.
              onClick={() => console.log('Notifications coming soon')}
              aria-label={`${t('dashboard.topbar.notifications', lang)} — ${t('marche.sidebar.coming_soon', lang)}`}
              className={cn(circleBtn, 'relative shrink-0')}
            >
              <Bell className="h-5 w-5 text-text-primary" aria-hidden="true" />
              <span
                aria-hidden="true"
                className="absolute right-[10px] top-[10px] h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
              />
            </button>

            <div className="shrink-0">
              <ProfileAvatarMenu user={user} triggerClassName={circleBtn} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

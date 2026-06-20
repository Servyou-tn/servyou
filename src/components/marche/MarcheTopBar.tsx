'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
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
// The S brand mark stands ALONE on the far left (it moved here from the sidebar, so it stays
// visible on mobile where the sidebar is hidden). It's a clean image in a Link home — no chrome.
//
// Layout — at md+ a single flex row: the logo, then a flex spacer, then everything else clustered
// on the right in order [welcome (home only) → search → 4-pill toggle → bell → avatar]. The
// toggle is the one shrinkable member (it scrolls internally), so when the row gets tight the
// spacer collapses and the pills scroll rather than the page overflowing. On mobile (<md) it's a
// two-row grid: row 1 = logo + search + bell/avatar, row 2 = the toggle full-width (scrolls); the
// welcome is hidden (the in-page heading covers it there). The right cluster is one wrapper that
// is `display:contents` on mobile (its members place straight into the grid) and a flex at md+.
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

  // Publish the bar's live height into --marche-topbar-h so the sidebar can stick directly
  // beneath it. The bar's height varies (the homepage welcome makes it taller than the browse
  // pages, and it reflows by breakpoint), so we measure rather than hardcode an offset.
  const barRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = barRef.current
    if (!el) return
    const publish = () =>
      document.documentElement.style.setProperty('--marche-topbar-h', `${el.offsetHeight}px`)
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

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
      ref={barRef}
      className={cn(
        'sticky top-0 z-40 border-b transition-colors duration-200 ease-out',
        scrolled
          ? 'border-border-subtle bg-white/80 backdrop-blur-md'
          : 'border-transparent bg-transparent',
      )}
    >
      {/* Logo (far left) · spacer · right cluster. Mobile (<md) is a two-row grid; md+ is one
          flex row. The bar spans full width across the sidebar + content columns below. The LEFT
          padding is tighter than the right so the logo hugs the viewport edge while the right
          cluster keeps its normal inset. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 pl-2 pr-4 md:flex md:w-full md:gap-x-4 md:pl-3 md:pr-6 lg:gap-x-6 lg:pl-4 lg:pr-8">
        {/* S logo — alone on the far left. Clean mark (no border/shadow/hover), Link home.
            Slightly larger on desktop where it balances against the welcome heading. */}
        <Link
          href="/"
          aria-label="Servyou"
          className="col-start-1 row-start-1 flex shrink-0 items-center"
        >
          <Image
            src="/brand/logo/servyou-hero.png"
            alt="Servyou"
            width={96}
            height={96}
            priority
            className="h-16 w-auto md:h-24"
          />
        </Link>

        {/* Spacer (md+ only) — pushes the cluster to the right so the logo stands alone. */}
        <div aria-hidden className="hidden md:block md:flex-1" />

        {/* Right cluster — welcome → search → pills → bell → avatar. display:contents on mobile
            (members fall into the grid below); a flex group at md+ (md:min-w-0 lets the pills
            inside shrink/scroll when the row is tight). */}
        <div className="contents md:flex md:min-w-0 md:items-center md:gap-4">
          {/* Welcome — home only, md+ only (the in-page heading serves mobile). Compact, capped,
              and truncating so a long name never dominates or breaks the row. */}
          {hasWelcome && (
            <div className="hidden min-w-0 md:block md:max-w-[200px] md:shrink-0">
              {heading && (
                <h1 className="truncate text-lg font-bold leading-tight text-[#0A0A0A] md:text-xl">
                  {heading}
                </h1>
              )}
              {subtitle && <p className="mt-0.5 truncate text-xs text-[#6B6B6B]">{subtitle}</p>}
            </div>
          )}

          {/* Search — mobile: row 1, between the logo and the bell/avatar. md+: before the pills. */}
          <div className="col-start-2 row-start-1 min-w-0 md:shrink-0">
            <ExpandableSearch currentType={activeToggle} initialQuery={initialQuery} />
          </div>

          {/* Pills — mobile: full-width second row (scrolls). md+: after the search; the one
              member allowed to shrink so it scrolls (rather than overflowing) when space is tight. */}
          <div className="col-span-full row-start-2 min-w-0 md:row-auto">
            <SegmentedToggle value={activeToggle} hrefFor={hrefFor} />
          </div>

          {/* Bell + avatar — mobile: row 1, far right. md+: end of the cluster. */}
          <div className="col-start-3 row-start-1 flex shrink-0 items-center justify-self-end gap-2 md:gap-3">
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
    </div>
  )
}

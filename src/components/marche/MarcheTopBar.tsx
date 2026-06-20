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
// The S brand mark anchors the far left (it moved here from the sidebar, so it stays visible on
// mobile where the sidebar is hidden). It's a clean image in a Link home — no button chrome.
//
// Layout — at md+ a single flex row: LEFT (logo → welcome, when present → compact search) and
// RIGHT (the 4-option segmented toggle → bell → avatar), pushed apart by the toggle's auto-margin
// so empty space sits between them. The welcome never truncates on desktop. On mobile the
// welcome (home only) stacks on its own row above one control row: logo, search, the
// (horizontally-scrolling) toggle, bell, avatar. The controls share a wrapper that dissolves at
// md+ (md:contents) so each becomes a zone of the outer row, ordered by `order`.
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
      {/* Full width — the bar spans across the sidebar + content columns below, so the logo
          anchors the true far left. */}
      <div className="flex w-full flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:gap-4 md:px-6 lg:gap-6 lg:px-8">
        {/* Welcome — home only. Mobile: its own row above the controls. Desktop: between the logo
            and the search (md:order-2), and never truncates (it truncates on mobile only). */}
        {hasWelcome && (
          <div className="min-w-0 md:order-2 md:shrink-0">
            {heading && (
              <h1 className="truncate text-xl font-bold leading-tight text-[#0A0A0A] md:overflow-visible md:text-2xl lg:text-3xl">
                {heading}
              </h1>
            )}
            {subtitle && <p className="mt-0.5 truncate text-xs text-[#6B6B6B]">{subtitle}</p>}
          </div>
        )}

        {/* Controls — mobile: one flex row [logo, search, toggle, bell, avatar]. md+: md:contents
            dissolves this wrapper so each child becomes a zone of the outer row, ordered logo(1) →
            welcome(2) → search(3) → (ml-auto) toggle(4) → bell + avatar(5). */}
        <div className="flex min-w-0 items-center gap-2 md:contents">
          {/* S logo — the brand anchor, far left. A clean mark (no border/shadow/hover), in a
              Link home. h-11 matches the unified interactive-surface height; the asset is square. */}
          <Link href="/" aria-label="Servyou" className="flex shrink-0 items-center md:order-1">
            <Image
              src="/brand/logo/servyou-hero.png"
              alt="Servyou"
              width={48}
              height={48}
              priority
              className="h-12 w-auto"
            />
          </Link>

          {/* Search — mobile: takes the remaining row width. Desktop: next to the welcome. */}
          <div className="min-w-0 flex-1 md:order-3 md:flex-none">
            <ExpandableSearch currentType={activeToggle} initialQuery={initialQuery} />
          </div>

          {/* Toggle — scrolls if its pills overflow. Desktop: pushed to the right edge via ml-auto,
              sitting next to the bell. It's the only cluster allowed to shrink/scroll, so the logo
              + welcome + search never get squeezed. */}
          <div className="min-w-0 max-w-[44vw] shrink md:order-4 md:ml-auto md:max-w-none md:shrink-0">
            <SegmentedToggle value={activeToggle} hrefFor={hrefFor} />
          </div>

          {/* Bell + avatar — rightmost. */}
          <div className="flex shrink-0 items-center gap-2 md:order-5 md:gap-3">
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

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
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { NavTextLinks } from './NavTextLinks'
import { PublishProjectCTA } from './PublishProjectCTA'
import { ExpandableSearch } from './ExpandableSearch'
import { HelpDropdown } from './HelpDropdown'
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
// Layout — at md+ a single flex row: the logo sits anchored on the far left, then a flex spacer,
// then the whole right group [search → text links (xl+ only) → "Publier un projet" CTA → icon
// cluster (help → language → bell → avatar)] pushed to the right edge. So the empty space falls
// between the wordmark and the search, not inside the right group. The SEARCH is the one flexible
// member (md:w-[280px], shrinks under pressure); the logo, CTA and cluster are all shrink-0, so the
// bar can never overflow — when the row tightens, the spacer collapses and then the search narrows.
// On mobile (<md) it's a two-row grid: row 1 = logo + search + language/bell/avatar (help is md+
// only), row 2 = the CTA (the text
// links are hidden below xl; the sidebar is the marketplace switcher there). The per-page subtitle
// that used to live here renders as the animated PageHeader below the bar.
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
  const pathname = usePathname()
  const onHome = pathname === '/'

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

  // The active toggle option is the catalog type the page is on (fed by the page).
  const hrefFor = (type: ToggleType) => toggleDestination(type, { onHome })

  // Bell — same white circular surface as the pills (idle + hover + focus). Avatar — the
  // brand-blue circle inside IS the visual, so its wrapper carries only the shared hover lift
  // + focus ring (no white bg/border) for keyboard-nav consistency.
  const bellBtn = cn(
    'relative inline-flex w-11 shrink-0 items-center justify-center rounded-full',
    interactiveSurface(false),
  )
  // Help — same white circular surface as the bell, but md+ only: the mobile top row already
  // carries logo + search + language/bell/avatar, and a 4th 44px icon would squeeze the search
  // to nothing at 375px. FAQ + Contact stay reachable on mobile via the footer.
  const helpBtn = cn(
    'hidden w-11 shrink-0 items-center justify-center rounded-full md:inline-flex',
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
          cluster keeps its normal inset. On desktop the row top-aligns (md:items-start) so every
          element sits at the 12px top padding instead of centering low against the tall logo. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 ps-2 pe-4 md:flex md:w-full md:items-start md:gap-x-6 md:ps-3 md:pe-6 lg:gap-x-8 lg:ps-4 lg:pe-8">
        {/* S logo — alone on the far left. Clean mark (no border/shadow/hover), Link home.
            Slightly larger on desktop where it balances against the welcome heading. */}
        <Link
          href="/"
          aria-label="Servyou"
          className="col-start-1 row-start-1 flex shrink-0 items-start"
        >
          <Image
            src="/brand/logo/servyou-navbar.png"
            alt="Servyou"
            width={125}
            height={36}
            priority
            // The full wordmark (S + ServYou) sits one notch under the control height (h-9) so it
            // doesn't dominate the row; top-aligned via the row's md:items-start. The props keep the
            // asset's natural ≈3.5:1 ratio (1218×350) and w-auto follows it, so it never stretches.
            className="h-9 w-auto"
          />
        </Link>

        {/* Spacer (md+ only) — sits between the logo and the right group, so the wordmark stays
            anchored on the far left while the search / text links / CTA / icons all push toward the
            right edge as one group. On mobile it's hidden; the grid keeps logo + search + icons on
            row 1. (This replaced the old "search hugs the wordmark" anchoring from b50ca2b.) */}
        <div aria-hidden className="hidden md:block md:flex-1" />

        {/* Search — mobile: row 1 (col 2), between the logo and the icon cluster. md+: leads the
            right group. This wrapper carries the desktop width (md:w-[280px]) and is the row's ONE
            flexible member — no shrink-0, so under pressure it narrows while everything else holds,
            making the bar overflow-proof. */}
        <div className="col-start-2 row-start-1 min-w-0 md:w-[280px]">
          <ExpandableSearch currentType={initialType} initialQuery={initialQuery} />
        </div>

        {/* Marketplace text links — xl+ only (the row can't hold them alongside search + CTA +
            cluster below ~1280px). Routing + active state unchanged from the old pills. */}
        <NavTextLinks value={initialType} hrefFor={hrefFor} />

        {/* "Publier un projet" CTA — the money button, always visible. Mobile: its own row (row 2),
            full label. md+: the last member of the right group, sitting just before the icon
            cluster with the normal gap (no large space between them). Icon-only at md, full at lg+. */}
        <div className="col-span-full row-start-2 flex shrink-0 md:row-auto">
          <PublishProjectCTA />
        </div>

        {/* Help + language + bell + avatar — mobile: row 1, far right (help is md+ only, so the
            mobile trio is unchanged). md+: end of the row, help leading. The flex gap here
            (gap-2 / md:gap-3) spaces each icon from the next consistently. */}
        <div className="col-start-3 row-start-1 flex shrink-0 items-center justify-self-end gap-2 md:gap-3">
          <HelpDropdown triggerClassName={helpBtn} />
          <LanguageToggle />
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
              className="absolute end-[10px] top-[10px] h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
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

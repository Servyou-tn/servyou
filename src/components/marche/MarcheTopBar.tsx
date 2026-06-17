'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell, Settings } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { marcheEngineHref, resolveMarcheSidebarNav } from '@/lib/marche/marche-routing'
import { SharedSearchBar } from '@/components/dashboard/shell/SharedSearchBar'
import { ProfileAvatarMenu, type TopBarUser } from './ProfileAvatarMenu'

type SearchType = 'product' | 'service'

// True once content has scrolled more than 8px under the bar — the trigger for the
// bar's translucent surface. Plain window-scroll listener: the marche shell scrolls the
// window (the main column is normal flow), so scrollY is the signal. setState bails out
// when the boolean is unchanged, so this stays cheap.
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

// The marche shell's sticky top bar — flush to the top of the viewport (top:0), spanning
// the content column (right of the sidebar). At rest it's transparent and the pill +
// icon cluster float over the page; once content scrolls underneath, the WHOLE bar gains
// a bg-white/80 + backdrop-blur surface and a bottom border so what passes under stays
// legible. Left: the global marketplace search pill (solid white, the bar supplies the
// blur now). Right: Settings (pill with label ≥xl, icon-only below), a visual-only bell,
// and the profile avatar menu. The cluster is hidden below md (mobile gets its own pass).
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
  // On the two browse engines the toggle is the cross-engine compass (Produits ⇄ Services).
  // Off them (/recherche, /categories, the account pages) it stays the search-scope toggle —
  // omitting toggleHref leaves SharedSearchBar's original /recherche behavior untouched.
  const { onMarche } = resolveMarcheSidebarNav(pathname)

  // Shared circular-button surface (44px tall, WCAG touch target). Hover scale + active
  // press are motion-safe (the prefers-reduced-motion query) so they self-disable.
  const iconBtnBase = cn(
    'inline-flex h-11 items-center justify-center rounded-full border border-border-subtle bg-white shadow-sm',
    'transition-all duration-150 ease-out hover:bg-slate-50 hover:shadow-md',
    'motion-safe:hover:scale-[1.04] motion-safe:active:scale-[0.96]',
    FOCUS_RING,
  )
  const circleBtn = cn(iconBtnBase, 'w-11')

  return (
    <div
      className={cn(
        'sticky top-0 z-40 border-b transition-colors duration-200 ease-out',
        scrolled
          ? 'border-border-subtle bg-white/80 backdrop-blur-md'
          : 'border-transparent bg-transparent',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3 lg:px-8">
        {/* Left — the global marketplace search pill (kept solid white; the bar provides
            the scroll blur). */}
        <div className="min-w-0 max-w-2xl flex-1">
          {/* Header search is the primary typed-query entry point — it lands on
              /recherche (the full search results surface), NOT /marche. /marche keeps its
              own inline ?q= handling for now; a later cleanup commit removes that dead path. */}
          <SharedSearchBar
            basePath="/recherche"
            initialType={initialType}
            initialQuery={initialQuery}
            toggleHref={onMarche ? marcheEngineHref : undefined}
          />
        </div>

        {/* Right — the icon cluster. Hidden below md (mobile pass is separate). */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          {/* Settings — a pill (gear + label) ≥xl, collapsing to an icon-only circle below
              xl to save width. */}
          <Link
            href="/parametres"
            aria-label={t('marche.sidebar.parametres', lang)}
            className={cn(iconBtnBase, 'w-11 gap-2 xl:w-auto xl:px-4')}
          >
            <Settings className="h-4 w-4 text-text-primary" aria-hidden="true" />
            <span className="hidden text-sm font-medium text-text-primary xl:inline">
              {t('marche.sidebar.parametres', lang)}
            </span>
          </Link>

          <button
            type="button"
            // TODO: Real notifications system — see roadmap.md, post-MVP. Visual-only
            // for now: the bell shows an unread dot but opens no panel.
            onClick={() => console.log('Notifications coming soon')}
            aria-label={`${t('dashboard.topbar.notifications', lang)} — ${t('marche.sidebar.coming_soon', lang)}`}
            className={cn(circleBtn, 'relative')}
          >
            <Bell className="h-5 w-5 text-text-primary" aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute right-[10px] top-[10px] h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
            />
          </button>

          <ProfileAvatarMenu user={user} triggerClassName={circleBtn} />
        </div>
      </div>
    </div>
  )
}

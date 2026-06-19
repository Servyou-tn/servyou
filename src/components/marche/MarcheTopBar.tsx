'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { marcheEngineHref, homeEngineHref, resolveMarcheSidebarNav } from '@/lib/marche/marche-routing'
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
// legible. Right cluster (pinned hard right, one tight group): the global marketplace
// search pill, then a visual-only bell, then the profile avatar menu (whose dropdown is
// the single canonical door to /parametres). Bell + avatar show ≥md; the search stays
// visible at every width (mobile owns their small-screen treatment in a separate pass).
// Left slot: an optional welcome (greeting + quiet subtitle) — ONLY the consumer homepage
// passes `heading`/`subtitle`; every other page leaves it empty so the cluster is the
// bar's only content.
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
  // On the two browse engines the toggle is the cross-engine compass (Produits ⇄ Services).
  // On the consumer homepage (/) it switches the home catalog in place via ?type=. Off both
  // (/recherche, /categories, the account pages) it stays the search-scope toggle — omitting
  // toggleHref leaves SharedSearchBar's original /recherche behavior untouched.
  const { onMarche } = resolveMarcheSidebarNav(pathname)
  const onHome = pathname === '/'

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
        {/* Left slot — the homepage welcome (greeting + quiet subtitle), vertically
            centered with the right cluster. Only the consumer homepage passes these;
            every other page omits them, leaving the slot empty. */}
        {(heading || subtitle) && (
          <div className="min-w-0 flex-1">
            {heading && (
              <h1 className="truncate text-2xl font-bold text-[#0A0A0A] md:text-3xl">{heading}</h1>
            )}
            {subtitle && <p className="mt-0.5 truncate text-xs text-[#6B6B6B]">{subtitle}</p>}
          </div>
        )}

        {/* Right cluster — search pill + bell + avatar, pinned hard right as one tight
            group. ml-auto (≥md) carries it right even when the welcome slot is empty; on
            mobile it stretches (flex-1) so the search stays usable. Search is the primary
            typed-query entry point — it lands on /recherche. Bell + avatar show ≥md. */}
        <div className="flex min-w-0 flex-1 items-center gap-3 md:ml-auto md:flex-none">
          <div className="min-w-0 flex-1 md:w-80 md:flex-none lg:w-96">
            <SharedSearchBar
              basePath="/recherche"
              initialType={initialType}
              initialQuery={initialQuery}
              toggleHref={onMarche ? marcheEngineHref : onHome ? homeEngineHref : undefined}
            />
          </div>

          <button
            type="button"
            // TODO: Real notifications system — see roadmap.md, post-MVP. Visual-only
            // for now: the bell shows an unread dot but opens no panel.
            onClick={() => console.log('Notifications coming soon')}
            aria-label={`${t('dashboard.topbar.notifications', lang)} — ${t('marche.sidebar.coming_soon', lang)}`}
            className={cn(circleBtn, 'relative hidden shrink-0 md:inline-flex')}
          >
            <Bell className="h-5 w-5 text-text-primary" aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute right-[10px] top-[10px] h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"
            />
          </button>

          <div className="hidden shrink-0 md:block">
            <ProfileAvatarMenu user={user} triggerClassName={circleBtn} />
          </div>
        </div>
      </div>
    </div>
  )
}

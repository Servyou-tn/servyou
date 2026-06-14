'use client'

import { useEffect, useRef, useState, type Ref } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { Wordmark } from '@/components/layout/Wordmark'
import { MenuIcon } from '@/components/layout/icons'
import { SearchIcon, BellIcon } from '@/components/dashboard/consumer/icons'

// Column-local top bar (not page-wide). Desktop/tablet: marketplace search + bell.
// Mobile: hamburger + logo + bell (search lives in the marketplace itself there).
export function DashboardTopBar({
  drawerOpen,
  onOpenDrawer,
  hamburgerRef,
}: {
  drawerOpen: boolean
  onOpenDrawer: () => void
  hamburgerRef?: Ref<HTMLButtonElement>
}) {
  const lang = useLang()
  const [bellOpen, setBellOpen] = useState(false)
  const bellWrapRef = useRef<HTMLDivElement>(null)

  // Close the notifications popover on Escape or an outside click.
  useEffect(() => {
    if (!bellOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setBellOpen(false)
    }
    function onClick(e: MouseEvent) {
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [bellOpen])

  return (
    <header className="flex items-center gap-3 border-b border-border-subtle bg-surface-base px-4 py-3 md:px-6 md:py-4">
      {/* Mobile: hamburger */}
      <button
        ref={hamburgerRef}
        type="button"
        onClick={onOpenDrawer}
        aria-label={t('nav.menu_open', lang)}
        aria-expanded={drawerOpen}
        className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-pill md:hidden ${FOCUS_RING}`}
      >
        <MenuIcon className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Mobile: logo */}
      <Wordmark className="h-7 md:hidden" />

      {/* Desktop/tablet: search */}
      <form action="/recherche" method="GET" className="hidden max-w-[480px] flex-1 md:flex">
        <label htmlFor="dashboard-search" className="sr-only">
          {t('dashboard.topbar.searchPlaceholder', lang)}
        </label>
        <div className="relative w-full">
          <SearchIcon
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            id="dashboard-search"
            name="q"
            type="search"
            placeholder={t('dashboard.topbar.searchPlaceholder', lang)}
            className={`w-full rounded-xl border border-border-subtle bg-white py-2.5 pe-4 ps-10 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted ${FOCUS_RING}`}
          />
        </div>
      </form>

      {/* Bell + notifications popover */}
      <div ref={bellWrapRef} className="relative ms-auto">
        <button
          type="button"
          onClick={() => setBellOpen((o) => !o)}
          aria-label={t('dashboard.topbar.notifications', lang)}
          aria-haspopup="dialog"
          aria-expanded={bellOpen}
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-pill ${FOCUS_RING}`}
        >
          <BellIcon className="h-5 w-5" aria-hidden="true" />
        </button>
        {bellOpen ? (
          <div
            role="dialog"
            aria-label={t('dashboard.topbar.notifications', lang)}
            className="absolute end-0 z-50 mt-2 w-64 rounded-xl border border-border-subtle bg-white p-4 shadow-[0_24px_64px_rgba(15,23,42,0.12)]"
          >
            <p className="text-center text-sm text-text-muted">
              {t('dashboard.topbar.notificationsEmpty', lang)}
            </p>
          </div>
        ) : null}
      </div>
    </header>
  )
}

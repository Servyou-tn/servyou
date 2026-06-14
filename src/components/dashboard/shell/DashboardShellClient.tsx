'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { DashboardSidebar } from './DashboardSidebar'
import { DashboardTopBar } from './DashboardTopBar'

// The responsive frame. Persistent sidebar at md+ (icon-only 72px tablet, full 240px
// desktop), hamburger drawer below md. The right rail is passed in as an already-
// rendered server slot (RSC composition) and laid out once — third column at lg,
// stacked below the main content otherwise.
export function DashboardShellClient({
  rightRail,
  children,
}: {
  rightRail: ReactNode
  children: ReactNode
}) {
  const lang = useLang()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  function closeDrawer() {
    setDrawerOpen(false)
    hamburgerRef.current?.focus()
  }

  // Body scroll lock + Escape close while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
        hamburgerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  // Focus the drawer's close button when it opens.
  useEffect(() => {
    if (drawerOpen) closeRef.current?.focus()
  }, [drawerOpen])

  // Keep Tab focus inside the open drawer (aria-modal).
  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    )
    if (!focusables || focusables.length === 0) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Persistent sidebar (md+) */}
      <aside className="sticky top-0 hidden h-screen shrink-0 border-e border-border-subtle bg-surface-base md:flex md:w-[72px] lg:w-60">
        <DashboardSidebar variant="desktop" />
      </aside>

      {/* Right region: top bar, then main + rail */}
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar
          drawerOpen={drawerOpen}
          onOpenDrawer={() => setDrawerOpen(true)}
          hamburgerRef={hamburgerRef}
        />
        {/* lg: two columns (main | 280px rail). Below lg the grid collapses, so the
            rail naturally stacks under the main content — rendered exactly once. */}
        <div className="lg:grid lg:grid-cols-[1fr_280px]">
          <main id="main-content" className="min-w-0 px-4 py-6 md:px-6 md:py-8">
            {children}
          </main>
          <aside className="px-4 pb-8 lg:border-s lg:border-border-subtle lg:px-5 lg:py-8">
            {rightRail}
          </aside>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-50 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t('nav.aria_primary', lang)}
        >
          <div
            className="absolute inset-0 bg-text-primary/40 motion-safe:transition-opacity"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <div
            ref={panelRef}
            onKeyDown={onPanelKeyDown}
            className="absolute inset-y-0 start-0 flex w-60 flex-col bg-surface-base shadow-xl"
          >
            <DashboardSidebar
              variant="mobile-drawer"
              closeRef={closeRef}
              onClose={closeDrawer}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

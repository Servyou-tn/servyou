'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import type { ShellRole } from './sidebar-items'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

// The responsive frame for the authenticated workspace. Persistent navy sidebar at lg+; below
// lg it becomes a slide-out drawer behind the topbar hamburger (body-scroll lock + Escape close
// + focus trap). Content sits on the --page-bg ground. In RTL the default flex row reverses, so
// the sidebar lands on the right (Souq/Noon/Jumia convention) with no directional overrides.
export function AppShellClient({
  user,
  role,
  pageToolbar,
  rightRail,
  children,
}: {
  user: TopBarUser | null
  role: ShellRole
  pageToolbar?: ReactNode
  rightRail?: ReactNode
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

  // Focus the close button when the drawer opens.
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
    <div className="flex min-h-screen bg-surface-subtle">
      {/* Persistent sidebar (lg+). */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block">
        <Sidebar role={role} />
      </aside>

      {/* Right region: topbar, optional relocated filter toolbar, then content. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={user}
          role={role}
          onOpenDrawer={() => setDrawerOpen(true)}
          hamburgerRef={hamburgerRef}
        />

        {/* Relocated page filter (e.g. Statut on /mes-commandes, Type on /mes-favoris) — the
            existing filter element, moved out of the old sidebar accordion into a slim strip. */}
        {pageToolbar ? (
          <div className="border-b border-border-subtle bg-white px-4 py-2.5 md:px-8">{pageToolbar}</div>
        ) : null}

        <main id="main-content" className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          {/* Centered at max-w-7xl to preserve the migrated pages' intended reading width
              (MarcheLayout capped content the same way) and avoid wide-screen stretch. */}
          <div className="mx-auto w-full max-w-7xl">
            {rightRail ? (
              <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
                <div className="min-w-0">{children}</div>
                <aside className="mt-6 lg:mt-0">{rightRail}</aside>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>

      {/* Mobile drawer. */}
      {drawerOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
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
            className="absolute inset-y-0 start-0 flex w-[280px] max-w-[85vw] flex-col"
          >
            <Sidebar
              role={role}
              inDrawer
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

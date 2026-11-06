'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Bell, EllipsisVertical } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { Topbar } from '@/components/shell/Topbar'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import { roleToShellRole } from '@/lib/roles'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AdminSidebar, type AdminCounts } from '@/components/AdminSidebar'

// The admin frame (Figma « NOV 4 — Admin »: every admin frame's sidebar + topbar is the shell spec).
// lg+: the persistent navy AdminSidebar + the app's existing Topbar, unchanged. Below lg: the frame's
// navy mobile header (admin-m375-reports « mobile-header »: lockup · « Admin » tag · bell · kebab) — the
// kebab opens the same sidebar as a drawer (scroll lock, Escape, focus trap: AppShellClient's drawer
// contract, copied because that frame is shared). Content sits on surface-subtle; the layout fetches
// the user and the counts (server) and passes them in.
export function AdminShell({ user, counts, children }: { user: TopBarUser | null; counts: AdminCounts; children: ReactNode }) {
  const lang = useLang()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const kebabRef = useRef<HTMLButtonElement>(null)
  const unusedHamburgerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  function closeDrawer() {
    setDrawerOpen(false)
    kebabRef.current?.focus()
  }

  useEffect(() => {
    if (!drawerOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setDrawerOpen(false)
        kebabRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [drawerOpen])

  function onPanelKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Tab') return
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
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
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 lg:block">
        <AdminSidebar counts={counts} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop topbar — the shared Topbar as-is (its hamburger is lg:hidden, so never shown here). */}
        <div className="sticky top-0 z-30 hidden lg:block">
          <Topbar
            user={user}
            role={roleToShellRole(user?.seller_type ?? null)}
            onOpenDrawer={() => setDrawerOpen(true)}
            hamburgerRef={unusedHamburgerRef}
          />
        </div>

        {/* Mobile header — 56 tall, blue-950, pad 12/16, gap 12. */}
        <header className="sticky top-0 z-30 flex items-center gap-3 bg-brand-blue-950 px-4 py-3 lg:hidden">
          <Link href="/admin" aria-label="Servyou" className={cn('flex shrink-0 items-center gap-2 rounded-pill', FOCUS_RING)}>
            <Image src="/brand/logo/servyou-s-mark.png" alt="" width={32} height={32} priority className="h-8 w-8 shrink-0" />
            <span className="text-xl font-bold text-white">ServYou</span>
          </Link>
          <span className="rounded-full bg-brand-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
            {t('admin.mobile.tag', lang)}
          </span>
          <span className="flex-1" aria-hidden="true" />
          <AdminBell />
          <button
            ref={kebabRef}
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t('shell.mobile.menu.open', lang)}
            aria-expanded={drawerOpen}
            className={cn('relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/5', FOCUS_RING)}
          >
            <EllipsisVertical className="h-[22px] w-[22px]" aria-hidden="true" />
            {/* 32px box keeps the 56px header; the invisible child extends the hit area to 44 (Button pattern). */}
            <span aria-hidden="true" className="absolute -inset-1.5" />
          </button>
        </header>

        {/* Content pad: frame 32/32/48/32 at 1440, 20/16/32/16 at 375. */}
        <main id="main-content" className="min-w-0 flex-1 px-4 pb-8 pt-5 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t('admin.nav.aria', lang)}>
          <div className="absolute inset-0 bg-text-primary/40" onClick={closeDrawer} aria-hidden="true" />
          <div ref={panelRef} onKeyDown={onPanelKeyDown} className="absolute inset-y-0 start-0 flex w-[280px] max-w-[85vw] flex-col bg-brand-blue-950">
            <div className="min-h-0 flex-1">
              <AdminSidebar counts={counts} inDrawer closeRef={closeRef} onClose={closeDrawer} onNavigate={() => setDrawerOpen(false)} />
            </div>
            {/* The topbar's language toggle has no place in the 375 header — it rides at the foot of the drawer. */}
            <div className="shrink-0 px-7 pb-6">
              <LanguageToggle />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// The mobile header's bell: the Topbar's honest empty notifications panel (no feed yet, no fake count),
// with a white 22px glyph for the navy ground.
function AdminBell() {
  const lang = useLang()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('shell.topbar.notifications.title', lang)}
          className={cn('relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/5', FOCUS_RING)}
        >
          <Bell className="h-[22px] w-[22px]" aria-hidden="true" />
          <span aria-hidden="true" className="absolute -inset-1.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-72 overflow-hidden rounded-2xl border border-border-subtle bg-white p-0 shadow-lg">
        <div className="border-b border-border-subtle px-4 py-3">
          <p className="text-label font-semibold text-text-primary">{t('shell.topbar.notifications.title', lang)}</p>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-body-sm text-text-muted">{t('shell.topbar.notifications.empty', lang)}</p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

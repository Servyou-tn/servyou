'use client'

import Link from 'next/link'
import type { Ref } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { sidebarSectionsForRole, type ShellRole } from './sidebar-items'
import { isActiveRoute } from './active-route'
import { SidebarSection } from './SidebarSection'
import { SidebarItem } from './SidebarItem'

// The app-shell sidebar (design system Sections 3.1/3.2): a full-height dark-navy column, 240px
// on desktop, rendered inside a slide-out drawer below lg. Sections + items are chosen by role
// (sidebar-items.ts). `inDrawer` adds the close button for the mobile overlay; `onNavigate`
// closes the drawer when a link is followed.
export function Sidebar({
  role,
  inDrawer = false,
  onNavigate,
  onClose,
  closeRef,
}: {
  role: ShellRole
  inDrawer?: boolean
  onNavigate?: () => void
  onClose?: () => void
  closeRef?: Ref<HTMLButtonElement>
}) {
  const lang = useLang()
  const pathname = usePathname()
  const sections = sidebarSectionsForRole(role)

  return (
    <div className="flex h-full w-full flex-col bg-brand-blue-950 px-4 py-6 text-text-inverse">
      {/* Logo block (80px). Text wordmark — the navbar PNG's navy "Serv" vanishes on the dark
          ground, so we reuse the colored-span wordmark (DashboardSidebar precedent). A dedicated
          dark-bg logo asset is a logged brand-assets follow-up. */}
      <div className="flex h-20 items-center justify-between">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="Servyou"
          className={`rounded-pill text-xl font-bold tracking-tight ${FOCUS_RING}`}
        >
          <span className="text-white">Serv</span>
          <span className="text-brand-accent-light">You</span>
        </Link>
        {inDrawer ? (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('shell.mobile.menu.close', lang)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-pill text-white/70 transition-colors hover:bg-white/5 hover:text-white ${FOCUS_RING}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <nav
        aria-label={t('nav.aria_primary', lang)}
        className="mt-2 flex flex-1 flex-col gap-6 overflow-y-auto"
      >
        {sections.map((section) => (
          <SidebarSection key={section.labelKey} label={t(section.labelKey, lang)}>
            {section.items.map((item) => (
              <SidebarItem
                key={item.href}
                href={item.href}
                label={t(item.key, lang)}
                icon={item.icon}
                active={isActiveRoute(pathname, item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </SidebarSection>
        ))}
      </nav>
    </div>
  )
}

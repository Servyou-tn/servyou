'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Ref } from 'react'
import { usePathname } from 'next/navigation'
import { Rocket, X } from 'lucide-react'
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
    <div className="flex h-full w-full flex-col bg-brand-blue-950 px-4 pb-6 text-text-inverse">
      {/* Logo band (208×72, top-aligned, pad L12 — Figma 611:45637 S-mark band → Lockup 123×32,
          gap 8): the 32px S-mark + "ServYou" wordmark, BOTH words #FFFFFF on the navy ground (the
          two-tone Serv/You treatment is for light surfaces only). shrink-0 so the band never
          compresses on a short viewport; ps-3 aligns the mark with the nav items at 28px. */}
      <div className="flex h-[72px] shrink-0 items-center justify-between ps-3">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="Servyou"
          className={`flex items-center gap-2 rounded-pill ${FOCUS_RING}`}
        >
          <Image
            src="/brand/logo/servyou-s-mark.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
          />
          <span className="text-xl font-bold tracking-tight text-white">ServYou</span>
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
        className="mt-3 flex flex-1 flex-col gap-6"
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
            {/* "Devenir vendeur" promo (Figma 611:45637 → 110:3874): only for a consumer
                (seller_type null; role is 'consumer' logged-out too). Hidden for sellers. */}
            {role === 'consumer' && section.labelKey === 'shell.sidebar.section.discover' && (
              <Link
                href="/devenir-vendeur"
                onClick={onNavigate}
                className={`mt-1 flex flex-col gap-2 rounded-xl bg-brand-blue-600 p-4 text-text-inverse transition-colors hover:bg-brand-blue-700 ${FOCUS_RING}`}
              >
                <Rocket className="h-6 w-6 shrink-0" aria-hidden="true" />
                <span className="text-h4">{t('shell.sidebar.sellerCta.title', lang)}</span>
                <span className="text-body-sm text-brand-blue-100">
                  {t('shell.sidebar.sellerCta.subtitle', lang)}
                </span>
              </Link>
            )}
          </SidebarSection>
        ))}
      </nav>
    </div>
  )
}

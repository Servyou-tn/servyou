'use client'

import type { Ref } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { UserIcon, CloseIcon } from '@/components/layout/icons'
import {
  LayoutDashboardIcon,
  PackageIcon,
  HeartIcon,
  BriefcaseIcon,
  StoreIcon,
  LogOutIcon,
} from '@/components/dashboard/consumer/icons'
import { isActiveRoute } from './sidebar-active'

const display = 'font-[family-name:var(--font-display)]'

type IconCmp = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

// Consumer nav items, in order. "Mon profil" points at the real /profile route.
const NAV_ITEMS: { key: string; href: string; Icon: IconCmp }[] = [
  { key: 'dashboard.sidebar.monEspace', href: '/mon-espace', Icon: LayoutDashboardIcon },
  { key: 'dashboard.sidebar.mesCommandes', href: '/mes-demandes', Icon: PackageIcon },
  { key: 'dashboard.sidebar.mesFavoris', href: '/mes-favoris', Icon: HeartIcon },
  { key: 'dashboard.sidebar.mesMissions', href: '/mes-missions', Icon: BriefcaseIcon },
  { key: 'dashboard.sidebar.monProfil', href: '/profile', Icon: UserIcon },
  { key: 'dashboard.sidebar.devenirVendeur', href: '/devenir-vendeur', Icon: StoreIcon },
]

// Dark "expanded" sidebar — a floating navy card (brand-primary). The active item
// inverts to a white pill with navy text/icon as the visual anchor. The collapsed
// (72px icon-only) variant is a deferred follow-up (ships with the marketplace
// route-aware shell work). `inDrawer` adds the close button for the mobile overlay.
export function DashboardSidebar({
  inDrawer = false,
  onNavigate,
  onClose,
  closeRef,
}: {
  inDrawer?: boolean
  onNavigate?: () => void
  onClose?: () => void
  closeRef?: Ref<HTMLButtonElement>
}) {
  const lang = useLang()
  const pathname = usePathname()

  return (
    <div className="flex h-full w-full flex-col rounded-2xl bg-brand-primary p-5 text-white">
      {/* Logo header — light wordmark for the dark card (navy "Serv" would vanish). */}
      <div className="flex items-center justify-between border-b border-white/10 pb-6">
        <span className={`${display} text-xl font-bold`} aria-label={t('sidebar.expanded.servyou', lang)}>
          <span className="text-white">Serv</span>
          <span className="text-brand-accent-light">You</span>
        </span>
        {inDrawer ? (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('nav.menu_close', lang)}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/5 hover:text-white ${FOCUS_RING}`}
          >
            <CloseIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Nav */}
      <nav aria-label={t('nav.aria_primary', lang)} className="flex-1 space-y-1 pt-4">
        {NAV_ITEMS.map((item) => {
          const active = isActiveRoute(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
                active ? 'bg-white text-brand-primary' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span>{t(item.key, lang)}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer — logout posts to the existing signout route. */}
      <div className="border-t border-white/10 pt-4">
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white ${FOCUS_RING}`}
          >
            <LogOutIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>{t('dashboard.sidebar.deconnexion', lang)}</span>
          </button>
        </form>
      </div>
    </div>
  )
}

'use client'

import type { Ref } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { Wordmark } from '@/components/layout/Wordmark'
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

type IconCmp = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

// Consumer nav items, in order. Role-conditional items come in future commits.
// "Mon profil" points at the real /profile route (there is no /mon-profil).
const NAV_ITEMS: { key: string; href: string; Icon: IconCmp }[] = [
  { key: 'dashboard.sidebar.monEspace', href: '/mon-espace', Icon: LayoutDashboardIcon },
  { key: 'dashboard.sidebar.mesCommandes', href: '/mes-demandes', Icon: PackageIcon },
  { key: 'dashboard.sidebar.mesFavoris', href: '/mes-favoris', Icon: HeartIcon },
  { key: 'dashboard.sidebar.mesMissions', href: '/mes-missions', Icon: BriefcaseIcon },
  { key: 'dashboard.sidebar.monProfil', href: '/profile', Icon: UserIcon },
  { key: 'dashboard.sidebar.devenirVendeur', href: '/devenir-vendeur', Icon: StoreIcon },
]

export function DashboardSidebar({
  variant,
  onNavigate,
  onClose,
  closeRef,
}: {
  variant: 'desktop' | 'mobile-drawer'
  onNavigate?: () => void
  onClose?: () => void
  closeRef?: Ref<HTMLButtonElement>
}) {
  const lang = useLang()
  const pathname = usePathname()
  const isDrawer = variant === 'mobile-drawer'

  // Labels show always in the drawer; on the persistent rail they appear only at lg
  // (icon-only 72px at the tablet breakpoint).
  const labelCls = isDrawer ? 'inline' : 'hidden lg:inline'
  // Center icons in the collapsed tablet rail, start-align once labels show.
  const rowJustify = isDrawer ? '' : 'justify-center lg:justify-start'

  return (
    <div className="flex h-full w-full flex-col">
      {/* Logo header */}
      <div className="flex h-16 items-center justify-between px-3">
        {isDrawer ? (
          <>
            <Wordmark className="h-8" />
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label={t('nav.menu_close', lang)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-pill ${FOCUS_RING}`}
            >
              <CloseIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </>
        ) : (
          <>
            {/* Full wordmark at desktop, S-mark only in the collapsed tablet rail. */}
            <Wordmark className="hidden h-8 lg:block" />
            <Image
              src="/brand/logo/servyou-hero.png"
              alt="Servyou"
              width={120}
              height={120}
              className="mx-auto block h-8 w-8 lg:hidden"
            />
          </>
        )}
      </div>

      {/* Nav */}
      <nav aria-label={t('nav.aria_primary', lang)} className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = isActiveRoute(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${rowJustify} ${FOCUS_RING} ${
                active
                  ? 'bg-brand-sky text-brand-primary'
                  : 'text-text-muted transition-colors hover:bg-surface-subtle'
              }`}
            >
              <item.Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className={labelCls}>{t(item.key, lang)}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer — logout is a POST form to the existing signout route. */}
      <div className="border-t border-border-subtle px-3 py-4">
        <form action="/auth/signout" method="POST">
          <button
            type="submit"
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 ${rowJustify} ${FOCUS_RING}`}
          >
            <LogOutIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className={labelCls}>{t('dashboard.sidebar.deconnexion', lang)}</span>
          </button>
        </form>
      </div>
    </div>
  )
}

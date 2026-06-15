'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'
import { StorefrontIcon, PackageIcon, HeartIcon, BriefcaseIcon } from './icons'

type IconCmp = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

// The four shared destinations of the marche app shell. All live links now that their
// pages exist; each lights up by longest-prefix match (so /mes-missions/nouvelle keeps
// "Mes missions" active).
const NAV_ITEMS: { key: string; href: string; Icon: IconCmp }[] = [
  { key: 'marche.sidebar.marche', href: '/marche', Icon: StorefrontIcon },
  { key: 'marche.sidebar.commandes', href: '/mes-commandes', Icon: PackageIcon },
  { key: 'marche.sidebar.favoris', href: '/mes-favoris', Icon: HeartIcon },
  { key: 'marche.sidebar.missions', href: '/mes-missions', Icon: BriefcaseIcon },
]

// The marche shell sidebar — a floating full-height white card (NOT the dashboard
// sidebar, which is reserved for the seller dashboards). Locked to its full 224px width
// on desktop so the top bar sits in the same screen position on every page (no more
// product-vs-service collapse). Hidden below lg; a mobile drawer is a separate pass.
export function MarcheSidebar() {
  const lang = useLang()
  const pathname = usePathname()

  // Pill nav items matching the top bar's "Mes paramètres" button: rounded-full, h-11,
  // px-4, white bg + subtle border + soft shadow (active = brand-accent tinted, same shape).
  const navBase = `flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all duration-200 ease-out ${FOCUS_RING}`

  return (
    // sticky full-height rail; the p-4 is the floating gap around the white card.
    <aside className="sticky top-0 hidden h-screen shrink-0 p-4 lg:block">
      <div className={`outline-brand flex h-full w-56 flex-col overflow-hidden rounded-3xl bg-white ${CARD_SHADOW}`}>
        {/* Header — brand wordmark PNG (never a text wordmark). object-cover crops the
            asset's transparent top/bottom bands to a readable ink height. */}
        <div className="flex items-center border-b border-border-subtle px-3 pb-4 pt-4">
          <Image
            src="/brand/logo/servyou-navbar.png"
            alt="Servyou"
            width={160}
            height={48}
            className="h-12 w-40 object-cover"
          />
        </div>

        {/* Nav — all four destinations as pills, active by longest-prefix match. */}
        <nav aria-label={t('nav.aria_primary', lang)} className="flex flex-1 flex-col gap-2 px-3 pt-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`${navBase} ${
                  active
                    ? 'border border-brand-accent/30 bg-brand-accent/10 text-brand-accent shadow-sm'
                    : 'border border-border-subtle bg-white text-text-primary shadow-sm hover:bg-slate-50 hover:shadow-md'
                }`}
              >
                <item.Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{t(item.key, lang)}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

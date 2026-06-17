'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'
import { marcheEngineHref, resolveMarcheSidebarNav } from '@/lib/marche/marche-routing'
import { StorefrontIcon, PackageIcon, HeartIcon, BriefcaseIcon } from './icons'

type IconCmp = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

// The three account destinations under the Marché accordion. Each lights up by
// longest-prefix match (so /mes-missions/nouvelle keeps "Mes missions" active).
const ACCOUNT_ITEMS: { key: string; href: string; Icon: IconCmp }[] = [
  { key: 'marche.sidebar.commandes', href: '/mes-commandes', Icon: PackageIcon },
  { key: 'marche.sidebar.favoris', href: '/mes-favoris', Icon: HeartIcon },
  { key: 'marche.sidebar.missions', href: '/mes-missions', Icon: BriefcaseIcon },
]

const PRODUITS_HREF = marcheEngineHref('product')
const SERVICES_HREF = marcheEngineHref('service')

// The marche shell sidebar — a floating full-height white card (NOT the dashboard sidebar,
// which is reserved for the seller dashboards). Locked to 224px on desktop; hidden below lg
// (mobile drawer is a separate pass).
//
// Marché is an accordion: on any /marche/* route it expands and shows ONLY the active
// engine's sub-item (Produits OR Services — never both), carrying that engine's filter
// panel (`sidebarFilter`, fed by the page) beneath it. Each engine shows only its own side
// of the marketplace; switching engines is the top-bar toggle's job, not the sidebar's. On
// every other route it collapses to a single pill linking to the default (Produits) engine.
// The filter only appears here — /recherche and /categories keep their own right-column
// filter, and never pass `sidebarFilter`.
export function MarcheSidebar({ sidebarFilter }: { sidebarFilter?: ReactNode }) {
  const lang = useLang()
  const pathname = usePathname()

  // Expansion is route-derived (no separate toggle state): being on a browse route IS the
  // expanded state, so clicking Marché — which navigates to /marche/produits — expands it.
  const { onMarche, produitsActive, servicesActive } = resolveMarcheSidebarNav(pathname)

  const navBase = `flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all duration-200 ease-out ${FOCUS_RING}`
  const subBase = `flex h-9 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium transition-all duration-200 ease-out ${FOCUS_RING}`
  const activePill =
    'border border-brand-accent/30 bg-brand-accent/10 text-brand-accent shadow-sm'
  const idlePill =
    'border border-border-subtle bg-white text-text-primary shadow-sm hover:bg-slate-50 hover:shadow-md'

  return (
    <aside className="sticky top-0 hidden h-screen shrink-0 p-4 lg:block">
      <div className={`outline-brand flex h-full w-56 flex-col overflow-hidden rounded-3xl bg-white ${CARD_SHADOW}`}>
        {/* Header — brand wordmark PNG (never a text wordmark). object-cover crops the
            asset's transparent bands to a readable ink height. */}
        <div className="flex items-center border-b border-border-subtle px-3 pb-4 pt-4">
          <Image
            src="/brand/logo/servyou-navbar.png"
            alt="Servyou"
            width={160}
            height={48}
            className="h-12 w-40 object-cover"
          />
        </div>

        {/* Nav scrolls internally — the active engine's filter panel can be tall. */}
        <nav
          aria-label={t('nav.aria_primary', lang)}
          className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-4 pt-4"
        >
          {/* ── Marché accordion ── */}
          {onMarche ? (
            <div className="flex flex-col gap-1.5">
              {/* Group header (expanded) — links to the default Produits engine. */}
              <Link href={PRODUITS_HREF} className={`${navBase} ${idlePill} justify-between`}>
                <span className="flex items-center gap-2">
                  <StorefrontIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{t('marche.sidebar.marche', lang)}</span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
              </Link>

              {/* Sub-item, indented — ONLY the active engine's renders, always highlighted
                  and owning the filter beneath it. The inactive engine never appears here;
                  switching engines is the top-bar toggle's job. */}
              <div className="flex flex-col gap-1.5 pl-3">
                {produitsActive && (
                  <>
                    <Link href={PRODUITS_HREF} aria-current="page" className={`${subBase} ${activePill}`}>
                      <PackageIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="whitespace-nowrap">{t('common.products_section', lang)}</span>
                    </Link>
                    {sidebarFilter && <div className="px-0.5 pb-1">{sidebarFilter}</div>}
                  </>
                )}
                {servicesActive && (
                  <>
                    <Link href={SERVICES_HREF} aria-current="page" className={`${subBase} ${activePill}`}>
                      <BriefcaseIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span className="whitespace-nowrap">{t('common.services_section', lang)}</span>
                    </Link>
                    {sidebarFilter && <div className="px-0.5 pb-1">{sidebarFilter}</div>}
                  </>
                )}
              </div>
            </div>
          ) : (
            // Collapsed — a single Marché pill linking to the default Produits engine.
            <Link href={PRODUITS_HREF} className={`${navBase} ${idlePill} justify-between`}>
              <span className="flex items-center gap-2">
                <StorefrontIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="whitespace-nowrap">{t('marche.sidebar.marche', lang)}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
            </Link>
          )}

          {/* ── Account destinations ── */}
          {ACCOUNT_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`${navBase} ${active ? activePill : idlePill}`}
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

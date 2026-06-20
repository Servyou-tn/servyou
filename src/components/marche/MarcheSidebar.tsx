'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
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

// The collapsible filter panel's id — referenced by the chevron toggle's aria-controls.
const FILTER_PANEL_ID = 'marche-sidebar-filters'

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
  const { onMarche } = resolveMarcheSidebarNav(pathname)

  // The filter panel below the Marché button is collapsible via its chevron. Open by default;
  // no persistence — switching engine (a pathname change) resets it back to open. Refining
  // filters only changes the query string (same pathname), so it leaves the panel as-is.
  const [filtersOpen, setFiltersOpen] = useState(true)
  useEffect(() => {
    setFiltersOpen(true)
  }, [pathname])

  const navBase = `flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all duration-200 ease-out ${FOCUS_RING}`
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
            <div className="flex flex-col">
              {/* Group header (expanded). The label area links to the default Produits engine;
                  the chevron is a SEPARATE button that toggles the filter panel below (it can't
                  be nested inside the Link — an <a> can't contain a <button>). */}
              <div className={`${navBase} ${idlePill} justify-between`}>
                <Link
                  href={PRODUITS_HREF}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-full ${FOCUS_RING}`}
                >
                  <StorefrontIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{t('marche.sidebar.marche', lang)}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                  aria-controls={FILTER_PANEL_ID}
                  aria-label={filtersOpen ? 'Masquer les filtres' : 'Afficher les filtres'}
                  className={`-mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-text-muted transition-colors hover:bg-black/5 ${FOCUS_RING}`}
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ease-in-out ${filtersOpen ? 'rotate-180' : ''}`}
                    aria-hidden="true"
                  />
                </button>
              </div>

              {/* Filter panel — the active engine's filters. The Produits/Services sub-toggle
                  was removed (redundant with the top-bar engine toggle); the panel now holds
                  only the filter groups. Collapsible via the chevron: the grid-rows 1fr→0fr
                  trick animates height to auto with no magic number, paired with opacity for a
                  soft fade; `inert` drops the clipped content out of the tab order when closed. */}
              <div
                id={FILTER_PANEL_ID}
                inert={!filtersOpen}
                className={`grid transition-all duration-200 ease-in-out ${
                  filtersOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="pl-3 pt-1.5">
                    {sidebarFilter && <div className="px-0.5 pb-1">{sidebarFilter}</div>}
                  </div>
                </div>
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

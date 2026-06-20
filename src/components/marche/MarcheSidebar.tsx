'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'
import { marcheEngineHref, resolveMarcheSidebarNav } from '@/lib/marche/marche-routing'
import { StorefrontIcon, PackageIcon, HeartIcon, BriefcaseIcon } from './icons'

type IconCmp = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

// The three account destinations. Each lights up by longest-prefix match (so
// /mes-missions/nouvelle keeps "Mes missions" active). Filter-bearing items carry
// `showAria`/`hideAria` (hardcoded French) for their chevron; Mes missions has none (no
// sidebar filter today — a separate future PR), so it renders without a chevron.
const ACCOUNT_ITEMS: {
  key: string
  href: string
  Icon: IconCmp
  showAria?: string
  hideAria?: string
}[] = [
  {
    key: 'marche.sidebar.commandes',
    href: '/mes-commandes',
    Icon: PackageIcon,
    showAria: 'Afficher les filtres de commandes',
    hideAria: 'Masquer les filtres de commandes',
  },
  {
    key: 'marche.sidebar.favoris',
    href: '/mes-favoris',
    Icon: HeartIcon,
    showAria: 'Afficher les filtres de favoris',
    hideAria: 'Masquer les filtres de favoris',
  },
  { key: 'marche.sidebar.missions', href: '/mes-missions', Icon: BriefcaseIcon },
]

const PRODUITS_HREF = marcheEngineHref('product')

// The Marché filter panel's id + the account item's filter-panel id (only one of each is
// ever expanded at a time) — referenced by their chevron toggles' aria-controls.
const FILTER_PANEL_ID = 'marche-sidebar-filters'
const ACCOUNT_FILTER_PANEL_ID = 'consumer-sidebar-account-filter'

// Shared pill styling — one source of truth so every nav item (Marché + the account
// destinations) is byte-identical. Active items get the blue treatment; idle items the
// white pill with a hover lift.
const NAV_BASE = `flex h-11 items-center gap-2 rounded-full px-4 text-sm font-medium transition-all duration-200 ease-out ${FOCUS_RING}`
const ACTIVE_PILL = 'border border-brand-accent/30 bg-brand-accent/10 text-brand-accent shadow-sm'
const IDLE_PILL =
  'border border-border-subtle bg-white text-text-primary shadow-sm hover:bg-slate-50 hover:shadow-md'

// One sidebar nav item — a navigating pill (icon + label) with a unified chevron affordance:
// filter-bearing items always show a down-chevron (˅ collapsed → ^ expanded, the accordion
// convention). When the item is the active route AND its page supplied a filter, the chevron
// becomes a SEPARATE toggle button that expands the filter panel below (an <a> can't contain a
// <button>, hence the split). Otherwise the chevron is a decorative "has filters" hint on the
// nav link. Non-filter-bearing items (Mes missions) show no chevron.
function SidebarNavItem({
  href,
  Icon,
  label,
  active,
  filterBearing,
  expandable,
  open,
  onToggle,
  panelId,
  showAria,
  hideAria,
  filterContent,
}: {
  href: string
  Icon: IconCmp
  label: string
  active: boolean
  filterBearing: boolean
  expandable: boolean
  open?: boolean
  onToggle?: () => void
  panelId?: string
  showAria?: string
  hideAria?: string
  filterContent?: ReactNode
}) {
  const pill = active ? ACTIVE_PILL : IDLE_PILL
  const chevronColor = active ? 'text-brand-accent' : 'text-text-muted'

  if (expandable) {
    return (
      <div className="flex flex-col">
        <div className={`${NAV_BASE} ${pill} justify-between`}>
          <Link
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-full ${FOCUS_RING}`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
          </Link>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? hideAria : showAria}
            className={`-mr-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full ${chevronColor} transition-colors hover:bg-brand-accent/10 ${FOCUS_RING}`}
          >
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ease-in-out ${open ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        </div>
        {/* grid-rows 1fr→0fr animates height to auto; opacity fades; inert drops the clipped
            filter out of the tab order when collapsed. */}
        <div
          id={panelId}
          inert={!open}
          className={`grid transition-all duration-200 ease-in-out ${
            open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="pl-3 pt-1.5">
              <div className="px-0.5 pb-1">{filterContent}</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Not expandable — a navigating pill. Filter-bearing items still show a decorative
  // down-chevron so the "has filters" affordance reads the same on every route.
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`${NAV_BASE} ${pill} ${filterBearing ? 'justify-between' : ''}`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="whitespace-nowrap">{label}</span>
      </span>
      {filterBearing && (
        <ChevronDown className={`h-4 w-4 shrink-0 ${chevronColor}`} aria-hidden="true" />
      )}
    </Link>
  )
}

// The marche shell sidebar — a floating full-height white card (NOT the dashboard sidebar,
// which is reserved for the seller dashboards). Locked to 224px on desktop; hidden below lg
// (mobile drawer is a separate pass).
//
// Every nav item is a SidebarNavItem (above). Filter-bearing items (Marché, Mes commandes,
// Mes favoris) always show a down-chevron; on the active route, when the page supplies a
// `sidebarFilter`, the chevron toggles the filter panel below (the same panel the page fed).
// Marché's filter is fed only on /marche/*; the account filters only on their own routes.
// /recherche and /categories keep their own right-column filter and never pass `sidebarFilter`.
export function MarcheSidebar({ sidebarFilter }: { sidebarFilter?: ReactNode }) {
  const lang = useLang()
  const pathname = usePathname()
  const { onMarche } = resolveMarcheSidebarNav(pathname)

  // Marché's filter is open by default (matching the browse-by-default surface); the account
  // filter is collapsed by default. No persistence — a route change resets both.
  const [filtersOpen, setFiltersOpen] = useState(true)
  const [accountFilterOpen, setAccountFilterOpen] = useState(false)
  useEffect(() => {
    setFiltersOpen(true)
    setAccountFilterOpen(false)
  }, [pathname])

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
          {/* ── Marché ── */}
          <SidebarNavItem
            href={PRODUITS_HREF}
            Icon={StorefrontIcon}
            label={t('marche.sidebar.marche', lang)}
            active={onMarche}
            filterBearing
            expandable={onMarche && Boolean(sidebarFilter)}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((open) => !open)}
            panelId={FILTER_PANEL_ID}
            showAria="Afficher les filtres"
            hideAria="Masquer les filtres"
            filterContent={sidebarFilter}
          />

          {/* ── Account destinations ── */}
          {ACCOUNT_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const filterBearing = Boolean(item.showAria)
            return (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                Icon={item.Icon}
                label={t(item.key, lang)}
                active={active}
                filterBearing={filterBearing}
                expandable={active && filterBearing && Boolean(sidebarFilter)}
                open={accountFilterOpen}
                onToggle={() => setAccountFilterOpen((open) => !open)}
                panelId={ACCOUNT_FILTER_PANEL_ID}
                showAria={item.showAria}
                hideAria={item.hideAria}
                filterContent={sidebarFilter}
              />
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { CARD_SHADOW } from '@/components/layout/styles'
import { interactiveSurface, FOCUS_RING } from '@/components/ui/interactive-surface'
import { marcheEngineHref, resolveMarcheSidebarNav } from '@/lib/marche/marche-routing'
import { StorefrontIcon, PackageIcon, HeartIcon, BriefcaseIcon } from './icons'
import { SidebarSelectFilter } from './SidebarSelectFilter'

type IconCmp = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

// The three account destinations. Each lights up by longest-prefix match (so
// /mes-missions/nouvelle keeps "Mes missions" active). Filter-bearing items carry
// `showAria`/`hideAria` (hardcoded French) for their chevron; Mes missions has none (no
// sidebar filter), so it renders without a chevron.
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

// Each expandable button's filter-panel id — referenced by its chevron's aria-controls.
// Distinct ids because several panels can be open at once.
const MARCHE_PANEL_ID = 'sidebar-marche-filter'
const COMMANDES_PANEL_ID = 'sidebar-commandes-filter'
const FAVORIS_PANEL_ID = 'sidebar-favoris-filter'

// The pill layout (shape + padding + text). The surface (height, idle/active/hover, focus) comes
// from the shared interactiveSurface() — one source of truth across the sidebar + top bar.
const NAV_LAYOUT = 'flex items-center gap-2 rounded-full px-4 text-sm font-medium'

// One sidebar nav item — a navigating pill (icon + label) with a unified chevron affordance.
// Filter-bearing items always show a down-chevron (˅ collapsed → ^ expanded). When the item is
// `expandable`, the chevron is a SEPARATE toggle button (an <a> can't contain a <button>) that
// opens the filter panel below, and the label is a <Link> that still navigates — UNLESS the item
// is the active route, where the label is a no-op (you're already there). When not expandable,
// the whole pill is a navigating Link with a decorative "has filters" chevron. Non-filter-bearing
// items (Mes missions) show no chevron.
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
  const chevronColor = active ? 'text-brand-accent' : 'text-text-muted'

  const labelInner = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="whitespace-nowrap">{label}</span>
    </>
  )

  if (expandable) {
    return (
      <div className="flex flex-col">
        <div className={cn(NAV_LAYOUT, interactiveSurface(active), 'justify-between')}>
          {/* The label navigates (to go to that page) when inactive; on the active route it's a
              no-op — you're already there. Either way the chevron button beside it is the ONLY
              control that toggles the filter panel. */}
          {active ? (
            <span aria-current="page" className="flex min-w-0 flex-1 items-center gap-2">
              {labelInner}
            </span>
          ) : (
            <Link
              href={href}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-full ${FOCUS_RING}`}
            >
              {labelInner}
            </Link>
          )}
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
      className={cn(NAV_LAYOUT, interactiveSurface(active), filterBearing && 'justify-between')}
    >
      <span className="flex min-w-0 items-center gap-2">{labelInner}</span>
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
// Every nav item is a SidebarNavItem. Each filter-bearing button has its OWN open state, so
// several panels can be open at once. Mes commandes (Statut) and Mes favoris (Type) carry
// simple URL-param filters built right here, so they expand on ANY route — a selection writes
// its param to the CURRENT url (basePath={pathname}), so off their own page it never navigates
// (the param sits harmlessly and the page ignores it). Marché's filter needs server-fetched
// categories, so it stays scoped to /marche/* and is fed via `sidebarFilter`. A route change
// resets every panel.
export function MarcheSidebar({ sidebarFilter }: { sidebarFilter?: ReactNode }) {
  const lang = useLang()
  const pathname = usePathname()
  const { onMarche } = resolveMarcheSidebarNav(pathname)

  // Independent open state per filter-bearing button (no mutex — multiple can be open). Marché
  // opens by default on its browse surface; the account filters start collapsed. A route change
  // resets all three.
  const [marcheOpen, setMarcheOpen] = useState(true)
  const [commandesOpen, setCommandesOpen] = useState(false)
  const [favorisOpen, setFavorisOpen] = useState(false)
  // Reset the open-states on route change without an effect (React's adjust-state-during-
  // render pattern): compare against the previous pathname.
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (prevPathname !== pathname) {
    setPrevPathname(pathname)
    setMarcheOpen(true)
    setCommandesOpen(false)
    setFavorisOpen(false)
  }

  // The two simple filters, built in the sidebar so they expand on every route. basePath is the
  // current path: on their own page the param filters the list; elsewhere it's a harmless no-op
  // param (no navigation). The radios still respond either way.
  const statutFilter = (
    <SidebarSelectFilter
      paramName="statut"
      groupLabel="Statut"
      defaultValue="all"
      basePath={pathname}
      ariaShow="Afficher le filtre Statut"
      ariaHide="Masquer le filtre Statut"
      options={[
        { value: 'all', label: t('mescommandes.filter.all', lang) },
        { value: 'active', label: t('mescommandes.filter.active', lang) },
        { value: 'delivered', label: t('mescommandes.filter.delivered', lang) },
        { value: 'cancelled', label: t('mescommandes.filter.cancelled', lang) },
      ]}
    />
  )
  const typeFilter = (
    <SidebarSelectFilter
      paramName="type"
      groupLabel="Type"
      defaultValue="product"
      basePath={pathname}
      ariaShow="Afficher le filtre Type"
      ariaHide="Masquer le filtre Type"
      options={[
        { value: 'product', label: t('common.products_section', lang) },
        { value: 'service', label: t('common.services_section', lang) },
      ]}
    />
  )

  // Per-account-item filter wiring (Mes missions has none → not expandable, plain link).
  const accountFilters: Record<
    string,
    { open: boolean; toggle: () => void; content: ReactNode; panelId: string }
  > = {
    '/mes-commandes': {
      open: commandesOpen,
      toggle: () => setCommandesOpen((o) => !o),
      content: statutFilter,
      panelId: COMMANDES_PANEL_ID,
    },
    '/mes-favoris': {
      open: favorisOpen,
      toggle: () => setFavorisOpen((o) => !o),
      content: typeFilter,
      panelId: FAVORIS_PANEL_ID,
    },
  }

  return (
    <aside className="sticky top-[var(--marche-topbar-h,4.5rem)] hidden h-[calc(100vh_-_var(--marche-topbar-h,4.5rem))] shrink-0 self-start px-4 pb-4 pt-4 lg:block">
      <div className={`outline-brand flex h-full w-56 flex-col overflow-hidden rounded-3xl bg-white ${CARD_SHADOW}`}>
        {/* The brand mark moved to the top bar's far left; the sidebar starts with its nav. */}
        {/* Nav scrolls internally — an open filter panel can be tall. */}
        <nav
          aria-label={t('nav.aria_primary', lang)}
          className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-4 pt-4"
        >
          {/* ── Marché (filter scoped to /marche/*) ── */}
          <SidebarNavItem
            href={PRODUITS_HREF}
            Icon={StorefrontIcon}
            label={t('marche.sidebar.marche', lang)}
            active={onMarche}
            filterBearing
            expandable={onMarche && Boolean(sidebarFilter)}
            open={marcheOpen}
            onToggle={() => setMarcheOpen((o) => !o)}
            panelId={MARCHE_PANEL_ID}
            showAria="Afficher les filtres"
            hideAria="Masquer les filtres"
            filterContent={sidebarFilter}
          />

          {/* ── Account destinations ── */}
          {ACCOUNT_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const filterBearing = Boolean(item.showAria)
            const filter = accountFilters[item.href]
            return (
              <SidebarNavItem
                key={item.href}
                href={item.href}
                Icon={item.Icon}
                label={t(item.key, lang)}
                active={active}
                filterBearing={filterBearing}
                expandable={Boolean(filter)}
                open={filter?.open}
                onToggle={filter?.toggle}
                panelId={filter?.panelId}
                showAria={item.showAria}
                hideAria={item.hideAria}
                filterContent={filter?.content}
              />
            )
          })}
        </nav>
      </div>
    </aside>
  )
}

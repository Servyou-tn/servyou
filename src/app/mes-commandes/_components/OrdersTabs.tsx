import Link from 'next/link'
import { Package, Briefcase } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import type { OrdersTab } from '@/lib/marche/my-orders-params'

// The Produits · Services toggle (Figma segmented 704:59172 / 709:59668 / 710:59947): surface/pill track, radius 10,
// pad 4; the selected segment is white with a shadow, the other text/secondary. Produits stays FIRST, as drawn.
//
// Both segments are real links — `?tab=` is a URL fact, so the back button replays the tab and a bookmark opens it.
// Switching tab drops q / statut / tri / page on purpose: the two tabs have different status sets, and a stale
// `statut=prepared` would filter Services to nothing.
//
// Server component, no client interaction. A <nav> of links rather than role="tablist": each item is a full-page
// navigation, so there is no tabpanel / arrow-key model to promise (same call as H8's tab strip).
const BASE = '/mes-commandes'

export function OrdersTabs({ lang, tab }: { lang: Lang; tab: OrdersTab }) {
  const items: { key: OrdersTab; Icon: typeof Package }[] = [
    { key: 'produits', Icon: Package },
    { key: 'services', Icon: Briefcase },
  ]
  return (
    <nav
      aria-label={t('mesCommandes.tabsAria', lang)}
      className="inline-flex items-center self-start rounded-[10px] bg-surface-pill p-1"
    >
      {items.map(({ key, Icon }) => {
        const active = key === tab
        return (
          <Link
            key={key}
            href={`${BASE}?tab=${key}`}
            aria-current={active ? 'page' : undefined}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-body-sm font-medium transition-colors ${FOCUS_RING} ${
              active ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t(`mesCommandes.tab.${key}`, lang)}
          </Link>
        )
      })}
    </nav>
  )
}

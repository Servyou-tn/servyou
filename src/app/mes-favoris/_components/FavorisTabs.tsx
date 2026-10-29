'use client'

import { useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { ListingResults } from '@/components/listings/ListingResults'
import { FavorisProductGrid } from './FavorisProductGrid'
import { EmptyState } from '@/components/marche/EmptyState'
import { Pagination } from '@/components/shared/Pagination'
import { paginate } from '@/lib/search/search-params'
import { PackageIcon, BriefcaseIcon, StorefrontIcon, HeartIcon } from '@/components/marche/icons'
import { ShopCard } from '@/components/shops/ShopCard'
import { FreelancerCard } from '@/components/freelancers/FreelancerCard'
import type { ShopCardData } from '@/lib/marche/shop-cards'
import type { FreelancerCardData } from '@/lib/marche/freelancer-cards'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

type TabValue = 'produits' | 'services' | 'boutiques' | 'freelances'

const BASE = '/mes-favoris'

// Tab state is local (client) rather than a URL query param or a separate route: the page already fetched every favorited product,
// service, shop AND freelancer in one server pass, so switching tabs has nothing to re-fetch — the same « small personal list »
// reasoning that dropped F1's filter bar. All four tabs are live (B6; migration 98 added the 'shop' / 'freelancer' item types).
//
// Un-hearting a shop / freelancer card removes it from the list AT ONCE (optimistic, local `removed` sets); if the server refuses,
// the heart rolls back and the card reappears. The page's own refresh (the action revalidates /mes-favoris) then re-syncs the list
// and the header count.
export function FavorisTabs({
  products,
  services,
  shops,
  freelancers,
}: {
  products: ProductListing[]
  services: ServiceListing[]
  shops: ShopCardData[]
  freelancers: FreelancerCardData[]
}) {
  const lang = useLang()
  const [tab, setTab] = useState<TabValue>('produits')
  // Ids un-hearted in this session — hidden immediately, restored if the server says no.
  const [removedShops, setRemovedShops] = useState<ReadonlySet<string>>(new Set())
  const [removedFreelancers, setRemovedFreelancers] = useState<ReadonlySet<string>>(new Set())

  const tabs: TabValue[] = ['produits', 'services', 'boutiques', 'freelances']
  const toggleIn = (set: ReadonlySet<string>, id: string, hidden: boolean): ReadonlySet<string> => {
    const next = new Set(set)
    if (hidden) next.add(id)
    else next.delete(id)
    return next
  }
  const visibleShops = shops.filter((s) => !removedShops.has(s.id))
  const visibleFreelancers = freelancers.filter((f) => !removedFreelancers.has(f.id))

  // Pagination is reused for visual/structural consistency with the cached Figma audit ("single-
  // page Pagination"); at current favorites volumes every tab is one page, so Pagination
  // self-hides (totalPages <= 1 renders null — see shared/Pagination.tsx). No page state is
  // wired: this is not the search/orders pattern of URL-driven paging.
  const { totalPages: productPages } = paginate(products.length, 1)
  const { totalPages: servicePages } = paginate(services.length, 1)

  return (
    <div className="flex flex-col gap-6">
      {/* Quiet tab bar (Figma 718:60584, sunken track): matches ProduitsLensToggle/
          ServicesLensToggle/OrdersTabs, not SegmentedControl — those three were each measured
          against a real frame and landed on the same white-pill-on-surface-sunken look;
          SegmentedControl's solid blue pill was never measured against any of them
          (docs/follow-ups.md logs the consolidation question separately). */}
      <div
        role="tablist"
        aria-label={t('mesfavoris.tabsAria', lang)}
        className="inline-flex max-w-full items-center self-start overflow-x-auto rounded-[10px] bg-surface-sunken p-1"
      >
        {tabs.map((value) => {
          const isActive = tab === value
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(value)}
              className={`inline-flex h-9 shrink-0 items-center justify-center rounded-md px-3 text-body-sm font-medium transition-colors ${FOCUS_RING} ${
                isActive ? 'bg-white text-text-primary shadow-xs' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {t(`mesfavoris.tab.${value}`, lang)}
            </button>
          )
        })}
      </div>

      {tab === 'boutiques' ? (
        visibleShops.length === 0 ? (
          <EmptyState
            icon={<StorefrontIcon className="mx-auto h-12 w-12" />}
            message={t('mesfavoris.empty.boutiques.title', lang)}
            subtitle={t('mesfavoris.empty.boutiques.subtitle', lang)}
            cta={{ label: t('mesfavoris.empty.boutiques.cta', lang), href: '/marche/produits?vue=boutiques' }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleShops.map((shop) => (
              <ShopCard
                key={shop.id}
                shop={shop}
                lang={lang}
                heart={{
                  initialFavorited: true,
                  isLoggedIn: true,
                  onChange: (fav) => setRemovedShops((cur) => toggleIn(cur, shop.id, !fav)),
                }}
              />
            ))}
          </div>
        )
      ) : tab === 'freelances' ? (
        visibleFreelancers.length === 0 ? (
          <EmptyState
            icon={<HeartIcon className="mx-auto h-12 w-12" />}
            message={t('mesfavoris.empty.freelances.title', lang)}
            subtitle={t('mesfavoris.empty.freelances.subtitle', lang)}
            cta={{ label: t('mesfavoris.empty.freelances.cta', lang), href: '/marche/services' }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {visibleFreelancers.map((freelancer) => (
              <FreelancerCard
                key={freelancer.id}
                freelancer={freelancer}
                lang={lang}
                heart={{
                  initialFavorited: true,
                  isLoggedIn: true,
                  onChange: (fav) => setRemovedFreelancers((cur) => toggleIn(cur, freelancer.id, !fav)),
                }}
              />
            ))}
          </div>
        )
      ) : tab === 'services' ? (
        services.length === 0 ? (
          <EmptyState
            icon={<BriefcaseIcon className="mx-auto h-12 w-12" />}
            message={t('mesfavoris.empty.services.title', lang)}
            subtitle={t('mesfavoris.empty.services.subtitle', lang)}
            cta={{ label: t('mesfavoris.empty.services.cta', lang), href: '/marche/services' }}
          />
        ) : (
          <>
            <ListingResults type="service" items={services} />
            <Pagination page={1} totalPages={servicePages} basePath={BASE} />
          </>
        )
      ) : products.length === 0 ? (
        <EmptyState
          icon={<PackageIcon className="mx-auto h-12 w-12" />}
          message={t('mesfavoris.empty.produits.title', lang)}
          subtitle={t('mesfavoris.empty.produits.subtitle', lang)}
          cta={{ label: t('mesfavoris.empty.produits.cta', lang), href: '/marche/produits' }}
        />
      ) : (
        <>
          <FavorisProductGrid items={products} />
          <Pagination page={1} totalPages={productPages} basePath={BASE} />
        </>
      )}
    </div>
  )
}

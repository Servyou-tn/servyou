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
import { PackageIcon, BriefcaseIcon } from '@/components/marche/icons'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

type TabValue = 'produits' | 'services' | 'boutiques' | 'freelances'

const BASE = '/mes-favoris'

// Tab state is local (client) rather than a URL query param or a separate route: getMyFavorites
// already fetched every favorited product AND service in one server call, so switching tabs has
// nothing to re-fetch — the same "small personal list" reasoning that dropped F1's filter bar.
// Boutiques/Freelances render disabled (Ruling 1): favorites.item_type only allows
// 'product'/'service' at the DB level, so there is no data those tabs could ever show, and no
// body is rendered for them at all. Because tab state never reaches the URL, there is no such
// thing as a direct link to a disabled tab — ?tab=boutiques would simply be inert; the page
// always opens on Produits.
export function FavorisTabs({
  products,
  services,
}: {
  products: ProductListing[]
  services: ServiceListing[]
}) {
  const lang = useLang()
  const [tab, setTab] = useState<TabValue>('produits')

  const soon = t('mesfavoris.tab.soon', lang)
  const enabledTabs: TabValue[] = ['produits', 'services']
  const disabledTabs: TabValue[] = ['boutiques', 'freelances']

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
        {enabledTabs.map((value) => {
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
        {disabledTabs.map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            disabled
            aria-disabled="true"
            aria-selected={false}
            title={soon}
            className="inline-flex h-9 shrink-0 cursor-not-allowed items-center gap-1 rounded-md px-3 text-body-sm font-medium text-text-secondary"
          >
            {t(`mesfavoris.tab.${value}`, lang)}
            <span className="rounded-full bg-brand-blue-100 px-1.5 py-0.5 text-caption font-semibold text-brand-blue-600">
              {soon}
            </span>
          </button>
        ))}
      </div>

      {tab === 'services' ? (
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

'use client'

import { useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { SegmentedControl, type SegmentedControlOption } from '@/components/ui/segmented-control'
import { ListingResults } from '@/components/listings/ListingResults'
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
  const options: SegmentedControlOption<TabValue>[] = [
    { value: 'produits', label: t('mesfavoris.tab.produits', lang) },
    { value: 'services', label: t('mesfavoris.tab.services', lang) },
    {
      value: 'boutiques',
      label: t('mesfavoris.tab.boutiques', lang),
      disabled: true,
      disabledTitle: soon,
      soonLabel: soon,
    },
    {
      value: 'freelances',
      label: t('mesfavoris.tab.freelances', lang),
      disabled: true,
      disabledTitle: soon,
      soonLabel: soon,
    },
  ]

  // Pagination is reused for visual/structural consistency with the cached Figma audit ("single-
  // page Pagination"); at current favorites volumes every tab is one page, so Pagination
  // self-hides (totalPages <= 1 renders null — see shared/Pagination.tsx). No page state is
  // wired: this is not the search/orders pattern of URL-driven paging.
  const { totalPages: productPages } = paginate(products.length, 1)
  const { totalPages: servicePages } = paginate(services.length, 1)

  return (
    <div className="flex flex-col gap-6">
      <SegmentedControl
        options={options}
        value={tab}
        onChange={(v) => {
          if (v === 'produits' || v === 'services') setTab(v)
        }}
        ariaLabel={t('mesfavoris.tabsAria', lang)}
        className="max-w-full self-start overflow-x-auto"
      />

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
          <ListingResults type="product" items={products} />
          <Pagination page={1} totalPages={productPages} basePath={BASE} />
        </>
      )}
    </div>
  )
}

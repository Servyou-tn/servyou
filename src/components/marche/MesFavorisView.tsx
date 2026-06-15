'use client'

import { useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { ListingResults } from '@/components/listings/ListingResults'
import { EmptyState } from './EmptyState'
import { HeartIcon } from './icons'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

type FavType = 'product' | 'service'

// Favorites view: the same Produits/Services segmented toggle as /marche, rendering the
// reused product grid / service list. Unfavoriting a card refreshes the server data
// (FavoriteButton calls router.refresh()), so the item drops from the list.
export function MesFavorisView({
  products,
  services,
}: {
  products: ProductListing[]
  services: ServiceListing[]
}) {
  const lang = useLang()
  const [type, setType] = useState<FavType>('product')

  const segment = (active: boolean) =>
    `rounded-full px-5 py-1.5 text-[13px] font-medium transition-all duration-200 ${FOCUS_RING} ${
      active ? 'bg-brand-accent text-white shadow-sm' : 'text-[#0A0A0A]'
    }`

  return (
    <div>
      <div className="mb-6 inline-flex h-10 items-center gap-1 rounded-full bg-[#F4F4F4] p-1">
        <button
          type="button"
          aria-pressed={type === 'product'}
          onClick={() => setType('product')}
          className={segment(type === 'product')}
        >
          {t('common.products_section', lang)}
        </button>
        <button
          type="button"
          aria-pressed={type === 'service'}
          onClick={() => setType('service')}
          className={segment(type === 'service')}
        >
          {t('common.services_section', lang)}
        </button>
      </div>

      {type === 'product' ? (
        products.length > 0 ? (
          <ListingResults type="product" items={products} />
        ) : (
          <EmptyState
            icon={<HeartIcon className="mx-auto h-12 w-12" />}
            message={t('favorites.no_products', lang)}
            cta={{ label: t('marche.browse_cta', lang), href: '/marche' }}
          />
        )
      ) : services.length > 0 ? (
        <ListingResults type="service" items={services} />
      ) : (
        <EmptyState
          icon={<HeartIcon className="mx-auto h-12 w-12" />}
          message={t('favorites.no_services', lang)}
          cta={{ label: t('marche.browse_cta', lang), href: '/marche' }}
        />
      )}
    </div>
  )
}

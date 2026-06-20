'use client'

import { useSearchParams } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { ListingResults } from '@/components/listings/ListingResults'
import { EmptyState } from './EmptyState'
import { HeartIcon } from './icons'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

// Favorites view: the Produits/Services choice now lives in the sidebar (the "Mes favoris"
// expandable group writes ?type=); this view reads that param and renders the reused product
// grid / service list. An absent/unknown param means "Produits". Unfavoriting a card refreshes
// the server data (FavoriteButton calls router.refresh()), so the item drops from the list.
export function MesFavorisView({
  products,
  services,
}: {
  products: ProductListing[]
  services: ServiceListing[]
}) {
  const lang = useLang()
  const sp = useSearchParams()
  const type = sp.get('type') === 'service' ? 'service' : 'product'

  return (
    <div>
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

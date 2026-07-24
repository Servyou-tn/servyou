import { t, type Lang } from '@/lib/i18n'
import { ListingResults } from '@/components/listings/ListingResults'
import { ProductListingCard } from '@/components/listings/ProductListingCard'
import { ServiceListingCard } from '@/components/listings/ServiceListingCard'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'
import type { FavoriteItem } from '@/lib/marche/my-data'
import { EmptyState } from './EmptyState'
import { HeartIcon } from './icons'

// Favorites view. The sidebar Type filter writes ?type=product|service (absent = "Tous"); the
// page resolves that into `view` and hands us the current page's slice for the active list. The
// three views:
//   • all     — products + services interleaved by recency (combined). Products tile in the grid;
//               services span the full row (col-span-full), so each card keeps its native layout.
//   • product — the product grid (ListingResults), unchanged.
//   • service — the service list (ListingResults), unchanged.
// Empty states read the FULL per-kind totals (not the slice): an all-empty user gets the generic
// "no favorites yet" CTA to browse; a per-kind-empty user who has the other kind gets a nudge
// back to the combined Tous view.
export function MesFavorisView({
  view,
  combined,
  products,
  services,
  productTotal,
  serviceTotal,
  lang,
}: {
  view: 'all' | 'product' | 'service'
  combined: FavoriteItem[]
  products: ProductListing[]
  services: ServiceListing[]
  productTotal: number
  serviceTotal: number
  lang: Lang
}) {
  const browseCta = { label: t('marche.browse_cta', lang), href: '/marche' }
  const allCta = { label: t('favorites.filter.all', lang), href: '/mes-favoris' }

  if (view === 'product') {
    if (productTotal === 0) {
      return (
        <EmptyState
          icon={<HeartIcon className="mx-auto h-12 w-12" />}
          message={t('favorites.no_products', lang)}
          cta={serviceTotal > 0 ? allCta : browseCta}
        />
      )
    }
    return <ListingResults type="product" items={products} />
  }

  if (view === 'service') {
    if (serviceTotal === 0) {
      return (
        <EmptyState
          icon={<HeartIcon className="mx-auto h-12 w-12" />}
          message={t('favorites.no_services', lang)}
          cta={productTotal > 0 ? allCta : browseCta}
        />
      )
    }
    return <ListingResults type="service" items={services} />
  }

  // view === 'all' — combined Tous
  if (productTotal + serviceTotal === 0) {
    return (
      <EmptyState
        icon={<HeartIcon className="mx-auto h-12 w-12" />}
        message={t('favorites.empty', lang)}
        cta={browseCta}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {combined.map((f) =>
        f.kind === 'product' ? (
          <ProductListingCard key={`p-${f.item.id}`} product={f.item} />
        ) : (
          // ServiceListingCard is now the v3.7 vertical grid card, so services sit as normal
          // grid cells (no longer a spanned full-width row). F1 favorites gets its own Figma
          // rebuild later; this keeps the shared card sized correctly in the meantime.
          <ServiceListingCard key={`s-${f.item.id}`} service={f.item} />
        ),
      )}
    </div>
  )
}

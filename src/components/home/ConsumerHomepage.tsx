import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ListingResults } from '@/components/listings/ListingResults'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'
import { PackageIcon, BriefcaseIcon } from '@/components/marche/icons'
import { CARD_SHADOW } from '@/components/layout/styles'
import { PageHeader } from '@/components/shared/PageHeader'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import type { SearchType } from '@/lib/search/search-params'

// The logged-in consumer homepage IS the marketplace browse: greeting (in the shared top
// bar's left slot) + the active catalog's grid. The Produits/Services toggle in the top bar
// switches `type` in place via ?type= (no dashboard-style sections here — favorites/orders/
// recent strips were removed; the sidebar links own those destinations). Newest-first,
// browse-by-default — filters + pagination live on the /marche engines, not here.
export function ConsumerHomepage({
  user,
  type,
  products,
  services,
  lang,
}: {
  user: TopBarUser
  type: SearchType
  products: ProductListing[]
  services: ServiceListing[]
  lang: Lang
}) {
  const isEmpty = type === 'product' ? products.length === 0 : services.length === 0
  const Icon = type === 'product' ? PackageIcon : BriefcaseIcon

  return (
    <MarcheLayout user={user} searchType={type}>
      <PageHeader
        subtitle={t('page_header.accueil.subtitle', lang)}
        emphasisWord={t('page_header.accueil.emphasis', lang)}
      />
      {isEmpty ? (
        <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
          <div className="mx-auto max-w-md">
            <Icon className="mx-auto h-10 w-10 text-icon-muted" aria-hidden="true" />
            <p className="mt-4 text-base font-semibold text-text-primary">
              {t(type === 'product' ? 'marche.empty.products' : 'marche.empty.services', lang)}
            </p>
            <p className="mt-2 text-body-sm text-text-muted">
              {t(
                type === 'product'
                  ? 'marche.empty.products_subtitle'
                  : 'marche.empty.services_subtitle',
                lang,
              )}
            </p>
          </div>
        </div>
      ) : type === 'product' ? (
        <ListingResults type="product" items={products} />
      ) : (
        <ListingResults type="service" items={services} />
      )}
    </MarcheLayout>
  )
}

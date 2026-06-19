import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ListingResults } from '@/components/listings/ListingResults'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'
import { PackageIcon, BriefcaseIcon } from '@/components/marche/icons'
import { CARD_SHADOW } from '@/components/layout/styles'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import type { SearchType } from '@/lib/search/search-params'
import { firstName } from '@/lib/utils'

// The logged-in consumer homepage IS the marketplace browse: greeting (in the shared top
// bar's left slot) + the active catalog's grid. The Produits/Services toggle in the top bar
// switches `type` in place via ?type= (no dashboard-style sections here — favorites/orders/
// recent strips were removed; the sidebar links own those destinations). Newest-first,
// browse-by-default — filters + pagination live on the /marche engines, not here.
export function ConsumerHomepage({
  user,
  fullName,
  type,
  products,
  services,
  lang,
}: {
  user: TopBarUser
  fullName: string | null
  type: SearchType
  products: ProductListing[]
  services: ServiceListing[]
  lang: Lang
}) {
  // Time-of-day greeting is intentionally skipped: server time is UTC, not the user's local
  // time, so "Bonjour" is used always.
  const name = firstName(fullName)
  const greeting = name
    ? t('home.greeting.hello', lang, { name })
    : t('home.greeting.hello_noname', lang)

  const isEmpty = type === 'product' ? products.length === 0 : services.length === 0
  const Icon = type === 'product' ? PackageIcon : BriefcaseIcon

  return (
    <MarcheLayout user={user} searchType={type} heading={greeting} subtitle={t('home.subtitle', lang)}>
      {isEmpty ? (
        <div className={`rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
          <div className="mx-auto max-w-md">
            <Icon className="mx-auto h-10 w-10 text-[#B8B8B8]" aria-hidden="true" />
            <p className="mt-4 text-base font-semibold text-text-primary">
              {t(type === 'product' ? 'marche.empty.products' : 'marche.empty.services', lang)}
            </p>
            <p className="mt-2 text-[13px] text-text-muted">
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

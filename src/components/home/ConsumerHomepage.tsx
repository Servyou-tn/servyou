import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ProductListingCard } from '@/components/listings/ProductListingCard'
import { ServiceListingCard } from '@/components/listings/ServiceListingCard'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'
import type { HomepageData } from '@/lib/homepage/homepage-utils'
import { WelcomeStrip } from './WelcomeStrip'
import { ActiveOrdersStrip } from './ActiveOrdersStrip'
import { FavoritesStrip } from './FavoritesStrip'
import { HorizontalStrip } from './HorizontalStrip'

// The logged-in consumer homepage — discovery-first, continuation-first. Renders through
// the shared /marche shell. Conditional strips (active orders, favorites) disappear when
// empty; the "recently added" strips render whenever the platform has inventory.
export function ConsumerHomepage({
  user,
  fullName,
  data,
  lang,
}: {
  user: TopBarUser
  fullName: string | null
  data: HomepageData
  lang: Lang
}) {
  return (
    <MarcheLayout user={user}>
      <WelcomeStrip fullName={fullName} lang={lang} />

      {data.activeOrders.length > 0 && <ActiveOrdersStrip orders={data.activeOrders} lang={lang} />}

      {data.favorites.length > 0 && <FavoritesStrip favorites={data.favorites} lang={lang} />}

      {data.recentProducts.length > 0 && (
        <HorizontalStrip title={t('home.sections.recentProducts', lang)} viewAllHref="/marche" lang={lang}>
          {data.recentProducts.map((p) => (
            <div key={p.id} className="w-64 shrink-0">
              <ProductListingCard product={p} />
            </div>
          ))}
        </HorizontalStrip>
      )}

      {data.recentServices.length > 0 && (
        <HorizontalStrip
          title={t('home.sections.recentServices', lang)}
          viewAllHref="/marche?type=service"
          lang={lang}
        >
          {data.recentServices.map((s) => (
            <div key={s.id} className="w-[360px] shrink-0">
              <ServiceListingCard service={s} />
            </div>
          ))}
        </HorizontalStrip>
      )}
    </MarcheLayout>
  )
}

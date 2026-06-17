import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { ProductListingCard } from '@/components/listings/ProductListingCard'
import { ServiceListingCard } from '@/components/listings/ServiceListingCard'
import type { HomeFavorite } from '@/lib/homepage/homepage-utils'
import { HorizontalStrip } from './HorizontalStrip'

// Favorites teaser — type-adaptive cards reused untouched from /marche. Product cards
// are vertical tiles (w-64); service cards are horizontal rows (wider, w-[360px]) — so
// the strip has two card widths side by side (see report flag).
export function FavoritesStrip({ favorites, lang }: { favorites: HomeFavorite[]; lang: Lang }) {
  return (
    <HorizontalStrip title={t('home.sections.favorites', lang)} viewAllHref="/mes-favoris" lang={lang}>
      {favorites.map((f) =>
        f.type === 'product' ? (
          <div key={`p-${f.product.id}`} className="w-64 shrink-0">
            <ProductListingCard product={f.product} />
          </div>
        ) : (
          <div key={`s-${f.service.id}`} className="w-[360px] shrink-0">
            <ServiceListingCard service={f.service} />
          </div>
        ),
      )}
    </HorizontalStrip>
  )
}

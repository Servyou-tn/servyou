'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { PackageIcon } from '@/components/dashboard/consumer/icons'
import { tndPrice } from './listing-utils'

export type ProductListing = {
  id: string
  title: string
  price_tnd: number
  image_url: string | null
  shop: { name: string; city: string | null }
}

// Vertical product card for the /marche grid: the product image (or a quiet Package
// placeholder) bleeds to the rounded top edge with the favorite heart floating over it,
// then a white content block with name, "shop · city", price and a dark "Voir" pill. The
// heart sits outside the Link so favoriting never navigates; the rest of the card links to
// the product detail page (/produits/[id] — 404s until that route is rebuilt).
export function ProductListingCard({ product }: { product: ProductListing }) {
  const lang = useLang()

  const meta = [product.shop.name, product.shop.city].filter(Boolean).join(' · ')

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white transition-shadow ${CARD_SHADOW} hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)]`}
    >
      <Link href={`/produits/${product.id}`} className={`block rounded-2xl ${FOCUS_RING}`}>
        {/* Image area — no padding, so it fills the card's rounded top corners. */}
        <div className="relative aspect-[4/3] w-full bg-zinc-100">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
              <PackageIcon className="h-12 w-12 text-zinc-400" />
            </div>
          )}
        </div>

        <div className="p-4">
          <p className="line-clamp-2 text-base font-semibold text-text-primary">{product.title}</p>
          {meta && <p className="mt-1 line-clamp-1 text-xs text-text-muted">{meta}</p>}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-lg font-bold text-text-primary">{tndPrice(product.price_tnd)}</p>
            <span className="rounded-full bg-text-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-text-primary/90">
              {t('listing.product.viewAction', lang)}
            </span>
          </div>
        </div>
      </Link>

      {/* Favorite heart over the image — white disc behind it for contrast on photos. */}
      <div className="absolute end-3 top-3 rounded-full bg-white/90 shadow-sm">
        <FavoriteButton item_type="product" item_id={product.id} />
      </div>
    </div>
  )
}

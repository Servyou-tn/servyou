'use client'

import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { PackageIcon } from '@/components/dashboard/consumer/icons'
import { frenchRelativeAdded, tndPrice } from './listing-utils'

export type ProductListing = {
  id: string
  title: string
  price_tnd: number
  shop: { name: string; city: string | null }
  created_at: string
}

// Horizontal product row — same rhythm as ServiceListingCard. Thumbnail is a quiet
// Package placeholder (the marketplace has no image pipeline yet); shop name in the
// provider slot; fixed price.
export function ProductListingCard({ product }: { product: ProductListing }) {
  const lang = useLang()

  const meta = [
    product.shop.city,
    t('listing.service.relativeAdded', lang, { time: frenchRelativeAdded(product.created_at) }),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border-subtle bg-white p-4 transition-colors hover:bg-surface-subtle md:p-5">
      <Link
        href={`/produit/${product.id}`}
        className={`flex min-w-0 flex-1 items-center gap-4 rounded-lg ${FOCUS_RING}`}
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-subtle"
          aria-hidden="true"
        >
          <PackageIcon className="h-7 w-7 text-text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-base font-semibold text-text-primary">{product.title}</p>
          <p className="line-clamp-1 text-sm text-text-muted">{product.shop.name}</p>
          <p className="mt-0.5 text-xs text-text-muted">{meta}</p>
        </div>
        <p className="shrink-0 text-end text-base font-semibold text-text-primary">{tndPrice(product.price_tnd)}</p>
      </Link>
      <FavoriteButton item_type="product" item_id={product.id} />
    </div>
  )
}

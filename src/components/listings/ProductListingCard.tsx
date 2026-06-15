'use client'

import Link from 'next/link'
import Image from 'next/image'
import { FOCUS_RING } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { PackageIcon } from '@/components/dashboard/consumer/icons'
import { ArrowUpRightIcon } from './icons'
import { tndPrice } from './listing-utils'

export type ProductListing = {
  id: string
  title: string
  description: string | null
  price_tnd: number
  image_url: string | null
  shop: { name: string; city: string | null }
}

// Vertical product card (Wink-style, pure mono — no brand color inside): a square image
// (or a quiet Package placeholder) with the favorite heart floating top-right, then a
// white content block with title, 2-line description, "shop · city" meta, and a bottom
// row of bold price + a black circular CTA. The heart is a sibling of the Link, so it
// never navigates; the rest of the card — including the CTA — links to the detail page
// (/produits/[id], which 404s until that route is rebuilt).
export function ProductListingCard({ product }: { product: ProductListing }) {
  const meta = [product.shop.name, product.shop.city].filter(Boolean).join(' · ')

  return (
    <div className="card-premium relative overflow-hidden">
      <Link href={`/produits/${product.id}`} className={`block ${FOCUS_RING}`}>
        {/* Image area — fills the card's rounded top corners (no padding). */}
        <div className="relative aspect-square w-full overflow-hidden bg-[#F4F4F4]">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
              <PackageIcon className="h-12 w-12 text-[#B8B8B8]" />
            </div>
          )}
        </div>

        <div className="space-y-2 p-5">
          <p className="line-clamp-1 text-base font-semibold leading-tight text-[#0A0A0A]">
            {product.title}
          </p>
          <p className="line-clamp-2 min-h-[40px] text-[13px] leading-[1.5] text-[#8B8B8B]">
            {product.description}
          </p>
          {meta && <p className="line-clamp-1 text-xs font-medium text-[#8B8B8B]">{meta}</p>}
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[15px] font-bold text-[#0A0A0A]">{tndPrice(product.price_tnd)}</p>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-white transition-all duration-200 hover:scale-105 hover:bg-[#1A1A1A]"
            >
              <ArrowUpRightIcon className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>

      {/* Favorite heart over the image — sibling of the Link so it never navigates. */}
      <div className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white">
        <FavoriteButton item_type="product" item_id={product.id} />
      </div>
    </div>
  )
}

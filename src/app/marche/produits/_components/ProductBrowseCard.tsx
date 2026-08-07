'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MapPin, ImageIcon, ShoppingBag } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { useLang } from '@/components/LangProvider'
import { tndPrice } from '@/components/listings/listing-utils'
import type { ProductListing } from '@/components/listings/ProductListingCard'

// C1's product card — Figma 569:39818, measured (272×373).
//
// ⚑ THIS IS A FORK OF `ProductListingCard`, NOT A REPLACEMENT, AND THAT WAS THE FOUNDER'S CALL.
// The shared card serves /recherche, /categories/[slug] and ConsumerHomepage through
// `ListingResults`, and all three work today. The C1 frame is a different card — different cover
// ratio, heart on the opposite side, a shop badge and a category chip that do not exist there, no
// description, a blue CTA instead of a black one. Rewriting the shared card to match a frame drawn
// for a fourth surface would break three pages to fix one. The full delta table lives in
// docs/follow-ups.md so whoever consolidates them later has the diff already measured.
//
// Geometry, and it closes exactly: cover 276 + body (12 + 22 title + 10 gap + 41 bottom-row + 12)
// = 373.

export function ProductBrowseCard({ product }: { product: ProductListing }) {
  const lang = useLang()
  const city = product.shop.city?.trim() || null
  const category = product.category
    ? lang === 'ar' && product.category.name_ar
      ? product.category.name_ar
      : product.category.name_fr
    : null

  // The shop badge is initials, not a logo: `shops.logo_url` is null on every row today, and the
  // frame's badge draws a two-letter monogram ("AS"). Two words → two initials, one word → one.
  const initials =
    product.shop.name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('') || '?'

  return (
    <div className="relative overflow-hidden rounded-xl border border-border-subtle bg-white">
      <Link href={`/produits/${product.id}`} className={`block ${FOCUS_RING}`}>
        {/* Cover — FIXED 276px, not an aspect ratio. The frame pins the height so every card in a
            row ends its cover on the same line regardless of the column width the grid resolves to. */}
        <div className="relative h-[276px] w-full overflow-hidden border-b border-border-subtle bg-surface-sunken">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
              <ImageIcon className="h-12 w-12 text-icon-muted" />
            </div>
          )}

          {/* Shop badge — top-END in the frame, which is the side the heart does NOT take. */}
          <span className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-2xl border border-border-subtle bg-white text-xs font-semibold text-brand-blue-800">
            {initials}
          </span>

          {/* Category chip, bottom-start over the cover. Hidden rather than rendered empty when the
              product has no category — an empty pill reads as a loading state. */}
          {category && (
            <span className="absolute bottom-[7px] start-2 rounded-lg bg-surface-sunken px-3 py-1 text-body-sm font-medium text-text-secondary">
              {category}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2.5 p-3">
          {/* Single line + ellipsis, per the frame. NOT line-clamp-2: the card height is fixed and a
              second title line would push the price row past the cover-plus-97 the grid assumes. */}
          <p className="truncate text-base font-semibold leading-[22px] text-text-primary">
            {product.title}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="text-[17px] font-semibold leading-[22px] text-text-primary">
                {tndPrice(product.price_tnd)}
              </p>
              {city && (
                <span className="flex items-center gap-1 text-xs font-medium leading-[17px] text-text-muted">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{city}</span>
                </span>
              )}
            </div>

            {/* Decorative: the whole card is already the link, so this must not be a second
                focusable stop announcing the same destination. */}
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue-600 text-white"
            >
              <ShoppingBag className="h-5 w-5" />
            </span>
          </div>
        </div>
      </Link>

      {/* Heart — top-START here, the mirror of the shared card. Sibling of the Link so it never
          navigates. Logical property, so RTL puts it on the right without a second rule. */}
      <div className="absolute start-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-2xl border border-border-subtle bg-white">
        <FavoriteButton item_type="product" item_id={product.id} />
      </div>
    </div>
  )
}

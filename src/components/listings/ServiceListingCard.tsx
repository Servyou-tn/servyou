'use client'

import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW, HOVER_SHADOW } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ArrowRightIcon } from './icons'
import { initials } from './listing-utils'

export type ServiceListing = {
  id: string
  title: string
  description: string | null
  price_starting: number | null
  delivery_time: string | null
  freelancer: { full_name: string; city: string | null }
}

// Vertical service card sharing the product card's DNA (same shell, shadow, radius and
// typography). The square top area is a gradient tile with the freelancer's initials (no
// avatar column exists in the schema). Content block mirrors the product card; the bottom
// row shows the starting price + delivery time on the left and a black circular CTA on the
// right. Heart is a sibling of the Link; the rest links to the detail page (/services/[id],
// which 404s until that route is rebuilt).
export function ServiceListingCard({ service }: { service: ServiceListing }) {
  const lang = useLang()

  const start = service.price_starting != null ? Number(service.price_starting) : 0
  const priceLabel =
    start > 0
      ? t('listing.service.startingPrice', lang, { price: start })
      : t('listing.service.priceOnRequest', lang)

  const meta = [service.freelancer.full_name, service.freelancer.city].filter(Boolean).join(' · ')

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-white transition-all duration-300 ease-out ${CARD_SHADOW} ${HOVER_SHADOW}`}
    >
      <Link href={`/services/${service.id}`} className={`block ${FOCUS_RING}`}>
        {/* Gradient initials tile — the service equivalent of the product image. */}
        <div
          className="flex aspect-square w-full items-center justify-center overflow-hidden bg-linear-to-br from-[#F4F4F4] to-[#E8E8E8]"
          aria-hidden="true"
        >
          <span className="text-[48px] font-bold text-[#0A0A0A]">
            {initials(service.freelancer.full_name)}
          </span>
        </div>

        <div className="space-y-2 p-5">
          <p className="line-clamp-1 text-base font-semibold leading-tight text-[#0A0A0A]">
            {service.title}
          </p>
          <p className="line-clamp-2 min-h-[40px] text-[13px] leading-[1.5] text-[#8B8B8B]">
            {service.description}
          </p>
          {meta && <p className="line-clamp-1 text-xs font-medium text-[#8B8B8B]">{meta}</p>}
          <div className="mt-2 flex items-end justify-between">
            <div className="min-w-0">
              <p className="text-[15px] font-bold text-[#0A0A0A]">{priceLabel}</p>
              {service.delivery_time && (
                <p className="mt-0.5 text-xs text-[#B8B8B8]">
                  {t('listing.service.deliveryTime', lang, { time: service.delivery_time })}
                </p>
              )}
            </div>
            <span
              aria-hidden="true"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-white transition-all duration-200 hover:scale-105 hover:bg-[#1A1A1A]"
            >
              <ArrowRightIcon className="h-4 w-4" />
            </span>
          </div>
        </div>
      </Link>

      {/* Favorite heart over the tile — sibling of the Link so it never navigates. */}
      <div className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white">
        <FavoriteButton item_type="service" item_id={service.id} />
      </div>
    </div>
  )
}

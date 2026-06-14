'use client'

import Image from 'next/image'
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
  freelancer: { full_name: string; city: string | null; avatar_url?: string | null }
}

// Horizontal service row (bakery-style, one per line): circle avatar on the left, content
// in the middle, price/delivery + arrow CTA on the right, the favorite heart at the
// top-right corner. Person-led — services are about who you hire — vs the image-led
// product grid. Same premium white-card DNA (CARD_SHADOW, rounded-2xl, hover lift) as
// products. The avatar renders the freelancer photo when an avatar_url exists (no such
// column in the schema yet, so it always falls to initials today). The heart is a sibling
// of the Link, so toggling a favorite never navigates.
export function ServiceListingCard({ service }: { service: ServiceListing }) {
  const lang = useLang()

  const start = service.price_starting != null ? Number(service.price_starting) : 0
  const priceLabel =
    start > 0
      ? t('listing.service.startingPrice', lang, { price: start })
      : t('listing.service.priceOnRequest', lang)

  const byName = service.freelancer.full_name
    ? t('listing.service.by', lang, { name: service.freelancer.full_name })
    : null
  const meta = [byName, service.freelancer.city].filter(Boolean).join(' · ')

  return (
    <div
      className={`relative rounded-2xl bg-white transition-all duration-300 ease-out ${CARD_SHADOW} ${HOVER_SHADOW}`}
    >
      <Link
        href={`/services/${service.id}`}
        aria-label={service.title}
        className={`flex items-center gap-5 rounded-2xl p-5 ${FOCUS_RING}`}
      >
        {/* Circle avatar — freelancer photo when available, else initials. */}
        <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-[#F4F4F4] to-[#E8E8E8]">
          {service.freelancer.avatar_url ? (
            <Image
              src={service.freelancer.avatar_url}
              alt={service.freelancer.full_name}
              fill
              sizes="80px"
              className="object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-[#0A0A0A]" aria-hidden="true">
              {initials(service.freelancer.full_name)}
            </span>
          )}
        </div>

        {/* Middle — title, description, "par {name} · {city}" meta. */}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="line-clamp-1 text-base font-semibold text-[#0A0A0A]">{service.title}</p>
          <p className="line-clamp-2 min-h-[40px] text-[13px] leading-[1.5] text-[#8B8B8B]">
            {service.description}
          </p>
          {meta && <p className="line-clamp-1 text-xs font-medium text-[#8B8B8B]">{meta}</p>}
        </div>

        {/* Right — price + delivery (top), arrow CTA (bottom). pt-8 clears the heart. */}
        <div className="flex shrink-0 flex-col items-end justify-between gap-3 self-stretch pt-8">
          <div className="text-end">
            <p className="text-[15px] font-bold text-[#0A0A0A]">{priceLabel}</p>
            {service.delivery_time && (
              <p className="mt-0.5 text-xs text-[#B8B8B8]">
                {t('listing.service.deliveryTime', lang, { time: service.delivery_time })}
              </p>
            )}
          </div>
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0A0A0A] text-white transition-all duration-200 hover:scale-105 hover:bg-[#1A1A1A]"
          >
            <ArrowRightIcon className="h-4 w-4" />
          </span>
        </div>
      </Link>

      {/* Favorite heart at the top-right corner — sibling of the Link so it never navigates. */}
      <div className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white">
        <FavoriteButton item_type="service" item_id={service.id} />
      </div>
    </div>
  )
}

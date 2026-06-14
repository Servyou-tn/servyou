'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW, HOVER_SHADOW } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ArrowRightIcon } from './icons'

export type ServiceListing = {
  id: string
  title: string
  description: string | null
  price_starting: number | null
  delivery_time: string | null
  category?: { name_fr: string } | null
  freelancer: { full_name: string; city: string | null; avatar_url?: string | null }
}

// Horizontal service card (Upwork-style freelancer row, one per line):
//   LEFT  — circle avatar with the freelancer's name underneath (leads with who you hire)
//   MID   — category tag pill, service title, description, city
//   RIGHT — starting price + delivery time, with the arrow CTA pinned to the bottom
// The favorite heart floats at the top-right corner (a sibling of the Link, so it never
// navigates). The avatar renders the freelancer photo when an avatar_url exists (no such
// column in the schema yet, so it falls to the first initial today). Same premium
// white-card DNA (CARD_SHADOW, hover lift) and locked palette as products, but a softer
// rounded-3xl radius that echoes the circular avatar (products keep rounded-2xl for their
// rectangular images). items-start anchors the avatar to the top-left, name underneath.
export function ServiceListingCard({ service }: { service: ServiceListing }) {
  const lang = useLang()

  const start = service.price_starting != null ? Number(service.price_starting) : 0
  const priceLabel =
    start > 0
      ? t('listing.service.startingPrice', lang, { price: start })
      : t('listing.service.priceOnRequest', lang)

  const firstLetter = (service.freelancer.full_name.trim()[0] ?? '?').toUpperCase()

  return (
    <div
      className={`relative rounded-3xl bg-white transition-all duration-300 ease-out ${CARD_SHADOW} ${HOVER_SHADOW}`}
    >
      <Link
        href={`/services/${service.id}`}
        aria-label={service.title}
        className={`flex items-start gap-5 rounded-3xl p-5 ${FOCUS_RING}`}
      >
        {/* LEFT — circle avatar (photo when available, else initial) + name underneath. */}
        <div className="flex w-24 shrink-0 flex-col items-center">
          <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-[#F4F4F4] to-[#E8E8E8]">
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
                {firstLetter}
              </span>
            )}
          </div>
          {service.freelancer.full_name && (
            <p className="mt-2 line-clamp-1 w-full text-center text-xs font-medium text-[#0A0A0A]">
              {service.freelancer.full_name}
            </p>
          )}
        </div>

        {/* MIDDLE — category pill, title, description, city. */}
        <div className="min-w-0 flex-1">
          {service.category?.name_fr && (
            <span className="inline-block rounded-full bg-[#F4F4F4] px-3 py-1 text-[11px] font-medium text-[#1A1A1A]">
              {service.category.name_fr}
            </span>
          )}
          <p className="mt-2 line-clamp-1 text-[17px] font-bold leading-tight text-[#0A0A0A]">
            {service.title}
          </p>
          <p className="mt-2 line-clamp-2 text-[13px] leading-[1.5] text-[#8B8B8B]">
            {service.description}
          </p>
          {service.freelancer.city && (
            <p className="mt-2 text-xs text-[#8B8B8B]">{service.freelancer.city}</p>
          )}
        </div>

        {/* RIGHT — top spacer clears the absolute heart, then price/delivery, arrow at bottom. */}
        <div className="flex shrink-0 flex-col items-end justify-between gap-3 self-stretch">
          <div className="h-9 w-9 shrink-0" aria-hidden="true" />
          <div className="text-end">
            <p className="text-[15px] font-bold text-[#0A0A0A]">{priceLabel}</p>
            {service.delivery_time && (
              <p className="mt-1 text-xs text-[#B8B8B8]">
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

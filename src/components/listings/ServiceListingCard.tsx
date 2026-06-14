'use client'

import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { initials, frenchRelativeAdded } from './listing-utils'

export type ServiceListing = {
  id: string
  title: string
  price_starting: number | null
  freelancer: { full_name: string; city: string | null }
  created_at: string
}

// Horizontal service row (one per line): a square initials avatar (no avatar column
// exists in the schema, so initials are the only option) · title + "name · city" ·
// starting price + relative time, with the favorite heart floating at the top-right
// corner. The heart sits outside the navigation Link, so favoriting never navigates.
export function ServiceListingCard({ service }: { service: ServiceListing }) {
  const lang = useLang()

  const start = service.price_starting != null ? Number(service.price_starting) : 0
  const priceLabel =
    start > 0
      ? t('listing.service.startingPrice', lang, { price: start })
      : t('listing.service.priceOnRequest', lang)

  const subtitle = [service.freelancer.full_name, service.freelancer.city]
    .filter(Boolean)
    .join(' · ')

  const addedLabel = t('listing.service.relativeAdded', lang, {
    time: frenchRelativeAdded(service.created_at),
  })

  return (
    <div
      className={`relative rounded-2xl bg-white p-5 transition-colors hover:bg-zinc-50/50 ${CARD_SHADOW}`}
    >
      <Link
        href={`/services/${service.id}`}
        className={`flex items-center gap-4 rounded-2xl ${FOCUS_RING}`}
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-sky text-xl font-semibold text-brand-primary"
          aria-hidden="true"
        >
          {initials(service.freelancer.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-lg font-semibold text-text-primary">{service.title}</p>
          <p className="line-clamp-1 text-sm text-text-muted">{subtitle}</p>
        </div>
        {/* pe-8 keeps the price/time clear of the heart pinned to the top-right corner. */}
        <div className="shrink-0 pe-8 text-end">
          <p className="text-base font-semibold text-text-primary">{priceLabel}</p>
          <p className="mt-0.5 text-xs text-text-muted">{addedLabel}</p>
        </div>
      </Link>

      <div className="absolute end-2 top-2">
        <FavoriteButton item_type="service" item_id={service.id} />
      </div>
    </div>
  )
}

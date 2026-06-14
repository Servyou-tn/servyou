'use client'

import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { initials, frenchRelativeAdded } from './listing-utils'

export type ServiceListing = {
  id: string
  title: string
  price_starting: number | null
  freelancer: { full_name: string; city: string | null }
  created_at: string
}

// Horizontal service row: freelancer avatar (initials — no avatar column exists) ·
// title + name + meta · starting price + favorite heart. The heart is a sibling of
// the navigation Link, so toggling a favorite never triggers navigation.
export function ServiceListingCard({ service }: { service: ServiceListing }) {
  const lang = useLang()

  const start = service.price_starting != null ? Number(service.price_starting) : 0
  const priceLabel =
    start > 0
      ? t('listing.service.startingPrice', lang, { price: start })
      : t('listing.service.priceOnRequest', lang)

  const meta = [
    service.freelancer.city,
    t('listing.service.relativeAdded', lang, { time: frenchRelativeAdded(service.created_at) }),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border-subtle bg-white p-4 transition-colors hover:bg-surface-subtle md:p-5">
      <Link
        href={`/service/${service.id}`}
        className={`flex min-w-0 flex-1 items-center gap-4 rounded-lg ${FOCUS_RING}`}
      >
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-sky text-xl font-semibold text-brand-primary"
          aria-hidden="true"
        >
          {initials(service.freelancer.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-1 text-base font-semibold text-text-primary">{service.title}</p>
          <p className="line-clamp-1 text-sm text-text-muted">{service.freelancer.full_name}</p>
          <p className="mt-0.5 text-xs text-text-muted">{meta}</p>
        </div>
        <p className="shrink-0 text-end text-base font-semibold text-text-primary">{priceLabel}</p>
      </Link>
      <FavoriteButton item_type="service" item_id={service.id} />
    </div>
  )
}

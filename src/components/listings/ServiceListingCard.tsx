'use client'

import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { CARD_SHADOW, HOVER_SHADOW, FOCUS_RING } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'

export type ServiceListing = {
  id: string
  title: string
  description: string | null
  price_starting: number | null
  delivery_time: string | null
  // Optional so the other producers of this shared type (homepage getActiveServices,
  // favorites, D2 related) compile unchanged — only /marche/services supplies them today.
  tags?: string[]
  category?: { name_fr: string; name_ar?: string } | null
  freelancer: { full_name: string; city: string | null }
}

// Vertical service grid card (Figma "Service Card" v3.7 — 124:6200). White, 2px blue-600
// outline, rounded-xl. Two stacked blocks:
//   TOP    — title + favorite heart (heart floats top-end as a Link sibling so it never
//            navigates), description (3-line clamp), and up to three skill chips.
//   FOOTER — the freelancer (avatar initial + name) on the start edge, the starting price
//            and a "Voir le service" CTA on the end edge.
// The whole card is one Link to the service detail (D2). Rating + verified badge are drawn
// in Figma but deferred (Phase 3+) — not rendered. Avatars have no data source yet (no
// avatar_url column anywhere), so the avatar is always the freelancer's initial.
//
// CHIPS FALLBACK (stopgap): the card is designed around per-service skill tags, but the
// `tags` column ships mostly empty today, so an empty tags list falls back to a single
// category chip rather than leaving the card blank. This fallback is temporary — remove it
// once H6/H7 make tags required and real listings carry them (see docs/follow-ups.md).
export function ServiceListingCard({ service }: { service: ServiceListing }) {
  const lang = useLang()

  const start = service.price_starting != null ? Number(service.price_starting) : 0
  const priceLabel =
    start > 0
      ? t('listing.service.startingPrice', lang, { price: start })
      : t('listing.service.priceOnRequest', lang)

  const firstLetter = (service.freelancer.full_name.trim()[0] ?? '?').toUpperCase()

  const tags = service.tags ?? []
  const categoryLabel = service.category
    ? lang === 'ar' && service.category.name_ar
      ? service.category.name_ar
      : service.category.name_fr
    : null
  // Real skills when present; the category label as a single chip otherwise (stopgap above).
  const chips = tags.length > 0 ? tags.slice(0, 3) : categoryLabel ? [categoryLabel] : []

  return (
    <article
      className={`relative flex flex-col overflow-hidden rounded-xl border-2 border-brand-blue-600 bg-white transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${CARD_SHADOW} ${HOVER_SHADOW}`}
    >
      <Link
        href={`/services/${service.id}`}
        aria-label={service.title}
        className={`flex flex-1 flex-col rounded-xl ${FOCUS_RING}`}
      >
        {/* TOP block — title/description/chips, spaced to the block's full height. */}
        <div className="flex flex-1 flex-col justify-between gap-3 px-4 pb-1 pt-4">
          <div className="flex flex-col gap-3">
            {/* pe-8 reserves room for the heart pinned at the top-end corner. */}
            <h3 className="line-clamp-2 pe-8 text-base font-semibold leading-snug text-brand-blue-800">
              {service.title}
            </h3>
            {service.description && (
              <p className="line-clamp-3 text-body-sm text-text-secondary">{service.description}</p>
            )}
          </div>
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="inline-block rounded-md bg-brand-blue-50 px-2 py-1 text-caption font-medium text-brand-blue-700"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER — freelancer (start) · price + CTA (end). */}
        <div className="flex items-end justify-between gap-3 px-4 pb-4 pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-placeholder text-body-sm font-semibold text-text-primary"
            >
              {firstLetter}
            </span>
            {service.freelancer.full_name && (
              <span className="truncate text-body-sm text-brand-blue-800">
                {service.freelancer.full_name}
              </span>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="text-body-lg font-semibold text-brand-blue-800">{priceLabel}</span>
            <span className="inline-flex items-center rounded-lg bg-brand-blue-600 px-3 py-1.5 text-body-sm font-medium text-white">
              {t('listing.service.viewCta', lang)}
            </span>
          </div>
        </div>
      </Link>

      {/* Favorite heart — a Link sibling pinned to the top-end corner so it never navigates. */}
      <div className="absolute end-2 top-2 z-10">
        <FavoriteButton item_type="service" item_id={service.id} />
      </div>
    </article>
  )
}

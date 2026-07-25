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

// Vertical service grid card — measured to Figma "Service Card" v3.7 (124:6200 / variant
// 123:6120). FIXED height 279 (width fills the grid column), 2px blue-600 outline, radius/xl.
//   colorBlock (fills)  — SPACE_BETWEEN: topGroup (title[2-line clamp] + description[3-line
//                         clamp]) at the top, one chip row pinned to the bottom; the gap
//                         between them flexes.  Favorite heart is corner-anchored at inset 16.
//   footer (89, pinned) — left cluster: avatar + name; right cluster is a VERTICAL stack,
//                         raw price on top, "Voir le service" beneath (no "À partir de").
// Rating / verified are drawn in Figma but deferred; avatars have no data source (no
// avatar_url column) → initial. CHIP LABEL: the Figma shows human skill words, but the
// `tags` column stores unlabeled slugs ("identite-visuelle") with no label map, so — per
// founder direction, not title-casing slugs — the chip renders the localized *category*
// name until tags carry real labels (see docs/follow-ups.md).
//
// OFF-TOKEN VALUES (no Servyou token equals the measured Figma value — flagged per the
// no-arbitrary rule): card height 279, price 17px, CTA radius 10 (radius/lg exists but isn't
// wired as a utility), chip radius 6 (rounded-md = exact 6px). See the PR report.
export function ServiceListingCard({ service }: { service: ServiceListing }) {
  const lang = useLang()

  const start = service.price_starting != null ? Number(service.price_starting) : 0
  const priceLabel =
    start > 0
      ? t('listing.service.priceRaw', lang, { price: start })
      : t('listing.service.priceOnRequest', lang)

  const firstLetter = (service.freelancer.full_name.trim()[0] ?? '?').toUpperCase()

  const categoryLabel = service.category
    ? lang === 'ar' && service.category.name_ar
      ? service.category.name_ar
      : service.category.name_fr
    : null
  // Up to 3 skill chips from the tags column (human labels on the v3.7 card). Listings without
  // tags fall back to the localized category label so the chip row never renders empty.
  const tags = (service.tags ?? []).map((tg) => tg.trim()).filter(Boolean).slice(0, 3)
  const chips = tags.length > 0 ? tags : categoryLabel ? [categoryLabel] : []

  return (
    <article
      className={`relative flex h-[279px] flex-col overflow-hidden rounded-xl border-2 border-brand-blue-600 bg-white transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${CARD_SHADOW} ${HOVER_SHADOW}`}
    >
      <Link
        href={`/services/${service.id}`}
        aria-label={service.title}
        className={`flex flex-1 flex-col rounded-xl ${FOCUS_RING}`}
      >
        {/* colorBlock — fills, SPACE_BETWEEN; pad T16 R16 B4 L16, gap 12. */}
        <div className="flex flex-1 flex-col justify-between gap-3 pt-4 pe-4 pb-1 ps-4">
          {/* topGroup — gap 12. */}
          <div className="flex flex-col gap-3">
            {/* title: 16/Semi Bold, 2-line clamp; pe-8 clears the corner heart. */}
            <h3 className="line-clamp-2 pe-8 text-h4 text-brand-blue-800">{service.title}</h3>
            {service.description && (
              <p className="line-clamp-3 text-body-sm text-text-secondary">{service.description}</p>
            )}
          </div>
          {/* skillChips — up to 3 skill tags (v3.7 frame 611:45637); category label as the
              fallback when a listing carries no tags. Pinned to the bottom of colorBlock by
              SPACE_BETWEEN. */}
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

        {/* footer — pinned; pad T12 R16 B16 L16, gap 12, items-end. */}
        <div className="flex items-end justify-between gap-3 pt-3 pe-4 pb-4 ps-4">
          {/* leftCluster — avatar + name, gap 8. */}
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
          {/* rightStack — vertical: price on top, CTA beneath, gap 8. */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="text-[17px] font-semibold leading-tight text-brand-blue-800">
              {priceLabel}
            </span>
            <span className="inline-flex h-8 items-center rounded-[10px] bg-brand-blue-600 px-3 text-body-sm font-medium text-white">
              {t('listing.service.viewCta', lang)}
            </span>
          </div>
        </div>
      </Link>

      {/* Favorite heart — corner-anchored at the colorBlock content inset (16px pad + 2px
          border = 18 from the card edge, top-aligned with the title). The wrapper offset
          (end-2 / top-2.5) is calibrated to land the shared FavoriteButton's ♡ text glyph
          (14×24, not a 20px icon) at that inset. A Link sibling so it never navigates. */}
      <div className="absolute end-2 top-2.5 z-10">
        <FavoriteButton item_type="service" item_id={service.id} />
      </div>
    </article>
  )
}

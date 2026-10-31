'use client'

import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { HOVER_SHADOW, FOCUS_RING } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { Avatar } from '@/components/ui/avatar'
import type { SkillLabelPair } from '@/lib/freelance/service-draft'
import { servicePriceLabel } from '@/lib/freelance/service-price'

export type ServiceListing = {
  id: string
  title: string
  description: string | null
  /** service_listings.short_description (H6 step 2, « le résumé qui apparaît dans les résultats de
   *  recherche ») — the card's summary when set, else `description` (H6 PR-4 ruling D32). */
  short_description?: string | null
  price_starting: number | null
  /** service_listings.price_unit — « 450 TND / mois »; `fixed` and NULL print no unit (D32). */
  price_unit?: string | null
  delivery_time: string | null
  // Optional so the other producers of this shared type (homepage getActiveServices,
  // favorites, D2 related) compile unchanged — /marche/services and D4 supply them.
  /** The listing's skills, BOTH labels resolved server-side by the producer (skillLabelPair): the card
   *  picks by lang, so the service taxonomy never ships in this client bundle (H6 PR-4 ruling D31). */
  tags?: SkillLabelPair[]
  category?: { name_fr: string; name_ar?: string } | null
  freelancer: { full_name: string; city: string | null }
}

// Vertical service grid card — measured to Figma "Service Card" v3.7 (124:6200 / variant
// 123:6120) and re-measured on 1486:24359 / 1488:66061 / m375-marche-services. FIXED height 279 (width fills the grid column), 2px blue-600 STROKE,
// radius/xl. Figma draws that stroke INSIDE the frame and measures every padding from the OUTER edge (title x = 16, not 18), so the stroke is an
// overlay and the content keeps the full 343 × 279. No resting shadow (the frame has none; the hover lift stays).
//   title box FIXED 44 (two 22 lines) + description box FIXED 63 (three 21 lines): the chips and the footer never move with the text length.
//   heart = the plain 20 icon-heart at the top end (16 / 16); chips h23 r6 (pad 4/8, 12 Medium); CTA 120 × 32 r10, 14 SemiBold.
//   colorBlock (fills)  — SPACE_BETWEEN: topGroup (title[2-line clamp] + description[3-line
//                         clamp]) at the top, one chip row pinned to the bottom; the gap
//                         between them flexes.  Favorite heart is corner-anchored at inset 16.
//   footer (89, pinned) — left cluster: avatar + name; right cluster is a VERTICAL stack,
//                         raw price on top, "Voir le service" beneath (no "À partir de").
// Rating / verified are drawn in Figma but deferred; avatars have no data source (no
// avatar_url column) → person-glyph fallback (shared Avatar). CHIP LABEL: the listing's skills —
// pool skills as their FR/AR label, custom and legacy free-text tags as typed (H6 PR-4); a listing
// with no skills shows the localized *category* name instead, so the chip row is never empty.
//
// OFF-TOKEN VALUES (no Servyou token equals the measured Figma value — flagged per the
// no-arbitrary rule): card height 279, price 17px, CTA radius 10 (radius/lg exists but isn't
// wired as a utility), chip radius 6 (rounded-md = exact 6px). See the PR report.
export function ServiceListingCard({ service }: { service: ServiceListing }) {
  const lang = useLang()

  const start = service.price_starting != null ? Number(service.price_starting) : 0
  const priceLabel =
    start > 0
      ? servicePriceLabel(String(start), service.price_unit, lang)
      : t('listing.service.priceOnRequest', lang)
  const summary = service.short_description?.trim() || service.description

  const categoryLabel = service.category
    ? lang === 'ar' && service.category.name_ar
      ? service.category.name_ar
      : service.category.name_fr
    : null
  // Up to 3 skill chips from `tags` (the v3.7 frame shows three). Listings with no tags fall back
  // to the single localized category label, so the chip row never renders empty.
  const tags = (service.tags ?? [])
    .map((pair) => (lang === 'ar' ? pair.ar : pair.fr).trim())
    .filter(Boolean)
    .slice(0, 3)
  const chips = tags.length > 0 ? tags : categoryLabel ? [categoryLabel] : []

  return (
    <article
      className={`relative flex h-[279px] flex-col overflow-hidden rounded-xl bg-surface-base transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${HOVER_SHADOW}`}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 rounded-xl border-2 border-brand-blue-600" />
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
            <h3 className="line-clamp-2 h-11 pe-8 text-h4 leading-[22px] text-brand-blue-800">{service.title}</h3>
            <p className="line-clamp-3 h-[63px] text-body-sm text-text-secondary">{summary}</p>
          </div>
          {/* skillChips — up to 3 skill tags (v3.7 frame 611:45637), category label as the
              fallback. Pinned to the bottom of colorBlock by SPACE_BETWEEN. */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="inline-flex h-[23px] items-center rounded-[6px] bg-brand-blue-50 px-2 text-xs font-medium text-brand-blue-700"
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
            <Avatar size="sm" />
            {service.freelancer.full_name && (
              <span className="max-w-[120px] truncate text-body-sm text-brand-blue-800">
                {service.freelancer.full_name}
              </span>
            )}
          </div>
          {/* rightStack — vertical: price on top, CTA beneath, gap 8. */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="text-[17px] font-semibold leading-tight text-brand-blue-800">
              {priceLabel}
            </span>
            <span className="inline-flex h-8 min-w-[120px] items-center justify-center rounded-[10px] bg-brand-blue-600 px-3 text-body-sm font-semibold text-white">
              {t('listing.service.viewCta', lang)}
            </span>
          </div>
        </div>
      </Link>

      {/* Favorite heart — the Figma icon-heart: 20 × 20, 16 from the top and the end edge. A Link sibling so it never navigates. */}
      <div className="absolute end-4 top-4 z-30">
        <FavoriteButton item_type="service" item_id={service.id} variant="icon" />
      </div>
    </article>
  )
}

import Link from 'next/link'
import { Briefcase } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { FavoriteButton } from '@/components/FavoriteButton'
import { FOCUS_RING } from '@/components/layout/styles'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'
import { servicePriceLabel } from '@/lib/freelance/service-price'
import { t, type Lang } from '@/lib/i18n'

// D4 « Ses services » below lg — the frame's « ServiceCard / context=public » (m375-d4-profil, 343 × 247), NOT the v3.7 grid card the
// marketplace uses (that one stays from lg). surface/base + border/subtle, radius 12:
//   thumbnail — 44 tall blue-50 band, the 44 briefcase centred, the 44 « Favorite Heart » (24 icon, state off) at the end.
//   body      — pad 16, gap 10: title 18 Semi Bold · description 14 muted on ONE line · category badge (surface/sunken, 14 Medium) ·
//               « À partir de » 12 over the price 18 Bold (centred in its row, as drawn) · the freelancer's 24 avatar + name 13 Medium.
// No « Voir le service » button (the whole card is the link). The badge's placeholder icon (icon-banknote on every chip) and the avatar's
// « Verified » dot are not drawn: no per-category icon and no verification data exist.
export function PublicServiceCard({
  service,
  freelancerName,
  freelancerAvatarUrl,
  lang,
}: {
  service: ServiceListing
  freelancerName: string
  freelancerAvatarUrl: string | null
  lang: Lang
}) {
  const start = service.price_starting != null ? Number(service.price_starting) : 0
  const price = start > 0 ? servicePriceLabel(String(start), service.price_unit, lang) : t('listing.service.priceOnRequest', lang)
  const summary = service.short_description?.trim() || service.description
  const category = service.category ? (lang === 'ar' && service.category.name_ar ? service.category.name_ar : service.category.name_fr) : null

  return (
    <article className="relative overflow-hidden rounded-card border border-border-subtle bg-surface-base">
      <Link href={`/services/${service.id}`} className={`flex flex-col rounded-card ${FOCUS_RING}`}>
        <div className="flex h-11 items-center justify-center bg-brand-blue-50">
          <Briefcase className="size-9 text-brand-blue-300" strokeWidth={1.5} aria-hidden="true" />
        </div>
        <div className="flex flex-col gap-2.5 p-3.75">
          <h3 className="line-clamp-2 text-lg font-semibold leading-[22px] text-text-primary">{service.title}</h3>
          {summary && <p className="truncate text-body-sm leading-[17px] text-text-muted">{summary}</p>}
          {category && (
            <span className="w-fit rounded-md bg-surface-sunken px-3 py-1 text-body-sm font-medium text-text-secondary">{category}</span>
          )}
          <div className="flex flex-col items-center gap-0.5 text-center">
            {start > 0 && <span className="text-caption leading-[15px] text-text-muted">{t('service.from_price', lang)}</span>}
            <span className="text-lg font-bold leading-[22px] text-text-primary">{price}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <Avatar size="xs" src={freelancerAvatarUrl} name={freelancerName} />
            <span className="truncate text-[13px] font-medium leading-4 text-text-secondary">{freelancerName}</span>
          </div>
        </div>
      </Link>
      {/* A sibling of the link, so pressing it never navigates. The visible 24 icon carries a 44 hit area (FavoriteButton `icon`: 20 + 12 each side). */}
      <div className="absolute end-0 top-0 flex size-11 items-center justify-center">
        <FavoriteButton item_type="service" item_id={service.id} variant="icon" iconClassName="size-6 text-text-muted" />
      </div>
    </article>
  )
}

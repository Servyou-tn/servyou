import Link from 'next/link'
import { Check, ChevronRight, Clock, Globe, Link2, MapPin, Plus, Users } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { Avatar } from '@/components/ui/avatar'
import { getInitials } from '@/components/ui/initials'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ListingResults } from '@/components/listings/ListingResults'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'
import { FOCUS_RING } from '@/components/layout/styles'
import type { ServiceDetailData, DeliveryMode } from '@/lib/marche/service-detail'

// D2 — service detail. Measured against Figma 666:55479 (1440) and 668:55920 (375).
//
// Layout: desktop is a 2-column split — MAIN 750 FIXED + buy-box SIDEBAR 354, gap 32. Mobile is
// a single 343 column at gap 20 that REORDERS: title, then the whole buy box, then the body.
// Rather than render either block twice, the three blocks are placed with flex `order` on mobile
// and explicit grid cells on lg+ (title r1c1, buy box r1c2 spanning both rows, body r2c1).
//
// Two sections are data-gated, which is the common case rather than the edge: 20 of the 21
// seeded listings have an empty `deliverables` array and no `delivery_mode`, so "Ce qui est
// inclus" and "Mode de prestation" hide by default and appear only where the data exists.
//
// No ratings anywhere: the Avis section is a shell + empty state (reviews are post-MVP and there
// is no reviews table), and the related cards reuse ServiceListingCard, which already omits the
// rating row the Figma mock shows — the C1 phase-aware decision holding, not an omission.

const MODE_ICON: Record<DeliveryMode, typeof Globe> = {
  remote: Globe,
  onsite: MapPin,
  hybrid: Users,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      {/* 20/Semi Bold #0f172a in both frames. */}
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      {children}
    </section>
  )
}

export function ServiceDetail({
  service,
  related,
  lang,
}: {
  service: ServiceDetailData
  related: ServiceListing[]
  lang: Lang
}) {
  const price =
    service.startingPrice != null ? `${service.startingPrice.toLocaleString('fr-FR')} TND` : null
  const ModeIcon = service.deliveryMode ? MODE_ICON[service.deliveryMode] : null

  // Buy box — the SIDEBAR on desktop (354, pad 24, gap 16, r=12, 2px brand-blue-600 outline:
  // the same treatment as the v3.7 card). On mobile it is an unboxed stack directly under the
  // title, matching 668:55920, where price/CTA/freelancer are separate top-level blocks.
  const buyBox = (
    <aside className="order-2 flex flex-col gap-4 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:rounded-card lg:border-2 lg:border-brand-blue-600 lg:bg-white lg:p-6">
      <div className="flex items-center justify-between gap-4 lg:flex-col lg:items-stretch lg:gap-4">
        <div className="flex flex-col gap-0.5 lg:gap-1">
          <p className="text-[13px] leading-4 text-text-muted">{t('serviceDetail.priceFrom', lang)}</p>
          {price && (
            <p className="text-2xl font-semibold text-brand-blue-800 lg:text-[28px] lg:leading-9">
              {price}
            </p>
          )}
        </div>
        {service.deliveryTime && (
          <p className="flex items-center gap-2 text-body-sm text-text-muted lg:self-start">
            <Clock className="h-4 w-4 shrink-0 lg:h-[18px] lg:w-[18px]" aria-hidden="true" />
            {t('serviceDetail.deliveredIn', lang, { time: service.deliveryTime })}
          </p>
        )}
      </div>

      <Link
        href={`/demander/${service.id}`}
        className={`inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-brand-blue-600 px-5 text-base font-semibold text-white transition-colors hover:bg-brand-blue-600/90 ${FOCUS_RING}`}
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        {t('serviceDetail.cta', lang)}
      </Link>

      {/* heartShareRow — two equal 44px bordered buttons, gap 12. */}
      <div className="flex items-stretch gap-3">
        <div className="flex flex-1 items-center justify-center rounded-[10px] border border-border-strong bg-white">
          <FavoriteButton item_type="service" item_id={service.id} />
        </div>
        <Link
          href={`/services/${service.id}`}
          aria-label={t('serviceDetail.share', lang)}
          className={`flex h-11 flex-1 items-center justify-center rounded-[10px] border border-border-strong bg-white text-text-secondary transition-colors hover:bg-surface-subtle ${FOCUS_RING}`}
        >
          <Link2 className="h-5 w-5" aria-hidden="true" />
        </Link>
      </div>

      <div className="hidden h-px bg-border-subtle lg:block" aria-hidden="true" />

      {/* freelancerBlock. Avatar is initials-only: there is no avatar_url column on any profile
          table and no storage bucket, so the Figma photo cannot render (logged as a schema +
          storage follow-up). On mobile this is a tinted 12-radius row per 668:55920. */}
      {service.freelancer && (
        <div className="flex flex-col gap-3 rounded-card bg-surface-subtle p-3 lg:rounded-none lg:bg-transparent lg:p-0">
          <div className="flex items-center gap-3">
            <Avatar size="md" initials={getInitials(service.freelancer.name)} className="lg:size-14" />
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="truncate text-body-sm font-semibold text-brand-blue-800 lg:text-[15px]">
                {service.freelancer.name}
              </p>
              {service.freelancer.headline && (
                <p className="text-caption text-text-muted lg:text-[13px]">{service.freelancer.headline}</p>
              )}
              {service.freelancer.city && (
                <p className="flex items-center gap-1 text-caption text-text-muted">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {service.freelancer.city}
                </p>
              )}
            </div>
          </div>
          <Link
            href="/marche/services"
            className={`hidden h-8 items-center justify-center gap-2 rounded-[10px] border border-border-strong bg-white text-body-sm font-semibold text-text-primary transition-colors hover:bg-surface-subtle lg:inline-flex ${FOCUS_RING}`}
          >
            {t('serviceDetail.viewProfile', lang)}
          </Link>
        </div>
      )}

      <div className="hidden h-px bg-border-subtle lg:block" aria-hidden="true" />

      <p className="text-caption leading-[18px] text-text-muted">{t('serviceDetail.codNote', lang)}</p>
    </aside>
  )

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {/* breadcrumb — 13px, gap 8, chevron separators. */}
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-2 text-[13px] text-text-muted">
        <Link href="/" className="hover:text-text-secondary">{t('serviceDetail.breadcrumb.home', lang)}</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
        <Link href="/marche/services" className="hover:text-text-secondary">
          {t('serviceDetail.breadcrumb.services', lang)}
        </Link>
        {service.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
            <span>{service.category}</span>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
        <span className="text-text-secondary">{service.title}</span>
      </nav>

      {/* Columns are minmax(0,750px) + a FIXED 354, not a fixed 750 + 1fr. Figma 666:55479 splits
          1136 as MAIN 750 / SIDEBAR 354, and a hard 750 reproduces that at exactly 1440 — but it
          cannot shrink, so every pixel lost below 1440 came out of the panel: 354 → 280 at 1366
          (where the CTA label wrapped to two lines inside its fixed h-12), → 194 at 1280, → 52 at
          1100, all inside the lg range. Pinning the panel and letting MAIN reflow keeps 750/354
          exact at 1440 and keeps the panel intact everywhere below it. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,750px)_354px] lg:items-start lg:gap-8">
        {/* titleBlock — 28/36 on desktop, 22/28 on mobile, brand-blue-800. */}
        <div className="order-1 flex flex-col gap-3 lg:order-none lg:col-start-1 lg:row-start-1">
          <h1 className="text-[22px] font-semibold leading-7 text-brand-blue-800 lg:text-[28px] lg:leading-9">
            {service.title}
          </h1>
          {service.tags.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {service.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-md bg-brand-blue-50 px-2 py-1 text-caption font-medium text-brand-blue-700"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>

        {buyBox}

        <div className="order-3 flex flex-col gap-8 lg:order-none lg:col-start-1 lg:row-start-2">
          {service.description && (
            <p className="whitespace-pre-line text-[15px] leading-6 text-text-secondary">
              {service.description}
            </p>
          )}

          {/* Hidden when the array is empty — true for 20 of 21 rows today. */}
          {service.deliverables.length > 0 && (
            <Section title={t('serviceDetail.included', lang)}>
              <ul className="flex flex-col gap-2">
                {service.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-[15px] leading-6 text-text-secondary">
                    <Check className="mt-1 h-[18px] w-[18px] shrink-0 text-brand-blue-600" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Hidden when delivery_mode is null — the freelancer has not said. */}
          {service.deliveryMode && ModeIcon && (
            <Section title={t('serviceDetail.mode.title', lang)}>
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-blue-50 py-2 pe-4 ps-3 text-body-sm font-medium text-brand-blue-700">
                <ModeIcon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {t(`serviceDetail.mode.${service.deliveryMode}`, lang)}
              </p>
            </Section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <Section title={t('serviceDetail.related', lang)}>
          <ListingResults type="service" items={related} />
        </Section>
      )}

      <Section title={t('serviceDetail.reviews', lang)}>
        {/* Shell + empty state only: ratings are post-MVP and there is no reviews table. */}
        <div className="flex h-30 items-center justify-center rounded-[10px] bg-surface-subtle px-6 text-center">
          <p className="text-[15px] text-text-muted">{t('serviceDetail.reviewsEmpty', lang)}</p>
        </div>
      </Section>

      <p className="text-body-sm text-text-muted">{t('serviceDetail.report', lang)}</p>
    </div>
  )
}

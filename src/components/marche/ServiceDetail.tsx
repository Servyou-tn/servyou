import Link from 'next/link'
import { Check, ChevronLeft, ChevronRight, CircleCheck, Clock, Globe, MapPin, Plus, Users } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { Avatar } from '@/components/ui/avatar'
import { getInitials } from '@/components/ui/initials'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ShareLinkButton } from '@/components/produits/ShareLinkButton'
import { ServiceDescription } from '@/components/marche/ServiceDescription'
import { ListingResults } from '@/components/listings/ListingResults'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'
import { FOCUS_RING } from '@/components/layout/styles'
import type { ServiceDetailData, DeliveryMode } from '@/lib/marche/service-detail'
import { skillLabel } from '@/lib/freelance/service-draft'
import { formatServicePrice, servicePriceLabel } from '@/lib/freelance/service-price'
import { ReportListingModal } from '@/components/report/ReportListingModal'

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
//
// H6 PR-4 (docs/design/h6-pr4-deltas.md §6, rulings D31/D32): skill chips show the pool label in the
// page language (custom skills as typed); the price carries its unit (« 450 TND / mois ») and the
// currency per language; `hybrid` reads « À distance ou sur site », the wizard's « Sur site possible ».

const MODE_ICON: Record<DeliveryMode, typeof Globe> = {
  remote: Globe,
  onsite: MapPin,
  hybrid: Users,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      {/* 18/22 Semi Bold at 375 (m375-d2-service), 20 Semi Bold from lg (666:55479). */}
      <h2 className="text-lg font-semibold leading-[22px] text-text-primary lg:text-xl lg:leading-7">{title}</h2>
      {children}
    </section>
  )
}

export function ServiceDetail({
  service,
  related,
  lang,
  isLoggedIn,
}: {
  service: ServiceDetailData
  related: ServiceListing[]
  lang: Lang
  isLoggedIn: boolean
}) {
  const price =
    service.startingPrice != null
      ? servicePriceLabel(formatServicePrice(service.startingPrice, lang), service.priceUnit, lang)
      : null
  const ModeIcon = service.deliveryMode ? MODE_ICON[service.deliveryMode] : null

  // Buy box — the SIDEBAR on desktop (354, pad 24, gap 16, r=12, 2px brand-blue-600 outline:
  // the same treatment as the v3.7 card). On mobile it is an unboxed stack directly under the
  // title (m375-d2-service): price + délai · CTA · freelancer row · COD note · favori / partager,
  // every block 20 apart. The desktop order (price · CTA · favori / partager · freelancer · COD) is the
  // DOM order; the mobile one is flex `order`, so nothing renders twice except the freelancer row (below).
  const profileHref = service.freelancerProfileId ? `/freelance/${service.freelancerProfileId}` : null
  const buyBox = (
    <aside className="order-2 flex flex-col gap-5 lg:order-none lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:gap-4 lg:rounded-card lg:border-2 lg:border-brand-blue-600 lg:bg-white lg:p-6">
      <div className="order-1 flex items-center justify-between gap-4 lg:order-none lg:flex-col lg:items-stretch lg:gap-4">
        <div className="flex flex-col gap-0.5 lg:gap-1">
          <p className="text-xs leading-[15px] text-text-muted lg:text-[13px] lg:leading-4">{t('serviceDetail.priceFrom', lang)}</p>
          {price && (
            <p className="text-2xl font-semibold leading-[29px] text-brand-blue-800 lg:text-[28px] lg:leading-9">
              {price}
            </p>
          )}
        </div>
        {service.deliveryTime && (
          <p className="flex items-center gap-1.5 text-[13px] leading-4 text-text-muted lg:gap-2 lg:self-start lg:text-body-sm">
            <Clock className="h-4 w-4 shrink-0 lg:h-[18px] lg:w-[18px]" aria-hidden="true" />
            {t('serviceDetail.deliveredIn', lang, { time: service.deliveryTime })}
          </p>
        )}
      </div>

      <Link
        href={`/demander/${service.id}`}
        className={`order-2 inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-brand-blue-600 px-5 text-base font-semibold text-white transition-colors hover:bg-brand-blue-600/90 lg:order-none ${FOCUS_RING}`}
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        {t('serviceDetail.cta', lang)}
      </Link>

      {/* heartShareRow — two equal 44 px bordered buttons, gap 12: icon + « Favori » / « Partager » at 375, icon only from lg. */}
      <div className="order-5 grid grid-cols-2 gap-3 lg:order-none">
        <FavoriteButton item_type="service" item_id={service.id} variant="box" label={t('serviceDetail.favorite', lang)} labelClassName="lg:hidden" />
        <ShareLinkButton variant="bordered" labelClassName="lg:hidden" />
      </div>

      <div className="hidden h-px bg-border-subtle lg:block" aria-hidden="true" />

      {/* freelancerRow (375): a link to the profile — avatar 40 (the picture, else the person glyph), name 14 Semi Bold, headline 12 muted on ONE line, chevron 18;
          pad 12, gap 12, r12, surface/subtle. The frame's « Verified » badge is not drawn: there is no verification concept (D4 ruling). City is not in the frame. */}
      {service.freelancer &&
        (profileHref ? (
          <Link
            href={profileHref}
            className={`order-3 flex items-center gap-3 rounded-xl bg-surface-subtle p-3 lg:hidden ${FOCUS_RING}`}
          >
            <Avatar size="md" src={service.freelancer.avatarUrl} name={service.freelancer.name} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-sm font-semibold leading-[17px] text-brand-blue-800">{service.freelancer.name}</p>
              {service.freelancer.headline && (
                <p className="truncate text-xs leading-4 text-text-muted">{service.freelancer.headline}</p>
              )}
            </div>
            <ChevronRight className="size-[18px] shrink-0 text-text-muted rtl:rotate-180" aria-hidden="true" />
          </Link>
        ) : (
          <div className="order-3 flex items-center gap-3 rounded-xl bg-surface-subtle p-3 lg:hidden">
            <Avatar size="md" src={service.freelancer.avatarUrl} name={service.freelancer.name} />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="truncate text-sm font-semibold leading-[17px] text-brand-blue-800">{service.freelancer.name}</p>
              {service.freelancer.headline && (
                <p className="truncate text-xs leading-4 text-text-muted">{service.freelancer.headline}</p>
              )}
            </div>
          </div>
        ))}

      {/* freelancerBlock (desktop). Avatar is initials-only here, as built before the 375 pass; a tinted row only below lg is the block above. */}
      {service.freelancer && (
        <div className="hidden flex-col gap-3 lg:flex">
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
            className={`inline-flex h-8 items-center justify-center gap-2 rounded-[10px] border border-border-strong bg-white text-body-sm font-semibold text-text-primary transition-colors hover:bg-surface-subtle ${FOCUS_RING}`}
          >
            {t('serviceDetail.viewProfile', lang)}
          </Link>
        </div>
      )}

      <div className="hidden h-px bg-border-subtle lg:block" aria-hidden="true" />

      <p className="order-4 text-caption leading-[18px] text-text-muted lg:order-none">{t('serviceDetail.codNote', lang)}</p>
    </aside>
  )

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {/* breadcrumb — 13px. 375 (m375-d2-service): « ‹ Services › {category} », gap 6, chevrons 16 / 12; desktop: Accueil › Services › category › title, gap 8. */}
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-[13px] leading-4 text-text-muted lg:gap-2">
        <Link href="/" className="hidden hover:text-text-secondary lg:inline">{t('serviceDetail.breadcrumb.home', lang)}</Link>
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 rtl:rotate-180 lg:block" aria-hidden="true" />
        <Link href="/marche/services" className="inline-flex items-center gap-1.5 hover:text-text-secondary lg:gap-0">
          <ChevronLeft className="size-4 shrink-0 rtl:rotate-180 lg:hidden" aria-hidden="true" />
          {t('serviceDetail.breadcrumb.services', lang)}
        </Link>
        {service.category && (
          <>
            <ChevronRight className="size-3 shrink-0 rtl:rotate-180 lg:h-3.5 lg:w-3.5" aria-hidden="true" />
            <span className="text-text-secondary lg:text-text-muted">{service.category}</span>
          </>
        )}
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 rtl:rotate-180 lg:block" aria-hidden="true" />
        <span className="hidden text-text-secondary lg:inline">{service.title}</span>
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
                  className="rounded-md bg-brand-blue-50 px-2 py-1 text-caption font-medium text-brand-blue-700 max-lg:leading-[15px]"
                >
                  {skillLabel(tag, lang)}
                </li>
              ))}
            </ul>
          )}
        </div>

        {buyBox}

        <div className="order-3 flex flex-col gap-5 lg:order-none lg:col-start-1 lg:row-start-2 lg:gap-8">
          {service.description && <ServiceDescription text={service.description} />}

          {/* Hidden when the array is empty — true for 20 of 21 rows today. */}
          {service.deliverables.length > 0 && (
            <Section title={t('serviceDetail.included', lang)}>
              <ul className="flex flex-col gap-2">
                {service.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm leading-[17px] text-text-secondary lg:text-[15px] lg:leading-6">
                    {/* 375: icon-check-circle 18 blue-600, text 14/17 (m375-d2-service); desktop keeps the bare check. */}
                    <CircleCheck className="h-[18px] w-[18px] shrink-0 text-brand-blue-600 lg:hidden" aria-hidden="true" />
                    <Check className="mt-1 hidden h-[18px] w-[18px] shrink-0 text-brand-blue-600 lg:block" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Hidden when delivery_mode is null — the freelancer has not said. */}
          {service.deliveryMode && ModeIcon && (
            <Section title={t('serviceDetail.mode.title', lang)}>
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-blue-50 py-2 pe-4 ps-3 text-body-sm font-medium text-brand-blue-700 max-lg:leading-[17px]">
                <ModeIcon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                {t(`serviceDetail.mode.${service.deliveryMode}`, lang)}
              </p>
            </Section>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <Section title={t('serviceDetail.related', lang)}>
          <ListingResults type="service" items={related} layout="rail" />
        </Section>
      )}

      <Section title={t('serviceDetail.reviews', lang)}>
        {/* Shell + empty state only: ratings are post-MVP and there is no reviews table. */}
        <div className="flex items-center justify-center rounded-[10px] bg-surface-subtle px-6 py-8 text-center lg:h-30 lg:py-0">
          <p className="text-sm text-text-muted max-lg:leading-[17px] lg:text-[15px]">{t('serviceDetail.reviewsEmpty', lang)}</p>
        </div>
      </Section>

      {/* « Signaler ce service » — the D1 report modal (563:39705) reused for services; logged-out visitors are
          sent to sign in first. */}
      <div>
        <ReportListingModal kind="service" targetId={service.id} targetName={service.title} isLoggedIn={isLoggedIn} />
      </div>
    </div>
  )
}

import Link from 'next/link'
import { ChevronRight, Clock, MapPin } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { Avatar } from '@/components/ui/avatar'
import { getInitials } from '@/components/ui/initials'
import type { ServiceRequestTarget } from '@/lib/marche/demander'
import { ServiceRequestForm } from './ServiceRequestForm'

// E1 — « Demander un service ». Measured against Figma 680:56165 / 682:56521 (1440) and
// 682:56805 (375).
//
// Desktop 1136 splits MAIN 750 / SIDEBAR 354 at gap 32 — expressed as minmax(0,750px) + a fixed
// 354 for the same reason D2 does it: a hard 750 cannot shrink, so every pixel lost below 1440
// comes out of the panel. Mobile is one 343 column at gap 20 where the summary comes FIRST
// (682:56885), so the summary is the first grid child and moves to column 2 at lg.
//
// The mobile summary is a genuinely different composition, not a narrower copy: no chips, no
// dividers, no délai row, a 32 avatar and an inline "· ville". Those blocks are hidden rather
// than duplicated, and the two size deltas ride on responsive classes.

function Chips({ items }: { items: string[] }) {
  if (items.length === 0) return null
  return (
    <ul className="hidden flex-wrap gap-2 lg:flex">
      {items.map((chip) => (
        <li
          key={chip}
          className="rounded-md bg-brand-blue-50 px-2 py-1 text-caption font-medium text-brand-blue-700"
        >
          {chip}
        </li>
      ))}
    </ul>
  )
}

export function ServiceRequestScreen({
  service,
  initialPhone,
  lang,
}: {
  service: ServiceRequestTarget
  initialPhone: string
  lang: Lang
}) {
  const price =
    service.startingPrice != null ? `${service.startingPrice.toLocaleString('fr-FR')} TND` : null
  // Figma shows two chips (category + a tag). Real rows carry one category and 0–5 tags, so the
  // list is category-first and simply shorter when the freelancer set no tags.
  const chips = [service.category, ...service.tags].filter((c): c is string => Boolean(c))

  const summary = (
    <aside className="flex flex-col gap-3 rounded-card border-2 border-brand-blue-600 bg-surface-base p-4 lg:col-start-2 lg:row-start-1 lg:gap-4 lg:p-6">
      <h2 className="hidden text-[15px] font-semibold leading-5 text-text-primary lg:block">
        {t('demander.recap.title', lang)}
      </h2>

      <p className="text-[15px] font-semibold leading-[22px] text-brand-blue-800">{service.title}</p>

      <Chips items={chips} />

      <div className="hidden h-px bg-border-subtle lg:block" aria-hidden="true" />

      {/* Avatar is initials-only: no avatar_url column exists on any profile table and there is
          no storage bucket, so the Figma photo cannot render (same call as D2). */}
      <div className="flex items-center gap-2 lg:gap-3">
        <Avatar size="sm" initials={getInitials(service.freelancer.name)} className="lg:size-10" />
        <div className="flex min-w-0 flex-wrap items-center gap-x-1 lg:flex-col lg:items-start lg:gap-0.5">
          <p className="truncate text-body-sm font-semibold text-text-primary lg:text-[15px] lg:text-brand-blue-800">
            {service.freelancer.name}
          </p>
          {service.freelancer.city && (
            <>
              <p className="text-[13px] leading-5 text-text-muted lg:hidden">· {service.freelancer.city}</p>
              <p className="hidden items-center gap-1 text-caption text-text-muted lg:flex">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                {service.freelancer.city}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="hidden h-px bg-border-subtle lg:block" aria-hidden="true" />

      {price && (
        <div className="flex items-baseline gap-1.5 lg:flex-col lg:items-start lg:gap-1">
          <p className="text-[13px] leading-[18px] text-text-muted lg:leading-4">
            {t('serviceDetail.priceFrom', lang)}
          </p>
          <p className="text-xl font-semibold leading-[26px] text-brand-blue-800 lg:text-2xl lg:leading-[30px]">
            {price}
          </p>
        </div>
      )}

      {service.deliveryTime && (
        <p className="hidden items-center gap-2 text-body-sm text-text-muted lg:flex">
          <Clock className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
          {t('demander.recap.delai', lang)} {service.deliveryTime}
        </p>
      )}
    </aside>
  )

  return (
    <div className="flex flex-col gap-5 lg:gap-6">
      {/* breadcrumb — 13px, gap 8 (6 on mobile), chevron separators. The desktop frame carries
          five crumbs; the middle two are the same category/title links D2 renders. */}
      <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-[13px] text-text-muted lg:gap-2">
        <Link href="/" className="hover:text-text-secondary">{t('serviceDetail.breadcrumb.home', lang)}</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
        <Link href="/marche/services" className="hover:text-text-secondary">
          {t('serviceDetail.breadcrumb.services', lang)}
        </Link>
        {service.category && (
          <>
            <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 rtl:rotate-180 lg:block" aria-hidden="true" />
            <span className="hidden lg:inline">{service.category}</span>
          </>
        )}
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 rtl:rotate-180 lg:block" aria-hidden="true" />
        <Link href={`/services/${service.id}`} className="hidden hover:text-text-secondary lg:inline">
          {service.title}
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 rtl:rotate-180 lg:h-3.5 lg:w-3.5" aria-hidden="true" />
        <span className="text-text-secondary">{t('demander.breadcrumb.request', lang)}</span>
      </nav>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,750px)_354px] lg:items-start lg:gap-8">
        {summary}
        <div className="lg:col-start-1 lg:row-start-1">
          <ServiceRequestForm
            serviceId={service.id}
            briefing={service.buyerBriefing}
            initialPhone={initialPhone}
            lang={lang}
          />
        </div>
      </div>
    </div>
  )
}

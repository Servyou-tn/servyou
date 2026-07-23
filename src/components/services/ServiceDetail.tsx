'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Share2, Clock, Check, Briefcase } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ProductGallery } from '@/components/produits/ProductGallery'
import { ServiceListingCard, type ServiceListing } from '@/components/listings/ServiceListingCard'
import { initials } from '@/components/listings/listing-utils'
import type { ServiceDetailData } from '@/lib/marche/service-detail'

function formatPrice(n: number): string {
  return `${new Intl.NumberFormat('fr-TN').format(n)} TND`
}

function FreelancerAvatar({ name, size }: { name: string; size: 32 | 64 }) {
  const dim = size === 64 ? 'h-16 w-16 text-xl' : 'h-8 w-8 text-sm'
  return (
    <span
      className={`grid ${dim} shrink-0 place-items-center rounded-full bg-brand-primary font-semibold text-white`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}

// Redesigned service detail body — the sister of ProductDetail. Same grid (gallery +
// sticky info card on desktop, stacked on mobile via DOM order), with service-specific
// differences: "À partir de" price + delivery-time chip (no stock), a "Proposé par"
// freelancer block (non-clickable until /freelance/[slug] exists), and a "Demander ce
// service" CTA. Reuses ProductGallery for the work samples and ServiceListingCard for
// related services.
export function ServiceDetail({
  service,
  related,
  isAuthenticated,
}: {
  service: ServiceDetailData
  related: ServiceListing[]
  isAuthenticated: boolean
}) {
  const lang = useLang()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const longDesc = (service.description?.length ?? 0) > 400
  const freelancerName = service.freelancer?.name?.trim() || '—'

  const demanderHref = isAuthenticated
    ? `/demander/${service.id}`
    : `/connexion?next=${encodeURIComponent(`/demander/${service.id}`)}`

  async function handleShare() {
    const url = window.location.href
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: service.title, url })
      } catch {
        // user dismissed the share sheet — no-op
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <div className="lg:grid lg:grid-cols-5 lg:gap-8">
      {/* LEFT col (3/5), row 1 — work-samples gallery */}
      <div className="lg:col-span-3 lg:col-start-1 lg:row-start-1">
        <ProductGallery
          images={service.media}
          title={service.title}
          emptyIcon={<Briefcase className="h-12 w-12" aria-hidden="true" />}
          emptyLabel={t('service.detail.noPreview', lang)}
        />
      </div>

      {/* RIGHT col (2/5) — sticky info card (spans both rows). Stacks after the gallery on
          mobile, unsticky. */}
      <div className="mt-6 lg:col-span-2 lg:col-start-4 lg:row-span-2 lg:row-start-1 lg:mt-0">
        <div className="card-premium outline-brand rounded-2xl bg-white p-6 lg:sticky lg:top-24">
          {/* A — category chip + favorite heart */}
          <div className="flex items-start justify-between gap-3">
            {service.category ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-text-muted">
                {service.category}
              </span>
            ) : (
              <span />
            )}
            <FavoriteButton item_type="service" item_id={service.id} />
          </div>

          {/* B — title */}
          <h1 className="mt-3 text-2xl font-bold leading-tight text-text-primary">{service.title}</h1>

          {/* C — "À partir de" price + delivery-time chip (no stock for services) */}
          <div className="mt-3">
            {service.startingPrice != null ? (
              <>
                <p className="text-xs uppercase tracking-wide text-text-muted">
                  {t('service.from_price', lang)}
                </p>
                <p className="text-3xl font-bold text-brand-primary">{formatPrice(service.startingPrice)}</p>
              </>
            ) : (
              <p className="text-2xl font-bold text-brand-primary">
                {t('listing.service.priceOnRequest', lang)}
              </p>
            )}
            {service.deliveryTime && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-brand-blue-50 px-3 py-1 text-xs font-medium text-brand-accent">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {t('service.detail.deliveryIn', lang, { time: service.deliveryTime })}
              </span>
            )}
          </div>

          {/* D — freelancer block (non-clickable: /freelance/[slug] not rebuilt yet) */}
          {service.freelancer && (
            <div className="mt-4 cursor-default border-t border-border-subtle pt-4">
              {/* TODO: link to /freelance/[freelancer.slug] when the public freelancer page is built */}
              <p className="text-xs uppercase tracking-wide text-text-muted">{t('service.offered_by', lang)}</p>
              <div className="mt-2 flex items-center gap-3">
                <FreelancerAvatar name={freelancerName} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{freelancerName}</p>
                  {service.freelancer.headline && (
                    <p className="truncate text-xs text-text-muted">{service.freelancer.headline}</p>
                  )}
                  {service.freelancer.city && (
                    <p className="truncate text-xs text-text-muted">{service.freelancer.city}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* E — primary CTA */}
          <Link
            href={demanderHref}
            className={`mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-accent text-base font-semibold text-white shadow-md transition-all duration-200 ease-out hover:bg-brand-accent-light hover:shadow-lg ${FOCUS_RING}`}
          >
            {t('service.buy_cta', lang)}
            <ArrowRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>

          {/* F — secondary actions (report omitted: no consumer ReportModal yet) */}
          <div className="mt-3">
            <button
              type="button"
              onClick={handleShare}
              className={`inline-flex h-10 items-center gap-2 rounded-full bg-slate-50 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-slate-100 ${FOCUS_RING}`}
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Share2 className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? t('product.detail.link_copied', lang) : t('product.detail.share', lang)}
            </button>
          </div>
        </div>
      </div>

      {/* LEFT col, row 2 — below-the-fold content, aligned under the gallery */}
      <div className="lg:col-span-3 lg:col-start-1 lg:row-start-2">
        {/* 3.1 — description */}
        {service.description && (
          <section className="card-premium mt-8 rounded-2xl bg-white p-6">
            <h2 className="text-lg font-semibold text-text-primary">{t('product.detail.description', lang)}</h2>
            <p
              className={`mt-3 whitespace-pre-line text-base leading-relaxed text-text-primary ${
                longDesc && !expanded ? 'line-clamp-4' : ''
              }`}
            >
              {service.description}
            </p>
            {longDesc && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className={`mt-2 rounded text-sm font-medium text-brand-accent transition-colors hover:text-brand-primary ${FOCUS_RING}`}
              >
                {expanded ? t('product.detail.see_less', lang) : t('product.detail.see_more', lang)}
              </button>
            )}
          </section>
        )}

        {/* 3.2 — freelancer block (informational; non-clickable until /freelance is rebuilt) */}
        {service.freelancer && (
          <section className="card-premium mt-6 flex items-center gap-4 rounded-2xl bg-white p-6">
            <FreelancerAvatar name={freelancerName} size={64} />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-text-primary">{freelancerName}</p>
              {service.freelancer.headline && (
                <p className="text-sm text-text-muted">{service.freelancer.headline}</p>
              )}
              {service.freelancer.city && <p className="text-sm text-text-muted">{service.freelancer.city}</p>}
            </div>
          </section>
        )}

        {/* 3.3 — related services (ServiceListingCard is a full-width row, so vertical
            stack rather than a horizontal carousel) */}
        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              {t('service.detail.similarServices', lang)}
            </h2>
            <div className="flex flex-col gap-4">
              {related.map((s) => (
                <ServiceListingCard key={s.id} service={s} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

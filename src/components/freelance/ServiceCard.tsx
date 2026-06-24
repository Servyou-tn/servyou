'use client'

import Link from 'next/link'
import { Inbox, Pencil, ListChecks, RefreshCw } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import type { ServiceRow } from '@/lib/freelance/services-data'

// Owner-view service row — the freelancer manages their own listings here (vs the consumer-facing
// ServiceListingCard). Same white-card DNA as JobPostCard. The card itself isn't a link: the title
// links to the public service page ("preview as a buyer would see it"), and Modifier is the explicit
// action. Supprimer is intentionally NOT rendered this PR — deletion ships with the edit flow, and a
// no-op "coming soon" button would be worse UX than omitting it.

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-50 text-green-700',
  hidden: 'bg-gray-100 text-gray-600',
}

const chip = 'inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700'

export function ServiceCard({ service }: { service: ServiceRow }) {
  const lang = useLang()
  const statusKey =
    service.status === 'hidden'
      ? 'freelance.services.card.status.hidden'
      : 'freelance.services.card.status.active'
  const statusCls = STATUS_STYLES[service.status] ?? STATUS_STYLES.active
  const priceLabel = service.price != null ? `${service.price} TND` : '—'

  return (
    <li className="rounded-2xl border border-border-subtle bg-white p-4">
      {/* Category + status badges. */}
      <div className="flex flex-wrap items-center gap-2">
        {service.categoryName && <span className={chip}>{service.categoryName}</span>}
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusCls}`}>
          {t(statusKey, lang)}
        </span>
      </div>

      {/* Title (links to the public page) + price. */}
      <div className="mt-2 flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-base font-semibold text-text-primary">
          <Link href={`/services/${service.id}`} className={`block truncate rounded hover:underline ${FOCUS_RING}`}>
            {service.title}
          </Link>
        </h3>
        <span className="shrink-0 text-base font-semibold text-brand-accent">{priceLabel}</span>
      </div>

      {/* Description preview. */}
      {service.descriptionPreview && (
        <p className="mt-1 line-clamp-1 text-sm text-text-muted">{service.descriptionPreview}</p>
      )}

      {/* Deliverables + revisions summary (tags are kept off the card — detail page only). */}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1">
          <ListChecks className="h-3 w-3" aria-hidden="true" />
          {t('freelance.services.card.deliverables_count', lang, { count: service.deliverablesCount })}
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          {t('freelance.services.card.revisions_count', lang, { count: service.revisionsCount })}
        </span>
      </div>

      {/* Request count + Modifier action. */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
          <Inbox className="h-3 w-3" aria-hidden="true" />
          {t('freelance.services.card.requests_received', lang, { count: service.requestCount })}
        </span>
        <Link
          href={`/mon-profil-freelance/services/${service.id}/modifier`}
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded text-sm font-medium text-brand-accent hover:underline ${FOCUS_RING}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {t('freelance.services.card.edit', lang)}
        </Link>
      </div>
    </li>
  )
}

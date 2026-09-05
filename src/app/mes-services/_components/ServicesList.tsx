import { t, type Lang } from '@/lib/i18n'
import type { SellerServiceRow } from '@/lib/marche/seller-services'
import { ServiceRow } from './ServiceRow'

// Figma 258:7911: a rounded-12, bordered, clipped container wrapping a table-header row (bottom
// hairline) and N Service Row instances (each with its OWN bottom hairline, cornerRadius 0) — a
// real divided table, not a stack of bordered cards (G5's ProductsList). The header row has no
// measured mobile treatment (no 375 frame exists for H5) and is hidden below lg for that reason —
// same "no frame, so don't pretend one exists" posture as ProductRow's own inferred reflow.
export function ServicesList({ services, lang }: { services: SellerServiceRow[]; lang: Lang }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-base">
      <div className="hidden items-center gap-6 border-b border-border-subtle px-6 py-3 lg:flex">
        <span className="w-12 shrink-0" aria-hidden="true" />
        <span className="flex-1 text-body-sm font-medium text-text-secondary">
          {t('service.col_service', lang)}
        </span>
        <span className="w-[150px] shrink-0 text-body-sm font-medium text-text-secondary">
          {t('service.col_status', lang)}
        </span>
        <span className="w-[120px] shrink-0 text-body-sm font-medium text-text-secondary">
          {t('service.col_price', lang)}
        </span>
        <span className="w-[130px] shrink-0 text-body-sm font-medium text-text-secondary">
          {t('service.col_orders', lang)}
        </span>
        <span className="w-[100px] shrink-0" aria-hidden="true" />
      </div>
      <ul className="flex flex-col">
        {services.map((service) => (
          <ServiceRow key={service.id} service={service} lang={lang} />
        ))}
      </ul>
    </div>
  )
}

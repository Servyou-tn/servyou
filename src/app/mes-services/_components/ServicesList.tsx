import { t, type Lang } from '@/lib/i18n'
import type { SellerServiceRow } from '@/lib/marche/seller-services'
import { ServiceRow } from './ServiceRow'

// Figma 258:7911: a rounded-12, bordered, clipped container wrapping a table-header row (bottom
// hairline) and N Service Row instances (each with its OWN bottom hairline, cornerRadius 0) — a
// real divided table, not a stack of bordered cards (G5's ProductsList). The header row has no
// measured mobile treatment (no 375 frame exists for H5) and is hidden below lg for that reason —
// same "no frame, so don't pretend one exists" posture as ProductRow's own inferred reflow.
//
// Header labels re-measured 2026-09-06 (get_design_context, node 258:7912-7917): 12px/medium/
// text-muted/uppercase/tracking-0.24px — `text-caption` supplies the 12px/17px, `font-medium` and
// `tracking-[0.24px]` override its baked 400-weight/no-tracking default (same "arbitrary value over
// a baked token that doesn't match" pattern SidebarSection.tsx uses for its own 0.06em override).
//
// ⚑ Built as a plain template literal, NOT `cn()`. `cn` = `twMerge(clsx(...))`, and twMerge's
// default class-group config doesn't know this project's custom `text-caption` font-size scale —
// it groups any `text-*` token as a text-COLOR utility by default, so `text-caption` and
// `text-text-muted` land in the same conflict group and twMerge silently drops the first one.
// DOM-verified: with `cn('flex-1', HEADER_LABEL)` the rendered class attribute had `text-caption`
// stripped entirely (computed font-size fell back to the browser default 16px). No real conflict
// exists between these fixed strings, so cn() buys nothing here and only re-triggers the bug.
const HEADER_LABEL = 'text-caption font-medium uppercase tracking-[0.24px] text-text-muted'

export function ServicesList({ services, lang }: { services: SellerServiceRow[]; lang: Lang }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-base">
      <div className="hidden items-center gap-6 border-b border-border-subtle px-6 py-3 lg:flex">
        <span className="w-12 shrink-0" aria-hidden="true" />
        <span className={`flex-1 ${HEADER_LABEL}`}>{t('service.col_service', lang)}</span>
        <span className={`w-[150px] shrink-0 ${HEADER_LABEL}`}>{t('service.col_status', lang)}</span>
        <span className={`w-[120px] shrink-0 ${HEADER_LABEL}`}>{t('service.col_price', lang)}</span>
        <span className={`w-[130px] shrink-0 ${HEADER_LABEL}`}>{t('service.col_orders', lang)}</span>
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

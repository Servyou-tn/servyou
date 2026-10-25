import { shortDateTime } from '@/lib/orders/order-status'
import { statusLabelKey, type OrderType } from '@/lib/types/order-status'
import type { OrderEvent } from '@/lib/marche/seller-order-detail'
import { t, type Lang } from '@/lib/i18n'

// The order « Historique » panel — G9's panel-historique (Figma 504:27042), extracted when H8's engagement detail
// became its second consumer. G9 itself still carries its own copy; moving it onto this component is logged in
// docs/follow-ups.md (a shipped page, so not touched from the H8 PR).
//
// Measured from Figma 504:27044: timeline gap 16 · entry = a gap-8 row of a 10 px dot and a gap-6 label/time pair ·
// `timelineLine` a 2 px rule through the dot centres, inset 10 px top and bottom so it starts and stops AT the first
// and last dot.
//
// ⚑ NO INVENTED COPY. A `status_change` reuses the SAME i18n key the StatusPill uses for its target state
// (`statusLabelKey`), so the timeline says what the pill and the rail say. `print` events and status changes with no
// target have no honest rendering and are skipped.
//
// ⚑ ABSENT, NOT EMPTY. The panel renders nothing when no event is displayable — counted AFTER the skips, so a
// heading never sits over a bare connector line. An empty « Historique » would assert that nothing happened to an
// order that demonstrably did; absence says only « not recorded ». The orders that predate order_events (all of the
// freelancer's today) have none.
//
// A cancellation's reason rides on the event's own `note` (written by emit_order_event from cancellation_reason).

function labelFor(event: OrderEvent, orderType: OrderType, createdLabel: string, lang: Lang): string | null {
  if (event.eventType === 'created') return createdLabel
  if (event.eventType !== 'status_change' || !event.toStatus) return null
  return t('seller.orderDetail.event_status', lang, { status: t(statusLabelKey(event.toStatus, orderType), lang) })
}

export function displayableEvents(
  events: readonly OrderEvent[],
  orderType: OrderType,
  createdLabel: string,
  lang: Lang,
): { event: OrderEvent; label: string }[] {
  return events.flatMap((event) => {
    const label = labelFor(event, orderType, createdLabel, lang)
    return label ? [{ event, label }] : []
  })
}

export function OrderTimeline({
  events,
  orderType,
  heading,
  createdLabel,
  lang,
}: {
  events: readonly OrderEvent[]
  orderType: OrderType
  heading: string
  /** The `created` entry's wording — « Demande reçue » for a service, « Commande créée » for a product. */
  createdLabel: string
  lang: Lang
}) {
  const rows = displayableEvents(events, orderType, createdLabel, lang)
  if (rows.length === 0) return null

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
      <h2 className="text-h3 text-text-primary">{heading}</h2>
      <ol className="relative flex flex-col gap-4">
        <span aria-hidden="true" className="absolute inset-y-2.5 start-1 w-0.5 bg-border-strong" />
        {rows.map(({ event, label }, i) => (
          <li key={`${event.createdAt}-${i}`} className="relative flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                  event.toStatus === 'cancelled' ? 'bg-danger-500' : 'bg-brand-blue-600'
                }`}
              />
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="text-body-sm text-text-primary">{label}</span>
                <span className="text-body-sm text-text-muted">· {shortDateTime(event.createdAt, lang)}</span>
              </span>
            </div>
            {event.note ? (
              <p className="ms-4 ps-0.5 text-body-sm text-text-muted">
                {t('seller.orders.cancelled_reason', lang, { reason: event.note })}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  )
}

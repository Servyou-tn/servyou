import Link from 'next/link'
import { Image as ImageIcon, MapPin, CheckCircle2 } from 'lucide-react'
import { StatusPill } from '@/components/ui/status-pill'
import { statusPillFor } from '@/lib/orders/order-status'
import { nextSellerStatus, isCancellable, type OrderStatus } from '@/lib/types/order-status'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import type { SellerOrder } from '@/lib/marche/seller-orders'
import { shortRef } from '@/lib/orders/order-status'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import { AdvanceOrderButton } from './AdvanceOrderButton'
import { CancelOrderButton } from './CancelOrderButton'

// OrderActionRow — measured from Figma 488:24951 (9 variants) via instance 490:25700.
// surface/base + border/subtle 1px + radius 10 + pad 16 + gap 16, items-center:
//   thumb 48 (radius 8, surface/sunken) + 22px glyph
//   mid   flex-1, gap 4 — product (body 16/26 SemiBold) over a gap-8 meta row
//         (map-pin 14 + buyer body-sm text/secondary + optional wait body-sm text/muted)
//   right gap 12 — StatusPill · action-control (gap 8) · "Voir détails" body-sm blue/600
//
// The action control per state, read off the frame:
//   pending      WhatsApp "Confirmer sur WhatsApp" + ghost "Annuler"
//   accepted     secondary "Marquer préparée"        + (cancel)
//   prepared     secondary "Marquer expédiée"        + (cancel)
//   dispatched   secondary "Marquer en livraison"    + (cancel)
//   in_delivery  secondary "Marquer arrivée"         + (cancel)
//   arrived      muted text "En attente de confirmation acheteur" — the next hop is the BUYER's
//   received     green check glyph, no action (terminal)
//   cancelled    none, and the row grows to carry the reason line (Figma 132 vs 83)
//   refused      none, same shape as cancelled
//
// ⚑ CORRECTED in the G9 pass. G8 first shipped `pending`'s wa/brand button as a SKIN on the
// accept transition. G9's frame settles it: its `pending` specimen puts a WhatsApp Button under
// "Prochaine étape" with the helper "Confirmez la commande avec le client sur WhatsApp AVANT de
// préparer le colis". On COD you confirm before you accept, and conflating them means a seller
// accepts an order they have never discussed. So `pending` now renders TWO controls — WhatsApp
// (contact) and a separate "Accepter" (transition).
//
// Row width, measured before the change: the pending cluster was 490 of 1121 with mid at 581.
// A third control adds ~104 (button + gap), so the cluster lands at ~594 and mid at ~480 — it
// fits, but 53% of the row would be controls, so the row uses the SHORT WhatsApp label
// ("WhatsApp") while G9's larger rail button carries the full sentence.
export function OrderActionRow({
  order,
  lang,
  detailHref,
  shopName,
}: {
  order: SellerOrder
  lang: Lang
  detailHref: string
  /** Used in the WhatsApp prefill — the buyer needs to know who is messaging them. */
  shopName: string
}) {
  const pill = statusPillFor(order.status, order.orderType)
  const next = nextSellerStatus(order.status, order.orderType)
  const cancellable = isCancellable(order.status)
  const isTerminal = order.status === 'received' || order.status === 'cancelled'

  return (
    <li className="flex flex-col gap-3 rounded-[10px] border border-border-subtle bg-surface-base p-4 lg:flex-row lg:items-center lg:gap-4">
      {/* derived: below-lg the row stacks. Measured desktop is a single 1136×83 flex row. */}
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-surface-sunken">
          <ImageIcon className="h-[22px] w-[22px] text-icon-muted" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-body font-semibold text-text-primary">{order.title}</p>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-hidden="true" />
            <p className="truncate text-body-sm text-text-secondary">
              {order.buyerName}
              {order.buyerCity ? ` · ${order.buyerCity}` : ''}
            </p>
            {/* Wait time is pending-only — see SellerOrder.waitingHours for why. */}
            {order.waitingHours != null ? (
              <p className="shrink-0 text-body-sm text-text-muted">
                {t('seller.orders.waiting', lang, { hours: order.waitingHours })}
              </p>
            ) : null}
          </div>
          {/* cancelled/refused carry their reason on a second line — the Figma row grows 83 → 132. */}
          {order.status === 'cancelled' && order.cancellationReason ? (
            <p className="text-body-sm text-text-muted">
              {t('seller.orders.cancelled_reason', lang, { reason: order.cancellationReason })}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3">
        {pill ? <StatusPill status={pill.pill}>{t(pill.labelKey, lang)}</StatusPill> : null}

        {order.status === 'arrived' ? (
          <span className="text-body-sm text-text-muted">
            {t('seller.orders.awaiting_buyer', lang)}
          </span>
        ) : null}

        {order.status === 'received' ? (
          <CheckCircle2 className="h-5 w-5 text-success-700" aria-hidden="true" />
        ) : null}

        {order.status === 'pending' ? (
          <WhatsAppContactButton
            buyerId={order.buyerId}
            label={t('seller.orders.whatsapp_short', lang)}
            message={t('seller.orders.whatsapp_message', lang, {
              buyer: order.buyerName,
              shop: shopName,
              ref: shortRef(order.id),
              product: order.title,
            })}
          />
        ) : null}

        {next ? (
          <div className="flex items-center gap-2">
            <AdvanceOrderButton
              orderId={order.id}
              label={t(`seller.orders.advance.${next}`, lang)}
            />
            {cancellable ? (
              <CancelOrderButton
                orderId={order.id}
                status={order.status as OrderStatus}
                orderType={order.orderType}
                lang={lang}
              />
            ) : null}
          </div>
        ) : null}

        {/* arrived is still cancellable but has no advance button, so the cancel stands alone. */}
        {!next && cancellable && !isTerminal ? (
          <CancelOrderButton
            orderId={order.id}
            status={order.status as OrderStatus}
            orderType={order.orderType}
            lang={lang}
          />
        ) : null}

        <Link
          href={detailHref}
          className={`rounded text-body-sm text-brand-blue-600 hover:underline ${FOCUS_RING}`}
        >
          {t('seller.orders.view_detail', lang)}
        </Link>
      </div>
    </li>
  )
}

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { OrderRail } from '@/components/orders/OrderRail'
import { CancelOrderButton } from '@/components/orders/CancelOrderButton'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import type { MyProductOrder } from '@/lib/marche/my-orders'
import { BUYER_CANCEL_REASONS } from '@/lib/orders/cancel-reasons'
import { isCancelled, longDate, shortDate, shortRef, statusPillFor } from '@/lib/orders/order-status'
import { PRODUCT_LIFECYCLE, canConfirmReceipt, isCancellable, type OrderStatus } from '@/lib/types/order-status'
import { OrderAccordionRow } from './OrderAccordionRow'
import { ConfirmReceipt } from './OrdersList'

// E3 Produits list — the same accordion as Services, Figma 704:58976 (1440): a 48 SQUARE thumbnail (radius 8, surface/subtle,
// border/subtle — the frame draws an empty box; here it is the product's first image, with a glyph when there is none),
// the SHOP's name on the second line, the total, the StatusPill and the chevron. Body (704:59276): the lifecycle rail,
// the WhatsApp + « Confirmer la réception » actions, and the reference line.
//
// Differences from the frame, all deliberate (docs/design/e3-produits-measurements.md):
//  · the rail walks the full 7-step PRODUCT chain, not the frame's 4 mock stages — a parcel really is prepared, shipped
//    and out for delivery, and the buyer should see where it is;
//  · cancelled orders drop the rail and say who cancelled and why (the reason is stored; the buyer should read it);
//  · a text link « Annuler la commande » while the DB still allows it (any non-terminal state; a reason is required once
//    the parcel has shipped) — the frame draws no cancel affordance;
//  · « Commande #A4F729 » uses the shipped short reference (shortRef), not the frame's invented « #CMD-2024-0312 ».
//
// Receipt confirmation sends the STATUS only: `received_at` is stamped by the database on the transition (ConfirmReceipt).
export function ProductOrdersList({ orders }: { orders: MyProductOrder[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3 lg:gap-0">
      {orders.map((order) => (
        <ProductOrderRow
          key={order.id}
          order={order}
          open={openId === order.id}
          onToggle={() => setOpenId((cur) => (cur === order.id ? null : order.id))}
        />
      ))}
    </div>
  )
}

function ProductOrderRow({ order, open, onToggle }: { order: MyProductOrder; open: boolean; onToggle: () => void }) {
  const lang = useLang()
  const status = order.status as OrderStatus
  const pill = statusPillFor(order.status, 'product') ?? statusPillFor('pending', 'product')!
  const title = order.title ?? t('mesCommandes.untitled.product', lang)
  const price = order.total != null ? `${order.total.toLocaleString('fr-FR')} TND` : null

  return (
    <OrderAccordionRow
      id={order.id}
      open={open}
      onToggle={onToggle}
      thumb={<Thumb url={order.imageUrl} />}
      title={title}
      counterpart={order.shopName}
      date={shortDate(order.createdAt, lang)}
      price={price}
      pill={{ status: pill.pill, label: t(pill.labelKey, lang) }}
    >
      {isCancelled(order.status) ? (
        <CancelledNote order={order} />
      ) : (
        // derived: no mobile frame for a 7-step rail. At 56 px a node the chain is ~540 wide, so it scrolls sideways inside
        // its own strip below lg rather than overflowing the page (G9's rail has the same logged defect, unscrolled).
        <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <div className="min-w-[540px] lg:min-w-0">
            <OrderRail
              stages={PRODUCT_LIFECYCLE}
              status={order.status}
              labelKeyFor={(stage) => statusPillFor(stage, 'product')?.labelKey ?? `common.status_${stage}`}
              lang={lang}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <WhatsAppContactButton
          targetId={order.sellerId}
          label={t('mesCommandes.whatsapp', lang)}
          message={t('mesCommandes.whatsapp.message_product', lang, { ref: shortRef(order.id), product: title })}
          errorMessageKey="mesCommandes.whatsapp.error"
          noPhoneMessageKey="mesCommandes.whatsapp.none_shop"
        />
        {canConfirmReceipt(status) && <ConfirmReceipt orderId={order.id} />}
      </div>

      {isCancellable(status) && (
        <div className="self-start">
          <CancelOrderButton
            asLink
            orderId={order.id}
            status={status}
            orderType="product"
            lang={lang}
            reasons={BUYER_CANCEL_REASONS}
            bodyKey="mesCommandes.cancel.body"
          />
        </div>
      )}

      <p className="text-caption leading-[17px] text-text-muted">
        {t('mesCommandes.ref', lang, { ref: shortRef(order.id).slice(1), date: longDate(order.createdAt, lang) })}
      </p>
    </OrderAccordionRow>
  )
}

function Thumb({ url }: { url: string | null }) {
  return (
    <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-surface-subtle">
      {url ? (
        <Image src={url} alt="" fill sizes="48px" className="object-cover" />
      ) : (
        <Package className="size-5 text-icon-muted" aria-hidden="true" />
      )}
    </span>
  )
}

function CancelledNote({ order }: { order: MyProductOrder }) {
  const lang = useLang()
  const who = t(order.cancelledBy === 'buyer' ? 'mesCommandes.cancelled.buyer' : 'mesCommandes.cancelled.shop', lang)
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-surface-subtle px-4 py-3">
      <p className="text-body-sm font-semibold text-text-primary">{t('mesCommandes.cancelledBy', lang, { who })}</p>
      {order.cancellationReason ? (
        <p className="text-body-sm text-text-secondary">{order.cancellationReason}</p>
      ) : null}
    </div>
  )
}

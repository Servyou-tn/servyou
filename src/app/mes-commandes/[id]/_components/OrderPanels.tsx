import type { ReactNode } from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { WhatsAppContactButton } from '@/components/orders/WhatsAppContactButton'
import type { OrderDetail } from '@/lib/marche/order-detail'
import { priceBreakdownFor } from '@/lib/orders/price-breakdown'
import { shortRef } from '@/lib/orders/order-status'
import { formatPhoneDisplay } from '@/lib/phone'
import { t, type Lang } from '@/lib/i18n'

// The static panels of E4 « Détail de ma commande » (Figma 1469:23519 and its state frames). Server components: nothing here
// is interactive except the WhatsApp reveal, which is its own client leaf. Measured values are in
// docs/design/e4-order-detail-measurements.md.
//
// Every panel is surface/base + border/subtle + r12 + pad 24 + gap 16 with a 20/Semi Bold title (`text-h3`).

const PANEL = 'flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6'

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={PANEL}>
      <h2 className="text-h3 text-text-primary">{title}</h2>
      {children}
    </section>
  )
}

// « Destinataire / Adresse / Ville… »: a 14 muted label over a 16 value, gap 4.
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-body-sm text-text-muted">{label}</dt>
      {/* <bdi>: a buyer-typed value (a Latin street in an Arabic page, digits first) keeps its own internal order. */}
      <dd className="text-body text-text-primary">
        <bdi>{children}</bdi>
      </dd>
    </div>
  )
}

function Amount({ value, lang }: { value: number; lang: Lang }) {
  return <>{t('seller.orderDetail.price_amount', lang, { price: value })}</>
}

// ── « Le produit » / « Le service » ─────────────────────────────────────────────────────────────────────────────────────
export function ItemPanel({ order, lang }: { order: OrderDetail; lang: Lang }) {
  const isProduct = order.orderType === 'product'
  // The FROZEN price (what the order was placed at), never today's listing — falling back to the listing only for the oldest
  // rows that predate the snapshot. The full breakdown renders only when BOTH snapshots exist (priceBreakdownFor).
  const unit = order.unitPriceFrozen ?? order.item.price
  const breakdown = priceBreakdownFor({
    orderType: order.orderType,
    quantity: order.quantity,
    unitPriceFrozen: order.unitPriceFrozen,
    deliveryFee: order.deliveryFeeFrozen,
  })

  return (
    <Panel title={t(isProduct ? 'seller.orderDetail.product' : 'buyerOrder.panel.service', lang)}>
      <div className="flex items-start gap-4">
        <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-surface-sunken">
          {order.item.imageUrl ? (
            <Image src={order.item.imageUrl} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <Package className="size-7 text-icon-muted" aria-hidden="true" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-body font-semibold text-text-primary">
            {order.item.title ?? t(isProduct ? 'mesCommandes.untitled.product' : 'mesCommandes.untitled', lang)}
          </p>
          {isProduct ? (
            <>
              <p className="text-body-sm text-text-secondary">{t('buyerOrder.quantity', lang, { n: order.quantity })}</p>
              {unit != null ? (
                <p className="text-body-sm text-text-muted">
                  {t('buyerOrder.unit_price', lang, { price: unit })}
                </p>
              ) : null}
            </>
          ) : order.item.deliveryTime ? (
            <p className="text-body-sm text-text-muted">{t('buyerOrder.service_delay', lang, { delay: order.item.deliveryTime })}</p>
          ) : null}
        </div>
      </div>

      {breakdown ? (
        <dl aria-label={t('seller.orderDetail.price_aria', lang)} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-body text-text-secondary">
              {t('seller.orderDetail.price_line', lang, { n: breakdown.quantity })}
            </dt>
            <dd className="text-body text-text-primary">
              <Amount value={breakdown.lineTotal} lang={lang} />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt className="text-body text-text-secondary">{t('seller.orderDetail.price_delivery', lang)}</dt>
            <dd className="text-body text-text-primary">
              <Amount value={breakdown.deliveryFee} lang={lang} />
            </dd>
          </div>
          <hr className="border-border-subtle" />
          <div className="flex items-center justify-between gap-2">
            <dt className="text-body font-bold text-text-primary">{t('seller.orderDetail.price_total', lang)}</dt>
            <dd className="text-body font-bold text-text-primary">
              <Amount value={breakdown.total} lang={lang} />
            </dd>
          </div>
        </dl>
      ) : !isProduct && unit != null ? (
        // A service has no parcel and no carrier fee: one « Service » row and the Total, which are the same number.
        <dl aria-label={t('seller.orderDetail.price_aria', lang)} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-body text-text-secondary">{t('buyerOrder.line_service', lang)}</dt>
            <dd className="text-body text-text-primary">
              <Amount value={unit} lang={lang} />
            </dd>
          </div>
          <hr className="border-border-subtle" />
          <div className="flex items-center justify-between gap-2">
            <dt className="text-body font-bold text-text-primary">{t('seller.orderDetail.price_total', lang)}</dt>
            <dd className="text-body font-bold text-text-primary">
              <Amount value={unit} lang={lang} />
            </dd>
          </div>
        </dl>
      ) : null}

      <p className="text-body-sm text-text-muted">{t(isProduct ? 'buyerOrder.cod_product' : 'buyerOrder.cod_service', lang)}</p>
    </Panel>
  )
}

// ── « Vendeur » / « Freelance » (the rail) ──────────────────────────────────────────────────────────────────────────────
export function SellerPanel({ order, phone, lang }: { order: OrderDetail; phone: string | null; lang: Lang }) {
  const isProduct = order.orderType === 'product'
  const { seller } = order
  // « Boutique · Tunis » / « Designer graphique · Sfax » — whichever parts exist.
  const subline = (isProduct ? [t('buyerOrder.seller_kind_shop', lang), seller.city] : [seller.headline, seller.city])
    .filter((p): p is string => Boolean(p))
    .join(' · ')
  const ref = shortRef(order.id)
  const title = order.item.title ?? ''

  return (
    <Panel title={t(isProduct ? 'buyerOrder.panel.seller_shop' : 'buyerOrder.panel.seller_freelancer', lang)}>
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold text-text-primary">{seller.name}</p>
        {subline ? <p className="text-body-sm text-text-muted">{subline}</p> : null}
      </div>

      {/* The seller's number — get_contact_phone, answered ONLY because this order links the two. NULL (no number, or a suspended
          account) simply drops the row; the WhatsApp button below has its own click-time reveal. */}
      {phone ? (
        <div className="flex flex-col gap-1">
          <p className="text-body-sm text-text-muted">{t('buyerOrder.phone', lang)}</p>
          <p dir="ltr" className="text-body text-text-primary text-start rtl:text-end">
            {formatPhoneDisplay(phone)}
          </p>
          <p className="text-caption font-medium text-text-muted">
            {t(isProduct ? 'buyerOrder.phone_disclosure_shop' : 'buyerOrder.phone_disclosure_freelancer', lang)}
          </p>
        </div>
      ) : null}

      <WhatsAppContactButton
        targetId={seller.id}
        size="lg"
        label={t(isProduct ? 'buyerOrder.contact_shop' : 'buyerOrder.contact_freelancer', lang)}
        message={
          isProduct
            ? t('mesCommandes.whatsapp.message_product', lang, { ref, product: title })
            : t('mesCommandes.whatsapp.message', lang, { service: title })
        }
        errorMessageKey="mesCommandes.whatsapp.error"
        noPhoneMessageKey={isProduct ? 'mesCommandes.whatsapp.none_shop' : 'mesCommandes.whatsapp.none'}
      />
    </Panel>
  )
}

// ── « Livraison » (product) ─────────────────────────────────────────────────────────────────────────────────────────────
export function DeliveryPanel({ order, lang }: { order: OrderDetail; lang: Lang }) {
  const address = [order.deliveryStreet, order.deliveryQuartier].filter((p): p is string => Boolean(p)).join(', ')
  const city = [order.deliveryVille, order.deliveryGovernorate].filter((p): p is string => Boolean(p)).join(', ')

  return (
    <Panel title={t('seller.orderDetail.delivery', lang)}>
      <dl className="flex flex-col gap-4">
        {order.deliveryName ? <Field label={t('buyerOrder.recipient', lang)}>{order.deliveryName}</Field> : null}
        {address ? <Field label={t('buyerOrder.address', lang)}>{address}</Field> : null}
        {city ? <Field label={t('buyerOrder.city', lang)}>{city}</Field> : null}
      </dl>
      {order.buyerNote ? (
        <div className="flex flex-col gap-1 rounded-lg border-s-4 border-brand-blue-300 bg-surface-subtle p-3">
          <p className="text-caption font-medium uppercase text-text-muted">{t('buyerOrder.your_note', lang)}</p>
          <p className="text-body-sm text-text-primary">« {order.buyerNote} »</p>
        </div>
      ) : null}
    </Panel>
  )
}

// ── « Suivi de livraison » (product, not cancelled) ─────────────────────────────────────────────────────────────────────
// Before the parcel leaves (pending → prepared) both values are promises (« Choisie par la boutique à l'expédition »); afterwards
// they are the data, or a neutral line when the shop recorded none. `orders.carrier` is written by nothing today, so it is the
// neutral line on every real order; the tracking number is whatever the seller typed at dispatch.
const NOT_SHIPPED_YET = new Set(['pending', 'accepted', 'prepared'])

export function TrackingPanel({ order, lang }: { order: OrderDetail; lang: Lang }) {
  const shipped = !NOT_SHIPPED_YET.has(order.status)
  return (
    <Panel title={t('buyerOrder.panel.tracking', lang)}>
      <dl className="flex flex-col gap-4">
        <Field label={t('seller.orderDetail.carrier', lang)}>
          {shipped ? (order.carrier ?? t('buyerOrder.carrier_unknown', lang)) : t('buyerOrder.carrier_pending', lang)}
        </Field>
        <Field label={t('seller.orderDetail.tracking_label', lang)}>
          {shipped ? (order.trackingNumber ?? t('buyerOrder.tracking_unknown', lang)) : t('buyerOrder.tracking_pending', lang)}
        </Field>
      </dl>
    </Panel>
  )
}

// ── « Votre demande » (service) ─────────────────────────────────────────────────────────────────────────────────────────
// The frame also draws a « Ville » row here; a service order carries no city of its own (E1 asks for a description, a timeframe, a
// budget and a phone), so it is not invented. The budget the buyer typed is shown because it is HIS submitted data (E2 recaps it too).
export function RequestPanel({ order, lang }: { order: OrderDetail; lang: Lang }) {
  const need = order.serviceDescription ?? order.buyerNote
  return (
    <Panel title={t('buyerOrder.panel.request', lang)}>
      <dl className="flex flex-col gap-4">
        {need ? <Field label={t('buyerOrder.request_need', lang)}>{need}</Field> : null}
        {order.serviceTimeframe ? <Field label={t('buyerOrder.request_delay', lang)}>{order.serviceTimeframe}</Field> : null}
        {order.serviceBudget ? (
          <Field label={t('buyerOrder.request_budget', lang)}>{t('seller.orderDetail.price_amount', lang, { price: order.serviceBudget })}</Field>
        ) : null}
      </dl>
    </Panel>
  )
}

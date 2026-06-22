'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Activity, Package, Store, Briefcase, MessageCircle, CheckCircle, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t, type Lang } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { OrderLifecycleStepper } from '@/components/OrderLifecycleStepper'
import { OrderStatusBadge } from '@/components/marche/OrderStatusBadge'
import {
  canConfirmReceipt,
  isCancellable,
  requiresCancellationReason,
  statusLabelKey,
  type OrderStatus,
} from '@/lib/types/order-status'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import type { OrderDetail as OrderDetailData } from '@/lib/marche/order-detail'

function amount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function formatPrice(n: number): string {
  return `${new Intl.NumberFormat('fr-TN').format(n)} TND`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('fr-TN', { hour: '2-digit', minute: '2-digit' })
  return `${date} à ${time}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-TN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function govLabel(value: string | null, lang: Lang): string | null {
  if (!value) return null
  const g = GOVERNORATES.find((x) => x.value === value)
  return g ? (lang === 'ar' ? g.ar : g.fr) : value
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'S'
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('')
}

// A label / value detail row.
function Row({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border-subtle py-3 last:border-0">
      <dt className="shrink-0 text-sm text-text-muted">{label}</dt>
      <dd className={cn('text-right text-sm', muted ? 'text-text-muted' : 'text-text-primary')}>{value}</dd>
    </div>
  )
}

// Per-stage helper message shown under the stepper.
function statusMessage(
  order: OrderDetailData,
  lang: Lang,
): { text: string; tone: 'muted' | 'success' | 'danger' } | null {
  switch (order.status) {
    case 'pending':
      return { text: t('orders.status_msg_pending', lang), tone: 'muted' }
    case 'accepted':
      return { text: t('orders.status_msg_accepted', lang), tone: 'muted' }
    case 'prepared':
      return { text: t('orders.status_msg_prepared', lang), tone: 'muted' }
    case 'dispatched':
      return { text: t('orders.status_msg_dispatched', lang), tone: 'muted' }
    case 'in_delivery':
      return { text: t('orders.status_msg_in_delivery', lang), tone: 'muted' }
    case 'arrived':
      return { text: t('orders.status_msg_arrived', lang), tone: 'muted' }
    case 'received':
      return {
        text: t('orders.status_msg_received', lang, { date: order.receivedAt ? formatDate(order.receivedAt) : '' }),
        tone: 'success',
      }
    case 'cancelled':
      return { text: t('orders.status_msg_cancelled', lang, { date: formatDate(order.updatedAt) }), tone: 'danger' }
    default:
      return null
  }
}

export function OrderDetail({ order }: { order: OrderDetailData }) {
  const lang = useLang()
  const router = useRouter()
  const supabase = createClient()

  const [phone, setPhone] = useState<string | null>(null)
  const [revealing, setRevealing] = useState(false)
  const [receiptStep, setReceiptStep] = useState(false)
  const [submittingReceipt, setSubmittingReceipt] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [submittingCancel, setSubmittingCancel] = useState(false)
  const keepBtnRef = useRef<HTMLButtonElement>(null)

  const status = order.status as OrderStatus
  const isTerminal = status === 'received' || status === 'cancelled'
  const showReceive = canConfirmReceipt(status)
  // Simple, no-reason buyer cancel is exactly the pre-pivot window: cancellable AND no
  // reason required. Post-pivot (reason-required) cancellation is deferred (PR-D).
  const showCancel = isCancellable(status) && !requiresCancellationReason(status, order.orderType)
  const isShop = order.seller.type === 'shop'

  // Modal a11y: lock body scroll while open, move focus into the dialog (onto the
  // non-destructive "keep" button), and restore focus to the opener on close. Keyed on
  // cancelOpen only so a mid-submit state change can't bounce focus out of the dialog.
  useEffect(() => {
    if (!cancelOpen) return
    const opener = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    keepBtnRef.current?.focus()
    return () => {
      document.body.style.overflow = ''
      opener?.focus?.()
    }
  }, [cancelOpen])

  // Escape closes the dialog (unless mid-submit). Separate effect so it can read the
  // latest submittingCancel without re-running the focus/scroll effect above.
  useEffect(() => {
    if (!cancelOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submittingCancel) setCancelOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [cancelOpen, submittingCancel])

  const itemTitle = order.item.title ?? t('mescommandes.item_unavailable', lang)
  const shortId = order.id.slice(0, 8)
  const msg = statusMessage(order, lang)

  async function contactSeller() {
    let p = phone
    if (!p) {
      setRevealing(true)
      const { data, error } = await supabase.rpc('get_contact_phone', { target: order.seller.id })
      setRevealing(false)
      if (error) {
        console.error('[OrderDetail] phone reveal error:', error)
        toast.error(t('orders.phone_reveal_error', lang))
        return
      }
      if (!data) {
        toast.error(t('orders.seller_no_phone', lang))
        return
      }
      p = data as string
      setPhone(p)
    }
    const waNumber = p.replace(/[^0-9]/g, '') // wa.me wants digits only, country code included
    const message = t('orders.whatsapp_order_message', lang, { title: itemTitle, id: shortId })
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  async function confirmReceived() {
    setSubmittingReceipt(true)
    // Direct client write — gated authoritatively by the check_order_status_transition trigger
    // (buyer-only, only from 'arrived'). received_at stamped client-side (MVP decision).
    const { error } = await supabase
      .from('orders')
      .update({ status: 'received', received_at: new Date().toISOString() })
      .eq('id', order.id)
    if (error) {
      console.error('[OrderDetail] confirm received error:', error)
      toast.error(t('orders.receive_error', lang))
      setSubmittingReceipt(false)
      return
    }
    toast.success(t('orders.receive_success', lang))
    router.refresh()
  }

  async function cancelOrder() {
    setSubmittingCancel(true)
    // Pre-pivot buyer cancellation: no reason required (the trigger enforces this).
    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_by: 'buyer', cancellation_reason: null })
      .eq('id', order.id)
    if (error) {
      console.error('[OrderDetail] cancel error:', error)
      toast.error(t('orders.cancel_error', lang))
      setSubmittingCancel(false)
      return
    }
    toast.success(t('orders.cancel_success', lang))
    setCancelOpen(false)
    router.refresh()
  }

  // Item price block.
  let priceNode: React.ReactNode
  if (order.orderType === 'product') {
    priceNode =
      order.item.price != null ? (
        <p className="text-xl font-bold text-brand-primary">{formatPrice(order.item.price * order.quantity)}</p>
      ) : (
        <p className="text-sm font-medium text-text-muted">{t('mescommandes.price_unavailable', lang)}</p>
      )
  } else {
    priceNode =
      order.item.price != null ? (
        <p className="text-base font-semibold text-brand-primary">
          {t('listing.service.startingPrice', lang, { price: amount(order.item.price) })}
        </p>
      ) : (
        <p className="text-base font-semibold text-text-muted">{t('listing.service.priceOnRequest', lang)}</p>
      )
  }

  const toneCls =
    msg?.tone === 'success' ? 'text-green-700' : msg?.tone === 'danger' ? 'text-red-600' : 'text-text-muted'

  return (
    <div className="lg:grid lg:grid-cols-5 lg:gap-8">
      {/* LEFT — main content */}
      <div className="lg:col-span-3">
        {/* Back */}
        <Link
          href="/mes-commandes"
          className={cn(
            'mb-6 inline-flex items-center gap-1.5 rounded text-sm text-text-muted transition-colors hover:text-text-primary',
            FOCUS_RING,
          )}
        >
          <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          {t('orders.detail_back', lang)}
        </Link>

        {/* Header */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-text-muted">
            {t('orders.detail_order_label', lang)} #{shortId}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">{itemTitle}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {t(isShop ? 'orders.type_product' : 'orders.type_service', lang)} · {formatDateTime(order.createdAt)}
          </p>
        </div>

        {/* Section A — item summary */}
        <div className="card-premium outline-brand mb-6 rounded-2xl bg-white p-6">
          <div className="flex gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              {order.item.imageUrl ? (
                <Image src={order.item.imageUrl} alt="" fill sizes="96px" className="object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center text-[#B8B8B8]">
                  {order.orderType === 'product' ? (
                    <Package className="h-8 w-8" aria-hidden="true" />
                  ) : (
                    <Briefcase className="h-8 w-8" aria-hidden="true" />
                  )}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {order.item.category && (
                <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-text-primary">
                  {order.item.category}
                </span>
              )}
              <p className="mt-2 text-base font-semibold text-text-primary">{itemTitle}</p>
              {order.seller.name && (
                <p className="mt-1 truncate text-sm text-text-muted">
                  {[order.seller.name, order.seller.city].filter(Boolean).join(' · ')}
                </p>
              )}
              {order.orderType === 'product' && (
                <p className="mt-1 text-sm text-text-muted">
                  {t('orders.detail_quantity', lang)}: ×{order.quantity}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">{priceNode}</div>
          </div>
        </div>

        {/* Section B — lifecycle stepper */}
        <div className="card-premium outline-brand mb-6 rounded-2xl bg-white p-6">
          <div className="mb-6 flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-accent" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-text-primary">{t('orders.detail_tracking_title', lang)}</h2>
          </div>
          <OrderLifecycleStepper
            status={order.status}
            order_type={order.orderType}
            cancelled_by={order.cancelledBy}
            cancellation_reason={order.cancellationReason}
            received_at={order.receivedAt}
          />
          {msg && <p className={cn('mt-4 text-sm', toneCls)}>{msg.text}</p>}
        </div>

        {/* Section C — order / service details */}
        <div className="card-premium outline-brand mb-6 rounded-2xl bg-white p-6">
          <div className="mb-4 flex items-center gap-2">
            <Package className="h-5 w-5 text-brand-accent" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-text-primary">{t('orders.detail_order_section', lang)}</h2>
          </div>

          {order.orderType === 'product' ? (
            <dl>
              <Row label={t('orders.detail_recipient', lang)} value={order.deliveryName || '—'} />
              <Row label={t('orders.detail_address', lang)} value={order.deliveryStreet || '—'} />
              <Row label={t('orders.detail_governorate', lang)} value={govLabel(order.deliveryGovernorate, lang) || '—'} />
              <Row label={t('orders.detail_phone', lang)} value={order.deliveryPhone || '—'} />
              <Row
                label={t('orders.detail_your_note', lang)}
                value={order.buyerNote || t('orders.detail_no_note', lang)}
                muted={!order.buyerNote}
              />
            </dl>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-text-muted">{t('orders.detail_service_need', lang)}</p>
                <div className="mt-1.5 whitespace-pre-wrap rounded-xl bg-surface-subtle p-4 text-sm text-text-primary">
                  {order.serviceDescription || '—'}
                </div>
              </div>
              {(order.serviceTimeframe || order.serviceBudget) && (
                <dl className="border-t border-border-subtle pt-1">
                  {order.serviceTimeframe && (
                    <Row label={t('orders.detail_timeframe', lang)} value={order.serviceTimeframe} />
                  )}
                  {order.serviceBudget && (
                    <Row label={t('orders.detail_budget', lang)} value={`${order.serviceBudget} TND`} />
                  )}
                </dl>
              )}
            </div>
          )}
        </div>

        {/* Section D — seller */}
        <div className="card-premium outline-brand mb-6 rounded-2xl bg-white p-6 lg:mb-0">
          <div className="mb-4 flex items-center gap-2">
            {isShop ? (
              <Store className="h-5 w-5 text-brand-accent" aria-hidden="true" />
            ) : (
              <Briefcase className="h-5 w-5 text-brand-accent" aria-hidden="true" />
            )}
            <h2 className="text-lg font-semibold text-text-primary">
              {t(isShop ? 'orders.detail_seller_section' : 'orders.detail_freelancer_section', lang)}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            {order.seller.logoUrl ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100">
                <Image src={order.seller.logoUrl} alt="" fill sizes="64px" className="object-cover" />
              </div>
            ) : (
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-primary text-lg font-bold text-white">
                {initials(order.seller.name)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-text-primary">{order.seller.name || '—'}</p>
              {[order.seller.headline, order.seller.city].filter(Boolean).length > 0 && (
                <p className="truncate text-sm text-text-muted">
                  {[order.seller.headline, order.seller.city].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            {order.seller.linkId && (
              <Link
                href={`/${isShop ? 'boutique' : 'freelance'}/${order.seller.linkId}`}
                className={cn(
                  'inline-flex h-10 shrink-0 cursor-pointer items-center rounded-full border border-border-subtle bg-white px-4 text-sm font-medium text-text-primary transition-colors hover:bg-slate-50',
                  FOCUS_RING,
                )}
              >
                {t(isShop ? 'orders.detail_view_shop' : 'orders.detail_view_freelance', lang)}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT — sticky action panel */}
      <div className="mt-6 lg:col-span-2 lg:mt-0">
        <div className="card-premium outline-brand rounded-2xl bg-white p-6 lg:sticky lg:top-24">
          <p className="mb-4 text-xs uppercase tracking-wide text-text-muted">{t('orders.detail_actions', lang)}</p>

          <div className="flex flex-col gap-3">
            {/* WhatsApp — always available for contact throughout the lifecycle. */}
            <button
              type="button"
              onClick={contactSeller}
              disabled={revealing}
              className={cn(
                'inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#25D366] text-base font-semibold text-text-primary shadow-md transition-colors hover:bg-[#1DA851] disabled:cursor-not-allowed disabled:opacity-60',
                FOCUS_RING,
              )}
            >
              {revealing ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <MessageCircle className="h-5 w-5" aria-hidden="true" />
              )}
              {t(isShop ? 'orders.detail_contact_seller' : 'orders.detail_contact_freelance', lang)}
            </button>

            {/* Confirm receipt — only when arrived; 2-step (terminal, one-way action). */}
            {showReceive &&
              (!receiptStep ? (
                <button
                  type="button"
                  onClick={() => setReceiptStep(true)}
                  className={cn(
                    'inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand-accent text-base font-semibold text-white shadow-md transition-colors hover:bg-brand-accent-light',
                    FOCUS_RING,
                  )}
                >
                  <CheckCircle className="h-5 w-5" aria-hidden="true" />
                  {t('common.confirm_receipt_action', lang)}
                </button>
              ) : (
                <div className="rounded-2xl border border-border-subtle p-3">
                  <p className="text-sm font-medium text-text-primary">{t('orders.detail_receive_sure', lang)}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={confirmReceived}
                      disabled={submittingReceipt}
                      className={cn(
                        'inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-brand-accent text-sm font-semibold text-white transition-colors hover:bg-brand-accent-light disabled:cursor-not-allowed disabled:opacity-60',
                        FOCUS_RING,
                      )}
                    >
                      {submittingReceipt && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      {submittingReceipt ? t('common.submitting', lang) : t('orders.detail_receive_yes', lang)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptStep(false)}
                      disabled={submittingReceipt}
                      className={cn(
                        'inline-flex h-10 flex-1 cursor-pointer items-center justify-center rounded-full border border-border-subtle bg-white text-sm font-medium text-text-primary transition-colors hover:bg-slate-50 disabled:opacity-60',
                        FOCUS_RING,
                      )}
                    >
                      {t('common.cancel', lang)}
                    </button>
                  </div>
                </div>
              ))}

            {/* Cancel — pre-pivot only (simple, no reason). */}
            {showCancel && (
              <button
                type="button"
                onClick={() => setCancelOpen(true)}
                className={cn(
                  'inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-red-300 bg-white text-sm font-medium text-red-700 transition-colors hover:bg-red-50',
                  FOCUS_RING,
                )}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('orders.detail_cancel', lang)}
              </button>
            )}

            {/* Terminal note. */}
            {isTerminal && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <OrderStatusBadge
                  status={order.status}
                  label={t(statusLabelKey(status, order.orderType), lang)}
                />
                <span className="text-xs text-text-muted">
                  {t(status === 'received' ? 'orders.detail_completed_badge' : 'orders.detail_cancelled_badge', lang)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cancel confirmation modal. */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !submittingCancel && setCancelOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-order-title"
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 id="cancel-order-title" className="text-xl font-bold text-text-primary">
              {t('orders.cancel_modal_title', lang)}
            </h2>
            <p className="mt-2 text-sm text-text-muted">{t('orders.detail_cancel_body', lang)}</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                ref={keepBtnRef}
                type="button"
                onClick={() => setCancelOpen(false)}
                disabled={submittingCancel}
                className={cn(
                  'inline-flex h-10 cursor-pointer items-center rounded-full border border-border-subtle bg-white px-4 text-sm font-medium text-text-primary transition-colors hover:bg-slate-50 disabled:opacity-60',
                  FOCUS_RING,
                )}
              >
                {t('common.cancel_keep_action', lang)}
              </button>
              <button
                type="button"
                onClick={cancelOrder}
                disabled={submittingCancel}
                className={cn(
                  'inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-red-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60',
                  FOCUS_RING,
                )}
              >
                {submittingCancel && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {submittingCancel ? t('common.submitting', lang) : t('common.cancel_confirm_action', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

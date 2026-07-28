'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { OrderRail } from '@/components/orders/OrderRail'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/ui/avatar'
import { getInitials } from '@/components/ui/initials'
import { Button } from '@/components/ui/button'
import { StatusPill } from '@/components/ui/status-pill'
import { FOCUS_RING } from '@/components/layout/styles'
import type { MyServiceOrder } from '@/lib/marche/my-orders'
import {
  RAIL_STAGES,
  STAGE_LABEL_KEY,
  STATUS_PILL,
  canConfirmReceipt,
  isCancelled,
  longDate,
  shortDate,
  shortRef,
} from '@/lib/orders/order-status'

// E3 list — the accordion rows (Figma 709:59673 desktop / 710:59952 mobile).
//
// Client because the row expands in place and both body actions are interactive. The list is
// plain JSON from the server page, so nothing here fetches its own data; only the two writes
// (receipt confirmation, phone reveal) talk to Supabase.
//
// Row anatomy — collapsed header 93 tall (desktop) / 81 (mobile), pad 16/20, gap 12:
// 48 circle thumb · title 15/22 SemiBold + seller 13/18 muted + date 12/17 muted · price
// 15/22 SemiBold blue-800 + StatusPill + chevron. Mobile stacks price over the pill and folds
// seller/date into one "Nom · 24 nov" line (710:59958).
//
// Expanded body (709:59710, only row-3 is designed): a 4-stage rail, the two actions, and the
// order reference. Cancelled orders keep the body but drop the rail and the confirm button —
// subtractive from the designed body rather than an invented one. Where cancellation_reason
// should live is a logged follow-up.

// One accordion open at a time, matching the frame.
export function OrdersList({ orders }: { orders: MyServiceOrder[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <div className="flex flex-col gap-3 lg:gap-0">
      {orders.map((order) => (
        <OrderRow
          key={order.id}
          order={order}
          open={openId === order.id}
          onToggle={() => setOpenId((cur) => (cur === order.id ? null : order.id))}
        />
      ))}
    </div>
  )
}

function OrderRow({
  order,
  open,
  onToggle,
}: {
  order: MyServiceOrder
  open: boolean
  onToggle: () => void
}) {
  const lang = useLang()
  const pill = STATUS_PILL[order.status] ?? STATUS_PILL.pending
  const title = order.title ?? t('mesCommandes.untitled', lang)
  const price =
    order.startingPrice != null ? `${order.startingPrice.toLocaleString('fr-FR')} TND` : null
  const bodyId = `order-body-${order.id}`
  const headerId = `order-header-${order.id}`

  return (
    <div className="bg-surface-base">
      <h3>
        <button
          type="button"
          id={headerId}
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className={`flex w-full items-center gap-3 px-4 py-4 text-start lg:px-5 ${FOCUS_RING}`}
        >
          {/* No image exists for a service (getMyServiceOrders never returns one and there is no
              avatar column anywhere), so the 48 circle is the initials fallback D2/E1 settled on. */}
          <Avatar size="md" initials={getInitials(order.sellerName ?? title)} className="shrink-0" />

          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-body-sm font-semibold text-text-primary lg:text-[15px] lg:leading-[22px]">
              {title}
            </span>
            {/* Desktop: seller and date on their own lines. Mobile: one "Nom · 24 nov" line. */}
            <span className="truncate text-caption text-text-muted lg:hidden">
              {[order.sellerName, shortDate(order.createdAt, lang)].filter(Boolean).join(' · ')}
            </span>
            <span className="hidden truncate text-[13px] leading-[18px] text-text-muted lg:block">
              {order.sellerName}
            </span>
            <span className="hidden text-caption leading-[17px] text-text-muted lg:block">
              {shortDate(order.createdAt, lang)}
            </span>
          </span>

          <span className="flex shrink-0 flex-col items-end gap-1 lg:flex-row lg:items-center lg:gap-3">
            {price && (
              <span className="text-body-sm font-semibold text-brand-blue-800 lg:text-[15px] lg:leading-[22px]">
                {price}
              </span>
            )}
            <StatusPill status={pill.pill}>{t(pill.labelKey, lang)}</StatusPill>
          </span>

          <ChevronDown
            className={`h-5 w-5 shrink-0 text-text-muted transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
          <span className="sr-only">
            {t(open ? 'mesCommandes.collapse' : 'mesCommandes.expand', lang)}
          </span>
        </button>
      </h3>

      <div className="h-px bg-border-subtle" aria-hidden="true" />

      {open && (
        <div
          id={bodyId}
          role="region"
          aria-labelledby={headerId}
          className="flex flex-col gap-4 px-4 py-4 lg:px-5 lg:py-5"
        >
          {!isCancelled(order.status) && <Rail status={order.status} />}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <WhatsAppButton sellerId={order.sellerId} serviceTitle={title} />
            {canConfirmReceipt(order.status) && <ConfirmReceipt orderId={order.id} />}
          </div>

          <p className="text-caption leading-[17px] text-text-muted">
            {t('mesCommandes.ref', lang, {
              ref: shortRef(order.id),
              date: longDate(order.createdAt, lang),
            })}
          </p>
        </div>
      )}

      {open && <div className="h-px bg-border-subtle" aria-hidden="true" />}
    </div>
  )
}

// 4-stage rail (709:59711). 32 circles joined by 2px connectors; the connector after a
// completed stage is border-strong, the rest border-subtle.
function Rail({ status }: { status: string }) {
  const lang = useLang()
  // The rail treatment now lives in components/orders/OrderRail — extracted in the G9 delta pass
  // so the seller's detail page could reuse this exact visual language instead of the legacy
  // OrderLifecycleStepper. E3 keeps its OWN stage set (the 4-stage buyer service rail); only the
  // rendering is shared, which is why `stages` is a prop.
  return (
    <OrderRail
      stages={RAIL_STAGES}
      status={status}
      labelKeyFor={(stage) => STAGE_LABEL_KEY[stage as (typeof RAIL_STAGES)[number]]}
      lang={lang}
    />
  )
}

// Reveal-on-click, mirroring MissionDetail: get_contact_phone(target) returns the freelancer's
// phone only because this order row exists (its RLS-equivalent gate is an orders row linking the
// two). profiles.phone is nullable, so NULL is a normal outcome, not an error — the button then
// disables itself and says why.
function WhatsAppButton({ sellerId, serviceTitle }: { sellerId: string; serviceTitle: string }) {
  const lang = useLang()
  const supabase = createClient()
  const [phone, setPhone] = useState<string | null>(null)
  const [noPhone, setNoPhone] = useState(false)
  const [loading, setLoading] = useState(false)

  async function contact() {
    let p = phone
    if (!p) {
      setLoading(true)
      const { data, error } = await supabase.rpc('get_contact_phone', { target: sellerId })
      setLoading(false)
      if (error) {
        console.error('[OrdersList] phone reveal error:', error.message, error.code, error.details)
        toast.error(t('mesCommandes.whatsapp.error', lang))
        return
      }
      if (!data) {
        setNoPhone(true)
        toast.error(t('mesCommandes.whatsapp.none', lang))
        return
      }
      p = data as string
      setPhone(p)
    }
    const digits = p.replace(/[^0-9]/g, '') // wa.me wants digits only, country code included
    const message = t('mesCommandes.whatsapp.message', lang, { service: serviceTitle })
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <button
      type="button"
      onClick={contact}
      disabled={noPhone || loading}
      title={noPhone ? t('mesCommandes.whatsapp.none', lang) : undefined}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-[10px] px-4 text-body-sm font-semibold transition-colors ${FOCUS_RING} ${
        noPhone
          ? 'cursor-not-allowed bg-surface-sunken text-text-muted'
          : 'bg-wa-brand text-text-primary hover:bg-wa-brand-hover'
      }`}
    >
      <WhatsAppGlyph />
      {t('mesCommandes.whatsapp', lang)}
    </button>
  )
}

function WhatsAppGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0 fill-current" aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.89 2.38 1.01 2.54c.12.17 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  )
}

// The buyer's only write on an existing row. check_order_status_transition permits it from
// 'arrived' ONLY and for the buyer ONLY; RLS alone would allow any status, so the trigger is
// the real gate. received_at is stamped here because the trigger does not set it — without
// this, "Reçue le" has nothing to show.
function ConfirmReceipt({ orderId }: { orderId: string }) {
  const lang = useLang()
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [, startTransition] = useTransition()

  async function confirm() {
    setSaving(true)
    const { error } = await supabase
      .from('orders')
      .update({ status: 'received', received_at: new Date().toISOString() })
      .eq('id', orderId)
    if (error) {
      console.error('[OrdersList] confirmReceipt error:', error.message, error.code, error.details)
      toast.error(t('mesCommandes.confirmError', lang))
      setSaving(false)
      return
    }
    toast.success(t('common.receipt_confirmed_success', lang))
    startTransition(() => router.refresh())
    setSaving(false)
  }

  return (
    <Button type="button" size="sm" onClick={confirm} loading={saving}>
      {t('common.confirm_receipt_action', lang)}
    </Button>
  )
}

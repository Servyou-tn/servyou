'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cancelOrderAction } from '@/app/actions/orders'
import { requiresCancellationReason, type OrderStatus, type OrderType } from '@/lib/types/order-status'
import { CANCEL_REASON_OTHER, SHOP_CANCEL_REASONS } from '@/lib/orders/cancel-reasons'
import type { SellerOrderPath } from '@/lib/orders/seller-paths'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { ModalDialog, MODAL_FIELD_CLASS } from '@/components/shared/ModalDialog'

// Seller cancellation — Figma G8 modal specimen 490:26058 (480×660).
//
// Rebuilt on the F3 primitives rather than reusing `components/CancelOrderModal.tsx`: that one
// predates them, renders a bespoke shell, and — the actual reason — writes with a direct
// browser `supabase.update()`. G4 set the counter-precedent that seller mutations go through a
// server action. Its REASON MODEL is kept verbatim (presets + free text) and so is
// `requiresCancellationReason`, which encodes the trigger's post-pivot rule.
//
// The old modal keeps its three buyer-side call sites (it has none today) until those migrate onto
// `cancelOrderAction`, which is already written role-aware for exactly that. Logged.
//
// PROMOTED to src/components/orders when H8 became the second consumer, and split in two:
//   • CancelOrderDialog — the modal itself, controlled by its parent (H8's row opens it from a kebab item);
//   • CancelOrderButton — G8/G9's trigger (ghost button or text link) + the dialog, behaviour unchanged.
// `reasons` defaults to the shop owner's product presets; H8 passes SERVICE_CANCEL_REASONS.

type DialogProps = {
  orderId: string
  status: OrderStatus
  orderType: OrderType
  lang: Lang
  /** Preset reasons, as i18n keys. Defaults to the shop owner's. */
  reasons?: readonly string[]
  /** The page that shows this order's status — refreshed server-side after the cancel. */
  revalidate?: SellerOrderPath
  /** i18n key of the explanatory line; defaults to the seller's (« L'acheteur en sera informé »). A buyer passes their own. */
  bodyKey?: string
  /**
   * `radios` (default) is the seller's G8 modal and E3's buyer modal — unchanged. `select` is E4's buyer modal (Figma 1475:25765):
   * a « Motif » SELECT (required once the rule demands it) + an optional « Précisions » textarea, on the native-<dialog> shell.
   * The stored reason is the chosen preset's label, followed by the buyer's own words.
   */
  layout?: 'radios' | 'select'
  onClose: () => void
}

export function CancelOrderDialog({
  orderId,
  status,
  orderType,
  lang,
  reasons = SHOP_CANCEL_REASONS,
  revalidate = '/commandes-recues',
  bodyKey = 'seller.orders.cancel_body',
  layout = 'radios',
  onClose,
}: DialogProps) {
  const [selected, setSelected] = useState<string>('')
  const [custom, setCustom] = useState('')
  const [details, setDetails] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  // After the pivot the trigger REQUIRES a reason; before it, one is optional. Surfacing the rule
  // here keeps the write from bouncing off the database for something the UI already knew.
  const reasonRequired = requiresCancellationReason(status, orderType)
  const isOther = selected === CANCEL_REASON_OTHER
  // `select` layout: the preset's label + the buyer's own words; « Autre » alone carries no information, so with details it is dropped.
  const selectResolved =
    isOther && details.trim() !== ''
      ? details.trim()
      : [selected ? t(selected, lang) : '', details.trim()].filter(Boolean).join(' — ')
  const resolved = layout === 'select' ? selectResolved : isOther ? custom.trim() : selected ? t(selected, lang) : ''
  const blocked = reasonRequired && (layout === 'select' ? selected === '' : resolved === '')

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await cancelOrderAction({
        orderId,
        reason: resolved === '' ? undefined : resolved,
        revalidate,
      })
      if (result.ok) {
        onClose()
        router.refresh()
      } else {
        setError(result.error)
      }
    })
  }

  if (layout === 'select') {
    return (
      <ModalDialog
        open
        onClose={onClose}
        busy={pending}
        title={t('seller.orders.cancel_title', lang)}
        closeLabel={t('buyerOrder.dialog.close', lang)}
        onSubmit={(e) => {
          e.preventDefault()
          if (!blocked && !pending) submit()
        }}
        footer={
          <>
            <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={pending}>
              {t('buyerOrder.cancel.back', lang)}
            </Button>
            <Button type="submit" variant="danger" size="md" loading={pending} disabled={blocked}>
              {t('common.cancel_confirm_action', lang)}
            </Button>
          </>
        }
      >
        {reasonRequired ? (
          <p className="text-body-sm text-text-secondary">{t('seller.orders.cancel_reason_required', lang)}</p>
        ) : null}
        <div className="flex flex-col gap-2">
          <label htmlFor={`cancel-reason-${orderId}`} className="flex items-center gap-0.5 text-body-sm font-medium text-text-secondary">
            {t('buyerOrder.cancel.reason_label', lang)}
            {reasonRequired ? (
              <span className="text-danger-500" aria-hidden="true">
                *
              </span>
            ) : null}
          </label>
          <select
            id={`cancel-reason-${orderId}`}
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            required={reasonRequired}
            className={`h-11 px-4 ${MODAL_FIELD_CLASS}`}
          >
            <option value="">{t('buyerOrder.cancel.reason_placeholder', lang)}</option>
            {reasons.map((key) => (
              <option key={key} value={key}>
                {t(key, lang)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`cancel-details-${orderId}`} className="text-body-sm font-medium text-text-secondary">
            {t('buyerOrder.cancel.details_label', lang)}
          </label>
          <textarea
            id={`cancel-details-${orderId}`}
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t('buyerOrder.cancel.details_placeholder', lang)}
            rows={4}
            maxLength={400}
            className={`px-4 py-3 ${MODAL_FIELD_CLASS}`}
          />
        </div>
        {error ? (
          <p role="alert" className="text-body-sm text-danger-500">
            {error}
          </p>
        ) : null}
      </ModalDialog>
    )
  }

  return (
    // derived: no mobile frame for G8. The desktop modal is 480 wide; below-sm it fills the
    // viewport with the same padding rhythm.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('seller.orders.cancel_title', lang)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="flex w-full max-w-[480px] flex-col gap-4 rounded-xl bg-surface-base p-6">
        <h2 className="text-h3 text-text-primary">{t('seller.orders.cancel_title', lang)}</h2>
        <p className="text-body-sm text-text-secondary">
          {reasonRequired
            ? t('seller.orders.cancel_reason_required', lang)
            : t(bodyKey, lang)}
        </p>

        <fieldset className="flex flex-col gap-2">
          <legend className="sr-only">{t('seller.orders.cancel_reason_legend', lang)}</legend>
          {reasons.map((key) => (
            <label key={key} className="flex items-center gap-2 text-body text-text-primary">
              <input
                type="radio"
                name="cancel-reason"
                value={key}
                checked={selected === key}
                onChange={() => setSelected(key)}
                className="h-4 w-4 accent-brand-blue-600"
              />
              {t(key, lang)}
            </label>
          ))}
        </fieldset>

        {isOther ? (
          <textarea
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            maxLength={500}
            rows={3}
            aria-label={t('seller.orders.cancel_reason_legend', lang)}
            className="w-full rounded-lg border border-border-strong p-3 text-body text-text-primary"
          />
        ) : null}

        {error ? (
          <p role="alert" className="text-body-sm text-danger-500">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-3">
          {/* "Garder la commande", not "Annuler" — in a cancel-confirmation dialog both buttons
              reading "Annuler" is genuinely ambiguous. These two keys already existed for exactly
              this pair. (The previous `common.back` did not exist at all and rendered as a raw key
              — caught by measuring the modal OPEN, which a closed-state check never sees.) */}
          <Button variant="ghost" size="md" onClick={onClose} disabled={pending}>
            {t('common.cancel_keep_action', lang)}
          </Button>
          <Button variant="danger" size="md" loading={pending} disabled={blocked} onClick={submit}>
            {t('common.cancel_confirm_action', lang)}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function CancelOrderButton({
  asLink,
  ...dialog
}: Omit<DialogProps, 'onClose'> & {
  /** G9's rail renders "Annuler la commande" as a text link at the panel foot (Figma 497:26470),
   *  not as a button. G8's row keeps the ghost button. */
  asLink?: boolean
}) {
  const [open, setOpen] = useState(false)
  const { lang } = dialog

  if (open) return <CancelOrderDialog {...dialog} onClose={() => setOpen(false)} />

  if (asLink) {
    return (
      // G9 delta AC4. Figma 497:26470 paints this `#e5484d`, centres it, and gives it the panel's
      // full 312 width. It shipped as `brand-blue-600`, start-aligned, hug-width — i.e. a
      // DESTRUCTIVE action wearing the same colour as "Accepter" directly above it, reading as a
      // peer of the primary action rather than as the one that ends the order. That is a hazard,
      // not a colour delta, which is why it is closed here rather than logged.
      //
      // NOT `cn()` — `text-body-sm` and `text-danger-500` are a size token and a colour token, and
      // tailwind-merge would evict the size (see OrderRail's label and docs/follow-ups.md).
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full rounded text-center text-body-sm text-danger-500 hover:underline ${FOCUS_RING}`}
      >
        {t('seller.orderDetail.cancel_link', lang)}
      </button>
    )
  }
  return (
    <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
      {t('seller.orders.cancel', lang)}
    </Button>
  )
}

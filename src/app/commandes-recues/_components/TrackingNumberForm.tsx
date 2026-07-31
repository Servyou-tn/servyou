'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { setOrderTrackingAction } from '@/app/actions/orders'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

// G9 panel-suivi's tracking input — measured from Figma `Input` I497:26416.
//
// Measured: label 14/21 Inter Medium text/secondary (asterisk layer HIDDEN ⇒ NOT required) · field
// h44, pad 0/16, radius 10, white, 1px border/strong · placeholder 16/26 "Sera saisi à
// l'expédition" · helper 14/21 text/muted (counter layer HIDDEN ⇒ no character count).
//
// ⚑ The frame draws a field with no submit control, because a static mock does not need one. A real
// input does: without an explicit save the seller cannot tell whether a typed code was persisted,
// and a blur-to-save would fire on every accidental focus change. The button is therefore an
// addition to the frame, sized to the primitive's `md`, and it is disabled until the value actually
// changes so it never invites a no-op write.
//
// Empty submit CLEARS the column (the action maps '' → null): a mistyped 12-digit code must be
// correctable back to nothing, not just to a different wrong value.
export function TrackingNumberForm({
  orderId,
  initialValue,
  lang,
}: {
  orderId: string
  initialValue: string | null
  lang: Lang
}) {
  const [value, setValue] = useState(initialValue ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const dirty = value.trim() !== (initialValue ?? '').trim()
  const fieldId = `tracking-${orderId}`
  const helpId = `${fieldId}-help`

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        setSaved(false)
        startTransition(async () => {
          const result = await setOrderTrackingAction({ orderId, trackingNumber: value })
          if (result.ok) {
            setSaved(true)
            router.refresh()
          } else {
            setError(result.error)
          }
        })
      }}
    >
      <label htmlFor={fieldId} className="text-body-sm font-medium text-text-secondary">
        {t('seller.orderDetail.tracking_label', lang)}
      </label>
      {/* derived: below-lg the field and its button stack. No mobile frame exists for G9. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <input
          id={fieldId}
          name="trackingNumber"
          type="text"
          inputMode="numeric"
          maxLength={80}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setSaved(false)
          }}
          placeholder={t('seller.orderDetail.tracking_placeholder', lang)}
          aria-describedby={helpId}
          aria-invalid={error ? true : undefined}
          // `sm:flex-1`, not `flex-1`. Below sm the wrapper is flex-col, where flex-basis resolves
          // against the CROSS axis — height — so a bare `flex-1` overrode h-11 and collapsed the
          // field to 22px at 375. Caught by measuring both widths, not by reading the class list.
          className={`h-11 w-full min-w-0 rounded-[10px] border border-border-strong bg-surface-base px-4 text-body text-text-primary placeholder:text-text-muted sm:flex-1 ${FOCUS_RING}`}
        />
        {/* h-11 overrides the primitive's md height (40) to match the Figma field's measured 44 —
            the two sit on one row and a 4px mismatch reads as a mistake. The button itself has no
            Figma counterpart (see the header), so the field is what it should agree with. */}
        <Button
          type="submit"
          size="md"
          className="h-11 w-full sm:w-auto"
          loading={pending}
          disabled={!dirty}
        >
          {t('seller.orderDetail.tracking_save', lang)}
        </Button>
      </div>
      <p id={helpId} className="text-body-sm text-text-muted">
        {t('seller.orderDetail.tracking_helper', lang)}
      </p>
      {/* role="status" not "alert": a success confirmation should be announced without
          interrupting, and aria-live on the error is what warrants assertive. */}
      {saved && !dirty ? (
        <p role="status" className="text-body-sm text-success-700">
          {t('seller.orderDetail.tracking_saved', lang)}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-body-sm text-danger-500">
          {error}
        </p>
      ) : null}
    </form>
  )
}

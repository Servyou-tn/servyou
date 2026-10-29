'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ModalDialog, MODAL_FIELD_CLASS } from '@/components/shared/ModalDialog'
import { useLang } from '@/components/LangProvider'
import { createDispute } from '@/app/actions/disputes'
import { t } from '@/lib/i18n'
import type { OrderType } from '@/lib/types/order-status'
import type { DisputeReason } from '@/lib/types/dispute'

// « Signaler un problème » — Figma E4 1475:25807: a « Nature du problème » select (required), a « Décrivez le problème »
// textarea (required) and a primary « Envoyer le signalement ». It files a DISPUTE through the existing `createDispute` action
// (the role is inferred server-side from the order, never sent): the admin queue at /admin/litiges already handles it.
//
// The frame asks for the description ALWAYS; the database only requires it for « Autre » (disputes_other_requires_description).
// The form is the stricter of the two, deliberately — an admin triaging a dispute needs the buyer's words whatever the reason.
//
// Only the buyer-shaped reasons are offered. `payment_refused` and `buyer_unreachable` belong to the seller's side of the same
// table; a service has no parcel, so « Colis non reçu » / « Article abîmé » read as « Travail non livré » / « non conforme ».
const REASONS: Record<OrderType, readonly DisputeReason[]> = {
  product: ['not_delivered', 'wrong_item', 'damaged', 'other'],
  service: ['not_delivered', 'wrong_item', 'other'],
}

export function ReportProblemDialog({
  orderId,
  orderType,
  onClose,
}: {
  orderId: string
  orderType: OrderType
  /** Called on EVERY way out; the parent unmounts the dialog. */
  onClose: () => void
}) {
  const lang = useLang()
  const router = useRouter()
  const [reason, setReason] = useState<DisputeReason | ''>('')
  const [description, setDescription] = useState('')
  // An i18n KEY (the action answers with keys), resolved at render so a language switch re-translates it.
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = !submitting && reason !== '' && description.trim() !== ''

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    setErrorKey(null)
    const res = await createDispute(orderId, reason, description)
    if (!res.success) {
      setErrorKey(res.error)
      setSubmitting(false)
      return
    }
    toast.success(t('buyerOrder.dispute.success', lang))
    onClose()
    router.refresh() // the page now shows « signalement en cours » instead of the button
  }

  return (
    <ModalDialog
      open
      onClose={onClose}
      busy={submitting}
      title={t('buyerOrder.dispute.title', lang)}
      closeLabel={t('buyerOrder.dialog.close', lang)}
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      footer={
        <>
          <Button type="button" variant="ghost" size="md" onClick={onClose} disabled={submitting}>
            {t('buyerOrder.dispute.cancel', lang)}
          </Button>
          <Button type="submit" variant="primary" size="md" loading={submitting} disabled={!canSubmit}>
            {t('buyerOrder.dispute.submit', lang)}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        <label htmlFor={`dispute-reason-${orderId}`} className="flex items-center gap-0.5 text-body-sm font-medium text-text-secondary">
          {t('buyerOrder.dispute.kind_label', lang)}
          <span className="text-danger-500" aria-hidden="true">
            *
          </span>
        </label>
        <select
          id={`dispute-reason-${orderId}`}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value as DisputeReason | '')
            setErrorKey(null)
          }}
          required
          className={`h-11 px-4 ${MODAL_FIELD_CLASS}`}
        >
          <option value="">{t('buyerOrder.dispute.kind_placeholder', lang)}</option>
          {REASONS[orderType].map((r) => (
            <option key={r} value={r}>
              {t(r === 'other' ? 'buyerOrder.dispute.reason_other' : `buyerOrder.dispute.${orderType}.reason_${r}`, lang)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={`dispute-details-${orderId}`} className="flex items-center gap-0.5 text-body-sm font-medium text-text-secondary">
          {t('buyerOrder.dispute.details_label', lang)}
          <span className="text-danger-500" aria-hidden="true">
            *
          </span>
        </label>
        <textarea
          id={`dispute-details-${orderId}`}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setErrorKey(null)
          }}
          placeholder={t('buyerOrder.dispute.details_placeholder', lang)}
          rows={4}
          maxLength={1000}
          required
          className={`px-4 py-3 ${MODAL_FIELD_CLASS}`}
        />
      </div>

      {errorKey ? (
        <p role="alert" className="text-body-sm text-danger-500">
          {t(errorKey, lang)}
        </p>
      ) : null}
    </ModalDialog>
  )
}

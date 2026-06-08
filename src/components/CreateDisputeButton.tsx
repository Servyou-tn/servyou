'use client'

import { useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { DisputeCreateModal } from './DisputeCreateModal'

type Props = {
  orderId: string
  hasActiveDispute: boolean
  // Disputes can only be opened once the order has moved past 'pending' (RLS enforces
  // it too). /demande/confirmation/[id] is the buyer's persistent order view, often
  // seen while still pending — so the button is hidden there until the order advances.
  canCreate: boolean
  onCreated?: () => void
}

export function CreateDisputeButton({ orderId, hasActiveDispute, canCreate, onCreated }: Props) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [open, setOpen] = useState(false)

  // An active dispute already exists → muted notice (the partial unique index would
  // block a second one anyway). The DisputePanel above shows its live status.
  if (hasActiveDispute) {
    return (
      <button
        type="button"
        disabled
        aria-disabled="true"
        className="cursor-not-allowed rounded border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-400"
      >
        {tr('dispute.button_create_existing')}
      </button>
    )
  }

  // Order still pending → not eligible; render nothing.
  if (!canCreate) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
      >
        {tr('dispute.button_create')}
      </button>
      <DisputeCreateModal
        orderId={orderId}
        isOpen={open}
        onClose={() => setOpen(false)}
        onCreated={onCreated}
      />
    </>
  )
}

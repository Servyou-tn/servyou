'use client'

import { useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { createDispute } from '@/app/actions/disputes'
import type { DisputeReason } from '@/lib/types/dispute'

type Props = {
  orderId: string
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

const REASONS: DisputeReason[] = [
  'not_delivered', 'wrong_item', 'damaged', 'payment_refused', 'buyer_unreachable', 'other',
]

// Shared, role-agnostic dispute-creation modal. Mirrors CancelOrderModal's visual shell
// (fixed overlay + white card). Role is inferred server-side by createDispute — this
// component never sends or knows the caller's role. Validation is layered: the disabled
// submit (reason required; description required when reason='other'), the server action,
// and the DB CHECKs.
export function DisputeCreateModal({ orderId, isOpen, onClose, onCreated }: Props) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [reason, setReason] = useState<DisputeReason | ''>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const descriptionRequired = reason === 'other'
  const canSubmit = !submitting && reason !== '' && (!descriptionRequired || description.trim().length > 0)

  function close() {
    setReason('')
    setDescription('')
    setError(null)
    setSubmitting(false)
    onClose()
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await createDispute(orderId, reason, description)
    if (!res.success) {
      setError(tr(res.error))
      setSubmitting(false)
      return
    }
    setSubmitting(false)
    onCreated?.()
    close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-800">{tr('dispute.modal_title')}</h2>
        <p className="text-sm text-gray-500">{tr('dispute.modal_description')}</p>

        <div className="space-y-1">
          <label htmlFor="dispute-reason" className="block text-sm font-medium text-gray-600">
            {tr('dispute.field_reason')}
          </label>
          <select
            id="dispute-reason"
            value={reason}
            onChange={e => setReason(e.target.value as DisputeReason | '')}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">{tr('dispute.field_reason_placeholder')}</option>
            {REASONS.map(r => (
              <option key={r} value={r}>{tr('dispute.reason_' + r)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="dispute-description" className="block text-sm font-medium text-gray-600">
            {tr('dispute.field_description')}
          </label>
          <textarea
            id="dispute-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            placeholder={tr('dispute.field_description_placeholder')}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
          >
            {tr('dispute.action_cancel')}
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? tr('common.submitting') : tr('dispute.action_submit')}
          </button>
        </div>
      </form>
    </div>
  )
}

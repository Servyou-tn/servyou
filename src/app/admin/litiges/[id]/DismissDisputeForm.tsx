'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { dismissDispute } from '../actions'

// Dismiss = terminal close with NO side taken (dispute judged invalid). Mirrors
// DismissForm from reports: required note (textarea `required` + disabled submit when
// trimmed-empty + the DB CHECK as the real guard) that both parties see on close. Muted
// outline button so "no action taken" reads distinct from Resolve's primary blue. On
// success the parent re-renders into the read-only dismissed block.
export function DismissDisputeForm({ disputeId }: { disputeId: string }) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await dismissDispute(disputeId, note)
      if (!res.success) setError(tr(res.error ?? 'admin.disputes.error_dismiss_no_row'))
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label htmlFor="dispute_dismiss_note" className="block text-sm font-medium text-gray-700">
        {tr('admin.disputes.dismiss_note_label')}
      </label>
      <textarea
        id="dispute_dismiss_note"
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={4}
        required
        placeholder={tr('admin.disputes.dismiss_note_placeholder')}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || note.trim().length === 0}
        className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        {tr('admin.disputes.action_dismiss')}
      </button>
    </form>
  )
}

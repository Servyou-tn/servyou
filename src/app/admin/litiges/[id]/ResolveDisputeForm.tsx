'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { resolveDispute } from '../actions'
import type { DisputeOutcome } from '@/lib/types/dispute'

const OUTCOMES: DisputeOutcome[] = ['sided_buyer', 'sided_seller', 'compromise']

// Resolve = terminal close with one of three decisions (the side the admin took) plus a
// required note both parties see. The outcome is a radio group (explicit, not a dropdown:
// this is a consequential decision). Both fields are guarded three ways: the disabled
// submit, the server action, and the DB CHECKs (disputes_outcome_only_when_resolved +
// disputes_terminal_requires_admin_note). On success the parent re-renders into the
// read-only resolved block.
export function ResolveDisputeForm({ disputeId }: { disputeId: string }) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [outcome, setOutcome] = useState<DisputeOutcome | ''>('')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await resolveDispute(disputeId, outcome, note)
      if (!res.success) setError(tr(res.error ?? 'admin.disputes.error_resolve_no_row'))
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-gray-700">{tr('admin.disputes.outcome_label')}</legend>
        {OUTCOMES.map(o => (
          <label key={o} htmlFor={`dispute_outcome_${o}`} className="flex items-center gap-2 text-sm text-gray-800">
            <input
              type="radio"
              id={`dispute_outcome_${o}`}
              name="dispute_outcome"
              value={o}
              checked={outcome === o}
              onChange={() => setOutcome(o)}
              className="h-4 w-4"
            />
            {tr('admin.disputes.outcome_' + o)}
          </label>
        ))}
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="dispute_resolve_note" className="block text-sm font-medium text-gray-700">
          {tr('admin.disputes.note_label')}
        </label>
        <textarea
          id="dispute_resolve_note"
          value={note}
          onChange={e => setNote(e.target.value)}
          rows={4}
          required
          placeholder={tr('admin.disputes.note_placeholder')}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || outcome === '' || note.trim().length === 0}
        className="rounded bg-brand-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-700 disabled:opacity-50"
      >
        {tr('admin.disputes.action_resolve')}
      </button>
    </form>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { dismissReport } from '../actions'

// Dismiss = terminal close with NO action against the target (report judged invalid).
// Mirrors ResolveForm: required admin_note (textarea `required` + disabled submit when
// trimmed-empty + the DB CHECK as the real guard) that the reporter sees on close.
// Muted/secondary button styling so "no action taken" reads distinct from Resolve's
// primary blue. On success the action revalidates into the dismissed read-only state.
export function DismissForm({ reportId }: { reportId: string }) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await dismissReport(reportId, note)
      if (!res.success) setError(tr(res.error ?? 'admin.reports.error_dismiss_no_row'))
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label htmlFor="dismiss_note" className="block text-sm font-medium text-gray-700">
        {tr('admin.reports.dismiss_note_label')}
      </label>
      <textarea
        id="dismiss_note"
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={4}
        required
        placeholder={tr('admin.reports.dismiss_note_placeholder')}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || note.trim().length === 0}
        className="rounded border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
      >
        {tr('admin.reports.action_dismiss')}
      </button>
    </form>
  )
}

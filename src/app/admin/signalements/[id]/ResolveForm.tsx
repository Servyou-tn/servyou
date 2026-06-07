'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { resolveReport } from '../actions'

// Resolve = set status 'resolved' + a required admin_note the reporter sees as the
// outcome. The note is required in three places: the textarea `required` attribute,
// the disabled submit when trimmed-empty, and the server action (which the DB CHECK
// backs as the real guard). On success the action revalidates and the parent server
// component re-renders into the resolved (read-only note) state.
export function ResolveForm({ reportId }: { reportId: string }) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await resolveReport(reportId, note)
      if (!res.success) setError(tr(res.error ?? 'admin.reports.error_not_actionable'))
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label htmlFor="admin_note" className="block text-sm font-medium text-gray-700">
        {tr('admin.reports.field_admin_note')}
      </label>
      <textarea
        id="admin_note"
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={4}
        required
        placeholder={tr('admin.reports.admin_note_placeholder')}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || note.trim().length === 0}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {tr('admin.reports.action_resolve')}
      </button>
    </form>
  )
}

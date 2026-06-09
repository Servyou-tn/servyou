'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { suspendReportedUser } from '../actions'

// Mirrors utilisateurs/[id]/SuspendForm, but calls the report-local
// suspendReportedUser (which revalidates the report detail page too). The reason is
// required in three places: the textarea `required`, the disabled submit when
// trimmed-empty, and the DB function (which RAISEs on empty). On success the action
// revalidates and the parent server component re-renders into the suspended state.
export function SuspendReportedUserForm({ targetUserId, reportId }: {
  targetUserId: string
  reportId: string
}) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await suspendReportedUser(targetUserId, reason, reportId)
      if (!res.success) setError(tr(res.error ?? 'common.error_generic'))
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <label htmlFor="suspend_reason" className="block text-sm font-medium text-gray-700">
        {tr('admin.users.suspend_reason_label')}
      </label>
      <textarea
        id="suspend_reason"
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={3}
        required
        placeholder={tr('admin.users.suspend_reason_placeholder')}
        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending || reason.trim().length === 0}
        className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
      >
        {tr('admin.users.action_suspend')}
      </button>
    </form>
  )
}

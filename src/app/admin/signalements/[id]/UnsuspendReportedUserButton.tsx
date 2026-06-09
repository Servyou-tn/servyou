'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { unsuspendReportedUser } from '../actions'

// Mirrors utilisateurs/[id]/UnsuspendButton, but calls the report-local
// unsuspendReportedUser (which revalidates the report detail page too). Confirms first
// (a state change), then calls the action. On success the parent re-renders into the
// active state.
export function UnsuspendReportedUserButton({ targetUserId, reportId }: {
  targetUserId: string
  reportId: string
}) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!window.confirm(tr('admin.users.unsuspend_confirm'))) return
    setError(null)
    startTransition(async () => {
      const res = await unsuspendReportedUser(targetUserId, reportId)
      if (!res.success) setError(tr(res.error ?? 'common.error_generic'))
    })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-50 disabled:opacity-50"
      >
        {tr('admin.users.action_unsuspend')}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

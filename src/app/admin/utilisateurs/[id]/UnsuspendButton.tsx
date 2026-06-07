'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { unsuspendUser } from '../actions'

// Unsuspend = clear the suspended state via admin_unsuspend_user(uuid). Confirms
// first (destructive-ish state change), then calls the action. On success the action
// revalidates and the parent re-renders into the active state.
export function UnsuspendButton({ targetUserId }: { targetUserId: string }) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!window.confirm(tr('admin.users.unsuspend_confirm'))) return
    setError(null)
    startTransition(async () => {
      const res = await unsuspendUser(targetUserId)
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

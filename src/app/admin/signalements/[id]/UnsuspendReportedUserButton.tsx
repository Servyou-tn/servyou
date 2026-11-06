'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
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
      if (!res.success) setError(res.error ?? 'common.error_generic')
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" className="w-full" onClick={onClick} loading={pending}>
        {tr('admin.users.action_unsuspend')}
      </Button>
      {error && <p role="alert" className="text-body-sm text-danger-700">{tr(error)}</p>}
    </div>
  )
}

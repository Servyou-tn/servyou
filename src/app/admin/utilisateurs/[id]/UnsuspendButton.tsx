'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { unsuspendUser } from '../actions'

// Unsuspend = clear the suspended state via admin_unsuspend_user(uuid). Confirms first (a state change), then
// calls the action. On success the action revalidates and the parent re-renders into the active state. Restyled
// on the Button primitive for the J3 header (the slot « Suspendre » takes on an active account).
export function UnsuspendButton({ targetUserId }: { targetUserId: string }) {
  const lang = useLang()
  const [errorKey, setErrorKey] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!window.confirm(t('admin.users.unsuspend_confirm', lang))) return
    setErrorKey(null)
    startTransition(async () => {
      const res = await unsuspendUser(targetUserId)
      if (!res.success) setErrorKey(res.error ?? 'common.error_generic')
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="secondary" onClick={onClick} loading={pending}>
        {t('admin.users.action_unsuspend_short', lang)}
      </Button>
      {errorKey ? <p role="alert" className="text-body-sm text-danger-700">{t(errorKey, lang)}</p> : null}
    </div>
  )
}

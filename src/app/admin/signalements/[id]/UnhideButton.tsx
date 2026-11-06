'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { unhideContent, type ModerationTargetType } from '../actions'

// Unhide = clear the admin moderation marker and restore status='active' via
// admin_unhide_content(target_type, id). Confirms first (restores public visibility),
// then calls the action. On success the action revalidates and the parent re-renders
// into the active state (showing HideForm again). Mirrors UnsuspendButton.
export function UnhideButton({ targetType, targetId, reportId }: {
  targetType: ModerationTargetType
  targetId: string
  reportId: string
}) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onClick() {
    if (!window.confirm(tr('admin.moderation.unhide_confirm'))) return
    setError(null)
    startTransition(async () => {
      const res = await unhideContent(targetType, targetId, reportId)
      if (!res.success) setError(res.error ?? 'common.error_generic')
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" className="w-full" onClick={onClick} loading={pending}>
        {tr('admin.moderation.action_unhide')}
      </Button>
      {error && <p role="alert" className="text-body-sm text-danger-700">{tr(error)}</p>}
    </div>
  )
}

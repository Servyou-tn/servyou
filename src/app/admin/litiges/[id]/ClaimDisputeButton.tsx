'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { claimDispute } from '../actions'

// Claim = transition the dispute to 'under_review'. On benign failure (already
// claimed/closed, or RLS-blocked) the action returns an i18n error key which we
// translate inline. On success the action revalidates and the parent server
// component re-renders into the under_review state (claim button gone).
export function ClaimDisputeButton({ disputeId }: { disputeId: string }) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onClick() {
    setError(null)
    startTransition(async () => {
      const res = await claimDispute(disputeId)
      if (!res.success) setError(res.error ?? 'admin.disputes.error_claim_no_row')
    })
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="secondary" size="sm" onClick={onClick} loading={pending}>
        {tr('admin.disputes.action_claim')}
      </Button>
      {error && <p role="alert" className="text-body-sm text-danger-700">{tr(error)}</p>}
    </div>
  )
}

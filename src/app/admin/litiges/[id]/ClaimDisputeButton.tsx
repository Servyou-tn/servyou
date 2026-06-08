'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
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
      if (!res.success) setError(tr(res.error ?? 'admin.disputes.error_claim_no_row'))
    })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-50"
      >
        {tr('admin.disputes.action_claim')}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

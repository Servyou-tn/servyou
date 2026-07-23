'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { claimReport } from '../actions'

// Claim = transition the report to 'under_review'. On benign failure (already
// claimed/resolved, or RLS-blocked) the action returns an i18n error key which
// we translate inline. On success the action revalidates and the parent server
// component re-renders into the under_review state.
export function ClaimButton({ reportId }: { reportId: string }) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onClick() {
    setError(null)
    startTransition(async () => {
      const res = await claimReport(reportId)
      if (!res.success) setError(tr(res.error ?? 'admin.reports.error_already_claimed'))
    })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded border border-brand-blue-600 px-4 py-2 text-sm font-semibold text-brand-blue-700 transition-colors hover:bg-brand-blue-50 disabled:opacity-50"
      >
        {tr('admin.reports.action_claim')}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

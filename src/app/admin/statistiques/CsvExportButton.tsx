'use client'

import { useState, useTransition } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { generateCompletedOrdersCsv } from './actions'

// Triggers the admin-gated CSV server action and downloads the returned string as a
// file via a Blob + object URL (client-only APIs). Shows a loading label while the
// action runs and an inline error if it returns one.
export function CsvExportButton() {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onClick() {
    setError(null)
    startTransition(async () => {
      const res = await generateCompletedOrdersCsv()
      if ('error' in res) {
        setError(res.error === 'forbidden'
          ? tr('admin.statistiques.error_forbidden')
          : tr('common.error_generic'))
        return
      }
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    })
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {pending ? tr('admin.statistiques.csv_export_pending') : tr('admin.statistiques.csv_export_button')}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

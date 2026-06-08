'use client'

import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import type { DisputeRow } from '@/lib/types/dispute'

// Read-only display of a dispute on an order, shown to either party. Mirrors the
// admin status-pill colors (open=amber, under_review=blue, resolved=green,
// dismissed=grey). When closed (resolved/dismissed) it reveals the admin's decision:
// the outcome (for resolved) and the admin_note both parties see.
const STATUS_PILL: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700',
  under_review: 'bg-blue-50 text-blue-700',
  resolved: 'bg-green-50 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
}

function formatDate(value: string, lang: Lang): string {
  return new Date(value).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function DisputePanel({ dispute }: { dispute: DisputeRow | null }) {
  const lang = useLang()
  const tr = (key: string): string => t(key, lang)

  if (!dispute) return null
  const d = dispute
  const closed = d.status === 'resolved' || d.status === 'dismissed'

  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-700">{tr('dispute.section_title')}</h3>
        <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_PILL[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {tr('dispute.status_' + d.status)}
        </span>
      </div>

      <p className="text-sm text-gray-700">
        <span className="font-medium text-gray-500">{tr('dispute.field_reason')}: </span>
        {tr('dispute.reason_' + d.reason)}
      </p>
      {d.description && <p className="whitespace-pre-wrap text-sm text-gray-700">{d.description}</p>}
      <p className="text-xs text-gray-400">{tr('dispute.created_at_prefix')} {formatDate(d.created_at, lang)}</p>

      {closed && (
        <div className="space-y-1 rounded border border-gray-100 bg-gray-50 p-3">
          <p className="text-xs text-gray-400">{tr('dispute.closed_at_prefix')} {formatDate(d.updated_at, lang)}</p>
          {d.status === 'resolved' && d.outcome && (
            <p className="text-sm font-medium text-gray-700">{tr('dispute.outcome_' + d.outcome)}</p>
          )}
          {d.admin_note && (
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-gray-500">{tr('dispute.admin_note_label')}</p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">{d.admin_note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

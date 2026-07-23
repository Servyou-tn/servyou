import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { OrderLifecycleStepper } from '@/components/OrderLifecycleStepper'
import type { DisputeRow } from '@/lib/types/dispute'
import { ClaimDisputeButton } from './ClaimDisputeButton'
import { ResolveDisputeForm } from './ResolveDisputeForm'
import { DismissDisputeForm } from './DismissDisputeForm'

type Props = { params: Promise<{ id: string }> }

// The order is the dispute's evidence. Admin can read any order via the
// "Admin reads all orders" policy (migration 24). The stepper needs order_type;
// the explicit fields below surface received_at / cancellation context per spec §J.7.
type OrderContext = {
  id: string
  order_type: 'product' | 'service'
  status: string
  received_at: string | null
  cancelled_at: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
}

function formatDate(value: string, lang: Lang): string {
  return new Date(value).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700',
  under_review: 'bg-brand-blue-50 text-brand-blue-700',
  resolved: 'bg-green-50 text-green-700',
  dismissed: 'bg-gray-100 text-gray-600',
}

export default async function DisputeDetailPage({ params }: Props) {
  const { id } = await params
  const lang = await getLang()
  const tr = (key: string): string => t(key, lang)
  const supabase = await createClient()

  const { data: dispute, error } = await supabase
    .from('disputes')
    .select('id, order_id, created_by_role, reason, description, status, outcome, admin_note, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error) console.error('[admin/litiges/[id]] fetch error:', error)

  if (!dispute) {
    return (
      <div className="max-w-2xl space-y-4">
        <p className="text-sm text-gray-700">{tr('admin.disputes.error_not_found')}</p>
        <Link href="/admin/litiges" className="inline-block text-sm text-brand-blue-600 hover:underline">
          {tr('admin.disputes.back_to_queue')}
        </Link>
      </div>
    )
  }

  const d = dispute as DisputeRow

  // Order context — the evidence. maybeSingle: the FK cascades on delete, so a missing
  // order would mean the dispute is gone too; guard anyway.
  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .select('id, order_type, status, received_at, cancelled_at, cancelled_by, cancellation_reason')
    .eq('id', d.order_id)
    .maybeSingle()
  if (orderError) console.error('[admin/litiges/[id]] order context fetch error:', orderError)
  const order = (orderRow as OrderContext | null) ?? null

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/litiges" className="inline-block text-sm text-brand-blue-600 hover:underline">
        {tr('admin.disputes.back_to_queue')}
      </Link>

      <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">{tr('admin.disputes.section_info')}</h1>
          <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {tr('admin.disputes.status_' + d.status)}
          </span>
        </div>

        {/* Section 1 — dispute info */}
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-gray-500">{tr('admin.disputes.field_id')}</dt>
            <dd className="mt-1 font-mono text-xs text-gray-800">{d.id}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{tr('admin.disputes.field_order')}</dt>
            <dd className="mt-1 font-mono text-xs text-gray-800">{d.order_id}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{tr('admin.disputes.field_role')}</dt>
            <dd className="mt-1 text-gray-800">{tr('admin.disputes.role_' + d.created_by_role)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{tr('admin.disputes.field_reason')}</dt>
            <dd className="mt-1 text-gray-800">{tr('admin.disputes.reason_' + d.reason)}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{tr('admin.disputes.field_description')}</dt>
            <dd className="mt-1 whitespace-pre-wrap text-gray-800">{d.description ?? '—'}</dd>
          </div>
          <div>
            <dt className="font-medium text-gray-500">{tr('admin.disputes.field_created_at')}</dt>
            <dd className="mt-1 text-gray-800">{formatDate(d.created_at, lang)}</dd>
          </div>
        </dl>

        {/* Section 2 — order context (evidence) */}
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            {tr('admin.disputes.section_order_context')}
          </h2>
          {order === null ? (
            <p className="text-sm text-gray-500">—</p>
          ) : (
            <div className="space-y-4">
              <OrderLifecycleStepper
                status={order.status}
                order_type={order.order_type}
                cancelled_by={order.cancelled_by}
                cancellation_reason={order.cancellation_reason}
                received_at={order.received_at}
              />
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-gray-500">{tr('admin.disputes.field_order_status')}</dt>
                  <dd className="mt-1 text-gray-800">{tr('common.status_' + order.status)}</dd>
                </div>
                {order.received_at && (
                  <div>
                    <dt className="font-medium text-gray-500">{tr('admin.disputes.field_received_at')}</dt>
                    <dd className="mt-1 text-gray-800">{formatDate(order.received_at, lang)}</dd>
                  </div>
                )}
                {order.cancelled_at && (
                  <div>
                    <dt className="font-medium text-gray-500">{tr('admin.disputes.field_cancelled_at')}</dt>
                    <dd className="mt-1 text-gray-800">{formatDate(order.cancelled_at, lang)}</dd>
                  </div>
                )}
                {order.cancelled_by && (
                  <div>
                    <dt className="font-medium text-gray-500">{tr('admin.disputes.field_cancelled_by')}</dt>
                    <dd className="mt-1 text-gray-800">{tr('admin.disputes.role_' + order.cancelled_by)}</dd>
                  </div>
                )}
                {order.cancellation_reason && (
                  <div>
                    <dt className="font-medium text-gray-500">{tr('admin.disputes.field_cancellation_reason')}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-gray-800">{order.cancellation_reason}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Section 3 — actions / terminal state */}
        {d.status === 'resolved' ? (
          <div className="space-y-1 rounded border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">{tr('admin.disputes.resolved_header')}</p>
            <p className="text-sm text-gray-800">
              <span className="font-medium">{tr('admin.disputes.outcome_label')}:</span>{' '}
              {d.outcome ? tr('admin.disputes.outcome_' + d.outcome) : '—'}
            </p>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{d.admin_note}</p>
            <p className="text-xs text-gray-400">{formatDate(d.updated_at, lang)}</p>
          </div>
        ) : d.status === 'dismissed' ? (
          <div className="space-y-1 rounded border border-gray-200 bg-gray-50 p-4">
            <p className="text-sm font-medium text-gray-500">{tr('admin.disputes.dismissed_header')}</p>
            <p className="whitespace-pre-wrap text-sm text-gray-800">{d.admin_note}</p>
            <p className="text-xs text-gray-400">{formatDate(d.updated_at, lang)}</p>
          </div>
        ) : (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              {tr('admin.disputes.section_actions')}
            </h2>
            {d.status === 'open' && <ClaimDisputeButton disputeId={d.id} />}
            <ResolveDisputeForm disputeId={d.id} />
            <DismissDisputeForm disputeId={d.id} />
          </div>
        )}
      </div>
    </div>
  )
}

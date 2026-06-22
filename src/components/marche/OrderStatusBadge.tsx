// Brand-aware status pill for an order's lifecycle state. Pure presentational — the
// label text is resolved (i18n) by the caller and passed in. Color map per the spec:
// pending → slate, accepted/arrived → blue, prepared/dispatched/in_delivery → amber,
// received → green, cancelled → red.
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  accepted: 'bg-blue-100 text-blue-700',
  prepared: 'bg-amber-100 text-amber-700',
  dispatched: 'bg-amber-100 text-amber-700',
  in_delivery: 'bg-amber-100 text-amber-700',
  arrived: 'bg-blue-100 text-blue-700',
  received: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

export function OrderStatusBadge({ status, label }: { status: string; label: string }) {
  const cls = STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

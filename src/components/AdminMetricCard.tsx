// Presentational metric card for the admin overview grid. No hooks, no
// data fetching — the label arrives already translated from the page, and
// the value defaults to '—' (PR-I1 ships placeholders; PR-I-stats wires
// the real numbers via the admin_overview_stats() RPC).

type Props = {
  label: string
  value?: string
}

export function AdminMetricCard({ label, value = '—' }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-800">{value}</p>
    </div>
  )
}

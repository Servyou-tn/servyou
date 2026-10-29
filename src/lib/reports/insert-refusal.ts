// The two expected refusals of a `reports` insert (db/migrations/20261029183540_reports_anti_abuse.sql), shared by the
// three report actions (boutique/[id], freelance/[id], actions/listing-reports). Anything else stays the generic
// error: only these two are the user's own doing and safe to explain.
//
//   • 23505 on reports_one_open_per_reporter_target: this reporter already has an open / under-review report on
//     this target. Matched on the index name (the ma-boutique/creer `shops_owner_id_key` precedent), not on the
//     bare code, so a future unique constraint on the table cannot borrow the message.
//   • hint 'rate_limited' (enforce_report_rate_limit, 23514): 10 reports in the last 24 h.

export const REPORTS_DEDUPE_INDEX = 'reports_one_open_per_reporter_target'

export type ReportInsertRefusalKey = 'report.already_reported' | 'report.rate_limited'

export function reportInsertRefusalKey(error: {
  code?: string | null
  message?: string | null
  hint?: string | null
}): ReportInsertRefusalKey | null {
  if (error.code === '23505' && (error.message ?? '').includes(REPORTS_DEDUPE_INDEX)) return 'report.already_reported'
  if (error.code === '23514' && error.hint === 'rate_limited') return 'report.rate_limited'
  return null
}

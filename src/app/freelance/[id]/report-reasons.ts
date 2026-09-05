// Shared between actions.ts ('use server') and FreelancerReportModal.tsx (client). MUST live
// outside the 'use server' file — same reason as boutique/[id]/report-reasons.ts: Next's
// server-actions bundler only supports async-function exports from a 'use server' module.

export const FREELANCER_REPORT_REASONS = ['fake_scam', 'offensive', 'other'] as const
export type FreelancerReportReason = (typeof FREELANCER_REPORT_REASONS)[number]

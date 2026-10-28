// « Signaler ce produit / ce service » — Figma 563:39705 (D1 modal; D2 uses the same modal with « service »).
//
// Shared by the server action (app/actions/listing-reports.ts, 'use server') and the client modal
// (components/report/ReportListingModal.tsx). They MUST live outside the 'use server' file: a plain const
// array exported from a 'use server' module silently stops being an array when a Client Component imports it
// (the lesson recorded in app/boutique/[id]/report-reasons.ts).

export const LISTING_REPORT_KINDS = ['product', 'service'] as const
export type ListingReportKind = (typeof LISTING_REPORT_KINDS)[number]

// ALL FOUR values of the `reports.reason` CHECK. The shop and freelancer modals leave out 'wrong_category' (a
// listing-shape concept — « filed under the wrong category » — that does not apply to a whole shop or profile);
// a product or a service IS a listing, so it applies here.
export const LISTING_REPORT_REASONS = ['fake_scam', 'offensive', 'wrong_category', 'other'] as const
export type ListingReportReason = (typeof LISTING_REPORT_REASONS)[number]

export const LISTING_REPORT_DESCRIPTION_MAX = 500

// `reports.target_type` value and the public detail route per kind (used for the sign-in `?next=`).
export const LISTING_REPORT_TARGET_TYPE: Record<ListingReportKind, 'product' | 'service'> = {
  product: 'product',
  service: 'service',
}

export function listingReportNextPath(kind: ListingReportKind, id: string): string {
  return kind === 'product' ? `/produits/${id}` : `/services/${id}`
}

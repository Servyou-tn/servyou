// Shared between actions.ts ('use server') and ShopReportModal.tsx (client). MUST live outside
// the 'use server' file: Next's server-actions bundler only supports async-function exports from
// a 'use server' module — a plain const array (SHOP_REPORT_REASONS) imported from actions.ts into
// a Client Component silently turns into a non-array at runtime, crashing ShopReportModal's
// `.map()` the moment a signed-in visitor opens the form (caught live via CDP click-through, not
// by the mocked unit tests or the build/tsc gate — neither exercises the real server-actions
// bundling transform).

export const SHOP_REPORT_REASONS = ['fake_scam', 'offensive', 'other'] as const
export type ShopReportReason = (typeof SHOP_REPORT_REASONS)[number]

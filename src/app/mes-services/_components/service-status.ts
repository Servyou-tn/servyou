import { t, type Lang } from '@/lib/i18n'

// A service's status as H5 draws it — shared by the list row and the H7 edit header, so the pill a
// freelancer sees before opening a service is the pill on the page it opens.

function assertNever(x: never): never {
  throw new Error(`service-status: unhandled status ${JSON.stringify(x)}`)
}

// Exhaustive over service_listings.status ('active' | 'hidden' | 'draft') — a switch, not a
// ternary chain, so a future 4th status fails at assertNever (compile time) instead of silently
// falling through to whichever branch a ternary's `else` happened to catch. The 'draft' case is
// unreachable on H5 in practice: getSellerServices excludes drafts from every H5 tab (founder ruling —
// H5 must not be the surface that first makes an unpublished draft visible; making one resumable is
// H6's job, see docs/follow-ups.md). Handled here anyway so the switch stays compiler-exhaustive
// rather than comment-exhaustive the moment that upstream filter ever changes.
export function getStatusPresentation(
  service: { status: 'active' | 'hidden' | 'draft'; adminHiddenAt: string | null },
  lang: Lang,
): { isActive: boolean; pillStatus: 'active' | 'moderated' | 'paused' | 'draft'; pillLabel: string } {
  switch (service.status) {
    case 'active':
      return { isActive: true, pillStatus: 'active', pillLabel: t('common.status_active', lang) }
    case 'hidden':
      return service.adminHiddenAt != null
        ? { isActive: false, pillStatus: 'moderated', pillLabel: t('service.status_moderated', lang) }
        : { isActive: false, pillStatus: 'paused', pillLabel: t('service.status_paused', lang) }
    case 'draft':
      return { isActive: false, pillStatus: 'draft', pillLabel: t('service.status_draft', lang) }
    default:
      return assertNever(service.status)
  }
}

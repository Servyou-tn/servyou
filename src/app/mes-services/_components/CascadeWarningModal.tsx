'use client'

import { t, type Lang } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

// Founder ruling: the is_published CASCADE modal. Fires ONLY when pausing/deleting THIS row would
// leave the freelancer with zero active listings (ServiceRow.tsx's `isLastActive` check) — never
// on an ordinary pause. `sync_freelancer_is_published` flips `freelancer_profiles.is_published` to
// false the instant the freelancer's last `status='active'` service_listings row changes, which
// 404s their public profile (D4) — H7's own measured copy for both pause and delete talks only
// about search visibility for the one listing, never this. This modal is the correction.
//
// Same shell as DeleteServiceModal (centered overlay, rounded card, title/body/footer) — but no
// typed confirmation: confirming a pause calls the toggle directly; confirming a delete transitions
// to DeleteServiceModal's own typed-confirm step, it does not delete by itself.
export function CascadeWarningModal({
  variant,
  lang,
  pending,
  onCancel,
  onConfirm,
}: {
  variant: 'pause' | 'delete'
  lang: Lang
  pending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const body = t(`service.cascade_modal.${variant}_body`, lang)
  const confirmLabel = t(`service.cascade_modal.${variant}_confirm`, lang)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('service.cascade_modal.title', lang)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-scrim p-4"
    >
      <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-xl bg-surface-base p-6">
        <div className="flex flex-col gap-1.5">
          <p className="text-body font-semibold text-text-primary">
            {t('service.cascade_modal.title', lang)}
          </p>
          {/* Founder-dictated copy, rendered verbatim — the service isn't named in it, by design:
              the modal only ever fires for the freelancer's OWN last active listing, so "this
              service" reads unambiguously without it. */}
          <p className="text-body-sm text-text-secondary">{body}</p>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={pending}>
            {t('common.cancel', lang)}
          </Button>
          <Button variant="danger" size="md" loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

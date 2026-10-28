'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { createListingReportAction } from '@/app/actions/listing-reports'
import {
  LISTING_REPORT_DESCRIPTION_MAX,
  LISTING_REPORT_REASONS,
  listingReportNextPath,
  type ListingReportKind,
  type ListingReportReason,
} from '@/lib/reports/listing-report'

// « Signaler ce produit / ce service » — Figma 563:39705 (480 wide, r16, header 24/24/16/24 with a 20/Semi Bold
// title + close, body gap 16 — subtitle, required « Motif » select, optional « Description » — and a surface-subtle
// footer with a ghost « Annuler » + a danger submit). Same content and look as ShopReportModal /
// FreelancerReportModal; their markup is repeated by now (this is the third and fourth use), so this one is the
// shared component — those two are left untouched (once built stays built) and logged to migrate.
//
// Built on the native <dialog>: showModal() gives the focus trap, Escape-to-close, inert background and focus
// restoration to the trigger — none of which the two older hand-rolled modals have.
//
// AUTH — both detail pages are public and usually reached logged out. The trigger sends a logged-out visitor to
// /connexion?next=<the page> instead of opening a form whose submit could only fail (`isLoggedIn` comes from the
// page's own server fetch). The server action re-checks the session regardless.

export function ReportListingModal({
  kind,
  targetId,
  targetName,
  isLoggedIn,
}: {
  kind: ListingReportKind
  targetId: string
  targetName: string
  isLoggedIn: boolean
}) {
  const lang = useLang()
  const router = useRouter()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState<ListingReportReason | ''>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = !submitting && reason !== ''

  function open() {
    if (!isLoggedIn) {
      router.push(`/connexion?next=${encodeURIComponent(listingReportNextPath(kind, targetId))}`)
      return
    }
    dialogRef.current?.showModal()
  }

  // Resets the form on EVERY way out (button, Escape, backdrop) — it is wired to the dialog's own close event.
  function reset() {
    setReason('')
    setDescription('')
    setSubmitting(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    const res = await createListingReportAction({ kind, targetId, reason, description })
    if (!res.ok) {
      toast.error(res.error)
      setSubmitting(false)
      return
    }
    toast.success(t(`report.${kind}.success`, lang))
    dialogRef.current?.close()
  }

  const fieldClass = `w-full rounded-lg border border-border-strong bg-surface-base text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`

  return (
    <>
      <button
        type="button"
        onClick={open}
        // 21px of text; -my-3 py-3 grows the tap area to 45px without moving the layout (the ≥44px mobile rule).
        className={`-my-3 rounded-md py-3 text-body-sm text-text-muted transition-colors hover:text-text-secondary ${FOCUS_RING}`}
      >
        {t(kind === 'product' ? 'product.detail.report' : 'serviceDetail.report', lang)}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={`report-${kind}-title`}
        onClose={reset}
        // A click on the backdrop lands on the <dialog> itself (it has no padding; the form fills it).
        onClick={(e) => {
          if (e.target === e.currentTarget && !submitting) e.currentTarget.close()
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-[480px] overflow-hidden rounded-2xl bg-surface-base p-0 text-text-primary shadow-lg backdrop:bg-black/40"
      >
        <form onSubmit={submit}>
          <div className="flex items-center justify-between px-6 pb-4 pt-6">
            <h2 id={`report-${kind}-title`} className="text-xl font-semibold leading-[26px] text-text-primary">
              {t(`report.${kind}.title`, lang)}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={t('report.listing.close', lang)}
              className={`rounded-md p-1 text-text-muted transition-colors hover:text-text-primary ${FOCUS_RING}`}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col gap-4 px-6 pb-6">
            <p className="text-body-sm leading-[21px] text-text-secondary">
              {t(`report.${kind}.subtitle`, lang, { name: targetName })}
            </p>

            <div className="flex flex-col gap-2">
              <label htmlFor={`report-${kind}-reason`} className="flex items-center gap-0.5 text-body-sm font-medium text-text-secondary">
                {t('report.listing.reason_label', lang)}
                <span className="text-danger-500" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                id={`report-${kind}-reason`}
                value={reason}
                onChange={(e) => setReason(e.target.value as ListingReportReason | '')}
                required
                // showModal() focuses the first focusable element by default (the close button); the reason is
                // the first FIELD, which is where the user is about to act.
                autoFocus
                className={`h-11 px-4 ${fieldClass}`}
              >
                <option value="">{t('report.listing.reason_placeholder', lang)}</option>
                {LISTING_REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {t(`report.listing.reason_${r}`, lang)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor={`report-${kind}-description`} className="text-body-sm font-medium text-text-secondary">
                {t('report.listing.description_label', lang)}
              </label>
              <textarea
                id={`report-${kind}-description`}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('report.listing.description_placeholder', lang)}
                rows={4}
                maxLength={LISTING_REPORT_DESCRIPTION_MAX}
                className={`px-4 py-3 ${fieldClass}`}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 bg-surface-subtle px-6 pb-6 pt-4">
            <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()} disabled={submitting}>
              {t('report.listing.cancel', lang)}
            </Button>
            <Button type="submit" variant="danger" loading={submitting} disabled={reason === ''}>
              {t(`report.${kind}.submit`, lang)}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  )
}

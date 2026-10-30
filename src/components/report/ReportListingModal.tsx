'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FOCUS_RING } from '@/components/layout/styles'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { createListingReportAction } from '@/app/actions/listing-reports'
import { Turnstile, type TurnstileHandle } from '@/components/security/Turnstile'
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
// restoration to the trigger — none of which the two older hand-rolled modals have. What the element does NOT do,
// handled below: focus the first FIELD (it focuses the close button), lock page scroll, scroll its own content on a
// short viewport, and tell a backdrop CLICK from a drag that merely ended there.
//
// ERRORS ARE INLINE, not toasts: a modal dialog and its ::backdrop paint above everything (sonner included, which
// is also inert while the dialog is open), so a toast fired while it is open would sit dimmed under the scrim. Only
// the success toast is used — it fires as the dialog closes.
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
  const uid = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const turnstile = useRef<TurnstileHandle>(null)
  // True only when the press STARTED on the backdrop — see the dialog's onMouseDown / onClick.
  const pressStartedOnBackdrop = useRef(false)
  const [reason, setReason] = useState<ListingReportReason | ''>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = !submitting && reason !== ''

  // showModal() does not lock the page behind the scrim; mirror the repo's other modals (ModalShell). If the
  // component unmounts while the dialog is open (a route change), the lock must not outlive it.
  useEffect(() => {
    const dialog = dialogRef.current
    return () => {
      if (dialog?.open) document.body.style.overflow = ''
    }
  }, [])

  function open() {
    if (!isLoggedIn) {
      router.push(`/connexion?next=${encodeURIComponent(listingReportNextPath(kind, targetId))}`)
      return
    }
    dialogRef.current?.showModal()
    document.body.style.overflow = 'hidden'
    // showModal() focuses the first focusable element (the close button); the reason is the first FIELD, where the
    // user is about to act. An `autofocus` attribute is not reliable here — React only emits it on first render.
    selectRef.current?.focus()
  }

  // Wired to the dialog's own close event, so it runs on EVERY way out — buttons, Escape, backdrop, success.
  function reset() {
    document.body.style.overflow = ''
    setReason('')
    setDescription('')
    setError(null)
    setSubmitting(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    const turnstileToken = await turnstile.current?.getToken()
    const res = await createListingReportAction({ kind, targetId, reason, description }, turnstileToken)
    if (!res.ok) {
      setError(res.error)
      setSubmitting(false)
      return
    }
    toast.success(t(`report.${kind}.success`, lang))
    dialogRef.current?.close()
  }

  const fieldClass = `w-full rounded-lg border border-border-strong bg-surface-base text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`
  const titleId = `${uid}-title`
  const reasonId = `${uid}-reason`
  const descriptionId = `${uid}-description`
  const errorId = `${uid}-error`

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
        aria-labelledby={titleId}
        onClose={reset}
        // Escape while the request is in flight would close + reset the form, then a success toast would fire after
        // the user "cancelled". Keep the dialog until the action answers.
        onCancel={(e) => {
          if (submitting) e.preventDefault()
        }}
        // A backdrop click lands on the <dialog> itself (it has no padding; the form fills it). But a text-selection
        // drag that starts in the textarea and ends on the backdrop ALSO fires `click` on the dialog — so close only
        // when the press STARTED there too, or a mis-drag near the edge wipes what the user typed.
        onMouseDown={(e) => {
          pressStartedOnBackdrop.current = e.target === e.currentTarget
        }}
        onClick={(e) => {
          if (pressStartedOnBackdrop.current && e.target === e.currentTarget && !submitting) e.currentTarget.close()
        }}
        // max-h + overflow-y-auto: the UA caps a modal dialog at the viewport, and ~470px of form does not fit a
        // phone in landscape — without scrolling the footer (the submit button) would be clipped and unreachable.
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[480px] overflow-y-auto rounded-2xl bg-surface-base p-0 text-text-primary shadow-lg backdrop:bg-overlay-scrim"
      >
        <form onSubmit={submit}>
          <div className="flex items-center justify-between px-6 pb-4 pt-6">
            <h2 id={titleId} className="text-xl font-semibold leading-[26px] text-text-primary">
              {t(`report.${kind}.title`, lang)}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              disabled={submitting}
              aria-label={t('report.listing.close', lang)}
              className={`rounded-md p-1 text-text-muted transition-colors hover:text-text-primary disabled:opacity-50 ${FOCUS_RING}`}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col gap-4 px-6 pb-6">
            <p className="text-body-sm leading-[21px] text-text-secondary">
              {t(`report.${kind}.subtitle`, lang, { name: targetName })}
            </p>

            <div className="flex flex-col gap-2">
              <label htmlFor={reasonId} className="flex items-center gap-0.5 text-body-sm font-medium text-text-secondary">
                {t('report.listing.reason_label', lang)}
                <span className="text-danger-500" aria-hidden="true">
                  *
                </span>
              </label>
              <select
                ref={selectRef}
                id={reasonId}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value as ListingReportReason | '')
                  setError(null)
                }}
                required
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
              <label htmlFor={descriptionId} className="text-body-sm font-medium text-text-secondary">
                {t('report.listing.description_label', lang)}
              </label>
              <textarea
                id={descriptionId}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value)
                  setError(null)
                }}
                placeholder={t('report.listing.description_placeholder', lang)}
                rows={4}
                maxLength={LISTING_REPORT_DESCRIPTION_MAX}
                className={`px-4 py-3 ${fieldClass}`}
              />
            </div>

            {error && (
              <p id={errorId} role="alert" className="text-sm text-danger-500">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 bg-surface-subtle px-6 pb-6 pt-4">
            <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()} disabled={submitting}>
              {t('report.listing.cancel', lang)}
            </Button>
            <Turnstile ref={turnstile} action="report_listing" />
            <Button type="submit" variant="danger" loading={submitting} disabled={reason === ''}>
              {t(`report.${kind}.submit`, lang)}
            </Button>
          </div>
        </form>
      </dialog>
    </>
  )
}

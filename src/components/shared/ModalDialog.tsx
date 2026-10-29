'use client'

import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { FOCUS_RING } from '@/components/layout/styles'

// The order-flow modal shell — Figma E4 1475:25765 (« Annuler cette commande ? ») and 1475:25807 (« Signaler un
// problème »): 480 wide, r16, header pad 24/24/16/24 (20 Semi Bold title + close), a gap-16 body, a surface-subtle
// footer pad 16/24/24/24.
//
// A CONTROLLED wrapper over the native <dialog>: the parent owns `open`, this opens it with showModal() (focus trap,
// Escape, inert background, focus restored to the trigger) and reports every way out through `onClose`. It carries the
// four things the element does NOT do on its own, each learned the hard way in PR #230 (ReportListingModal):
//   • it focuses the first FIELD, not the close button;
//   • it locks page scroll while open (and releases it if the component unmounts mid-flight);
//   • it scrolls its own content on a short viewport (a phone in landscape) instead of clipping the footer;
//   • a backdrop click closes it only when the press STARTED on the backdrop — a text-selection drag that begins in a
//     field and ends outside must not wipe what the user typed.
// `busy` freezes every way out (Escape, backdrop, close button) while a request is in flight.
//
// ReportListingModal (components/report) still carries its own copy of this logic; moving it onto this shell is logged.

export function ModalDialog({
  open,
  onClose,
  title,
  closeLabel,
  busy = false,
  onSubmit,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  /** Accessible name of the × button. */
  closeLabel: string
  busy?: boolean
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
  footer: ReactNode
  children: ReactNode
}) {
  const uid = useId()
  const titleId = `${uid}-title`
  const dialogRef = useRef<HTMLDialogElement>(null)
  const pressStartedOnBackdrop = useRef(false)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    // Where focus was before the dialog took it — the footer buttons and a successful submit hand control back to the parent,
    // which unmounts a STILL-OPEN dialog, so the browser's own focus restoration (close()) never runs on those paths.
    const previouslyFocused = document.activeElement as HTMLElement | null
    if (open) {
      if (!dialog.open) dialog.showModal()
      // Applied whenever open, not only on the first open: React Strict Mode runs effect → cleanup → effect in dev, and the
      // second run finds the dialog already open.
      document.body.style.overflow = 'hidden'
      // showModal() focuses the first focusable element (the close button); the first field is where the user acts.
      dialog.querySelector<HTMLElement>('select, textarea, input')?.focus()
    } else if (dialog.open) {
      dialog.close()
    }
    return () => {
      // Closed or unmounted (a route change, a footer button): the scroll lock must not outlive the dialog.
      document.body.style.overflow = ''
      if (open && previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      // Fires on EVERY way out (button, Escape, backdrop, programmatic close) — the parent resets its state here.
      onClose={() => {
        // Chrome closes on a SECOND Escape even though `cancel` was prevented: while a request is in flight, reopen.
        if (busy) {
          dialogRef.current?.showModal()
          return
        }
        document.body.style.overflow = ''
        onClose()
      }}
      // Escape while the request is in flight would close + reset the form after the action had already run.
      onCancel={(e) => {
        if (busy) e.preventDefault()
      }}
      onMouseDown={(e) => {
        pressStartedOnBackdrop.current = e.target === e.currentTarget
      }}
      onClick={(e) => {
        if (pressStartedOnBackdrop.current && e.target === e.currentTarget && !busy) e.currentTarget.close()
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[480px] overflow-y-auto rounded-2xl bg-surface-base p-0 text-text-primary shadow-lg backdrop:bg-overlay-scrim"
    >
      <form onSubmit={onSubmit}>
        <div className="flex items-center justify-between px-6 pb-4 pt-6">
          <h2 id={titleId} className="text-xl font-semibold leading-[26px] text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            disabled={busy}
            aria-label={closeLabel}
            className={`rounded-md p-1 text-text-muted transition-colors hover:text-text-primary disabled:opacity-50 ${FOCUS_RING}`}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-6 pb-6">{children}</div>
        <div className="flex items-center justify-end gap-3 bg-surface-subtle px-6 pb-6 pt-4">{footer}</div>
      </form>
    </dialog>
  )
}

// The select / textarea look shared by the two order dialogs (Figma: r10, border/strong 1px, surface/base).
export const MODAL_FIELD_CLASS = `w-full rounded-lg border border-border-strong bg-surface-base text-base text-text-primary outline-none transition-colors focus:border-brand-blue-600 ${FOCUS_RING}`

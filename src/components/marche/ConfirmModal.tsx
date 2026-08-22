'use client'

import { useEffect, useRef } from 'react'
import { Button, type ButtonVariant } from '@/components/ui/button'

// Shared confirm-modal a11y wiring for AnnonceDetail's two destructive-adjacent actions (Close,
// Delete). Before PR-E, only Delete was a real modal, and even that one had no true Tab-cycling —
// initial-focus + Escape + scroll-lock only; Close was a bespoke inline two-step confirm with NONE
// of that wiring. This component is new: a real focus trap (Tab/Shift+Tab cycle between Cancel and
// Confirm), Escape-to-close, scroll-lock, focus restored to the opener on close — verified by
// behaviour test, not just visually (src/__tests__/confirm-modal.test.tsx). Route-local (marche/)
// per the standing rule: this is its first two consumers, not yet a third feature, so it does not
// move to components/ui.
//
// No typed keyword on either caller: closing is reversible (Reopen exists, gated by
// lib/marche/annonce-status.ts's own expiry check), and deleting an annonce is lower-consequence
// than DeleteProductModal's typed-confirm case — that one exists specifically for a product WITH
// order history, which an annonce delete has no equivalent of (job_responses rows are preserved by
// the soft-delete, not orphaned).
export function ConfirmModal({
  titleId,
  title,
  body,
  cancelLabel,
  confirmLabel,
  confirmVariant = 'danger',
  pending = false,
  onCancel,
  onConfirm,
}: {
  titleId: string
  title: string
  body: string
  cancelLabel: string
  confirmLabel: string
  confirmVariant?: ButtonVariant
  pending?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  // Button (components/ui/button.tsx) is not ref-forwarding, so focus lands on the dialog
  // container itself (tabIndex={-1}, the standard WAI-ARIA fallback when no single control is the
  // obvious default) rather than a specific button inside it.
  const dialogRef = useRef<HTMLDivElement>(null)

  // Scroll lock + focus into the dialog, restored to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    return () => {
      document.body.style.overflow = ''
      opener?.focus?.()
    }
  }, [])

  // Escape-to-close + a real Tab/Shift+Tab trap. Cancel and Confirm are the only two focusable
  // descendants (the dialog container itself is tabIndex={-1}, deliberately outside the tab
  // sequence — see the effect above), so cycling between exactly those two covers every case that
  // matters here: past the last wraps to the first, back past the first wraps to the last. Landing
  // on Cancel/Confirm the FIRST time (from the dialog container, right after mount) already works
  // via the browser's own default Tab behaviour and needs no interception.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) {
        onCancel()
        return
      }
      if (e.key !== 'Tab') return
      const dialog = dialogRef.current
      if (!dialog) return
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [pending, onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay-scrim" onClick={() => !pending && onCancel()} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-2xl bg-surface-base p-6 shadow-xl outline-none"
      >
        <h2 id={titleId} className="text-h3 text-text-primary">
          {title}
        </h2>
        <p className="mt-2 text-body-sm text-text-muted">{body}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" size="md" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} size="md" loading={pending} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useRef } from 'react'
import { Button, type ButtonVariant } from '@/components/ui/button'

// Shared confirm-modal a11y wiring for AnnonceDetail's two destructive-adjacent actions (Close,
// Delete). Before PR-E, only Delete was a real modal (focus-trap-lite, Escape-to-close,
// scroll-lock); Close was a bespoke inline two-step confirm with none of that wiring — two
// different confirmation UIs on one page. Route-local (marche/) per the standing rule: this is
// its first two consumers, not yet a third feature, so it does not move to components/ui.
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onCancel()
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

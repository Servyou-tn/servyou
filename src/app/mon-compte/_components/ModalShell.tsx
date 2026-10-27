'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// Dialog frame for the two /mon-compte modals (change password, delete account): scrim + card,
// scroll lock, Escape, a real Tab/Shift+Tab trap, focus restored to the opener — the same wiring as
// marche/ConfirmModal, which cannot host form fields (its body is a plain string). Route-local: two
// consumers, both on this page.
export function ModalShell({
  titleId,
  title,
  busy = false,
  onClose,
  children,
}: {
  titleId: string
  title: string
  busy?: boolean
  onClose: () => void
  children: ReactNode
}) {
  const dialogRef = useRef<HTMLDivElement>(null)

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
      if (e.key === 'Escape' && !busy) {
        onClose()
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
      if (e.shiftKey && (active === first || active === dialog)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [busy, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-overlay-scrim" onClick={() => !busy && onClose()} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-md flex-col gap-4 overflow-y-auto rounded-2xl bg-surface-base p-6 shadow-xl outline-none"
      >
        <h2 id={titleId} className="text-h3 text-text-primary">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

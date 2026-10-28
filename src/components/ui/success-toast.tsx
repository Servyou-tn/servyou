'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, X } from 'lucide-react'

// Toast / kind=success — Figma 424:17492 (380px card, surface/base, border-subtle, r12). Row: 20px
// success/500 check · message 14/Regular text/primary · 16px close (text/muted), 16px padding, gap 12. Under
// it a 2px progress track (success/100) whose fill (success/500) runs out over the 4s auto-dismiss — the
// frame's own motion note (« Auto-dismiss 4s »). The action slot (hidden in the frame) is not built.
//
// Rendered through sonner's toast.custom so it shares the root <Toaster> (position, stacking, swipe, timer)
// with every other toast; sonner owns the dismissal, the bar is only a picture of its clock.

export const SUCCESS_TOAST_MS = 4000

function SuccessToast({ id, message, closeLabel }: { id: string | number; message: string; closeLabel: string }) {
  // Mount full, then drain: a CSS transition (no keyframes in globals.css) from 100% to 0%. With
  // prefers-reduced-motion the bar is not drawn at all — a frozen full bar would misstate the timer.
  const [drained, setDrained] = useState(false)
  // Read once at mount (this only ever renders client-side, inside sonner's portal — no hydration pass).
  // `?.` so a jsdom test or a Storybook story (no matchMedia) renders the bar instead of throwing.
  const [reducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true)
  useEffect(() => {
    if (reducedMotion) return
    const raf = requestAnimationFrame(() => setDrained(true))
    return () => cancelAnimationFrame(raf)
  }, [reducedMotion])

  return (
    // No role: sonner's <section aria-live="polite"> already announces it; a nested live region can read twice.
    <div className="w-full overflow-hidden rounded-xl border border-border-subtle bg-surface-base shadow-lg">
      <div className="flex items-center gap-3 p-4">
        <CheckCircle2 className="size-5 shrink-0 text-success-500" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-body-sm text-text-primary">{message}</p>
        <button
          type="button"
          onClick={() => toast.dismiss(id)}
          aria-label={closeLabel}
          className="shrink-0 rounded text-text-muted hover:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue-600"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {!reducedMotion && (
        <div className="h-0.5 w-full bg-success-100" aria-hidden="true">
          <div
            className="h-full origin-left bg-success-500 transition-transform ease-linear rtl:origin-right"
            style={{ transform: `scaleX(${drained ? 0 : 1})`, transitionDuration: `${SUCCESS_TOAST_MS}ms` }}
          />
        </div>
      )}
    </div>
  )
}

export function showSuccessToast(message: string, closeLabel: string) {
  // Width = the root toaster's own --width (356px), NOT the frame's 380. A custom toast has no width of its own (it
  // shrink-wraps its text) and sonner only offsets left/right toasts, so any width other than the centre container's
  // sits flush with its start edge and renders off-centre (380 → +12px, shrink-wrap → −11px). Matching 380 means
  // changing <Toaster>'s --width for every toast — logged in docs/follow-ups/parametres-tabs-b1.md.
  toast.custom((id) => <SuccessToast id={id} message={message} closeLabel={closeLabel} />, {
    duration: SUCCESS_TOAST_MS,
    style: { width: 'var(--width)' },
  })
}

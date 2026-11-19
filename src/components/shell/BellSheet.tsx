'use client'

import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'

// The bell's mobile bottom sheet (< 1024) — Figma m375-fr / m375-en / m375-ar / m375-fr-empty (1778:32602 …). Mounted only
// while open. A native <dialog> opened with showModal(), the app's modal pattern (src/components/shared/ModalDialog.tsx):
// focus trap, Escape, an inert page behind it, and focus back on the bell when it closes. On top of the element:
//   • the page does not scroll behind it, and the lock is released however the sheet goes away (✕, Escape, the scrim, an
//     item that navigates, a route change that unmounts the shell);
//   • a tap on the scrim closes it — only a press that STARTED above the sheet, so a drag that ends there does not;
//   • a swipe down on the handle / header closes it past 80 px, and springs back under that (no spring under reduced
//     motion). Touch only: a mouse has ✕, the scrim and Escape.
// Every way out ends in the dialog's `close` event → onClose.

const SWIPE_CLOSE_PX = 80

export function BellSheet({
  labelledBy,
  onClose,
  header,
  children,
}: {
  labelledBy: string
  onClose: () => void
  /** The grabber + header: the swipe zone. */
  header: ReactNode
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const pressStartedOnScrim = useRef(false)
  const touchStart = useRef<number | null>(null)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
      if (dialog.open) dialog.close()
    }
  }, [])

  const aboveSheet = (clientY: number) => clientY < (ref.current?.getBoundingClientRect().top ?? 0)

  function onTouchStart(e: TouchEvent) {
    touchStart.current = e.touches[0]?.clientY ?? null
    setDragging(true)
  }
  function onTouchMove(e: TouchEvent) {
    if (touchStart.current === null) return
    setDrag(Math.max(0, (e.touches[0]?.clientY ?? touchStart.current) - touchStart.current))
  }
  function onTouchEnd() {
    touchStart.current = null
    setDragging(false)
    if (drag > SWIPE_CLOSE_PX) ref.current?.close()
    else setDrag(0)
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onMouseDown={(e) => {
        pressStartedOnScrim.current = e.target === e.currentTarget && aboveSheet(e.clientY)
      }}
      onClick={(e) => {
        if (pressStartedOnScrim.current && e.target === e.currentTarget && aboveSheet(e.clientY)) e.currentTarget.close()
      }}
      style={drag > 0 ? { transform: `translateY(${drag}px)` } : undefined}
      className={`m-0 mt-auto hidden max-h-[85dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[20px] bg-surface-base p-0 pb-6 text-text-primary backdrop:bg-text-primary/45 open:flex motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-200 ${
        dragging ? '' : 'motion-safe:transition-transform'
      }`}
    >
      <div className="shrink-0 touch-none" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} onTouchCancel={onTouchEnd}>
        <div className="flex justify-center pb-1 pt-2" aria-hidden="true">
          <span className="h-1 w-9 rounded-sm bg-border-strong" />
        </div>
        {header}
      </div>
      {children}
    </dialog>
  )
}

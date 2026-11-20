'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject, type TouchEvent } from 'react'

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
  returnFocusTo,
  header,
  children,
}: {
  labelledBy: string
  onClose: () => void
  /** The bell: focus goes back to it however the sheet closes (a click does not focus a button in every browser). */
  returnFocusTo: RefObject<HTMLElement | null>
  /** The grabber + header: the swipe zone. */
  header: ReactNode
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const pressStartedOnScrim = useRef(false)
  const touchStart = useRef<number | null>(null)
  // The latest offset, for touchend: a fast flick can end before the last touchmove's re-render lands in `drag`.
  const dragNow = useRef(0)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // The bell stays mounted while the sheet is open (it is the sheet's trigger): read it once, for the cleanup.
    const bell = returnFocusTo.current
    if (!dialog.open) dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      // Never close() here (ModalDialog's rule): close() queues a `close` event, and under Strict Mode's re-run that
      // event lands after the sheet re-opened and closes it for good. Unmounting takes the dialog out of the top layer.
      // Focus goes back by hand: the browser only restores it on close(), and ✕ or an item unmounts a still-open sheet.
      document.body.style.overflow = ''
      if (bell?.isConnected) bell.focus()
    }
  }, [returnFocusTo])

  const aboveSheet = (clientY: number) => clientY < (ref.current?.getBoundingClientRect().top ?? 0)

  function setOffset(px: number) {
    dragNow.current = px
    setDrag(px)
  }
  function onTouchStart(e: TouchEvent) {
    touchStart.current = e.touches[0]?.clientY ?? null
    setDragging(true)
  }
  function onTouchMove(e: TouchEvent) {
    if (touchStart.current === null) return
    setOffset(Math.max(0, (e.touches[0]?.clientY ?? touchStart.current) - touchStart.current))
  }
  function onTouchEnd() {
    touchStart.current = null
    setDragging(false)
    if (dragNow.current > SWIPE_CLOSE_PX) ref.current?.close()
    else setOffset(0)
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
      className={`m-0 mt-auto hidden max-h-[85dvh] w-full max-w-none flex-col overflow-hidden rounded-t-[20px] bg-surface-base p-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-text-primary backdrop:bg-overlay-scrim open:flex ${
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

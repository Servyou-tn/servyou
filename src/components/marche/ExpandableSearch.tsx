'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { interactiveSurface } from '@/components/ui/interactive-surface'
import type { ToggleType } from '@/lib/search/search-params'

// Command-palette search (Linear / Vercel / Notion / Stripe pattern). The navbar holds only a
// compact TRIGGER pill — it never expands inline, so nothing around it ever shifts. Clicking the
// trigger (or pressing ⌘K / Ctrl+K anywhere on the page) opens a centered modal overlay where the
// real searching happens, free of any horizontal competition with the welcome/pills/bell/avatar.
// Enter submits to /recherche?q=&type=<active toggle type>; Esc or a backdrop click closes.
//
// The modal is portaled to <body> so no ancestor (the sticky bar's backdrop-blur, transforms, the
// stacking context) can clip or mis-anchor it. Focus is moved into the input on open, trapped
// while open, and returned to the trigger on close.
export function ExpandableSearch({
  currentType,
  initialQuery = '',
}: {
  currentType: ToggleType
  initialQuery?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(initialQuery)
  const [mounted, setMounted] = useState(false)
  const [isMac, setIsMac] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const prevOpen = useRef(false)

  // Client-only: gate the portal + the keyboard hint until mounted (avoids any SSR/hydration
  // mismatch from document.body and the platform-specific ⌘K / Ctrl+K label).
  useEffect(() => {
    setMounted(true)
    setIsMac(typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform))
  }, [])

  // ⌘K (Mac) / Ctrl+K (Windows/Linux) toggles the palette from anywhere. The navbar is on every
  // consumer page, so this listener is effectively page-global.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // While open: autofocus the input, close on Esc, and trap Tab focus inside the dialog.
  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
      if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // Return focus to the trigger when the palette closes (without navigating).
  useEffect(() => {
    if (prevOpen.current && !open) triggerRef.current?.focus()
    prevOpen.current = open
  }, [open])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    const q = query.trim()
    if (q) params.set('q', q)
    params.set('type', currentType)
    setOpen(false)
    router.push(`/recherche?${params.toString()}`)
  }

  return (
    <>
      {/* Trigger — a compact search pill. Same shared surface as the toggle pills + sidebar
          buttons (h-11, white, border, lifted shadow, hover, focus ring). Always w-full: the
          desktop 280px width + shrink behaviour now live on the wrapper in MarcheTopBar, so the
          search is the row's one flexible member and the bar can never overflow. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir la recherche"
        className={cn(
          'group flex w-full items-center gap-2 rounded-full px-3.5',
          interactiveSurface(false),
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-text-muted" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-left text-sm text-text-muted">Rechercher…</span>
        {mounted && (
          <kbd className="hidden shrink-0 items-center rounded border border-border-subtle bg-surface-subtle px-1.5 py-0.5 font-sans text-[11px] font-medium text-text-muted md:inline-flex">
            {isMac ? '⌘K' : 'Ctrl K'}
          </kbd>
        )}
      </button>

      {/* Modal — portaled to <body>. Outer layer closes on click; the card stops propagation. */}
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="search-modal-title"
              className="fixed left-1/2 top-[20%] w-full max-w-2xl -translate-x-1/2 px-4"
            >
              <div
                className="rounded-2xl border border-border-subtle bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="search-modal-title" className="sr-only">
                  Rechercher sur Servyou
                </h2>
                <form onSubmit={onSubmit}>
                  {/* Large input row */}
                  <div className="flex items-center gap-3">
                    <Search className="h-5 w-5 shrink-0 text-text-muted" aria-hidden="true" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Rechercher…"
                      aria-label="Rechercher"
                      className="h-14 w-full border-none bg-transparent p-0 text-lg text-text-primary outline-none placeholder:text-text-muted"
                    />
                  </div>

                  {/* Reserved area for future autocomplete results. */}
                  <div className="-mx-6 mt-1 border-t border-border-subtle" />
                  <div className="flex min-h-[120px] items-center justify-center text-sm text-text-muted">
                    Tapez pour rechercher…
                  </div>
                  <div className="-mx-6 border-t border-border-subtle" />

                  {/* Footer hints */}
                  <div className="mt-3 flex items-center justify-between text-xs text-text-muted">
                    <span className="flex items-center gap-1.5">
                      <kbd className="rounded border border-border-subtle bg-surface-subtle px-1.5 py-0.5 font-sans text-[11px]">
                        Échap
                      </kbd>
                      pour fermer
                    </span>
                    <span className="flex items-center gap-1.5">
                      <kbd className="rounded border border-border-subtle bg-surface-subtle px-1.5 py-0.5 font-sans text-[11px]">
                        Entrée
                      </kbd>
                      pour rechercher
                    </span>
                  </div>
                </form>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

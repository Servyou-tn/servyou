'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { accountItems } from '@/lib/layout/nav-config'
import type { SellerType } from '@/lib/layout/select-variant'
import { ChevronDownIcon, UserIcon } from './icons'
import { FOCUS_RING } from './styles'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (first + last).toUpperCase()
}

// Avatar button → dropdown menu (consumer + workspace share it). Implements the
// ARIA menu pattern: arrow-key navigation between items, Home/End, Escape and
// Tab close (Escape returns focus to the trigger), and outside-click close.
// Déconnexion is a POST form to the existing /auth/signout route.
export function AccountMenu({ sellerType, fullName }: { sellerType: SellerType; fullName: string | null }) {
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const items = accountItems(sellerType)
  const ini = fullName ? initials(fullName) : ''

  // Outside-click + Escape while open.
  useEffect(() => {
    if (!open) return
    function onPointer(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [open])

  function onMenuKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Tab') {
      setOpen(false)
      return
    }
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    if (nodes.length === 0) return
    const idx = nodes.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      nodes[(idx + 1) % nodes.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      nodes[(idx - 1 + nodes.length) % nodes.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      nodes[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      nodes[nodes.length - 1]?.focus()
    }
  }

  const itemClass = `block rounded-lg px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-subtle ${FOCUS_RING}`

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('nav.account', lang)}
        className={`inline-flex h-10 items-center gap-1.5 rounded-full ps-1 pe-2 transition-colors hover:bg-surface-pill ${FOCUS_RING}`}
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-primary text-xs font-semibold text-white">
          {ini ? ini : <UserIcon className="h-4 w-4" />}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-text-muted transition-transform rtl:-scale-x-100 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t('nav.account', lang)}
          onKeyDown={onMenuKeyDown}
          className="absolute end-0 z-50 mt-2 w-56 rounded-xl border border-border-subtle bg-surface-base p-1.5 shadow-lg motion-safe:transition motion-safe:duration-150"
        >
          {items.map((item, i) => {
            if (item.kind === 'divider') {
              return <div key={`div-${i}`} role="separator" className="my-1.5 h-px bg-border-subtle" />
            }
            if (item.kind === 'logout') {
              return (
                <form key="logout" action="/auth/signout" method="POST" role="none">
                  <button
                    type="submit"
                    role="menuitem"
                    tabIndex={-1}
                    className={`block w-full rounded-lg px-3 py-2 text-start text-sm font-medium text-red-600 transition-colors hover:bg-red-50 ${FOCUS_RING}`}
                  >
                    {t(item.key, lang)}
                  </button>
                </form>
              )
            }
            return (
              <Link
                key={item.href}
                role="menuitem"
                tabIndex={-1}
                href={item.href}
                onClick={() => setOpen(false)}
                className={itemClass}
              >
                {t(item.key, lang)}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

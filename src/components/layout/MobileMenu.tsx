'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { navLinks, accountItems, activeHref } from '@/lib/layout/nav-config'
import type { HeaderState, SellerType } from '@/lib/layout/select-variant'
import { MenuIcon, CloseIcon } from './icons'
import { Wordmark } from './Wordmark'
import { FOCUS_RING } from './styles'

// Hamburger (<md) → full-screen overlay holding the same nav links plus the auth
// CTAs (public) or the account menu (consumer/workspace). Closes on Escape,
// backdrop tap, and route change; locks body scroll; focuses the close button on
// open and returns focus to the trigger on close. Transitions are motion-safe.
export function MobileMenu({
  state,
  sellerType,
}: {
  state: HeaderState
  sellerType: SellerType
}) {
  const lang = useLang()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  const links = navLinks(state)
  const active = activeHref(links, pathname)

  // The overlay closes when a link is tapped (onClick below) — handled in the
  // event, not a route-change effect, so navigation stays the single source of
  // truth and we avoid a setState-in-effect cascade.

  // Body scroll lock + Escape while open.
  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Focus the close button when the overlay opens.
  useEffect(() => {
    if (open) closeRef.current?.focus()
  }, [open])

  function close() {
    setOpen(false)
    triggerRef.current?.focus()
  }

  const rowClass = `rounded-lg px-4 py-3 text-base font-medium transition-colors ${FOCUS_RING}`

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('nav.menu_open', lang)}
        aria-expanded={open}
        className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-pill ${FOCUS_RING}`}
      >
        <MenuIcon className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t('nav.aria_primary', lang)}>
          <div
            className="absolute inset-0 bg-text-primary/40 motion-safe:transition-opacity"
            onClick={close}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 end-0 flex w-full max-w-sm flex-col bg-surface-base p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <Wordmark className="text-xl" />
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label={t('nav.menu_close', lang)}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-text-primary transition-colors hover:bg-surface-pill ${FOCUS_RING}`}
              >
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <nav aria-label={t('nav.aria_primary', lang)} className="mt-6 flex flex-col gap-1">
              {links.map(l => {
                const isActive = l.href === active
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`${rowClass} ${
                      isActive
                        ? 'bg-surface-pill text-text-primary'
                        : 'text-text-muted hover:bg-surface-subtle hover:text-text-primary'
                    }`}
                  >
                    {t(l.key, lang)}
                  </Link>
                )
              })}
            </nav>

            <div className="mt-auto border-t border-border-subtle pt-4">
              {state.variant === 'public' ? (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className={`${rowClass} text-center text-text-primary hover:bg-surface-subtle`}
                  >
                    {t('nav.login', lang)}
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className={`${rowClass} border border-brand-accent text-center font-semibold text-brand-accent hover:bg-brand-accent hover:text-white`}
                  >
                    {t('nav.signup_short', lang)}
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {accountItems(sellerType).map((item, i) => {
                    if (item.kind === 'divider') {
                      return <div key={`div-${i}`} className="my-1 h-px bg-border-subtle" />
                    }
                    if (item.kind === 'logout') {
                      return (
                        <form key="logout" action="/auth/signout" method="POST">
                          <button
                            type="submit"
                            className={`${rowClass} w-full text-start text-red-600 hover:bg-red-50`}
                          >
                            {t(item.key, lang)}
                          </button>
                        </form>
                      )
                    }
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`${rowClass} text-text-primary hover:bg-surface-subtle`}
                      >
                        {t(item.key, lang)}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

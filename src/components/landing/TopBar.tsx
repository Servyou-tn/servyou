'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Menu, Search, X } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import { LanguageToggle } from '@/components/layout/LanguageToggle'
import { Avatar } from '@/components/ui/avatar'
import { getInitials } from '@/components/ui/initials'
import type { HeaderAccount } from '@/lib/layout/nav-config'
import { ButtonLink, Lockup } from './ui'

// Top bar — Figma « Top bar · desktop · 80 px » (1675:37096) / « Top bar · phone · 60 px ».
// Desktop: lockup · 5 section links (14/21 Medium, 28px apart) · search · FR|AR · Se connecter · S'inscrire.
// Phone: lockup · S'inscrire (sm) · menu button that opens the same links.
export const SECTION_LINKS = [
  { href: '#categories', key: 'lp.nav.categories' },
  { href: '#freelances', key: 'lp.nav.freelances' },
  { href: '#boutiques', key: 'lp.nav.shops' },
  { href: '#notre-mission', key: 'lp.nav.mission' },
  { href: '#comment-ca-marche', key: 'lp.nav.how' },
] as const

export function TopBar({ account }: { account?: HeaderAccount }) {
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  const initials = account?.fullName ? getInitials(account.fullName) : undefined

  return (
    <header className="sticky top-0 z-40 lg:pt-2">
      <nav
        aria-label={t('nav.aria_primary', lang)}
        className="flex h-[60px] items-center border-b border-border-subtle bg-surface-base ps-4 pe-2 lg:h-20 lg:ps-10 lg:pe-10"
      >
        <Link href="/" aria-label="ServYou" className={cn('inline-flex rounded-md', FOCUS_RING)}>
          <Lockup size={28} className="lg:hidden" />
          <Lockup size={32} className="max-lg:hidden" />
        </Link>

        <ul className="ms-[111px] hidden items-center gap-1 xl:flex">
          {SECTION_LINKS.map(l => (
            <li key={l.href}>
              <a
                href={l.href}
                className={cn(
                  // Fiverr-style hover (founder, Nov 10): a light grey pill behind the text. The 12px side padding
                  // and the 4px gap keep the words where the Figma frame puts them (28px apart).
                  'flex h-10 items-center rounded-lg px-3 text-sm leading-[21px] font-medium text-text-secondary transition-colors duration-100 hover:bg-surface-sunken hover:text-text-primary focus-visible:bg-surface-sunken motion-reduce:transition-none',
                  FOCUS_RING,
                )}
              >
                {t(l.key, lang)}
              </a>
            </li>
          ))}
        </ul>

        <div className="ms-auto flex items-center">
          <Link
            href="/recherche"
            aria-label={t('lp.nav.search', lang)}
            className={cn('hidden size-10 items-center justify-center rounded-xl border border-border-subtle text-text-secondary hover:bg-surface-subtle lg:flex', FOCUS_RING)}
          >
            <Search className="size-5" aria-hidden="true" />
          </Link>
          <div className="ms-5 hidden lg:block">
            <LanguageToggle />
          </div>

          {account ? (
            <>
              <ButtonLink href={account.spaceHref} size="md" className="ms-3 hidden lg:inline-flex">
                {t('nav.dashboard', lang)}
              </ButtonLink>
              <Link href={account.spaceHref} aria-label={t('nav.dashboard', lang)} className={cn('ms-3 inline-flex rounded-full', FOCUS_RING)}>
                <Avatar size="sm" src={account.avatarUrl} initials={initials} />
              </Link>
            </>
          ) : (
            <>
              <ButtonLink href="/connexion" variant="ghost" size="md" className="ms-3 hidden w-[136px] lg:inline-flex">
                {t('nav.login', lang)}
              </ButtonLink>
              <ButtonLink href="/inscription" size="sm" className="w-[120px] text-sm lg:h-10 lg:text-base">
                {t('nav.signup_short', lang)}
              </ButtonLink>
            </>
          )}

          <button
            ref={triggerRef}
            type="button"
            aria-expanded={open}
            aria-controls="landing-menu"
            aria-label={t('nav.menu_open', lang)}
            onClick={() => setOpen(true)}
            className={cn('ms-1 flex size-11 items-center justify-center rounded-xl text-text-primary xl:hidden', FOCUS_RING)}
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </div>
      </nav>

      {open && (
        <div id="landing-menu" role="dialog" aria-modal="true" aria-label={t('nav.aria_primary', lang)} className="fixed inset-0 z-50 xl:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-0 bg-overlay-scrim"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 top-0 rounded-b-3xl bg-surface-base px-4 pt-2 pb-6 shadow-xl">
            <div className="flex h-[60px] items-center justify-between">
              <Lockup size={28} />
              <button
                ref={closeRef}
                type="button"
                aria-label={t('nav.menu_close', lang)}
                onClick={() => {
                  setOpen(false)
                  triggerRef.current?.focus()
                }}
                className={cn('flex size-11 items-center justify-center rounded-xl text-text-primary', FOCUS_RING)}
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            <ul className="mt-2 flex flex-col">
              {SECTION_LINKS.map(l => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={cn('flex h-12 items-center rounded-lg px-2 text-base font-medium text-text-primary hover:bg-surface-subtle', FOCUS_RING)}
                  >
                    {t(l.key, lang)}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
              <LanguageToggle />
              {!account && (
                <ButtonLink href="/connexion" variant="ghost" size="md">
                  {t('nav.login', lang)}
                </ButtonLink>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

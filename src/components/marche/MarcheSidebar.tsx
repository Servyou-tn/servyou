'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { StorefrontIcon, LogOutIcon, ChevronLeftIcon, ChevronRightIcon } from './icons'

type IconCmp = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

// Step-1 nav items. Minimal on purpose — more land as the account-utility pages
// return in follow-up commits. The Marché entry points at this page.
const NAV_ITEMS: { key: string; href: string; Icon: IconCmp }[] = [
  { key: 'marche.sidebar.marche', href: '/marche', Icon: StorefrontIcon },
]

// The /marche marketplace sidebar — a fresh, collapsible floating card (NOT the
// dashboard sidebar, which is reserved for the seller dashboards). Default
// collapsed (64px icon rail); an explicit chevron toggle expands it to 224px with
// labels. State is purely in-memory (useState) — no URL/localStorage. The chevron
// is the only expand/collapse control; nav items stay plain links.
export function MarcheSidebar() {
  const lang = useLang()
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)

  // Shared row styling for nav links + the logout button. Collapsed rows center
  // their icon; expanded rows left-align icon + label.
  const rowBase = `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
    expanded ? '' : 'justify-center'
  }`

  return (
    // sticky full-height rail; the p-4 is the floating gap around the white card.
    <aside className="sticky top-0 h-screen shrink-0 p-4">
      <div
        className={`flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-lg transition-all duration-200 ease-out motion-reduce:transition-none ${
          expanded ? 'w-56' : 'w-16'
        }`}
      >
        {/* Header — brand logo + the expand/collapse chevron. Real PNG assets
            (never a text wordmark): S-mark when collapsed, full wordmark expanded. */}
        <div
          className={`flex border-b border-border-subtle px-3 pb-4 pt-4 ${
            expanded ? 'items-center justify-between' : 'flex-col items-center gap-3'
          }`}
        >
          {expanded ? (
            // The wordmark asset is 3:2 (1536×1024). Size it by height (h-8) with
            // width/height props at the true aspect so next/image never stretches it.
            <Image
              src="/brand/logo/servyou-navbar.png"
              alt="Servyou"
              width={48}
              height={32}
              className="h-8 w-auto"
            />
          ) : (
            <Image
              src="/brand/logo/servyou-hero.png"
              alt="Servyou"
              width={32}
              height={32}
              priority
              className="h-8 w-8"
            />
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? t('nav.menu_close', lang) : t('nav.menu_open', lang)}
            aria-expanded={expanded}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-pill hover:text-text-primary ${FOCUS_RING}`}
          >
            {expanded ? (
              <ChevronLeftIcon className="h-5 w-5 rtl:-scale-x-100" />
            ) : (
              <ChevronRightIcon className="h-5 w-5 rtl:-scale-x-100" />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav aria-label={t('nav.aria_primary', lang)} className="flex-1 space-y-1 px-3 pt-4">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                aria-label={expanded ? undefined : t(item.key, lang)}
                title={expanded ? undefined : t(item.key, lang)}
                className={`${rowBase} ${
                  active
                    ? 'bg-brand-accent/10 text-brand-accent'
                    : 'text-text-muted hover:bg-surface-pill hover:text-text-primary'
                }`}
              >
                <item.Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {expanded && <span className="whitespace-nowrap">{t(item.key, lang)}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Footer — logout posts to the existing signout route (mirrors the
            dashboard sidebar's pattern). */}
        <div className="border-t border-border-subtle px-3 pb-4 pt-4">
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              aria-label={expanded ? undefined : t('nav.logout', lang)}
              title={expanded ? undefined : t('nav.logout', lang)}
              className={`${rowBase} w-full text-text-muted hover:bg-surface-pill hover:text-text-primary`}
            >
              <LogOutIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {expanded && <span className="whitespace-nowrap">{t('nav.logout', lang)}</span>}
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}

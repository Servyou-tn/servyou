'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW } from '@/components/layout/styles'
import {
  StorefrontIcon,
  PackageIcon,
  HeartIcon,
  BriefcaseIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from './icons'

type IconCmp = (props: React.SVGProps<SVGSVGElement>) => React.ReactElement

// The one live nav item — the marketplace browse page itself.
const ACTIVE_ITEM: { key: string; href: string; Icon: IconCmp } = {
  key: 'marche.sidebar.marche',
  href: '/marche',
  Icon: StorefrontIcon,
}

// Account-utility items whose pages aren't rebuilt yet. Rendered disabled (muted,
// non-clickable, "Bientôt disponible" tooltip) until each page returns in a
// follow-up commit.
const DISABLED_ITEMS: { key: string; Icon: IconCmp }[] = [
  { key: 'marche.sidebar.commandes', Icon: PackageIcon },
  { key: 'marche.sidebar.favoris', Icon: HeartIcon },
  { key: 'marche.sidebar.missions', Icon: BriefcaseIcon },
]

// The /marche marketplace sidebar — a fresh floating card (NOT the dashboard sidebar,
// which is reserved for the seller dashboards). Collapses to a 64px icon rail or expands
// to 224px with labels. When the parent passes `forceCollapsed`, the state follows URL
// intent (the /marche pages drive it from ?type) and the chevron is hidden; when the prop
// is omitted, the chevron toggles internal state — preserving the original toggleable
// behavior for any future non-/marche caller.
export function MarcheSidebar({ forceCollapsed }: { forceCollapsed?: boolean }) {
  const lang = useLang()
  const pathname = usePathname()
  const [internalExpanded, setInternalExpanded] = useState(false)

  const controlled = forceCollapsed !== undefined
  const expanded = controlled ? !forceCollapsed : internalExpanded

  const active = pathname === ACTIVE_ITEM.href || pathname.startsWith(ACTIVE_ITEM.href + '/')

  // Shared row geometry for every nav row. Collapsed rows center their icon;
  // expanded rows left-align icon + label. Interaction styles (transition, focus,
  // hover) are added per-row so the disabled rows opt out of them.
  const row = `flex items-center gap-3 rounded-xl px-4 py-2.5 text-[14px] font-medium ${
    expanded ? '' : 'justify-center'
  }`

  return (
    // sticky full-height rail; the p-4 is the floating gap around the white card.
    <aside className="sticky top-0 h-screen shrink-0 p-4">
      <div
        className={`flex h-full flex-col overflow-hidden rounded-3xl bg-white ${CARD_SHADOW} transition-all duration-200 ease-out motion-reduce:transition-none ${
          expanded ? 'w-56' : 'w-16'
        }`}
      >
        {/* Header — brand logo + expand/collapse chevron. Real PNG assets (never a
            text wordmark). The collapsed S is square (h-12 w-12); the collapsed
            header uses px-2 so the 48px S fits the 64px rail. The expanded wordmark
            PNG has wide transparent top/bottom bands, so object-cover in a fixed
            box crops them and fills the header at a readable ink height. */}
        <div
          className={`flex border-b border-border-subtle pb-4 pt-4 ${
            expanded ? 'items-center justify-between px-3' : 'flex-col items-center gap-3 px-2'
          }`}
        >
          {expanded ? (
            <Image
              src="/brand/logo/servyou-navbar.png"
              alt="Servyou"
              width={160}
              height={48}
              className="h-12 w-40 object-cover"
            />
          ) : (
            <Image
              src="/brand/logo/servyou-hero.png"
              alt="Servyou"
              width={48}
              height={48}
              priority
              className="h-12 w-12"
            />
          )}
          {!controlled && (
            <button
              type="button"
              onClick={() => setInternalExpanded((v) => !v)}
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
          )}
        </div>

        {/* Nav — the live Marché link, then the disabled account-utility items. */}
        <nav aria-label={t('nav.aria_primary', lang)} className="flex-1 space-y-1 px-3 pt-4">
          <Link
            href={ACTIVE_ITEM.href}
            aria-current={active ? 'page' : undefined}
            aria-label={expanded ? undefined : t(ACTIVE_ITEM.key, lang)}
            title={expanded ? undefined : t(ACTIVE_ITEM.key, lang)}
            className={`${row} transition-colors ${FOCUS_RING} ${
              active
                ? 'bg-brand-accent/10 text-brand-accent'
                : 'text-text-muted hover:bg-surface-pill hover:text-text-primary'
            }`}
          >
            <ACTIVE_ITEM.Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            {expanded && <span className="whitespace-nowrap">{t(ACTIVE_ITEM.key, lang)}</span>}
          </Link>

          {DISABLED_ITEMS.map((item) => (
            <div
              key={item.key}
              aria-disabled="true"
              title={t('marche.sidebar.coming_soon', lang)}
              className={`${row} cursor-not-allowed select-none text-[#8B8B8B] opacity-60`}
            >
              <item.Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {expanded && <span className="whitespace-nowrap">{t(item.key, lang)}</span>}
            </div>
          ))}
        </nav>
      </div>
    </aside>
  )
}

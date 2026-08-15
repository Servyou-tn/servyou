'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { Ref } from 'react'
import { usePathname } from 'next/navigation'
import { Rocket, X } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { sidebarSectionsForRole, type ShellRole } from './sidebar-items'
import { isActiveRoute } from './active-route'
import { SidebarSection } from './SidebarSection'
import { SidebarItem } from './SidebarItem'

// The app-shell sidebar (design system Sections 3.1/3.2): a full-height dark-navy column, 240px
// on desktop, rendered inside a slide-out drawer below lg. Sections + items are chosen by role
// (sidebar-items.ts). `inDrawer` adds the close button for the mobile overlay; `onNavigate`
// closes the drawer when a link is followed.
export function Sidebar({
  role,
  inDrawer = false,
  onNavigate,
  onClose,
  closeRef,
}: {
  role: ShellRole
  inDrawer?: boolean
  onNavigate?: () => void
  onClose?: () => void
  closeRef?: Ref<HTMLButtonElement>
}) {
  const lang = useLang()
  const pathname = usePathname()
  const sections = sidebarSectionsForRole(role)

  return (
    <div className="flex h-full w-full flex-col bg-brand-blue-950 px-4 pb-6 text-text-inverse">
      {/* Logo band — 72px tall, start-pad 12 (Figma 611:45637: band 208×72 → Lockup 123×32, gap 8).
          The 32px S-mark + "ServYou" wordmark with BOTH words #FFFFFF: the two-tone Serv/You
          treatment is for light surfaces only, and the navbar PNG's navy "Serv" vanishes on this
          ground. shrink-0 so the band never compresses on a short viewport; ps-3 aligns the mark
          with the nav-item icons. */}
      <div className="flex h-[72px] shrink-0 items-center justify-between ps-3">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="Servyou"
          className={`flex items-center gap-2 rounded-pill ${FOCUS_RING}`}
        >
          <Image
            src="/brand/logo/servyou-s-mark.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0"
          />
          <span className="text-xl font-bold text-white">ServYou</span>
        </Link>
        {inDrawer ? (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t('shell.mobile.menu.close', lang)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-pill text-white/70 transition-colors hover:bg-white/5 hover:text-white ${FOCUS_RING}`}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* Section spacing now comes from SidebarSection's own caption padding (pt-3), so the list
          gap drops to the measured 2px. overflow-y-auto is deliberately KEPT — it is not a Figma
          value, it stops the nav clipping on a short viewport. */}
      <nav
        aria-label={t('nav.aria_primary', lang)}
        // `overflow-y-auto` STAYS: PR #91 added it so a short viewport scrolls the nav instead of
        // clipping its last items, and that is still right — measured, the nav's content is 508px
        // tall and it genuinely overflows below a ~616px viewport (at 600 → scrollHeight 508 vs
        // clientHeight 492). Removing it would clip "Aide" off the bottom on a laptop.
        //
        // What is removed is the SCROLLBAR CHROME, not the scrolling (G4 delta S1). The classic
        // Windows track is 15px wide and it eats that out of the 208px row, compounding the label
        // truncation; Figma's sidebar has no track at all. `scrollbar-width:none` (+ the WebKit
        // pseudo-element) hides the furniture while keeping wheel, trackpad, and keyboard
        // scrolling intact — so no clip is reintroduced.
        className="mt-3 flex flex-1 flex-col gap-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {sections.map((section) => (
          <SidebarSection key={section.labelKey} label={t(section.labelKey, lang)}>
            {section.items.map((item) => {
              // The lone expandable case (Marketplace) — contained here, not a general nested-item
              // model (sidebar-items.ts's SidebarItemDef comment has the full reasoning). Expansion
              // reads `expandOn` (a route PREFIX, e.g. "/marche"), never `item.href` (its own
              // navigation target, e.g. "/marche/produits") — the two engines share the prefix but
              // not the href, so deriving expansion from href would collapse the sub-items the
              // moment a visitor is on the OTHER engine.
              const expanded = item.subItems && item.expandOn ? isActiveRoute(pathname, item.expandOn) : undefined
              return (
                <div key={item.href}>
                  <SidebarItem
                    href={item.href}
                    label={t(item.key, lang)}
                    icon={item.icon}
                    // Never active when it owns subItems: with `expandOn` prefix-matching both
                    // engines and `href` exact/prefix-matching only Produits, both the parent AND
                    // the Produits sub-item would otherwise light up solid at once — two
                    // aria-current="page" in one <nav>. The chevron (via `expanded`) is this row's
                    // only visual state; the real "current" signal lives on whichever sub-item
                    // matches below.
                    active={item.subItems ? false : isActiveRoute(pathname, item.href)}
                    onNavigate={onNavigate}
                    disabled={item.disabled}
                    soonLabel={item.disabled ? t('shell.sidebar.soon', lang) : undefined}
                    expanded={expanded}
                  />
                  {expanded && item.subItems && (
                    <div className="mt-0.5 flex flex-col gap-0.5 ps-8">
                      {item.subItems.map((sub) => (
                        <SidebarItem
                          key={sub.href}
                          href={sub.href}
                          label={t(sub.key, lang)}
                          active={isActiveRoute(pathname, sub.href)}
                          onNavigate={onNavigate}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {/* "Devenir vendeur" promo (Figma 611:45637 → 110:3874): only for a consumer
                (seller_type null; role is 'consumer' logged-out too). Hidden for sellers. */}
            {role === 'consumer' && section.labelKey === 'shell.sidebar.section.discover' && (
              <Link
                href="/devenir-vendeur"
                onClick={onNavigate}
                className={`flex flex-col gap-2 rounded-xl bg-brand-blue-600 p-4 text-text-inverse transition-colors hover:bg-brand-blue-700 ${FOCUS_RING}`}
              >
                <Rocket className="h-6 w-6 shrink-0" aria-hidden="true" />
                <span className="text-h4">{t('shell.sidebar.sellerCta.title', lang)}</span>
                <span className="text-body-sm leading-5 text-brand-blue-100">
                  {t('shell.sidebar.sellerCta.subtitle', lang)}
                </span>
              </Link>
            )}
          </SidebarSection>
        ))}
      </nav>
    </div>
  )
}

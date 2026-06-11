'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { selectVariant, type SellerType } from '@/lib/layout/select-variant'
import { navLinks, activeHref } from '@/lib/layout/nav-config'
import { Wordmark } from './Wordmark'
import { LanguageToggle } from './LanguageToggle'
import { AccountMenu } from './AccountMenu'
import { MobileMenu } from './MobileMenu'
import { FOCUS_RING } from './styles'

// Shared production Header (Cultivo pill-capsule pattern). Three-zone layout:
// brand left · centered pill capsule of nav links · actions right. The active
// page wears a white sub-pill with a green status dot.
//
// Client component on the AdminSidebar precedent: it needs the live pathname for
// both variant selection and active-link highlighting. The server layout supplies
// the server-only facts (session, role, name) as props.
export function Header({
  isLoggedIn,
  sellerType,
  fullName,
}: {
  isLoggedIn: boolean
  sellerType: SellerType
  fullName: string | null
}) {
  const pathname = usePathname()
  const lang = useLang()

  const state = selectVariant({ isLoggedIn, sellerType, pathname })
  if (state.hidden) return null

  const links = navLinks(state)
  const active = activeHref(links, pathname)

  // The marketing landing page (/) gets a distinct treatment: a white floating
  // capsule on a transparent header (the page paints a soft-blue backdrop behind
  // it), and a bright-blue Sign-up button. Every other route keeps the standard
  // full-width bar. Logged-in users are redirected off / so this is always the
  // public variant there.
  const isLanding = pathname === '/'

  return (
    <header
      className={`sticky top-0 z-40 ${
        isLanding
          ? ''
          : 'border-b border-border-subtle bg-surface-base/95 backdrop-blur supports-[backdrop-filter]:bg-surface-base/80'
      }`}
    >
      <nav
        aria-label={t('nav.aria_primary', lang)}
        className={
          isLanding
            ? // Compact floating pill: shrink-wraps to content (w-fit), centered
              // (mx-auto), tight padding + a single gap-6 between the three zones.
              'mx-auto mt-6 flex w-fit items-center gap-6 rounded-full border border-[rgba(15,23,42,0.08)] bg-white px-4 py-2 shadow-lg'
            : // Standard full-width bar on every other route.
              'mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-4 lg:px-6'
        }
      >
        {/* Left — brand */}
        <div className="flex items-center md:justify-start">
          <Link href="/" aria-label="Servyou" className={`inline-flex items-center rounded-md ${FOCUS_RING}`}>
            <Wordmark />
          </Link>
        </div>

        {/* Center — nav links (md+). On the landing capsule they sit directly on
            the white pill (no gray group background); every other route keeps the
            gray surface-pill group. The active link wears a tinted sub-pill +
            green dot — white on the standard bar, surface-pill (#F1F5F9) on the
            white landing capsule so it stays visible. */}
        <div className="hidden md:flex md:justify-center">
          <ul
            className={`flex items-center gap-1 ${
              isLanding ? '' : 'rounded-full bg-surface-pill p-1'
            }`}
          >
            {links.map(l => {
              const isActive = l.href === active
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      isActive
                        ? isLanding
                          ? 'bg-surface-pill text-text-primary'
                          : 'bg-surface-pill-active text-text-primary shadow-sm'
                        : 'text-text-muted hover:text-text-primary'
                    } ${FOCUS_RING}`}
                  >
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-status-dot-success" aria-hidden="true" />
                    )}
                    {t(l.key, lang)}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Right — actions. On the landing capsule every top-level zone is an even
            gap-6 apart (FR/AR · Se connecter · S'inscrire), matching the gap-6 the
            capsule already sets between logo, nav links, and this cluster. Other
            routes keep their tighter gap-2/gap-3 action spacing. */}
        <div className={`flex items-center justify-end ${isLanding ? 'gap-6' : 'gap-2 md:gap-3'}`}>
          <LanguageToggle />

          {/* md+ : auth CTAs (public) or account dropdown */}
          <div className={`hidden md:flex md:items-center ${isLanding ? 'gap-6' : 'md:gap-3'}`}>
            {state.variant === 'public' ? (
              <>
                <Link
                  href="/login"
                  className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:text-text-primary ${FOCUS_RING}`}
                >
                  {t('nav.login', lang)}
                </Link>
                <Link
                  href="/signup"
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-white transition-colors ${
                    isLanding ? 'bg-brand-accent hover:bg-[#1D4ED8]' : 'bg-brand-primary hover:bg-[#152C6B]'
                  } ${FOCUS_RING}`}
                >
                  {t('nav.signup_short', lang)}
                </Link>
              </>
            ) : (
              <AccountMenu sellerType={sellerType} fullName={fullName} />
            )}
          </div>

          {/* mobile : hamburger + overlay */}
          <MobileMenu state={state} sellerType={sellerType} />
        </div>
      </nav>
    </header>
  )
}

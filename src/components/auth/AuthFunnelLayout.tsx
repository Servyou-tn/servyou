import type { ReactNode } from 'react'
import Link from 'next/link'
import localFont from 'next/font/local'
import { ChevronLeft } from 'lucide-react'
import { Wordmark } from '@/components/layout/Wordmark'
import { FOCUS_RING } from '@/components/layout/styles'
import { AuthShell } from './AuthShell'

// Manrope via --font-display — the same display voice as the landing page, set on
// the white <main> so BOTH the header (title/subtitle, outside the box) and the
// box children inherit it. No 'use client': pure presentation; the interactive
// form is the only client island, passed as children.
// One face per weight Google served, all the same variable file (src/fonts/README.md). Every
// Manrope call site names its const `manrope`: localFont uses it as the family name, so the faces
// of all call sites on a page merge into one family, as Google's shared "Manrope" family did.
const manrope = localFont({
  src: [
    { path: '../../fonts/manrope-latin.woff2', weight: '400', style: 'normal' },
    { path: '../../fonts/manrope-latin.woff2', weight: '500', style: 'normal' },
    { path: '../../fonts/manrope-latin.woff2', weight: '600', style: 'normal' },
    { path: '../../fonts/manrope-latin.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
})

const display = 'font-[family-name:var(--font-display)]'

// Shared page scaffold for the whole auth funnel — mirrors HowItWorks (Section 3):
// the title sits on the WHITE page above a navy container, the footer link sits on
// white below it. AuthShell is just the navy box in the middle. No logo/chrome at
// the top (Stripe/Linear/Notion pattern); the title anchors the page. Callers pass
// the role-specific title, the shared subtitle, an optional footer node, and the
// box width (Step 1 720, Step 2 560).
//
// Opt-in `homeBar` (sign-in + sign-up, walk 2026-11-02 #8): the page was a dead end — no logo, no way back. It adds the wordmark (→ home)
// and, when the page knows where the visitor came from, a « ‹ Retour au … » link. `notice` is the one line saying WHY they are here
// (#7: « Connectez-vous pour demander ce produit »), under the subtitle.
export function AuthFunnelLayout({
  title,
  subtitle,
  footer,
  children,
  maxWidthClass,
  variant = 'navy',
  homeBar = false,
  back,
  notice,
  homeLabel,
}: {
  title: string
  subtitle?: string
  footer?: ReactNode
  children: ReactNode
  maxWidthClass?: string
  variant?: 'navy' | 'white'
  homeBar?: boolean
  back?: { href: string; label: string }
  notice?: string
  /** Accessible name of the wordmark link (« Accueil — Servyou »). */
  homeLabel?: string
}) {
  return (
    <main
      id="main-content"
      className={`${manrope.variable} flex min-h-screen flex-col bg-white`}
    >
      {homeBar ? (
        <div className="flex items-center justify-between gap-3 px-4 pt-4 md:px-6">
          <Link href="/" aria-label={homeLabel ?? 'Servyou'} className={`inline-flex items-center rounded-md ${FOCUS_RING}`}>
            <Wordmark className="h-12" />
          </Link>
          {back ? (
            <Link
              href={back.href}
              className={`${display} inline-flex min-h-11 items-center gap-1.5 rounded-md text-body-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] ${FOCUS_RING}`}
            >
              <ChevronLeft className="size-4 shrink-0 rtl:rotate-180" aria-hidden="true" />
              {back.label}
            </Link>
          ) : null}
        </div>
      ) : null}

      {/* Page header — navy title + muted subtitle on the white page, above the box
          (same scale/weight as the landing section titles). 48px top mobile / 64px
          desktop (32 / 40 under the home bar). Centering works identically in LTR and RTL. */}
      <header className={`px-4 text-center ${homeBar ? 'pt-8 md:pt-10' : 'pt-12 md:pt-16'}`}>
        {/* responsive pair retained: md:text-[40px] has no clean tier; half-tokenizing would break the mobile→desktop ramp (DS-3b-3) */}
        <h1
          className={`${display} mx-auto max-w-[720px] text-balance text-[30px] font-bold leading-[1.15] tracking-[-0.025em] text-[var(--text-primary)] md:text-[40px]`}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={`${display} mx-auto mt-2 max-w-[560px] text-base font-medium text-[var(--text-muted)] md:text-lg`}
          >
            {subtitle}
          </p>
        ) : null}
        {notice ? (
          <p
            role="status"
            className={`${display} mx-auto mt-4 max-w-[560px] rounded-lg bg-[var(--brand-blue-50)] px-4 py-3 text-body-sm font-semibold text-[var(--brand-blue-800)]`}
          >
            {notice}
          </p>
        ) : null}
      </header>

      {/* The navy box, 32px below the title on mobile / 40px desktop. */}
      <div className="mt-8 flex justify-center px-4 md:mt-10">
        <AuthShell variant={variant} maxWidthClass={maxWidthClass}>
          {children}
        </AuthShell>
      </div>

      {/* Footer link on white, below the box. */}
      {footer ? (
        <footer
          className={`${display} px-4 pb-6 pt-8 text-center text-body font-medium text-[var(--text-muted)] md:pb-8 md:pt-12`}
        >
          {footer}
        </footer>
      ) : null}
    </main>
  )
}

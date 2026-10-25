import type { ReactNode } from 'react'
import localFont from 'next/font/local'
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
export function AuthFunnelLayout({
  title,
  subtitle,
  footer,
  children,
  maxWidthClass,
  variant = 'navy',
}: {
  title: string
  subtitle?: string
  footer?: ReactNode
  children: ReactNode
  maxWidthClass?: string
  variant?: 'navy' | 'white'
}) {
  return (
    <main
      id="main-content"
      className={`${manrope.variable} flex min-h-screen flex-col bg-white`}
    >
      {/* Page header — navy title + muted subtitle on the white page, above the box
          (same scale/weight as the landing section titles). 48px top mobile / 64px
          desktop. Centering works identically in LTR and RTL. */}
      <header className="px-4 pt-12 text-center md:pt-16">
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

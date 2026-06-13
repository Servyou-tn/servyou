import type { ReactNode } from 'react'
import Link from 'next/link'
import { Manrope } from 'next/font/google'
import { Wordmark } from '@/components/layout/Wordmark'

// Manrope via --font-display — the same display voice as /inscription Step 1 and
// the landing page, so the whole auth funnel reads as one piece. No 'use client':
// the shell is pure presentation (the interactive form is the only client island,
// passed as children), so the chrome ships zero JS.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

// Shared chrome for every auth page — the /inscription role picker (Step 1), the
// signup Step-2 forms, signin, verify-email, and the two password-recovery pages.
// A full-height white canvas with a barely-there dot texture; the Servyou wordmark
// centered at the top; and a single pale-blue (brand-ice) card sitting just below
// the logo, not vertically centered. Callers size the card via `maxWidthClass`
// (Step 1 720, signup 560, signin/verify 480, reset 420). Card padding (32px mobile
// / 56px desktop), radius and shadow are unchanged; inner elements stay white so
// the eye reads three layers: white page → blue card → white controls.
export function AuthShell({
  children,
  maxWidthClass = 'max-w-[480px]',
}: {
  children: ReactNode
  maxWidthClass?: string
}) {
  return (
    <div className={`${manrope.variable} relative flex min-h-screen flex-col bg-[var(--surface-base)]`}>
      {/* Subtle dot texture (3%) in brand-sky — barely there, for warmth over pure
          white. Symmetric, so it needs no RTL handling. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--brand-sky)_1px,_transparent_1px)] bg-[size:24px_24px] opacity-[0.03]"
      />

      {/* Logo-only navbar — the Servyou wordmark centered at the top (identical in
          LTR and RTL; center is center). Links home. */}
      <header className="relative z-10 flex justify-center px-6 pt-6 md:pt-8">
        <Link
          href="/"
          aria-label="Servyou"
          className="inline-flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2"
        >
          <Wordmark className="h-16" />
        </Link>
      </header>

      {/* The card sits just below the logo (mt-8/md:mt-16 = 32px mobile / 64px
          desktop) rather than vertically centered, for better above-the-fold
          density. bg-brand-ice is the subtle blue; inner controls stay white. */}
      <main
        id="main-content"
        className="relative z-10 flex justify-center px-6 pb-12"
      >
        <div
          className={`mt-8 w-full md:mt-16 ${maxWidthClass} rounded-3xl border border-[var(--border-subtle)] bg-brand-ice p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)] md:p-14`}
        >
          {children}
        </div>
      </main>
    </div>
  )
}

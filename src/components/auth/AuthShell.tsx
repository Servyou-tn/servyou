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

// Shared chrome for every auth page — signup Step 2, signin, verify-email, and the
// two password-recovery pages. A full-height white canvas with a barely-there dot
// texture, a logo-only navbar linking home, and a single centered card. Callers
// size the card via `maxWidthClass` (signup 560, signin/verify 480, reset 420).
// Card padding (32px mobile / 56px desktop), radius and shadow match Step 1.
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

      {/* Minimal navbar — logo only, no menu / no auth CTAs. Inline-start by flow
          (top-left LTR, top-right under <html dir="rtl">). */}
      <header className="relative z-10 p-4 md:p-6">
        <Link
          href="/"
          aria-label="Servyou"
          className="inline-flex items-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-accent)] focus-visible:ring-offset-2"
        >
          <Wordmark className="h-12" />
        </Link>
      </header>

      <main
        id="main-content"
        className="relative z-10 flex flex-grow items-center justify-center p-6"
      >
        <div
          className={`w-full ${maxWidthClass} rounded-3xl border border-[var(--border-subtle)] bg-white p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)] md:p-14`}
        >
          {children}
        </div>
      </main>
    </div>
  )
}

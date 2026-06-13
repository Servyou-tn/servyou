import type { ReactNode } from 'react'

// The styled card container for the auth funnel — JUST the box. The white page,
// the centered title/subtitle, and the footer link live in AuthFunnelLayout.
//
// Default variant 'navy' uses the EXACT --brand-primary navy of the landing
// page's "Comment ça marche" section (HowItWorks.tsx) — brand continuity from
// marketing into signup. Inner controls (form inputs, role cards) stay white, so
// they read as bright "windows" on the navy. The 'white' variant keeps the
// earlier pale-ice treatment as a fallback; no page currently uses it.
export function AuthShell({
  children,
  maxWidthClass = 'max-w-[480px]',
  variant = 'navy',
}: {
  children: ReactNode
  maxWidthClass?: string
  variant?: 'navy' | 'white'
}) {
  const surface =
    variant === 'navy'
      ? 'bg-[var(--brand-primary)] shadow-[0_32px_80px_-16px_rgba(15,23,42,0.25)]'
      : 'border border-[var(--border-subtle)] bg-brand-ice shadow-[0_24px_64px_rgba(15,23,42,0.08)]'

  return (
    <div className={`w-full ${maxWidthClass} rounded-3xl p-8 md:p-14 ${surface}`}>
      {children}
    </div>
  )
}

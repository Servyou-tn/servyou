import type { ReactNode } from 'react'

// The styled card container for the auth funnel — JUST the box. The white page,
// the centered title/subtitle, and the footer link live in AuthFunnelLayout.
//
// Default variant 'navy' reproduces the landing page's "Comment ca marche" navy
// container (HowItWorks.tsx) pixel-for-pixel: the --brand-primary base, a soft
// brand-accent center glow, and a faint brand-sky dot texture, all clipped to the
// rounded corners. Inner controls (form inputs, role cards) stay white, so they
// read as bright "windows" on the navy. The 'white' variant keeps the earlier
// pale-ice treatment as a fallback; no page currently uses it.
export function AuthShell({
  children,
  maxWidthClass = 'max-w-[480px]',
  variant = 'navy',
}: {
  children: ReactNode
  maxWidthClass?: string
  variant?: 'navy' | 'white'
}) {
  if (variant === 'white') {
    return (
      <div
        className={`w-full ${maxWidthClass} rounded-3xl border border-[var(--border-subtle)] bg-brand-ice p-8 shadow-[0_24px_64px_rgba(15,23,42,0.08)] md:p-14`}
      >
        {children}
      </div>
    )
  }

  return (
    <div
      className={`relative w-full ${maxWidthClass} overflow-hidden rounded-3xl bg-[var(--brand-primary)] p-8 shadow-[0_32px_80px_-16px_rgba(15,23,42,0.25)] md:p-14`}
    >
      {/* Soft brand-accent glow at centre fading to navy — copied from HowItWorks. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(37,99,235,0.08),_transparent_70%)]"
      />
      {/* Faint brand-sky dot texture for the dark context — copied from HowItWorks. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--brand-sky)_1px,_transparent_1px)] bg-[size:24px_24px] opacity-[0.04]"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

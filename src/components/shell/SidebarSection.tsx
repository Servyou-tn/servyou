import type { ReactNode } from 'react'

// A sidebar section: an uppercase caption label (design system Section 3.2 — text-section-cap,
// 12px/600/uppercase/tracking) over its nav items. Label colour is brand-blue-300 (#8faef9 — the
// measured Figma 611:45637 value), which clears WCAG AA at ~7:1 on the navy ground. (The AA risk
// the DS avoids here is the slate #64748B, a different colour.)
export function SidebarSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      {/* Section Label: 32px box, pad 12/12/8, letter-spacing 6% (Figma 611:45637). pt-3 gives the
          top breathing room that the nav's 2px list gap no longer provides; items sit 2px apart
          beneath. tracking-[0.06em] is the exact measured value — the text-section-cap token bakes
          in 0.05em, so it is overridden here (DS follow-up: correct the token to 0.06em). */}
      <p className="h-8 px-3 pt-3 text-section-cap uppercase tracking-[0.06em] text-brand-blue-300">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

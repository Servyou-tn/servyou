import type { ReactNode } from 'react'

// A sidebar section: an uppercase caption label (design system Section 3.2 — text-section-cap,
// 12px/600/uppercase/tracking) over its nav items. Label color is brand-blue-300 (#8faef9 — the
// measured Figma 611:45637 value), which clears WCAG AA at ~7:1 on the navy ground (the AA risk
// the DS avoids here is the slate #64748B, a different color).
export function SidebarSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      {/* Section Label: 32h box, pad 12/12/8 (Figma 611:45637) — pt-3 gives the top breathing
          room; items sit 2px apart (gap 2) beneath. */}
      <p className="px-3 pt-3 pb-2 text-section-cap uppercase text-brand-blue-300">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

import type { ReactNode } from 'react'

// A sidebar section: an uppercase caption label (design system Section 3.2 — text-section-cap,
// 12px/600/uppercase/tracking) over its nav items. Label color is white/60 rather than the
// literal --sidebar-text-muted (#64748B), which fails WCAG AA on the navy ground; white/60
// clears AA and matches the established DashboardSidebar treatment.
export function SidebarSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="px-3 pb-2 text-section-cap uppercase text-white/60">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

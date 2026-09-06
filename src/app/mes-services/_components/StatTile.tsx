import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// H5's own stat tile — measured from Figma 243:695 (label 14 Medium text/secondary · value 28
// Bold text/primary · subtitle 12 text/muted, border/subtle 1px + radius 12 + pad 20 + gap 8).
// iconCircle re-measured 2026-09-06 (get_design_context on 242:8084, 4 stat-tile nodes + fetched
// SVG assets): 44px circle radius/full, 20px glyph, stroke-width 2 — one px smaller than H4's own
// 22px glyph, this frame's own number, not copied. ACCENT hexes matched BYTE-FOR-BYTE against
// tokens.css on fetch (blue #1F5FE0, warning #92400E, success #166534) — same accent shape H4's
// StatTile already uses, so reusing it here instead of inventing a second one.
const ACCENT = {
  blue: 'bg-brand-blue-100 text-brand-blue-600',
  warning: 'bg-warning-100 text-warning-700',
  success: 'bg-success-100 text-success-700',
} as const

// ⚑ THIRD ROUTE-LOCAL COPY, DELIBERATELY NOT PROMOTED. tableau-de-bord-vendeur/_components/
// StatTile.tsx (G4, 1st) and tableau-de-bord/_components/StatTile.tsx (H4, 2nd) both already carry
// the "promote at the 3rd consumer" comment this file is the trigger for — and this one also needs
// a `delta` region neither of those has (H5's "Commandes ce mois" tile is the first REAL delta
// value in the app; H4's own Vues du profil tile deliberately renders none, per
// servyou-phase-aware-features). Promoting three call sites' shapes into one `src/components/ui`
// primitive from inside an H5 PR would touch two already-shipped dashboards — out of this PR's
// scope. Logged in docs/follow-ups.md per the same rule FreelancerShareButton hit in D4.
export function StatTile({
  label,
  value,
  icon: Icon,
  accent,
  subtitle,
  delta,
}: {
  label: string
  value: string
  icon: LucideIcon
  accent: keyof typeof ACCENT
  /** Plain subtitle line — mutually exclusive with `delta` (only one is ever measured per tile). */
  subtitle?: string
  /** "Commandes ce mois"'s delta row: a signed count plus a comparison caption. */
  delta?: { direction: 'up' | 'down' | 'flat'; text: string; caption: string }
}) {
  return (
    <div className="flex flex-1 flex-col gap-2 rounded-xl border border-border-subtle bg-surface-base p-5">
      <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', ACCENT[accent])}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <p className="text-body-sm font-medium text-text-secondary">{label}</p>
      <p className="text-[28px] font-bold leading-[normal] text-text-primary">{value}</p>
      {subtitle ? <p className="text-caption text-text-muted">{subtitle}</p> : null}
      {delta ? (
        <p className="flex items-baseline gap-1.5">
          <span
            dir="ltr"
            className={cn(
              'text-caption font-semibold',
              delta.direction === 'up' && 'text-success-500',
              delta.direction === 'down' && 'text-danger-500',
              delta.direction === 'flat' && 'text-text-muted',
            )}
          >
            {delta.text}
          </span>
          <span className="text-caption text-text-muted">{delta.caption}</span>
        </p>
      ) : null}
    </div>
  )
}

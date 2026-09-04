import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Duplicated from tableau-de-bord-vendeur/_components/StatTile.tsx (G4) rather than imported —
// that file's own comment says promote to src/components/ui at the THIRD consumer; H4 is the
// second, so this stays route-local per the same rule.
//
// Visual contract is H4's OWN measured spec (docs/design/h4-discovery.md §9, figma-cli CDP read
// of 167:12252 etc, 2026-09-03), not a copy of G4's: border/subtle 1px + radius/xl + pad 20 + gap
// 12, 44px accent iconCircle (glyph 22px) LEFT-aligned — G4's original centers its icon in a
// full-width row, which is right for G4's own frame but measured wrong for this one (every stat
// tile child sits at x=20, not centered). H4's stat row has no `delta` in any of its four tiles,
// which is this component's only shape — no prop drift beyond the sizing/alignment fix.
export type TileAccent = 'blue' | 'success' | 'indigo' | 'warning' | 'neutral'

const ACCENT: Record<TileAccent, string> = {
  blue: 'bg-brand-blue-100 text-brand-blue-600',
  success: 'bg-success-100 text-success-700',
  indigo: 'bg-brand-indigo-100 text-brand-indigo-600',
  warning: 'bg-warning-100 text-warning-700',
  neutral: 'bg-surface-sunken text-icon-muted',
}

export function StatTile({
  label,
  value,
  subtitle,
  icon: Icon,
  accent,
  muted,
}: {
  label: string
  value: string
  subtitle: string
  icon: LucideIcon
  accent: TileAccent
  /** Renders the value in the muted ramp — for a tile with no real data source yet. */
  muted?: boolean
}) {
  return (
    <div className="flex flex-1 flex-col gap-3 rounded-xl border border-border-subtle bg-surface-base p-5 shadow-xs">
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
          ACCENT[accent],
        )}
      >
        <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
      </span>
      <div className="flex w-full flex-col gap-1">
        {/* leading-none on all three lines — Pass 2. G4's StatTile uses leading-[normal] on the
            value (≈34px for Inter) and that is verified correct THERE (it reproduces G4's own
            484:24205 frame height, 196, exactly). H4's frame targets a shorter tile (159, not
            196) with the same padding/icon/gap envelope, so it cannot be using the same loose
            line-heights — solving for the 159 target with the padding/icon/gap already measured
            in h4-discovery.md §9 leaves ~63px for this 3-line stack, which is what leading-none
            (14+28+14=56, plus the two 4px gaps=64) lands almost exactly on. G4 stays untouched. */}
        <p className="text-body-sm font-medium leading-none text-text-secondary">{label}</p>
        <p
          className={cn(
            'text-[28px] font-bold leading-none',
            muted ? 'text-text-muted' : 'text-brand-blue-800',
          )}
        >
          {value}
        </p>
        <p className="text-body-sm leading-none text-text-muted">{subtitle}</p>
      </div>
    </div>
  )
}

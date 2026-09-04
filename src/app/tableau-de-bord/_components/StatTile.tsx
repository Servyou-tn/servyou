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
  icon: Icon,
  accent,
  muted,
}: {
  label: string
  value: string
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
      {/* Pass 4 (figma-cli Safe Mode read, 167:1225x) — TWO lines, not three. The frame has no
          subtitle text node at all; Pass 1-2 built one because nothing had ever measured it
          directly (h4-discovery.md §9 only confirmed padding/icon/gap, never drilled into the
          text stack). `leading-[normal]` on both lines, not `leading-none` — measured heights
          are label 17px / value 34px (≈1.214× their font sizes, i.e. Inter's own `normal`), and
          the label→value gap is 12px, not `gap-1`. 40(pad)+44(icon)+12(gap)+17+12+34 = 159 exact. */}
      <div className="flex w-full flex-col gap-3">
        <p className="text-body-sm font-medium leading-[normal] text-text-secondary">{label}</p>
        <p
          className={cn(
            'text-[28px] font-bold leading-[normal]',
            muted ? 'text-text-muted' : 'text-brand-blue-800',
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

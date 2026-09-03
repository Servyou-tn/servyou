import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Duplicated from tableau-de-bord-vendeur/_components/StatTile.tsx (G4) rather than imported —
// that file's own comment says promote to src/components/ui at the THIRD consumer; H4 is the
// second, so this stays route-local per the same rule. Visual contract unchanged: border/subtle
// 1px + shadow/xs + radius/xl + pad space/6 + gap 16, 48px accent iconCircle over a 4-gap text
// stack. H4's stat row has no `delta` in any of its four tiles (see docs/design/h4-discovery.md
// §1), which is this component's only shape — no prop drift from the G4 original.
export type TileAccent = 'blue' | 'success' | 'indigo' | 'neutral'

const ACCENT: Record<TileAccent, string> = {
  blue: 'bg-brand-blue-100 text-brand-blue-600',
  success: 'bg-success-100 text-success-700',
  indigo: 'bg-brand-indigo-100 text-brand-indigo-600',
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
    <div className="flex flex-1 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6 shadow-xs">
      <div className="flex w-full items-center justify-center">
        <span
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full',
            ACCENT[accent],
          )}
        >
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>
      <div className="flex w-full flex-col gap-1">
        <p className="text-body-sm font-medium text-text-secondary">{label}</p>
        {/* leading-[normal], not leading-normal — see the G4 original's note (StatTile.tsx). */}
        <p
          className={cn(
            'text-[28px] font-bold leading-[normal]',
            muted ? 'text-text-muted' : 'text-brand-blue-800',
          )}
        >
          {value}
        </p>
        <p className="text-body-sm text-text-muted">{subtitle}</p>
      </div>
    </div>
  )
}

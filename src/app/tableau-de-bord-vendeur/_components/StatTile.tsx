import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

// Glance tile — measured from the G4 specimen 484:24205 (`glance-*`, 272×196 at 1440).
// border/subtle 1px + shadow/xs + radius/xl + pad space/6 + gap 16; a 48px accent iconCircle over
// a 4-gap text stack (label 14/21 Medium text/secondary · value 28 Bold blue/800 · sub 14/21
// text/muted). Value is 28px raw: the type ramp has no 28 step, and it is a structural stat number
// rather than a ramp step (design system §3), so it stays a literal here.
//
// The four accents are the measured ones, in frame order: blue-100 · success-100 · indigo-100 ·
// surface-sunken. `neutral` exists because "Produits actifs" is deliberately unaccented — it is a
// count, not a signal.
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
        <p
          className={cn(
            'text-[28px] font-bold leading-normal',
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

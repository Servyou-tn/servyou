import { ArrowDown, ArrowUp, Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'
import { figureDir } from './parts'

// The admin « StatTile » (Figma NOV 4 — Admin, J1 / J8 / M1: StatTile / color=…, delta=…, kebab=off): pad 24, gap 16,
// border subtle, radius 12; a 48 icon circle (24 glyph — the frame draws icon-inbox on every tile); then label 14
// Medium secondary · value 28 Bold blue-800 · either a delta row (16 arrow + 14 Medium; the arrow shows the sign, the
// colour the meaning: success good / danger bad — a shorter delay is green)
// or a 14 Regular muted subtitle. A different recipe from src/components/shared/StatTile (pad 20, 44 circle,
// value text-primary), so it stays admin-local; the J3 tiles in UserDetailView share the value style.
const ACCENT = {
  green: 'bg-success-100 text-success-500',
  blue: 'bg-brand-blue-100 text-brand-blue-600',
  indigo: 'bg-brand-indigo-100 text-brand-indigo-500',
  neutral: 'bg-surface-sunken text-text-secondary',
} as const
export type KpiAccent = keyof typeof ACCENT

export type KpiDelta = { direction: 'up' | 'down' | 'flat'; tone: 'good' | 'bad' | 'neutral'; text: string; label: string }

const TONE = { good: 'text-success-500', bad: 'text-danger-500', neutral: 'text-text-muted' } as const

export function KpiTile({
  label,
  labelShort,
  value,
  accent = 'neutral',
  delta,
  subtitle,
  subtitleShort,
  className,
}: {
  label: string
  /** M1 375 draws shorter labels (« Reçues » for « Commandes reçues »); shown below lg when given. */
  labelShort?: string
  value: string
  accent?: KpiAccent
  /** Shown only when the previous period gives a base (the caller decides); `label` is the sr-only reading. */
  delta?: KpiDelta | null
  subtitle?: string | null
  subtitleShort?: string | null
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6', className)}>
      <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-full', ACCENT[accent])} aria-hidden="true">
        <Inbox className="size-6" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-body-sm font-medium text-text-secondary">
          {labelShort ? <><span className="lg:hidden">{labelShort}</span><span className="max-lg:hidden">{label}</span></> : label}
        </p>
        {/* <bdi dir="ltr">: « 4 / 8 », « 12,5 % » and « 1 240 TND » keep their order inside Arabic. */}
        <p className="text-[28px] font-bold leading-[34px] text-brand-blue-800"><bdi dir={figureDir(value)}>{value}</bdi></p>
        {delta ? (
          <p className="flex items-center gap-1">
            {delta.direction === 'up' ? <ArrowUp className={cn('size-4', TONE[delta.tone])} aria-hidden="true" /> : null}
            {delta.direction === 'down' ? <ArrowDown className={cn('size-4', TONE[delta.tone])} aria-hidden="true" /> : null}
            {/* Template string, not cn(): twMerge would evict text-body-sm next to the colour. */}
            <span
              aria-hidden="true"
              dir={figureDir(delta.text)}
              className={`${TONE[delta.tone]} text-body-sm font-medium`}
            >
              {delta.text}
            </span>
            <span className="sr-only">{delta.label}</span>
          </p>
        ) : subtitle ? (
          <p className="text-body-sm text-text-muted">
            {subtitleShort ? <><span className="lg:hidden">{subtitleShort}</span><span className="max-lg:hidden">{subtitle}</span></> : subtitle}
          </p>
        ) : null}
      </div>
    </div>
  )
}

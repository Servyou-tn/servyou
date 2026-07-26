import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// Button — F3 primitive, measured from Figma COMPONENT_SET 19:207 (42 variants), token-bound, and
// compliant with the four shared/ui boundary rules (tokens only, role-agnostic, feature-independent,
// no caller-and-self CSS). Appearance is Figma's; behaviour is the app's (learned across ~40 bespoke
// call sites the primitive replaces — loading/disabled/re-entrancy/RTL/type=button/icon-only naming).
//
// Reconciliation notes worth keeping:
//   • Loading announces itself (aria-busy) — repo-wide, aria-busy existed on exactly ONE element
//     before this primitive. The spinner LEADS and the label STAYS visible (no width jump / no lost
//     accessible name); the button is disabled while busy so a double-submit can't fire.
//   • Disabled is a RECOLOR (surface-sunken / text-muted), per Figma — not the three different
//     opacities (50/60/70) the call sites had.
//   • Focus is the shared FOCUS_RING (2px brand-blue-600 offset), not Figma's #808080 placeholder
//     stroke — which is itself bound to $blue/600, so the ring matches design intent.
//   • Label weight is font-semibold. Figma's label weight was an UNSET DEFAULT (Inter Regular/400 —
//     no fontWeight/fontStyle variable bound on any of the 42 labels), inconsistent with StatusPill
//     (Semi Bold) and the ~40 call sites (medium/semibold). Corrected to Semi Bold in the Figma
//     SOURCE first (all 42 labels), then built here — source completes before code reads it.
//   • danger hover/pressed use danger-700 (Figma renders #808080 grey there — an authoring gap; see
//     docs/follow-ups.md). link has no Figma hover, so we add underline.
//   • Touch target: md is 40px (desktop size). On mobile it must offer a ≥44px hit area WITHOUT
//     changing the rendered 40px box (else it would fight the VRT baseline). The boundary lint forbids
//     the arbitrary `content-['']` a real ::before needs, so the hit area is an invisible, aria-hidden
//     child that paints nothing (VRT-neutral) and extends the clickable region by 2px on every side.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

// Default colours per variant (Figma bindings: $blue/*, $surface/*, $border/strong, $danger/*, $text/*).
const VARIANT_BASE: Record<ButtonVariant, string> = {
  primary: 'bg-brand-blue-600 text-text-inverse',
  secondary: 'bg-surface-base border border-border-strong text-text-primary',
  ghost: 'text-brand-blue-600',
  danger: 'bg-danger-500 text-text-inverse',
  link: 'text-brand-blue-600',
}

// Hover / pressed — applied only when interactive (skipped while loading so a busy button can't
// flash a hover state, and dropped when disabled).
const VARIANT_STATE: Record<ButtonVariant, string> = {
  primary: 'hover:bg-brand-blue-700 active:bg-brand-blue-800',
  secondary: 'hover:bg-surface-subtle active:bg-surface-sunken',
  ghost: 'hover:bg-brand-blue-50 active:bg-brand-blue-100',
  danger: 'hover:bg-danger-700 active:bg-danger-700', // Figma renders #808080 grey — see follow-ups
  link: 'hover:underline active:text-brand-blue-800', // link has no Figma hover treatment
}

// Disabled recolor (Figma: fill $surface/sunken + $text/muted). link stays transparent (Figma 19:146).
const VARIANT_DISABLED: Record<ButtonVariant, string> = {
  primary: 'bg-surface-sunken text-text-muted border-transparent',
  secondary: 'bg-surface-sunken text-text-muted border-transparent',
  ghost: 'bg-surface-sunken text-text-muted border-transparent',
  danger: 'bg-surface-sunken text-text-muted border-transparent',
  link: 'text-text-muted',
}

// Heights/type are Figma-measured (sm 32 · md 40 · lg 48; sm 14px, md/lg 16px). Padding is token-scale
// (Figma authored a fixed 120px demo width, so real padding was never encoded — see follow-ups).
const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-6 text-base',
}

const BASE = cn(
  'relative inline-flex items-center justify-center gap-2 rounded-lg font-semibold whitespace-nowrap',
  'transition-colors motion-reduce:transition-none disabled:cursor-not-allowed',
  '[&_svg]:size-4 [&_svg]:shrink-0',
  FOCUS_RING,
)

export type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Shows a leading spinner, sets aria-busy, and disables the button (non-interactive while busy). */
  loading?: boolean
  /** Leading icon (a lucide glyph). Replaced by the spinner while loading. */
  iconStart?: React.ReactNode
  /** Trailing icon. */
  iconEnd?: React.ReactNode
} & React.ButtonHTMLAttributes<HTMLButtonElement>

/**
 * Icon-only usage (no text child) MUST pass `aria-label` — the a11y contract (§Button) requires an
 * accessible name. Enter/Space activation and focus come free from the real <button> element.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  iconStart,
  iconEnd,
  disabled = false,
  type,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  const colors = disabled
    ? VARIANT_DISABLED[variant]
    : cn(VARIANT_BASE[variant], !loading && VARIANT_STATE[variant])

  return (
    <button
      {...props}
      type={type ?? 'button'}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(BASE, SIZE[size], colors, className)}
    >
      {loading ? <Loader2 aria-hidden="true" className="animate-spin" /> : iconStart}
      {children}
      {iconEnd}
      {/* Mobile touch-target: extends the hit region to ≥44px without altering the 40px box or any
          painted pixel. md only (sm is desktop/table-only; lg is already 48px). */}
      {size === 'md' && <span aria-hidden="true" className="absolute -inset-0.5" />}
    </button>
  )
}

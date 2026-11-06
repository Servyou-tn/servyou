import { createElement } from 'react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// One source of truth for every interactive surface across the consumer shell — the sidebar
// account buttons, the top-bar toggle pills, the search pill, the bell, and the avatar. Locking
// the height / idle surface / hover / active treatment / focus ring here makes future drift
// impossible: each call site only adds its own shape + padding.

// 44px — meets the WCAG touch-target standard.
export const SURFACE_HEIGHT = 'h-11'

// Same rounded-full shape for labelled pills and icon circles alike.
export const SURFACE_SHAPE_PILL = 'rounded-full'
export const SURFACE_SHAPE_CIRCLE = 'rounded-full'

// The resting surface: white card with a subtle border + a soft drop-shadow that reads as lifted
// (not the flat 1px shadow-sm) — the whole interactive family shares this depth.
export const SURFACE_IDLE =
  // eslint-disable-next-line shared-ui/no-raw-color -- off-token custom shadow; F3 design decision (docs/f2-state.md)
  'bg-white border border-border-subtle shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-text-primary'

// The hover lift (carries the transition so unhovered → hovered is smooth) — a stronger drop.
export const SURFACE_HOVER =
  // eslint-disable-next-line shared-ui/no-raw-color -- off-token custom shadow; F3 design decision (docs/f2-state.md)
  'transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]'

// The selected treatment — a light brand-blue-600 tint (Linear / Vercel / Stripe pattern), NOT a
// solid fill. A selected surface is stable: it keeps the tint, no hover swap. Same lifted shadow
// as idle (it's last in the cn() chain for active, so it must carry the upgraded depth too).
export const SURFACE_ACTIVE =
  // eslint-disable-next-line shared-ui/no-raw-color -- off-token custom shadow; F3 design decision (docs/f2-state.md)
  'bg-brand-blue-600/10 border-brand-blue-600/40 text-brand-blue-600 shadow-[0_2px_8px_rgba(0,0,0,0.06)]'

// The shared focus ring (re-exported so call sites import everything from one place).
export { FOCUS_RING }

// The composed surface — height + idle white surface + focus ring, plus EITHER the hover lift
// (inactive) or the brand-blue-600 tint (active). cn() ensures the active tint reliably overrides
// the idle bg/border/text (tailwind-merge keeps the last of each conflicting utility — a raw
// string would let the CSS cascade pick the winner unpredictably). Call sites add shape +
// padding (a label pill, an icon circle, the search wrapper).
export const interactiveSurface = (active = false) =>
  cn(
    SURFACE_HEIGHT,
    SURFACE_IDLE,
    FOCUS_RING,
    active ? `transition-all duration-200 ease-out ${SURFACE_ACTIVE}` : SURFACE_HOVER,
  )

// ── HitArea — the mobile 44 px tap target, painted nothing ──────────────────────────────────────────────────────
// WCAG 2.5.5 / the touch-target rule: below lg every tap target offers ≥ 44 × 44. The box itself must not change
// (painted pixels are VRT baselines), so the target gets an invisible, aria-hidden child that extends its hit
// region past its edges, below lg only — desktop keeps its exact hit area. The parent must be `relative` (or
// `max-lg:relative`). `size` is the target's own box on the axis being extended; the inset is (44 − size) / 2 on
// the spacing scale. `axis="y"` extends only vertically — for a wide target that is already ≥ 44 across, or for
// segments that sit side by side. A positioned span paints (and hit-tests) above non-positioned neighbours, so an
// extension that overlaps a neighbour steals its taps: where two targets are less than 12 px apart, pass the larger
// `size` whose inset fits in half the gap, so neither steals the other's tap.
export type HitAreaSize = 16 | 20 | 24 | 28 | 32 | 36 | 40
// (44 − size) / 2, plus 1 px: an absolute inset is measured from the PADDING box, so on a target with a 1 px border
// the plain value would fall 1 px short on each side (a bordered 40 px secondary button reached only 42). The extra
// pixel is invisible on a borderless target.
const HIT_INSET: Record<'both' | 'x' | 'y', Record<HitAreaSize, string>> = {
  both: { 16: 'max-lg:-inset-3.75', 20: 'max-lg:-inset-3.25', 24: 'max-lg:-inset-2.75', 28: 'max-lg:-inset-2.25', 32: 'max-lg:-inset-1.75', 36: 'max-lg:-inset-1.25', 40: 'max-lg:-inset-0.75' },
  x: { 16: 'max-lg:-inset-x-3.75', 20: 'max-lg:-inset-x-3.25', 24: 'max-lg:-inset-x-2.75', 28: 'max-lg:-inset-x-2.25', 32: 'max-lg:-inset-x-1.75', 36: 'max-lg:-inset-x-1.25', 40: 'max-lg:-inset-x-0.75' },
  y: { 16: 'max-lg:-inset-y-3.75', 20: 'max-lg:-inset-y-3.25', 24: 'max-lg:-inset-y-2.75', 28: 'max-lg:-inset-y-2.25', 32: 'max-lg:-inset-y-1.75', 36: 'max-lg:-inset-y-1.25', 40: 'max-lg:-inset-y-0.75' },
}

/** The class list of a hit-area span — for the rare call site that cannot render the component (a CSS-only slot). */
export function hitAreaClass(size: HitAreaSize, axis: 'both' | 'x' | 'y' = 'both'): string {
  // `max-lg:` only: at lg+ the span has no inset, so it is a 0 × 0 absolute box and adds no hit area.
  // On an x/y-only extension the other axis spans the target exactly (inset-x-0 / inset-y-0).
  const other = axis === 'y' ? 'max-lg:inset-x-0' : axis === 'x' ? 'max-lg:inset-y-0' : ''
  return cn('pointer-events-auto absolute', HIT_INSET[axis][size], other)
}

/** Invisible, aria-hidden hit extension (see above). Render it as the LAST child of a `relative` tap target. */
export function HitArea({ size, axis = 'both' }: { size: HitAreaSize; axis?: 'both' | 'x' | 'y' }) {
  return createElement('span', { 'aria-hidden': true, className: hitAreaClass(size, axis) })
}

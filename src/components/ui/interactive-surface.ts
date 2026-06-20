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
  'bg-white border border-border-subtle shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-text-primary'

// The hover lift (carries the transition so unhovered → hovered is smooth) — a stronger drop.
export const SURFACE_HOVER =
  'transition-all duration-200 ease-out hover:bg-slate-50 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]'

// The selected treatment — a light brand-accent tint (Linear / Vercel / Stripe pattern), NOT a
// solid fill. A selected surface is stable: it keeps the tint, no hover swap. Same lifted shadow
// as idle (it's last in the cn() chain for active, so it must carry the upgraded depth too).
export const SURFACE_ACTIVE =
  'bg-brand-accent/10 border-brand-accent/40 text-brand-accent shadow-[0_2px_8px_rgba(0,0,0,0.06)]'

// The shared focus ring (re-exported so call sites import everything from one place).
export { FOCUS_RING }

// The composed surface — height + idle white surface + focus ring, plus EITHER the hover lift
// (inactive) or the brand-accent tint (active). cn() ensures the active tint reliably overrides
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

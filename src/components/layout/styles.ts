// Shared interaction styles for the Header. Keeping the focus ring in one place
// guarantees every interactive element gets the identical, WCAG-visible ring
// (2px brand-accent, 2px offset) — the spec's "never outline:none without a
// replacement": we suppress the default outline and supply a ring instead.
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base'

// Whisper-soft shadow system shared by every floating white card on /marche
// (sidebar, search bar, listing cards, empty-state cards). One source of truth keeps
// the arbitrary values identical everywhere. CARD_SHADOW is the resting tier;
// HOVER_SHADOW is the lift applied on hover/focus-within (pair them on the same card
// with `transition-all duration-300 ease-out`).
export const CARD_SHADOW = 'shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
export const HOVER_SHADOW = 'hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'

// Sticky wrapper for the freelancer horizontal filter bars (/emplois, and the freelancer view of
// /marche/produits·/marche/services). Pins just under the MarcheTopBar using --marche-topbar-h —
// the same dynamic-height variable the sidebar sticks to, so it tracks the navbar's real height
// rather than a hardcoded offset. z-30 sits below the navbar (z-40); the navbar's dropdowns and the
// chips' own Radix popovers are portalled at z-50, so they always render above the bar. Opaque
// bg-white + a bottom border keep scrolling cards from bleeding through and separate the bar from
// the content. Pair on the same element as the bar's `flex … overflow-x-auto` (the chips scroll
// horizontally on mobile; the popovers are portalled, so the overflow never clips them).
export const STICKY_FILTER_BAR =
  'sticky top-[var(--marche-topbar-h,4.5rem)] z-30 border-b border-border-subtle bg-white'

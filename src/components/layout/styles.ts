// Shared interaction styles for the Header. Keeping the focus ring in one place
// guarantees every interactive element gets the identical, WCAG-visible ring
// (2px brand-blue-600, 2px offset) — the spec's "never outline:none without a
// replacement": we suppress the default outline and supply a ring instead.
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-600 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base'

// Whisper-soft shadow system shared by every floating white card on /marche
// (sidebar, search bar, listing cards, empty-state cards). One source of truth keeps
// the arbitrary values identical everywhere. CARD_SHADOW is the resting tier;
// HOVER_SHADOW is the lift applied on hover/focus-within (pair them on the same card
// with `transition-all duration-300 ease-out`).
export const CARD_SHADOW = 'shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
export const HOVER_SHADOW = 'hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]'

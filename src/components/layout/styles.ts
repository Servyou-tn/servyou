// Shared interaction styles for the Header. Keeping the focus ring in one place
// guarantees every interactive element gets the identical, WCAG-visible ring
// (2px brand-accent, 2px offset) — the spec's "never outline:none without a
// replacement": we suppress the default outline and supply a ring instead.
export const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-base'

// Shared className overrides for the dropdown-menu / popover primitives.
//
// The shadcn primitives default to tokens this project never wired (`bg-popover`, `bg-accent`,
// `text-popover-foreground`…), so every menu in the app re-styles its content and items with app
// tokens. Those two strings were duplicated byte-for-byte in `ServicesFilterBar` and E3's
// `OrdersFilterBar`; G8's sort select is the third consumer, which is the documented threshold for
// promoting a route-local pattern into `components/ui`.
//
// Token-only and feature-independent, so this satisfies the shared/ui boundary rule.
//
// Measured on the shipped ServicesFilterBar « Catégorie » panel (the reference implementation):
//   menu  div[role=menu]          bg #ffffff · 1px solid #e2e8f0 · radius 12 · pad 4 · text/primary
//   item  div[role=menuitemradio] h32 · radius 10 · pad 6 8 6 32 · 14/20 · text/primary
// The 32px inline-start padding on an item is the primitive's own indicator gutter — it is what
// leaves room for the radio tick, so items must not override their padding.

export const MENU_CONTENT =
  'rounded-xl border border-border-subtle bg-white p-1 text-text-primary shadow-lg'

export const MENU_ITEM =
  'cursor-pointer rounded-lg text-body-sm text-text-primary focus:bg-surface-subtle focus:text-text-primary'

export const POPOVER_CONTENT =
  'rounded-xl border border-border-subtle bg-white text-text-primary shadow-lg'

# Button's single disabled treatment conflates two different meanings — ruled OUT of scope for G7 (fix/g7-header-and-dirty-state, 2026-08-18)
- **What:** the F3 `Button` primitive (`src/components/ui/button.tsx`) applies one recolor
  (`VARIANT_DISABLED`, `bg-surface-sunken text-text-muted`, lines 52-59) to every disabled state
  regardless of *why* it is disabled. Two distinct semantics share it across call sites: **"fill
  in the form" gates** — the control becomes enabled once the user acts (e.g.
  `components/produits/ProductForm.tsx:322`, `disabled={!canPublish}` on the Publish button) —
  and **hard blocks** — the control cannot become enabled by anything the user types in this
  session (e.g. `app/mes-produits/[id]/modifier/_components/EditProductForm.tsx:404`,
  `disabled={product.hasOrders}` on the delete button, permanently blocked while the product has
  order history, with adjacent copy explaining why).
- **Why one shared treatment cannot be right for both (founder ruling, 2026-08-18):** a gate wants
  to read as "not yet — do the thing and this unlocks." A hard block wants to read as "not
  available, and nothing you type here changes that." The same grey undersells the block and
  oversells the gate; fixing one by recoloring it would misrepresent the other.
- **Ruled OUT of G7:** this is a design-system decision on the primitive's `VARIANT_DISABLED`
  table, not something a single edit form should patch around. G7 ships with `Button` unchanged.
- **Trigger:** a DS pass on `Button` — likely wants a second disabled treatment (e.g. a
  `disabledReason`/hard-block variant, mirroring the `disabledTitle` pattern G7's own status
  `Select` already uses at `EditProductForm.tsx:374-375`) rather than one boolean `disabled` prop
  covering both meanings.

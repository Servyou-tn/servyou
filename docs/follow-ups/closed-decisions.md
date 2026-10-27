# Closed decisions — do NOT "fix" these

Settled deliberately, with the reasoning, so a later pass does not read them as defects and
undo them. A closed decision is not a deferral.

## ✅ Orders do NOT snapshot a product image — the 48×48 falling back to its icon is CORRECT

- **Decision (founder, 2026-07-31):** `orders` will **not** get an `item_image_url` column.
- **Why, and this is the whole point:** `item_title` and `unit_price_tnd` are frozen because they
  are **facts about money and identity** — what was bought and what it cost must survive the
  product being edited or deleted. **A thumbnail is decorative.** It is not a fact the order needs
  to be correct.
- **And freezing would not even work.** A frozen URL does not survive the storage object being
  deleted. Snapshotting the path buys a **broken image** (a 404'd `<img>`, or alt text under
  `next/image`) instead of the clean icon placeholder that renders today. That is strictly worse:
  a broken image reads as a bug, an icon placeholder reads as "no photo".
- **So the expected behaviour is:** product deleted → `orders.product_id` goes NULL (existing
  `ON DELETE SET NULL`) → `product_images` rows CASCADE away → the G9 order row renders its
  **icon placeholder** at `_components/OrderActionRow.tsx:64`, while title and price still render
  from the snapshot. **This is the design, not a gap.**
- **Do not** "restore" the thumbnail by adding a snapshot column, and do not copy the image to an
  order-owned path (that doubles stored bytes for every ordered image against the 1 GB cap that
  is the binding storage constraint).
- **Context:** `docs/design/image-storage-discovery.md` §6b. Its §7b trigger analysis
  (`set_order_snapshot` reads scalars, so any future snapshot column needs a correlated subquery
  over `product_images` and must not raise when there is no image) stays valid and is worth
  reading first *if* a snapshot column is ever genuinely justified.

## ✅ The sidebar's Marketplace item is expandable — a deliberate REVERSAL of the 2026-06-27 flat-IA ruling, not drift

- **Decision (founder, 2026-08-15, PR `feat/sidebar-marketplace-and-shell-migration`):** the
  Marketplace item in `sidebar-items.ts` expands to two sub-items (Produits/Services). Clicking it
  navigates to Produits AND expands; clicking Services navigates there and the expansion follows
  the route. This is the ONE exception to the flat, no-nesting sidebar IA the founder locked on
  2026-06-27 (`sidebar-items.ts:17`, "supersedes the example item list in design system Section
  6.1").
- **Why this reverses the ruling rather than violating it:** the 2026-06-27 flat IA assumed a
  visitor could still switch between the Produits and Services marketplace engines some other way.
  That other way — the legacy marche top bar's Produits/Services text-link toggle
  (`MarcheTopBar.tsx`'s `NavTextLinks`) — was retired in this SAME PR, and no cross-engine toggle
  exists anywhere else now (`/marche/services` and `/marche/produits` each keep only their OWN
  local toggle — Services/Freelances and Produits/Boutiques respectively, per the same PR's
  ruling). Once that was gone, the sidebar had to become the thing that moves a visitor between
  the two engines — new information the 2026-06-27 decision didn't have, not a change of mind.
- **Contained, not a general nested-item model:** `SidebarItemDef` gained one optional `subItems`
  field and Sidebar.tsx gained one conditional branch — every other item in every other section is
  still a flat leaf. If a second item ever needs the same treatment, that's the trigger to
  generalize; one exception is not.
- **Do not** read this as license to nest other sidebar items, and do not "simplify" it back to
  flat without first checking whether a cross-engine toggle has been rebuilt somewhere else — if
  one hasn't, collapsing this back to a flat Marketplace link removes the only way to reach the
  Services engine from the sidebar.
- **INFERRED, not measured:** no Figma frame exists for a chevron/expand affordance on the v2 navy
  sidebar (`SidebarItem.tsx` cites `611:45637`, flat-only) and the quota was exhausted before this
  PR. The `ChevronDown` + `rotate-180` treatment (matching `MarcheSidebar.tsx`'s old filter toggle
  and `AccountMenu.tsx`'s dropdown, not a directional `ChevronRight` idiom) is a reasoned choice,
  not a measured one — re-check against a real frame if the quota ever resets.

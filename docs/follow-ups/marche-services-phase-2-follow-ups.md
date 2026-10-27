# /marche/services Phase 2 — follow-ups (from feat/marche-services-rebuild, 2026-07-26)

## 🔴 The Figma radius scale is in `:root` but NOT in `@theme` — `rounded-lg` is still 8px
- **What:** `src/styles/tokens.css` (generated from Figma) defines the canonical radius ramp,
  including **`--radius-lg: 10px`**, but it emits them into **`:root`**. Tailwind v4 only turns a
  custom property into a utility when it is declared inside **`@theme`**, and `globals.css`'s
  `@theme inline` block adds only `--radius-card` / `--radius-pill` — its comment says so
  explicitly: *"Semantic spacing/radius/shadow aliases (distinct names; **no built-in scale
  overridden**)"*. So **`rounded-lg` still resolves to Tailwind's built-in 8px**, and the DS token
  at 10px is unreachable from a class name. Same mismatch for `--radius-md` (8px token vs. the
  built-in `rounded-md` 6px).
- **Consequence:** every surface the Figma measures at radius 10 — sidebar nav items, the topbar
  search + icon buttons, the filter-bar controls, the lens-toggle track, the card CTA — must ship
  `rounded-[10px]`. Swapping those to `rounded-lg` looks like a free token cleanup and is actually
  a silent **2px regression**; nothing catches it (the boundary lint gates colour, not dimension,
  and the build stays green). This is the `docs/design/marche-services-measurements.md` gap #1,
  now diagnosed to its root cause.
- **Why deferred:** the fix — wiring the generated radius scale into `@theme` (or adding a
  distinct-name alias such as `--radius-control: 10px`, following the `--radius-card` precedent) —
  **retunes 34 existing `rounded-lg` call sites by +2px**, including the F3 `Button` primitive,
  whose VRT baselines are committed at the 0.05% threshold. That is a guaranteed gate break and a
  full re-baseline: a DS PR, not a page rebuild.
- **Related, check when doing it:** F3's `Button` standardizes on `rounded-lg`. If the Figma
  measured its radius at 10, the merged primitive already carries this same 2px delta.
- **Trigger:** a DS radius/token PR that can afford the re-baseline.

## ServiceCard off-token values with no DS equivalent
- `h-[279px]` (measured card height) and `text-[17px]` (measured price size) in
  `ServiceListingCard.tsx` have **no token to map to** — forcing them onto a near tier would be
  worse than a documented raw value, and neither fails CI. Retained deliberately, commented in
  place. **Trigger:** re-evaluate when the type ramp gets its Figma pass (typography is still the
  documented token gap — see `docs/frontend-audit.md`).

## Consolidate `ServicesLensToggle` into the shared `SegmentedControl`
- **What:** `ServicesLensToggle` is a bespoke parallel toggle. It was deliberately **kept** in
  this PR: the shared `src/components/ui/segmented-control.tsx` supports neither a **disabled
  option** nor a **"Bientôt" badge**, and both are load-bearing while the Freelances lens is
  deferred. Adding them is component work that would block a page build.
- **Trigger:** the F3 Segmented reconciliation batch (see the parked inventory below) — add
  disabled-option + badge + per-option icon support there, then migrate this toggle.

## `service_listings` has no `is_published` column — the publish gate is `status='active'`
- **What:** Verified against the live schema: `service_listings` carries `status text NOT NULL`
  (plus `admin_hidden_at`) and **no `is_published`**. Every consumer surface gates on
  `status = 'active'`. The locked two-CTA **Save / Publish** model assumes an `is_published` flag
  per publishable entity, so draft-vs-published is currently encoded in `status` values rather
  than a dedicated column.
- **Why deferred:** reconciling the two is a **schema migration** (add the column, backfill from
  `status`, update every read path + RLS), approval-gated and discovery-first — not a frontend
  rebuild's scope.
- **Trigger:** before H6/H7 (create/edit service) ship their real two-CTA footer; fold in the
  equivalent `products` gate so both catalogs move together.

## Ville filter — mobile parity + /recherche exposure
- The desktop `ServicesFilterBar` now has a **Ville** dropdown; the mobile `SearchFiltersSheet`
  does **not**. That sheet is **shared with /recherche**, so adding a city control there changes
  two surfaces at once and needs its own pass. The `ville` param itself lives in the shared
  search layer and already applies on /recherche if hand-typed (and now counts in
  `searchHasFilters`), it is simply not exposed in that UI yet.
- **Trigger:** fold Ville into the shared filter sheet when /recherche gets its rebuild.
- **Known ambiguity in the empty state:** the control is hidden when `cities` is empty, and
  `getServiceCities()` also returns `[]` on a **query error** (logged, per the never-a-silent-
  empty-list rule). So a transient failure removes the Ville dropdown while Catégorie and Prix
  still render — it reads as "this page has no city filter" rather than "degraded". Deliberate
  (it beats a dead control), but do not mistake a missing Ville dropdown for a regression:
  check the server log for `[filter-cities]` first.

## Avatar placeholder grey (`#cbd5e1`) has no semantic token
- The Figma topbar avatar fill is **#cbd5e1**; the DS `--surface-placeholder` is **#f4f4f4**. The
  F2 `Avatar` primitive's person-glyph fallback already paints `bg-border-strong`, which **is**
  #cbd5e1 — a *border* token used as a background. It wants a slate/300 primitive, and the slate
  ramp is already logged as missing in the token inventory. **No raw hex was introduced**; the
  topbar avatar keeps the primitive's Figma-measured `initials` variant (brand-blue-100 /
  brand-blue-600) rather than being repainted, because the fill lives inside the F2 primitive and
  changing it would re-baseline the F2 VRT snapshots.
- **Trigger:** the DS pass that adds the slate ramp — then give the fallback a real
  `avatar-placeholder` surface token and drop the border-token-as-background.

# H5 — Mes services (`feat/h5-mes-services`, 2026-09-05)

## `StatTile` is now at its documented third consumer — promote to shared
- `tableau-de-bord-vendeur/_components/StatTile.tsx` (G4) and `tableau-de-bord/_components/
  StatTile.tsx` (H4) both already carry the "promote at the 3rd consumer" comment.
  `mes-services/_components/StatTile.tsx` (H5) is the third route-local copy — and it needed a
  `delta` region neither of the first two has (H5's "Commandes ce mois" tile is the first REAL
  delta value in the app; H4's own "Vues du profil" tile deliberately renders none).
- **Not promoted here.** Promoting means designing one shared shape covering all three tiles'
  measured deltas (G4: no delta, always a subtitle; H4: no delta, optional muted value; H5: an
  optional signed delta ALONGSIDE a caption) and repointing two already-shipped dashboards at it —
  out of an H5 page-build PR's scope, same reasoning `FreelancerShareButton` used above.
- **Trigger:** a fourth consumer, or a dedicated component-consolidation pass.

## `marche.sidebar.coming_soon`'s Arabic value is untranslated French — found while building H5
- `src/lib/i18n/ar.ts` line ~1382: `'marche.sidebar.coming_soon': "Bientôt disponible"` — the exact
  French string, not translated. H5 reuses this key for its two permanently-inert CTAs ("+ Créer un
  service" and the kebab's "Modifier", both disabled because H6/H7 don't exist in code yet), and
  the AR curl-verified render confirmed the leak lands on H5's own AR page, not just wherever this
  key was first used.
- **Not fixed here.** The key is shared across the sidebar, admin nav, and at least one other
  ParametresForm consumer (per its own comment) — retranslating it is a one-line fix but touches
  shared copy from inside an H5 PR, which is exactly the drive-by CLAUDE.md's one-PR-one-focus rule
  exists to stop, however small.
- **Trigger:** its own tiny PR — translate to something like "قريبًا" or "متاح قريبًا" and
  re-verify every consumer's AR render (sidebar, admin nav, ParametresForm, H5 now too).

## Service Row's category-specific thumb icon — real column, no icon data behind it (founder to rule)

- **Founder's own H5 fidelity pass (2026-09-06)** asked whether the row's per-category glyph (Figma
  258:7898's `thumb-icon`, swapped per service — palette/code/video/file-text/megaphone/languages)
  maps to a real column, and to report rather than invent a mapping if not.
- **What's real:** `service_listings.category_id` (migration `20260625000000`) is a genuine FK to
  `public.categories`. It is currently NOT selected in `seller-services-query.ts` — `SellerServiceRow`
  carries no category field at all, and `ServiceRow.tsx` renders a single hardcoded `Wrench` glyph
  for every row regardless of category.
- **Why it's not a simple wire-up:** `public.categories` (flat, 14 rows, migration `20260603182553`)
  has NO icon column — icons exist only in the separate `src/lib/taxonomy/service-categories.ts`
  (13 richer sectors: `developpement-web-mobile`, `design-graphique-logo`, …, each with a lucide
  `icon` name). The DB's flat service-kind slugs (`developpement`, `design-creation`, `marketing`, `montage-video`,
  `redaction`, `business-conseil`, `ugc`, `data-science-analyse` — from `20260804132447`'s backfill)
  do not line up 1:1 with the TS taxonomy's slugs, and reconciling them is the deferred taxonomy
  migration [[project_service_taxonomy]] already tracks, not this PR's scope.
- **Not fixed here** — per the founder's own instruction not to invent a mapping. Thumb stays the
  generic `Wrench` glyph for every row.
- **Trigger:** the taxonomy reconciliation migration lands (DB `categories.slug` aligned with
  `service-categories.ts` `id`) → then `seller-services-query.ts` can join `category_id` → slug →
  `serviceCategories.find(c => c.id === slug)?.icon` → a lucide icon-name→component lookup in
  `ServiceRow.tsx`.
- **✅ RESOLVED — `feat/h5-mes-services`, 2026-09-06.** Founder ruling: build it now against the 8
  real `categories.slug` values under `kind='service'` (`developpement`, `design-creation`,
  `marketing`, `montage-video`, `redaction`, `business-conseil`, `ugc`, `data-science-analyse` —
  confirmed live via `select slug, kind from categories`), independent of the taxonomy
  reconciliation above. `seller-services-query.ts` now joins `categories(slug)` and
  `SellerServiceRow.categorySlug` carries it through; `ServiceRow.tsx` holds a static
  `CATEGORY_ICONS` record (Code/Palette/Megaphone/Video/FileText/Briefcase/Camera/BarChart3),
  `Wrench` fallback for null/unmapped. The icon choices are founder-ruled, not measured against
  Figma — if the taxonomy migration above ever lands, re-derive from `service-categories.ts`'s own
  `icon` field instead of keeping this record as a second source of truth.

## Segmented control's selected-pill fill vs. H5's own frame — new sighting on the open consolidation question above

- Surfaced during the same H5 fidelity re-pass (2026-09-06) that produced the category-icon
  ruling above, and adds a fourth data point to the still-open **"`SegmentedControl`'s solid blue
  pill vs. the quiet frame — founder-ruled for F1, four implementations still unconsolidated"**
  entry a few sections up in this same file: the shipped
  `SegmentedControl` (`src/components/ui/segmented-control.tsx`) renders its selected tab as a
  solid `bg-brand-blue-600` pill with white label text; H5's own status-tabs frame (244:726)
  appears, from screenshot inspection, to show a white-pill-on-grey-track treatment instead — the
  same "quiet" look that entry already confirmed for F1's frame (`718:60584`, `surface-sunken`
  tokens) against this component's blue-fill default.
- **Unverified, not folded into that entry's evidence table yet** — both available Figma read
  paths (`get_design_context` and a `get_metadata` fill-inspection on the pill node) were
  exhausted before a clean fill-color read on 244:726 came back, and a
  screenshot-only comparison is exactly the kind of cross-zoom read this file has been burned by
  before (see the row-height sighting from this same fidelity pass — screenshot vs. Figma image at
  different zooms, no real divergence once DOM-measured). Do not treat this sighting as confirming
  244:726 is "quiet" — only that it looks that way, same evidentiary bar the existing entry already
  holds itself to for its two unchecked callers.
- **`SegmentedControl`'s actual current callers, re-counted against the live tree (grep +
  DOM-verified render, not memory) — the caller list in the existing entry is now stale in three
  places, so re-verify before scoping the consolidation PR:** only **two** call sites render
  today — `src/app/mes-services/_components/ServiceFiltersBar.tsx` (H5 status tabs, this PR) and
  `src/app/mes-produits/[id]/modifier/_components/EditProductForm.tsx` (product status toggle) —
  both DOM-confirmed live at 40px on 2026-09-06. The third importer,
  `src/components/dashboard/shell/SharedSearchBar.tsx`, is **unreachable**: it renders only under
  `DashboardTopBar` → `DashboardShellClient`, which this same file already documents as having
  zero render call sites anywhere in `src` (see "`DashboardSidebar.tsx` has a stale
  `/mes-missions` href — left alone, dead code"). `/marche/produits` and `/recherche` were gated
  for it and produced no `[role="tablist"]` at all. `FavorisTabs` (F1) no longer imports
  `SegmentedControl` per that entry's own fix, and the `ParametresForm` FR/AR toggle it names does
  not exist under that name in the current tree (`ParametresShell.tsx` carries no
  `SegmentedControl` import). Net: a fill change would repaint two live surfaces, not four.
- **Not fixed here** — same reasoning the existing entry already gives: one component's default
  fill is a design-system consolidation question, not a drive-by inside an H5 (or F1) page fix.
- **Trigger:** unchanged from the existing entry, now with a confirmed third frame (244:726) to
  pull alongside `718:60584`, `EditProductForm`'s and `SharedSearchBar`'s call sites — resolve all
  of it together in one design-system PR rather than another per-page patch.
- **✅ RESOLVED — `feat/h5-mes-services`, 2026-09-06.** The blocking condition above was a clean
  fill-color read on 244:726/244:727 and an accurate current caller count — this pass got both.
  `get_variable_defs`-equivalent read via the figma-cli plugin sandbox on `244:727` (the Segmented
  instance inside H5's own filter-bar) returned `surface/sunken` `#F1F5F9` track (`radius/lg` 10,
  padding 4), `surface/base` `#FFFFFF` selected pill (`radius/md` 8, `shadow 0 1 2 rgb(0 0 0/.04)`
  = `shadow-xs`), `text/primary` selected label, `text/secondary` unselected — the exact token pair
  already confirmed for F1's `718:60584` and `ProduitsLensToggle`'s `578:42513`, now a third
  independent frame agreeing on it with zero frames anywhere supporting the shipped blue fill. With
  the caller list re-audited down to the two real live consumers (`ServiceFiltersBar` and
  `EditProductForm` — `SharedSearchBar` unreachable, `ParametresForm`/`FavorisTabs` don't import
  it), "needs a design-system PR to weigh four implementations" no longer applied: there was
  nothing left to weigh, only two call sites to repaint to the pattern three frames independently
  agree on. `segmented-control.tsx` now ships `rounded-lg bg-surface-sunken` track /
  `rounded-md bg-white shadow-xs` selected pill / `text-text-primary` selected · `text-text-secondary`
  unselected, replacing the `rounded-full bg-surface-pill` / `bg-brand-blue-600` / `text-white` set.
  DOM-verified live on both callers (H5 desktop+mobile, FR+AR; `EditProductForm`'s status toggle),
  screenshot-checked via `scripts/gate/authed.mjs`-pattern CDP runs, 2026-09-07. The original
  entry's premise (four unconsolidated implementations) is now stale in the same way its own caller
  list was — closing both as resolved for the two implementations that actually exist.

# Sidebar Marketplace + legacy shell retirement (`feat/sidebar-marketplace-and-shell-migration`, 2026-08-15)

## TopbarSearch's type inference doesn't widen to /recherche or /categories/[slug]'s own query string — by design, not an oversight

- **What:** `TopbarSearch.tsx`'s type-aware fix infers `type` from PATHNAME only
  (`/marche/services` → `service`, else `product`). It does NOT read the CURRENT page's own
  `?type=` when that page is `/recherche` or `/categories/[slug]` — searching from the shell
  topbar while already on `/recherche?type=service` still resolves to product, because pathname
  alone can't see the current query string's type.
- **Why not widened:** founder call — those two pages carry `type` correctly through their OWN
  page-local `SearchQueryInput` now (it patches the CURRENT url via `buildSearchQuery`, so `type`
  survives automatically). `TopbarSearch` is the fallback path for every OTHER page (freelancer
  dashboard, shop dashboard, `/mes-commandes`, etc.), not the primary way to search from within an
  already-type-scoped result set — widening it to parse the current query string would duplicate
  logic the page-local input already owns correctly.
- **Trigger:** only if click-through shows visitors reaching for the topbar search while deep in a
  service-scoped `/recherche` or category results and getting silently bounced to products. Until
  then this is an accepted, named gap, not a bug queue item.

## `TopBarUser` type still lives in the deprecated-looking `ProfileAvatarMenu.tsx`

- **What:** `MarcheLayout.tsx` / `MarcheSidebar.tsx` / `MarcheTopBar.tsx` are deleted in this PR,
  but `ProfileAvatarMenu.tsx` stays — 8 files (`shell/AppShell.tsx`, `AppShellClient.tsx`,
  `Topbar.tsx`, `TopbarUserMenu.tsx`, `home/ConsumerHomepage.tsx`, `lib/marche/shell-user.ts`, and
  `ProfileAvatarMenu.tsx` itself) import the `TopBarUser` **type** from it; only `MarcheTopBar.tsx`
  (now deleted) ever imported the `ProfileAvatarMenu` **component** at runtime.
- **Why not moved here:** a type relocation ripples all 8 import sites for a rename with zero
  behavior change — out of scope for a PR about the sidebar and the marketplace shell migration.
- **Trigger:** the next PR that touches the shell — move `TopBarUser` to `shell/` (or a shared
  types module) and update the 8 import sites in the same commit, then `ProfileAvatarMenu.tsx`
  itself can be evaluated for deletion or a rename to reflect what it actually still does.

## Five marche/* components are now true orphans (zero importers) — not deleted here

- **What:** deleting `MarcheTopBar.tsx`/`MarcheSidebar.tsx` orphaned five components nobody else
  imports: `ExpandableSearch.tsx`, `NavTextLinks.tsx`, `HelpDropdown.tsx`, `PublishProjectCTA.tsx`,
  `SidebarSelectFilter.tsx` (grep-verified zero real importers, repo-wide). Also orphaned inside
  `lib/marche/marche-routing.ts`: the `toggleDestination`, `homeEngineHref`, and
  `resolveMarcheSidebarNav` exports (the last was already partly dead — `produitsActive`/
  `servicesActive` were computed and unit-tested but never consumed even before this PR).
  `marche-routing.ts` itself survives: `marcheRedirectTarget` is still used by `/marche`'s own
  redirect route, unrelated to this migration.
- **Why not deleted here:** the ruling for this PR named exactly three files for deletion
  (`MarcheLayout.tsx`, `MarcheSidebar.tsx`, `MarcheTopBar.tsx`). Expanding deletion to their
  now-orphaned dependents is a reasonable next step but a distinct one — "one PR, one focus,"
  same posture PR #83 (`chore/strip-legacy-consumer-ui`) took with its own cascade.
- **Trigger:** a dedicated cleanup commit — grep each name repo-wide to reconfirm zero importers
  (components can gain a new consumer between now and then) before deleting.

## AppShell has no site Footer — /recherche, /categories/[slug], and / (consumer landing) lose theirs in this migration

- **What:** `AppShellClient.tsx` renders sidebar + topbar + content, no `<Footer>`. `MarcheLayout`
  rendered one unconditionally. The three routes migrated in this PR lose their footer as a result.
- **Why this isn't new scope:** `/marche/produits` and `/marche/services` made the identical trade
  when they moved to AppShell earlier (`feat/rebuild-marche-services` and the produits rebuild) —
  this PR extends an already-accepted gap to three more routes, it doesn't introduce it. No
  existing follow-up entry named it before now.
- **Trigger:** whenever AppShell's own footer situation gets a real design decision — a persistent
  footer slot, or an explicit call that authenticated/browse surfaces don't need one.

## ConsumerHomepage's thin-landing card is INFERRED, no measured frame

- **What:** `/`'s new thin landing (`ConsumerHomepage.tsx`) — greeting + one card with two CTAs
  into `/marche/produits` and `/marche/services` — has no Figma frame behind it. Kept deliberately
  minimal (reused `PageHeader` + one `CARD_SHADOW` card, one new i18n key pair
  `home.landing.body`) rather than invent a bespoke landing design without a frame to build
  against.
- **Trigger:** if/when a Figma frame for this surface exists (quota permitting), reconcile against
  it — this is a functional placeholder, not a claimed-final design.

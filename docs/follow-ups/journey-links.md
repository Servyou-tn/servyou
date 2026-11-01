# Follow-ups — journey links + old dashboard files (`fix/journey-links`, 2026-11-01)

## More of the old consumer dashboard is now unused — RESOLVED (`chore/dashboard-orphans`, founder go 2026-11-01: all deleted)

**What** This PR deletes the five files the brief named (`QuickActions`, `ActiveOrdersSnapshot`, `CategoriesWidget`, `DashboardSidebar`,
`DashboardShellClient`). With them gone, these have no importer left in `src/` (checked by grep on the module names):

- `src/components/dashboard/shell/DashboardTopBar.tsx` (was imported only by `DashboardShellClient`)
- `src/components/dashboard/shell/SharedSearchBar.tsx` (only by `DashboardTopBar`)
- `src/components/dashboard/shell/sidebar-active.ts` + `sidebar-active.test.ts` (only by `DashboardSidebar`)
- `src/components/dashboard/consumer/order-buckets.ts` + `ActiveOrdersSnapshot.test.ts` (the test covers `bucketOrders`, used only by the
  deleted `ActiveOrdersSnapshot`)
- `src/components/dashboard/consumer/GreetingHeader.tsx`, `ProfileCard.tsx` (already unused before this PR)

`src/components/dashboard/consumer/icons.tsx` stays: `ProductListingCard` imports `PackageIcon` from it.
Comments in `order-buckets.ts` and `src/lib/i18n/plurals.test.ts` still name `ActiveOrdersSnapshot`. The i18n keys only these files used were
not audited.

**Why deferred** Out of the brief's list; one PR, one focus.

**Where it lives** `src/components/dashboard/`.

**Trigger** The founder or architect OKs a second cleanup pass (delete the list above, grep the i18n keys they used).

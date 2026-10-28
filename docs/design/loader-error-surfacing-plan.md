# Loader error surfacing — plan (APPROVED, resumed 2026-10-27)

Status: discovery by Agent A on 2026-10-25. Rulings 1, 2, 3, 5, 6 approved. Ruling 4 (Sentry DSN) does not block PR-1: call Sentry through the existing helpers; it is a no-op if the DSN is unset.

FIRST STEP: line numbers below are from 2026-10-25 (before #187/#213). Re-check every site against current main.

## Problem
Failed Supabase queries are silently turned into "not found", empty lists, zero counts or the wrong role. This is exactly what hid the six-week PGRST201 outage.

| Pattern | Where | User sees |
|---|---|---|
| Failed query → "not found" | product/service/shop/freelancer/annonce/order (buyer+seller) detail loaders; `getCategoryBySlug`; demander target; admin dispute/report/user detail | 404 during an outage |
| Failed list → empty list | `searchMarketplace` (`/marche/produits`, `/marche/services`, `/recherche`, `/categories`); favorites (`my-data.ts`); mes-annonces; shop products; freelancer services; related items; subcategories; product categories in create/edit forms; admin lists | "No results", empty favorites, create form with no categories, empty admin queue |
| Failed lookup → zero results | `search-marketplace.ts` category-slug lookup | 0 results + raw log |
| Failed read → wrong state | home `page.tsx` (seller routed as consumer); `getShellUser` (~33 pages); `getCurrentProfile` (`/parametres` bounces to `/connexion`) | Wrong role / login bounce |
| Count shows 0 | `getCompletedProjectCount`; admin user-detail counts; `/admin/statistiques` | False "0" |
| Server action wrong message | `disputes.ts`, `demander/[id]/actions.ts` | « introuvable / non éligible » instead of generic error |

- Already correct (they throw): `seller-*` loaders, `my-orders`, `freelancer-dashboard`, `freelancer-profile-edit`, `service-draft-query`, `require-seller`, ma-boutique and mon-profil-freelance pages. Thrown errors already reach Sentry via `onRequestError` — this extends an existing convention.
- `getActiveProducts` / `getActiveServices` in `data.ts` have no app callers (tests only) → out of scope.

## Design — `src/lib/supabase/query-error.ts`
- `class QueryError extends Error { where: string; code?: string }` — message = `${where}: ${err.message}`.
- `failQuery(where: string, err: PostgrestError | Error): never` — `console.error` with where/message/code/details (server log only), then `throw new QueryError(...)`. No Sentry here; whoever catches reports (root error boundary → `onRequestError`).
- `reportQueryError(where: string, err): void` — `console.error` (same fields) + `Sentry.captureException(new Error(...), { tags: { where, code } })` with **message + code only**. For deliberate partial-data displays.
- `isNoRowLike(err): boolean` — true for codes `22P02` (bad uuid) and `PGRST116` (no row from .single()). Junk URLs stay 404 and do not flood Sentry.
- `settle<T>(where, promise: Promise<T>): Promise<{ ok: true; data: T } | { ok: false }>` — catches ONLY `QueryError`, calls `reportQueryError`, returns `{ ok: false }`. Re-throws everything else so `notFound()` / `redirect()` still work.

Privacy: `error.details` / `error.hint` NEVER go to Sentry (Postgres puts row values there; `scrubPII` only redacts by field name). Server log only.

Rule per site:
- Main query fails → `failQuery` (throw). If `isNoRowLike(err)` or no row → return null → page calls `notFound()` (404 as today).
- Secondary query fails (related items, counts, sidebars) → keep partial display + `reportQueryError`.

## UI
`src/components/marche/ErrorState.tsx`, next to `EmptyState` and mirroring its API/layout. Spec (Figma Error State `179:12636`, no Figma read needed):
- centered column, same spacing and max-width as `EmptyState`;
- icon: lucide `AlertTriangle` inside a circle tinted with the danger token (danger-subtle background, danger foreground), same circle size as EmptyState's icon;
- title `system.loadError.title` (EmptyState title style), body `system.loadError.body` (EmptyState body style);
- one **secondary** button « Réessayer » (`system.error.retry`, existing key) → client-side `router.refresh()` (make the button a small client component; ErrorState itself can stay a server component);
- `role="alert"`; RTL-safe (logical properties only).

Root `src/app/error.tsx` bug: « Réessayer » calls `reset()`, which does not refetch server data, so it can never recover from a DB failure. Switch to `unstable_retry` (Next 16, confirm in node_modules/next) and log `error.digest`, not the raw error object.

Placement (ruling 1):
- List pages: `settle()` + inline `<ErrorState>` inside their normal shell (header/nav stay).
- Detail/form pages: throw → root `error.tsx`.

i18n (next to `system.error.*` in fr.ts / ar.ts):
- `system.loadError.title`: « Impossible de charger ce contenu » / « تعذّر تحميل المحتوى »
- `system.loadError.body`: « Un problème temporaire nous empêche de l'afficher. Réessayez dans un instant. » / « حدث خلل مؤقت يمنع عرضه. أعد المحاولة بعد لحظات. »

## PR-1 scope (this branch) — public + consumer reads
- New: `src/lib/supabase/query-error.ts`, `src/components/marche/ErrorState.tsx`, `src/__tests__/query-error.test.ts`, `src/__tests__/loader-error-surfacing.test.ts` (mocked Supabase + Sentry).
- Loaders: `lib/search/search-marketplace.ts`, `lib/marche/{product-detail, service-detail, shop-detail, freelancer-detail (main + services list), annonce-detail, order-detail, seller-order-detail, demander, my-data, product-categories, filter-categories, filter-cities, mon-compte, shell-user}.ts`, `lib/categories/category-data.ts`, `lib/dashboard/data.ts`.
- Pages: `app/page.tsx`, `app/error.tsx`, `app/marche/produits/page.tsx`, `components/marche/ServicesBrowsePage.tsx`, `app/recherche/page.tsx`, `app/categories/[slug]/page.tsx`, `app/mes-favoris/page.tsx`, `app/mes-annonces/page.tsx`.
- i18n: `fr.ts`, `ar.ts`.
- If a listed file no longer exists or moved, follow it and note it in the report. Do not widen scope.

## PR-2 (later, NOT this branch)
Admin lists/details/statistiques; server actions (disputes, demander actions, mes-annonces actions, mon-compte, parametres); seller partial-data reporting; freelancer-detail sub-queries; completed-projects count; raw logs in client components.

## Rulings
1. Placement: inline `ErrorState` in shell for list pages; fixed root `error.tsx` for detail/form pages. ✅
2. Wording: FR/AR strings as written. ✅
3. Role reads: home page throws rather than guess; shell top bar (`getShellUser`) keeps partial display (signed-out look) + `reportQueryError`. ✅
4. Sentry DSN: open, founder checks Vercel. Not blocking. ⏳
5. Split: PR-1 then PR-2. ✅
6. Completed-projects count: hide the stat on error instead of a false « 0 » (PR-2). ✅

Testing: mocked Supabase + Sentry only, run by file path (`npx vitest run <file>`); default `vitest` hits the live DB. Never rls-smoke.

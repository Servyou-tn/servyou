import { resolveStockState } from './product-stock'

// G5 « Mes produits » — pure types/predicates only. NO `@/lib/supabase/server` import here on
// purpose: `ProductRow.tsx` (client) imports `isOutOfStock` and `SellerProductRow` from this file,
// and that server-only import (which pulls in `next/headers`) would otherwise drag the whole
// server client into the client bundle — Turbopack refuses the build when it does. The actual
// fetch (`getSellerProducts`) lives in `./seller-products-query`, which imports FROM here, never
// the other way round.
//
// Full reasoning: docs/design/g5-discovery.md §8.1–8.3.

/** Rows per page — the frame draws 10 rows above the pagination block. */
export const PRODUCTS_PER_PAGE = 10

// Frame order (§8.1): Tous · Actifs · Masqués · Épuisés. Unlike G8's inbox, there is no
// action-first case for landing anywhere but the first tab — `all` is both the frame's active tab
// and the default here.
export const PRODUCT_TABS = ['all', 'active', 'hidden', 'out_of_stock'] as const
export type ProductTab = (typeof PRODUCT_TABS)[number]
export const DEFAULT_PRODUCT_TAB: ProductTab = 'all'

// The app's one canonical "what counts as sold" (seller-dashboard.ts:118-119) — reused here for
// Vendus rather than a second definition. Not exported from that file, so restated, not imported.
export const DELIVERED = 'received'

type StockFields = { tracks_stock: boolean; stock_count: number | null }
type TabFields = { status: string } & StockFields

/**
 * Épuisés is a VIEW over the catalogue, not a fifth `status` — a product can be `status='active'`
 * and out of stock at once, so this is NOT mutually exclusive with `active`. Delegates to
 * `resolveStockState` (the same function D1 uses for the rupture pill) rather than reimplementing
 * the `tracks_stock && stock<=0` condition a second time — that equivalence is the whole point:
 * the JS-reduced tab COUNT (below) and the SQL row FILTER (seller-products-query's content query)
 * both have to agree with this one function, or the pagination total silently disagrees with the
 * rendered rows. See `matchesProductTab`'s own note.
 */
export function isOutOfStock(p: StockFields): boolean {
  return resolveStockState(p) === 'sold_out'
}

/**
 * The single source of truth for "does this row belong in this tab" — driving BOTH the cheap
 * JS-reduced counts (§8.1 step 1, over minimal-column rows) and documenting exactly what the SQL
 * content query (step 2) must filter to. Keep the two in lockstep: a SQL predicate that drifts
 * from this function would make the tab badge disagree with what's rendered, silently.
 */
export function matchesProductTab(p: TabFields, tab: ProductTab): boolean {
  switch (tab) {
    case 'all':
      return true
    case 'active':
      return p.status === 'active'
    case 'hidden':
      return p.status === 'hidden'
    case 'out_of_stock':
      return isOutOfStock(p)
  }
}

export type ProductTabCounts = Record<ProductTab, number>

/**
 * Tous counts every product exactly once, independent of the other three — NOT their sum (that
 * sum can exceed Tous, since Épuisés overlaps either Actifs or Masqués).
 */
export function countProductTabs(rows: TabFields[]): ProductTabCounts {
  return {
    all: rows.length,
    active: rows.filter((r) => matchesProductTab(r, 'active')).length,
    hidden: rows.filter((r) => matchesProductTab(r, 'hidden')).length,
    out_of_stock: rows.filter((r) => matchesProductTab(r, 'out_of_stock')).length,
  }
}

export type SellerProductRow = {
  id: string
  title: string
  priceTnd: number
  tracksStock: boolean
  stockCount: number | null
  status: string
  adminHiddenAt: string | null
  adminHiddenReason: string | null
  imageUrl: string | null
  /** Delivered-order count — Vendus. */
  soldCount: number
  /** Any order at all, any status — the delete-eligibility signal (§8.5), NOT the same as soldCount. */
  hasOrders: boolean
}

export type SellerProductsPage = {
  products: SellerProductRow[]
  counts: ProductTabCounts
  totalCount: number
  totalPages: number
  page: number
}

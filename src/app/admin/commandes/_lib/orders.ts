// Pure logic for /admin/commandes (Figma J9): tabs, filters and their RPC arguments. No Supabase here. The RPCs
// (admin_list_orders / admin_count_orders) validate every value again and raise 23514 on anything else.

export const ORDER_TABS = ['all', 'blocked', 'in_progress', 'received', 'cancelled'] as const
export type OrderTab = (typeof ORDER_TABS)[number]
export const ORDER_TYPES = ['all', 'product', 'service'] as const
export type OrderTypeFilter = (typeof ORDER_TYPES)[number]
export const ORDER_PERIODS = ['7', '30', '90', 'all'] as const
export type OrderPeriod = (typeof ORDER_PERIODS)[number]
export const ORDER_SORTS = ['newest', 'oldest'] as const
export type OrderSort = (typeof ORDER_SORTS)[number]

export function parseOne<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

/** The RPCs' 80-character search limit, trimmed — a longer query is cut, never sent to fail with 23514. */
export function searchArg(q: string): string | undefined {
  const s = q.trim().slice(0, 80)
  return s ? s : undefined
}

/** p_days: 7 / 30 / 90, or null for « Toutes les dates ». */
export function daysArg(period: OrderPeriod): number | null {
  return period === 'all' ? null : Number(period)
}

type Counts = { all_count: number; blocked: number; in_progress: number; received: number; cancelled: number }
/** admin_count_orders' one row → the tab badges (same filters as the list, so a tab and its rows agree). */
export function tabCount(counts: Counts, tab: OrderTab): number {
  return tab === 'all' ? counts.all_count : counts[tab]
}

/** « Coussin brodé main ×2 »; a missing title (no snapshot, listing gone) is « — ». */
export function articleText(title: string | null, quantity: number): string {
  const base = title?.trim() || '—'
  return quantity > 1 ? `${base} ×${quantity}` : base
}

export function pageOffset(page: number, perPage: number): number {
  return (Math.max(1, Math.floor(page) || 1) - 1) * perPage
}

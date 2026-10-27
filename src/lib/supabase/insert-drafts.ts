import type { Database } from './database.types'

type OrderInsert = Database['public']['Tables']['orders']['Insert']

/**
 * What a buyer-side order INSERT sends: everything except `seller_id`.
 *
 * The generated type marks `orders.seller_id` required (NOT NULL, no column default) — but the BEFORE INSERT trigger
 * `enforce_order_insert_integrity` derives it from the product's shop / the service's freelancer and OVERWRITES whatever
 * the client sent (docs/follow-ups/orders-insert-integrity). A client must not choose it, so the draft omits it and the
 * single cast below is the one place that says so.
 */
export type OrderInsertDraft = Omit<OrderInsert, 'seller_id'>

export function asOrderInsert(draft: OrderInsertDraft): OrderInsert {
  return draft as OrderInsert
}

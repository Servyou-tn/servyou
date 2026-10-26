// The cancel-reason presets a seller picks from, by seller type. i18n KEYS, resolved at render
// (reference_i18n_store_keys_not_text). The chosen label is what is stored in `cancellation_reason`, so
// the buyer reads it in the seller's language at the time — the same trade-off G8 already made.

/** Shared by both lists: choosing it reveals a free-text field. */
export const CANCEL_REASON_OTHER = 'common.cancel_reason_seller_other'

/** G8 / G9 — a shop owner cancelling a product order. */
export const SHOP_CANCEL_REASONS = [
  'common.cancel_reason_seller_out_of_stock',
  'common.cancel_reason_seller_invalid_address',
  'common.cancel_reason_seller_unreachable',
  'common.cancel_reason_seller_product_error',
  CANCEL_REASON_OTHER,
] as const

/** E3 Produits — a buyer cancelling their own product order. Keys already shipped with the legacy buyer modal. */
export const BUYER_CANCEL_REASONS = [
  'common.cancel_reason_buyer_changed_mind',
  'common.cancel_reason_buyer_too_slow',
  'common.cancel_reason_buyer_unavailable',
  'common.cancel_reason_buyer_found_cheaper',
  'common.cancel_reason_buyer_order_error',
  CANCEL_REASON_OTHER,
] as const

/** H8 — a freelancer cancelling a service engagement (nothing ships, so no stock / address / listing-photo reasons). */
export const SERVICE_CANCEL_REASONS = [
  'common.cancel_reason_freelancer_unavailable',
  'common.cancel_reason_freelancer_out_of_scope',
  'common.cancel_reason_freelancer_terms_mismatch',
  'common.cancel_reason_seller_unreachable',
  CANCEL_REASON_OTHER,
] as const

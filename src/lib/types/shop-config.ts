// Shop configuration types — types and constants matching the
// shops, shop_payment_methods, and shop_categories schema in
// production. Mirrors the CHECK constraints from:
//   - 20260606192321_shop_configurable_workspace (shop_type, delivery_setup)
//   - 20260606194103_shop_workspace_market_alignment (preferred_carriers, flouci)

export const SHOP_TYPES = ['physical', 'online_only', 'dropshipper'] as const
export type ShopType = (typeof SHOP_TYPES)[number]

export const DELIVERY_SETUPS = ['self_delivery', 'third_party', 'buyer_pickup'] as const
export type DeliverySetup = (typeof DELIVERY_SETUPS)[number]

export const PAYMENT_METHODS = [
  'cod',
  'bank_transfer',
  'd17',
  'flouci',
  'konnect',
  'other',
] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

// i18n label-key helpers — all keys live under boutique.* in fr.ts
// matching the existing namespace.
export function shopTypeLabelKey(type: ShopType): string {
  return `boutique.shop_type_${type}`
}

export function deliverySetupLabelKey(setup: DeliverySetup): string {
  return `boutique.delivery_setup_${setup}`
}

export function paymentMethodLabelKey(method: PaymentMethod): string {
  return `boutique.payment_method_${method}`
}

// Shop interface extending the existing 5-column shape with the 5
// new scalar columns added in PRs #28 and shop_workspace_market_alignment.
export interface Shop {
  id: string
  owner_id: string
  name: string
  description: string | null
  city: string | null
  logo_url: string | null
  banner_url: string | null
  shop_type: ShopType | null
  delivery_setup: DeliverySetup | null
  working_hours: string | null
  location_detail: string | null
  preferred_carriers: string | null
  created_at: string
  updated_at: string
}

export interface ShopPaymentMethodRow {
  id?: string
  shop_id: string
  method: PaymentMethod
  note: string | null
}

export interface ShopCategoryRow {
  id?: string
  shop_id: string
  category_id: string
}

export interface CategoryRow {
  id: string
  name_fr: string
  name_ar: string
  slug: string
}

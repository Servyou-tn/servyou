/**
 * The production select strings that embed categories through service_listings, shared by
 * category-embeds-unambiguous.test.ts (live PostgREST, integration run) and
 * category-embeds-hint-guard.test.ts (source drift + unhinted-embed scan, default unit run).
 * Not a test file itself: no `.test.` in the name, so vitest never collects it.
 */

export type Role = 'anon' | 'authenticated'
export interface EmbedCase {
  site: string
  // Repo-relative source file that must still contain `select` verbatim (category-embeds-hint-guard.test.ts).
  file: string
  table: 'service_listings' | 'orders' | 'favorites'
  select: string
  role: Role
  // Public marketplace reads: at least one row must come back carrying a `categories` object.
  expectRowWithCategory?: boolean
}

// Copied verbatim from the call sites (whitespace included). category-embeds-hint-guard.test.ts
// (default unit run, no DB) fails when a copy no longer appears in its source file.
export const CASES: EmbedCase[] = [
  {
    site: 'lib/marche/data.ts getActiveServices',
    file: 'src/lib/marche/data.ts',
    table: 'service_listings',
    select:
      'id, title, description, short_description, starting_price_tnd, price_unit, delivery_time, freelancer_profiles!inner(profile_id, city, admin_hidden_at), categories!service_listings_category_id_fkey(name_fr)',
    role: 'anon',
    expectRowWithCategory: true,
  },
  {
    site: 'lib/marche/demander.ts getRequestTarget (service)',
    file: 'src/lib/marche/demander.ts',
    table: 'service_listings',
    select: `id, title, starting_price_tnd, price_unit, delivery_time, status, buyer_briefing, tags,
       categories!service_listings_category_id_fkey ( name_fr ),
       freelancer_profiles!inner ( profile_id, city, headline, admin_hidden_at )`,
    role: 'authenticated',
    expectRowWithCategory: true,
  },
  {
    site: 'lib/marche/freelancer-detail.ts services',
    file: 'src/lib/marche/freelancer-detail.ts',
    table: 'service_listings',
    select:
      'id, title, description, short_description, starting_price_tnd, price_unit, delivery_time, tags, categories!service_listings_category_id_fkey ( name_fr, name_ar )',
    role: 'anon',
    expectRowWithCategory: true,
  },
  {
    site: 'lib/marche/my-data.ts getMyOrders',
    file: 'src/lib/marche/my-data.ts',
    table: 'orders',
    select: `id, order_type, status, quantity, cancelled_by, cancellation_reason, received_at, created_at,
       products ( title, price_tnd, shops ( name, city ), categories ( name_fr ), product_images ( image_url, display_order ) ),
       service_listings ( title, starting_price_tnd, freelancer_profiles ( profile_id, city ), categories!service_listings_category_id_fkey ( name_fr ) )`,
    role: 'authenticated',
  },
  {
    site: 'lib/marche/my-data.ts getMyFavorites',
    file: 'src/lib/marche/my-data.ts',
    table: 'favorites',
    select: `item_type, created_at,
       products ( id, title, description, price_tnd, status, admin_hidden_at, shops ( name, city, admin_hidden_at ), categories ( name_fr, name_ar ), product_images ( image_url, display_order ) ),
       service_listings ( id, title, description, short_description, starting_price_tnd, price_unit, delivery_time, status, admin_hidden_at, freelancer_profiles ( profile_id, city, admin_hidden_at ), categories!service_listings_category_id_fkey ( name_fr ) )`,
    role: 'authenticated',
  },
  {
    site: 'lib/marche/my-orders.ts getMyServiceOrders',
    file: 'src/lib/marche/my-orders.ts',
    table: 'orders',
    select: `id, status, created_at, received_at, cancelled_by, cancellation_reason, seller_id,
       service_listings ( title, starting_price_tnd, freelancer_profiles ( city ), categories!service_listings_category_id_fkey ( name_fr ) )`,
    role: 'authenticated',
  },
  {
    site: 'lib/marche/order-detail.ts getOrderDetail',
    file: 'src/lib/marche/order-detail.ts',
    table: 'orders',
    select: `id, order_type, status, quantity, buyer_id, seller_id,
         delivery_name, delivery_address, delivery_phone, buyer_note,
         created_at, updated_at, cancelled_by, cancellation_reason, received_at,
         carrier, tracking_number, unit_price_tnd, delivery_fee_tnd,
         products ( id, title, price_tnd, shop_id,
                    categories ( name_fr ),
                    shops ( id, name, city, logo_url ),
                    product_images ( image_url, display_order ) ),
         service_listings ( id, title, starting_price_tnd, delivery_time, freelancer_profile_id,
                    categories!service_listings_category_id_fkey ( name_fr ),
                    freelancer_profiles ( id, city, headline ) )`,
    role: 'authenticated',
  },
  {
    site: 'lib/marche/seller-services-query.ts content',
    file: 'src/lib/marche/seller-services-query.ts',
    table: 'service_listings',
    select: `id, title, description, starting_price_tnd, status, admin_hidden_at,
         commandes:orders(count), all_orders:orders(count), categories!service_listings_category_id_fkey(slug)`,
    role: 'authenticated',
  },
  {
    site: 'lib/marche/service-detail.ts getServiceDetail',
    file: 'src/lib/marche/service-detail.ts',
    table: 'service_listings',
    select: `id, title, description, starting_price_tnd, price_unit, delivery_time, status, category_id, freelancer_profile_id,
       deliverables, delivery_mode, revisions_count, tags,
       categories!service_listings_category_id_fkey ( name_fr, name_ar ),
       subcategory:categories!service_listings_subcategory_id_fkey ( name_fr, name_ar ),
       freelancer_profiles!inner ( id, profile_id, city, headline, admin_hidden_at )`,
    role: 'anon',
    expectRowWithCategory: true,
  },
  {
    site: 'lib/marche/service-detail.ts related',
    file: 'src/lib/marche/service-detail.ts',
    table: 'service_listings',
    select: `id, title, description, short_description, starting_price_tnd, price_unit, delivery_time,
         categories!service_listings_category_id_fkey ( name_fr ),
         freelancer_profiles!inner ( profile_id, city, admin_hidden_at )`,
    role: 'anon',
    expectRowWithCategory: true,
  },
  {
    site: 'lib/search/search-marketplace.ts fetchServices',
    file: 'src/lib/search/search-marketplace.ts',
    table: 'service_listings',
    select:
      'id, title, description, short_description, starting_price_tnd, price_unit, delivery_time, tags, created_at, category_id, freelancer_profiles!inner(profile_id, city, admin_hidden_at), categories!service_listings_category_id_fkey(name_fr, name_ar)',
    role: 'anon',
    expectRowWithCategory: true,
  },
]

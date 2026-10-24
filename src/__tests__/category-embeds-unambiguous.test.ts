/**
 * Live-PostgREST regression guard for the PGRST201 hotfix (fix/pgrst201-category-embeds).
 *
 * Since 20260909203226 (service_listings.subcategory_id) service_listings has TWO foreign keys to
 * categories (category_id, subcategory_id). A bare `categories(...)` embed reached through
 * service_listings is then ambiguous: PostgREST answers HTTP 300 / PGRST201 for the whole request,
 * which broke /services/<id> (404), /mes-commandes (500) and emptied the marketplace lists. Every
 * such embed now names the FK: `categories!service_listings_category_id_fkey(...)`.
 *
 * Mock tests cannot catch this class — the ambiguity lives in PostgREST's schema cache — so this file
 * runs each production select string verbatim against the real API and asserts `error === null`
 * (which also catches PGRST200 from a wrong hint, e.g. the service_listings hint left on a products
 * embed). PostgREST resolves embeds before RLS, so a select that returns zero visible rows still
 * proves the string parses; the public marketplace selects additionally assert a row comes back with
 * a `categories` object, proving the result key the mappers read is unchanged.
 *
 * When you add or change a select that embeds categories through service_listings, add it here.
 *
 * Pattern A (live-DB). Service role for the fixture user and teardown only.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/category-embeds-unambiguous.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'cat-embed-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PASSWORD = `Ce-${randomUUID()}-Aa1!` // per run, never committed

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)
const anon: SupabaseClient = hasCreds
  ? createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

type Role = 'anon' | 'authenticated'
interface EmbedCase {
  site: string
  table: 'service_listings' | 'orders' | 'favorites'
  select: string
  role: Role
  // Public marketplace reads: at least one row must come back carrying a `categories` object.
  expectRowWithCategory?: boolean
}

// Copied verbatim from the call sites (whitespace included) so a drift is a visible diff here.
const CASES: EmbedCase[] = [
  {
    site: 'lib/marche/data.ts getActiveServices',
    table: 'service_listings',
    select:
      'id, title, description, starting_price_tnd, delivery_time, freelancer_profiles!inner(profile_id, city, admin_hidden_at), categories!service_listings_category_id_fkey(name_fr)',
    role: 'anon',
    expectRowWithCategory: true,
  },
  {
    site: 'lib/marche/demander.ts getRequestTarget (service)',
    table: 'service_listings',
    select: `id, title, starting_price_tnd, delivery_time, status, buyer_briefing, tags,
       categories!service_listings_category_id_fkey ( name_fr ),
       freelancer_profiles!inner ( profile_id, city, headline, admin_hidden_at )`,
    role: 'authenticated',
    expectRowWithCategory: true,
  },
  {
    site: 'lib/marche/freelancer-detail.ts services',
    table: 'service_listings',
    select:
      'id, title, description, starting_price_tnd, delivery_time, tags, categories!service_listings_category_id_fkey ( name_fr, name_ar )',
    role: 'anon',
    expectRowWithCategory: true,
  },
  {
    site: 'lib/marche/my-data.ts getMyOrders',
    table: 'orders',
    select: `id, order_type, status, quantity, cancelled_by, cancellation_reason, received_at, created_at,
       products ( title, price_tnd, shops ( name, city ), categories ( name_fr ), product_images ( image_url, display_order ) ),
       service_listings ( title, starting_price_tnd, freelancer_profiles ( profile_id, city ), categories!service_listings_category_id_fkey ( name_fr ) )`,
    role: 'authenticated',
  },
  {
    site: 'lib/marche/my-data.ts getMyFavorites',
    table: 'favorites',
    select: `item_type, created_at,
       products ( id, title, description, price_tnd, status, admin_hidden_at, shops ( name, city, admin_hidden_at ), categories ( name_fr, name_ar ), product_images ( image_url, display_order ) ),
       service_listings ( id, title, description, starting_price_tnd, delivery_time, status, admin_hidden_at, freelancer_profiles ( profile_id, city, admin_hidden_at ), categories!service_listings_category_id_fkey ( name_fr ) )`,
    role: 'authenticated',
  },
  {
    site: 'lib/marche/my-orders.ts getMyServiceOrders',
    table: 'orders',
    select: `id, status, created_at, received_at, cancelled_by, cancellation_reason, seller_id,
       service_listings ( title, starting_price_tnd, freelancer_profiles ( city ), categories!service_listings_category_id_fkey ( name_fr ) )`,
    role: 'authenticated',
  },
  {
    site: 'lib/marche/order-detail.ts getOrderDetail',
    table: 'orders',
    select: `id, order_type, status, quantity, buyer_id, seller_id,
         delivery_name, delivery_address, delivery_phone, buyer_note,
         created_at, updated_at, cancelled_by, cancellation_reason, received_at,
         unit_price_tnd, delivery_fee_tnd,
         products ( id, title, price_tnd, shop_id,
                    categories ( name_fr ),
                    shops ( id, name, city, logo_url ),
                    product_images ( image_url, display_order ) ),
         service_listings ( id, title, starting_price_tnd, freelancer_profile_id,
                    categories!service_listings_category_id_fkey ( name_fr ),
                    freelancer_profiles ( id, city, headline ) )`,
    role: 'authenticated',
  },
  {
    site: 'lib/marche/seller-services-query.ts content',
    table: 'service_listings',
    select: `id, title, description, starting_price_tnd, status, admin_hidden_at,
         commandes:orders(count), all_orders:orders(count), categories!service_listings_category_id_fkey(slug)`,
    role: 'authenticated',
  },
  {
    site: 'lib/marche/service-detail.ts getServiceDetail',
    table: 'service_listings',
    select: `id, title, description, starting_price_tnd, delivery_time, status, category_id, freelancer_profile_id,
       deliverables, delivery_mode, revisions_count, tags,
       categories!service_listings_category_id_fkey ( name_fr ),
       freelancer_profiles!inner ( id, profile_id, city, headline, admin_hidden_at )`,
    role: 'anon',
    expectRowWithCategory: true,
  },
  {
    site: 'lib/marche/service-detail.ts related',
    table: 'service_listings',
    select: `id, title, description, starting_price_tnd, delivery_time,
         categories!service_listings_category_id_fkey ( name_fr ),
         freelancer_profiles!inner ( profile_id, city, admin_hidden_at )`,
    role: 'anon',
    expectRowWithCategory: true,
  },
  {
    site: 'lib/search/search-marketplace.ts fetchServices',
    table: 'service_listings',
    select:
      'id, title, description, starting_price_tnd, delivery_time, tags, created_at, category_id, freelancer_profiles!inner(profile_id, city, admin_hidden_at), categories!service_listings_category_id_fkey(name_fr, name_ar)',
    role: 'anon',
    expectRowWithCategory: true,
  },
]

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id as string)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

let userClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { data, error } = await admin.auth.admin.createUser({
    email: email('buyer'),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Category Embeds Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  userClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: signInErr } = await userClient.auth.signInWithPassword({ email: email('buyer'), password: PASSWORD })
  if (signInErr) throw new Error(`signIn failed: ${signInErr.message}`)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

describe.skipIf(!hasCreds)('categories embeds through service_listings are unambiguous', () => {
  it.each(CASES.map((c) => [c.site, c] as const))('%s', async (_site, c) => {
    const client = c.role === 'anon' ? anon : userClient
    let query = client.from(c.table).select(c.select)
    if (c.expectRowWithCategory) {
      query = query.eq('status', 'active').not('category_id', 'is', null)
    }
    const { data, error, status } = await query.limit(5)

    expect(status).not.toBe(300)
    expect(error?.code).not.toBe('PGRST201')
    expect(error).toBeNull()

    if (c.expectRowWithCategory) {
      const rows = (data ?? []) as unknown as { categories: unknown }[]
      expect(rows.length).toBeGreaterThan(0)
      const category = rows[0].categories
      expect(category).toBeTruthy()
      expect(Array.isArray(category)).toBe(false)
    }
  })
})

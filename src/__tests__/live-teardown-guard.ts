import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Teardown guard for every live-DB suite whose fixtures include a seller. Call it with the fixture
 * profile ids BEFORE the first orders delete and before any deleteUser.
 *
 * A fixture product or service listing is live on production while the suite runs — both
 * `products.status` and `service_listings.status` default to 'active', and the orderability check
 * in enforce_order_insert_integrity (migration 54) never looks at `freelancer_profiles.is_published`
 * — so a real customer can order it. Deleting the fixture seller would then take that order with
 * it, silently: orders.seller_id is ON DELETE CASCADE, and RI cascades run breadth-first, so the
 * order is gone before any product_id / service_listing_id SET NULL could trip a CHECK. A teardown
 * that deletes orders `.in('seller_id', ids)` deletes it directly. So: refuse to tear down at all
 * while a non-fixture order points at a fixture seller, and resolve it by hand.
 *
 * Same check as orders-lifecycle-columns.test.ts's teardown (PR #193), shared from here.
 */
export async function refuseTeardownOnForeignOrders(
  admin: SupabaseClient<Database>,
  fixtureIds: string[],
  prefix: string,
): Promise<void> {
  if (fixtureIds.length === 0) return
  const { data, error } = await admin
    .from('orders')
    .select('id')
    .in('seller_id', fixtureIds)
    .not('buyer_id', 'in', `(${fixtureIds.join(',')})`)
  if (error) throw new Error(`teardown safety check failed: ${error.message}`)
  if ((data ?? []).length > 0) {
    throw new Error(
      `teardown REFUSED: ${data?.length} non-fixture order(s) reference a ${prefix} seller — a real ` +
        'customer ordered a live fixture item during the run. Resolve by hand; never force-delete.',
    )
  }
}

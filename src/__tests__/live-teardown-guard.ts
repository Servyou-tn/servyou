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

/**
 * The job_responses twin, for every live-DB suite whose fixtures include an open job post: a post that
 * is open and under 30 days old is on the board while the suite runs, so a real freelancer can answer
 * it, and deleting the fixture poster would take that response with it (job_responses.job_post_id is
 * ON DELETE CASCADE). Call it before any job_responses delete and before any deleteUser.
 */
export async function refuseTeardownOnForeignResponses(
  admin: SupabaseClient<Database>,
  fixtureIds: string[],
  prefix: string,
): Promise<void> {
  if (fixtureIds.length === 0) return
  const { data: posts, error: postsErr } = await admin.from('job_posts').select('id').in('consumer_id', fixtureIds)
  if (postsErr) throw new Error(`teardown post lookup failed: ${postsErr.message}`)
  const postIds = (posts ?? []).map((row) => row.id)
  if (postIds.length === 0) return
  const { data, error } = await admin
    .from('job_responses')
    .select('id')
    .in('job_post_id', postIds)
    .not('freelancer_id', 'in', `(${fixtureIds.join(',')})`)
  if (error) throw new Error(`teardown safety check failed: ${error.message}`)
  if ((data ?? []).length > 0) {
    throw new Error(
      `teardown REFUSED: ${data?.length} non-fixture response(s) on a ${prefix} post — a real freelancer ` +
        'answered an open fixture post during the run. Resolve by hand; never force-delete.',
    )
  }
}
